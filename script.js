class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentFilter = 'all';
        this.currentSort = 'newest';
        this.editingTaskId = null;

        this.init();
    }

    init() {
        this.loadTasks();
        this.bindEvents();
        this.renderTasks();
        this.updateStats();
        this.setDefaultDateTime();
    }

    setDefaultDateTime() {
        const now = new Date();
        const dateTimeLocal = now.toISOString().slice(0, 16);
        document.getElementById('taskDateTime').value = dateTimeLocal;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    loadTasks() {
        try {
            const stored = localStorage.getItem('taskmaster_tasks');
            this.tasks = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.tasks = [];
        }
    }

    saveTasks() {
        try {
            localStorage.setItem('taskmaster_tasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Error saving tasks:', error);
        }
    }

    addTask(title, dateTime) {
        if (!title || title.trim() === '') return false;

        const task = {
            id: this.generateId(),
            title: title.trim(),
            dateTime: dateTime || null,
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.tasks.unshift(task);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        return true;
    }

    deleteTask(id) {
        if (!confirm('Delete this task?')) return;
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveTasks();
        this.renderTasks();
        this.updateStats();
        // close modal if open
        this.closeEditModal();
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            task.updatedAt = new Date().toISOString();
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
        }
    }

    editTask(id, title, dateTime) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.title = title.trim();
            task.dateTime = dateTime || null;
            task.updatedAt = new Date().toISOString();
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
            return true;
        }
        return false;
    }

    openEditModal(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        this.editingTaskId = id;
        document.getElementById('editTaskTitle').value = task.title;
        document.getElementById('editTaskDateTime').value = task.dateTime || '';
        document.getElementById('editModal').classList.add('show');
    }

    closeEditModal() {
        document.getElementById('editModal').classList.remove('show');
        this.editingTaskId = null;
    }

    getFilteredTasks() {
        let filtered = [...this.tasks];

        if (this.currentFilter === 'completed') {
            filtered = filtered.filter(t => t.completed);
        } else if (this.currentFilter === 'pending') {
            filtered = filtered.filter(t => !t.completed);
        }

        switch (this.currentSort) {
            case 'oldest':
                filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'due-date':
                filtered.sort((a, b) => {
                    if (!a.dateTime && !b.dateTime) return 0;
                    if (!a.dateTime) return 1;
                    if (!b.dateTime) return -1;
                    return new Date(a.dateTime) - new Date(b.dateTime);
                });
                break;
            case 'title':
                filtered.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'newest':
            default:
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }

        return filtered;
    }

    isOverdue(task) {
        if (!task.dateTime || task.completed) return false;
        return new Date(task.dateTime) < new Date();
    }

    isUpcoming(task) {
        if (!task.dateTime || task.completed) return false;
        const diff = new Date(task.dateTime) - new Date();
        return diff > 0 && diff <= 86400000;
    }

    formatDateTime(dateTimeString) {
        if (!dateTimeString) return 'No due date';
        const date = new Date(dateTimeString);
        const now = new Date();
        const diffDays = Math.ceil((date - now) / 86400000);

        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (diffDays === 0) return `Today · ${timeStr}`;
        if (diffDays === 1) return `Tomorrow · ${timeStr}`;
        if (diffDays === -1) return `Yesterday · ${timeStr}`;
        if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days · ${timeStr}`;
        if (diffDays < -1) return `${Math.abs(diffDays)} days ago · ${timeStr}`;

        return `${dateStr} · ${timeStr}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    createTaskHTML(task) {
        const isOverdue = this.isOverdue(task);
        const isUpcoming = this.isUpcoming(task);
        const statusClass = task.completed ? 'completed' : isOverdue ? 'overdue' : isUpcoming ? 'upcoming' : 'pending';
        const badge = task.completed ? 'Done' : isOverdue ? 'Overdue' : isUpcoming ? 'Soon' : 'Pending';

        return `
        <div class="task-card ${statusClass}" data-id="${task.id}">
            <div class="task-badge ${statusClass}">${badge}</div>
            <div class="task-body">
                <p class="task-title">${this.escapeHtml(task.title)}</p>
                <span class="task-date ${isOverdue ? 'overdue' : isUpcoming ? 'upcoming' : ''}">
                    <i class="fas fa-calendar-alt"></i>
                    ${this.formatDateTime(task.dateTime)}
                    ${isOverdue ? '<i class="fas fa-exclamation-circle"></i>' : ''}
                </span>
            </div>
            <div class="task-actions">
                <button class="btn-icon ${task.completed ? 'undo' : 'complete'}" title="${task.completed ? 'Undo' : 'Complete'}"
                    onclick="taskManager.toggleTask('${task.id}')">
                    <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                </button>
                <button class="btn-icon edit" title="Edit"
                    onclick="taskManager.openEditModal('${task.id}')">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="btn-icon delete" title="Delete"
                    onclick="taskManager.deleteTask('${task.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
    }

    renderTasks() {
        const container = document.getElementById('tasksContainer');
        const filtered = this.getFilteredTasks();

        if (filtered.length === 0) {
            container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <h3>${this.currentFilter === 'all' ? 'No tasks yet' : `No ${this.currentFilter} tasks`}</h3>
                <p>${this.currentFilter === 'all' ? 'Add your first task above!' : 'Try changing the filter.'}</p>
            </div>`;
            return;
        }

        container.innerHTML = filtered.map(t => this.createTaskHTML(t)).join('');
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        document.getElementById('totalTasks').textContent = total;
        document.getElementById('pendingTasks').textContent = pending;
        document.getElementById('completedTasks').textContent = completed;
    }

    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderTasks();
    }

    setSort(sort) {
        this.currentSort = sort;
        this.renderTasks();
    }

    bindEvents() {
        // Add task form
        document.getElementById('taskForm').addEventListener('submit', e => {
            e.preventDefault();
            const title = document.getElementById('taskTitle').value;
            const dateTime = document.getElementById('taskDateTime').value;
            if (this.addTask(title, dateTime)) {
                e.target.reset();
                this.setDefaultDateTime();
            }
        });

        // Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setFilter(btn.dataset.filter));
        });

        // Sort
        document.getElementById('sortSelect').addEventListener('change', e => {
            this.setSort(e.target.value);
        });

        // Edit form submit
        document.getElementById('editForm').addEventListener('submit', e => {
            e.preventDefault();
            const title = document.getElementById('editTaskTitle').value;
            const dateTime = document.getElementById('editTaskDateTime').value;
            if (this.editTask(this.editingTaskId, title, dateTime)) {
                this.closeEditModal();
            }
        });

        // ✅ FIX: close button uses class selector, not missing id
        document.querySelector('#editModal .close-btn').addEventListener('click', () => {
            this.closeEditModal();
        });

        // Cancel button
        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.closeEditModal();
        });

        // ✅ FIX: delete button inside modal wired up
        document.getElementById('deleteTask').addEventListener('click', () => {
            if (this.editingTaskId) {
                this.deleteTask(this.editingTaskId);
            }
        });

        // Backdrop click
        document.getElementById('editModal').addEventListener('click', e => {
            if (e.target.id === 'editModal') this.closeEditModal();
        });

        // Escape key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') this.closeEditModal();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskManager;
}
