export class NotificationCenter {
  constructor(container, bus) {
    this.el = container;
    this.bus = bus;
    this.visible = false;
    this.notifications = [];
    this._buildDOM();
    this._bindEvents();
  }

  _buildDOM() {
    this.el.classList.add('acrylic-heavy', 'hidden');
    this._renderContent();
  }

  _renderContent() {
    this.el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:var(--text-md);font-weight:600">Notifications</span>
        <button class="taskbar-btn" id="notif-clear" style="width:28px;height:28px">
          <span class="material-symbols-rounded" style="font-size:16px">delete_sweep</span>
        </button>
      </div>
      <div id="notif-list"></div>
    `;
    this.el.querySelector('#notif-clear').addEventListener('click', () => {
      this.notifications = [];
      this._renderList();
    });
  }

  _renderList() {
    const list = this.el.querySelector('#notif-list');
    if (!this.notifications.length) {
      list.innerHTML = `<div style="text-align:center;padding:32px 0;color:var(--color-outline);font-size:var(--text-sm)">No notifications</div>`;
      return;
    }
    list.innerHTML = '';
    this.notifications.forEach(n => {
      const card = document.createElement('div');
      card.className = 'notification-card';
      card.innerHTML = `
        <div class="notif-icon">
          <span class="material-symbols-rounded">${n.icon || 'notifications'}</span>
        </div>
        <div class="notif-content">
          <div class="notif-title">${n.title}</div>
          <div class="notif-body">${n.body}</div>
          <div class="notif-time">${n.time || 'Just now'}</div>
        </div>
      `;
      list.appendChild(card);
    });
  }

  notify(opts) {
    const now = new Date();
    opts.time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    this.notifications.unshift(opts);
    if (this.notifications.length > 20) this.notifications.pop();
    this._renderList();
    this._showToast(opts);
  }

  _showToast(opts) {
    const toast = document.createElement('div');
    toast.className = 'toast acrylic';
    toast.innerHTML = `<strong>${opts.title}</strong> — ${opts.body}`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.animation = `toastOut var(--dur-slow) var(--ease) forwards`; }, 3000);
    setTimeout(() => toast.remove(), 3600);
  }

  open() {
    this.visible = true;
    this._renderList();
    this.el.classList.remove('hidden');
    this.el.classList.add('visible');
  }

  close() {
    this.visible = false;
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
  }

  toggle() { this.visible ? this.close() : this.open(); }

  _bindEvents() {
    this.bus.on('notifications:toggle', () => this.toggle());
    this.bus.on('notification:show', (opts) => this.notify(opts));
    document.addEventListener('click', (e) => {
      if (this.visible && !e.target.closest('#notification-panel') && !e.target.closest('#taskbar-tray') && !e.target.closest('#taskbar-clock')) {
        this.close();
      }
    });
  }
}
