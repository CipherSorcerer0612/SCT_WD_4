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
            const stored = localStorage.getItem('tasks');
            this.tasks = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.tasks = [];
        }
    }

    saveTasks() {
        try {
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
        } catch (error) {
            console.error('Error saving tasks:', error);
            alert('Error saving tasks. Please check your browser storage.');
        }
    }

    addTask(title, dateTime) {
        if (!title || title.trim() === '') {
            alert('Please enter a task title');
            return false;
        }

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
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(task => task.id !== id);
            this.saveTasks();
            this.renderTasks();
            this.updateStats();
        }
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
            filtered = filtered.filter(task => task.completed);
        } else if (this.currentFilter === 'pending') {
            filtered = filtered.filter(task => !task.completed);
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
        const dueDate = new Date(task.dateTime);
        const now = new Date();
        const timeDiff = dueDate.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);
        return hoursDiff <= 24 && hoursDiff > 0;
    }

    formatDateTime(dateTimeString) {
        if (!dateTimeString) return 'No due date';
        
        const date = new Date(dateTimeString);
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const formatted = date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
            hour: '2-digit',
            minute: '2-digit'
        });

        if (diffDays === 0) return `Today, ${formatted.split(', ')[1]}`;
        if (diffDays === 1) return `Tomorrow, ${formatted.split(', ')[1]}`;
        if (diffDays === -1) return `Yesterday, ${formatted.split(', ')[1]}`;
        if (diffDays > 1) return `In ${diffDays} days, ${formatted.split(', ')[1]}`;
        
        return formatted;
    }

    createTaskHTML(task) {
        const isOverdue = this.isOverdue(task);
        const isUpcoming = this.isUpcoming(task);
        const dateTimeClass = isOverdue ? 'overdue' : isUpcoming ? 'upcoming' : '';

        return `
            <div class="task-card ${task.completed ? 'completed' : ''} ${dateTimeClass}" data-id="${task.id}">
                <div class="task-status ${task.completed ? 'completed' : 'pending'}"></div>
                <div class="task-header">
                    <div>
                        <div class="task-title">${this.escapeHtml(task.title)}</div>
                        <div class="task-meta">
                            <div class="task-date ${dateTimeClass}">
                                <i class="fas fa-calendar-alt"></i>
                                ${this.formatDateTime(task.dateTime)}
                                ${isOverdue ? '<i class="fas fa-exclamation-triangle"></i>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn btn-sm ${task.completed ? 'btn-secondary' : 'btn-success'}" onclick="taskManager.toggleTask('${task.id}')">
                        <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i>
                        ${task.completed ? 'Undo' : 'Complete'}
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="taskManager.openEditModal('${task.id}')">
                        <i class="fas fa-edit"></i>
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="taskManager.deleteTask('${task.id}')">
                        <i class="fas fa-trash"></i>
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    renderTasks() {
        const container = document.getElementById('tasksContainer');
        const filteredTasks = this.getFilteredTasks();

        if (filteredTasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>${this.currentFilter === 'all' ? 'No tasks yet' : `No ${this.currentFilter} tasks`}</h3>
                    <p>${this.currentFilter === 'all' ? 'Add your first task to get started!' : `Try changing the filter or add some tasks.`}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredTasks
            .map(task => this.createTaskHTML(task))
            .join('');
    }

    updateStats() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.completed).length;
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
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('taskTitle').value;
            const dateTime = document.getElementById('taskDateTime').value;
            
            if (this.addTask(title, dateTime)) {
                e.target.reset();
                this.setDefaultDateTime();
            }
        });

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setFilter(btn.dataset.filter);
            });
        });

        document.getElementById('sortSelect').addEventListener('change', (e) => {
            this.setSort(e.target.value);
        });

        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('editTaskTitle').value;
            const dateTime = document.getElementById('editTaskDateTime').value;
            
            if (this.editTask(this.editingTaskId, title, dateTime)) {
                this.closeEditModal();
            }
        });

        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('editModal').addEventListener('click', (e) => {
            if (e.target.id === 'editModal') {
                this.closeEditModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeEditModal();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaskManager;
}