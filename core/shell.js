export class EventBus {
  constructor() { this._handlers = {}; }
  on(event, cb) { (this._handlers[event] ||= []).push(cb); }
  off(event, cb) { if (this._handlers[event]) this._handlers[event] = this._handlers[event].filter(h => h !== cb); }
  emit(event, data) { (this._handlers[event] || []).forEach(cb => cb(data)); }
}

export class Shell {
  constructor() {
    this.bus = new EventBus();
    this.apps = [];
  }

  registerApp(config) {
    this.apps.push(config);
    this.bus.emit('app:registered', config);
  }

  getApps() { return this.apps; }

  boot() {
    this._setupContextMenu();
    this._setupKeyboard();
    this.bus.emit('shell:ready');
  }

  _setupContextMenu() {
    const menu = document.getElementById('context-menu');
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const isDesktop = e.target.id === 'desktop' || e.target.closest('#desktop');
      if (!isDesktop) { menu.classList.add('hidden'); return; }
      menu.innerHTML = '';
      const items = [
        { icon: 'refresh', label: 'Refresh', action: () => this.bus.emit('desktop:refresh') },
        { divider: true },
        { icon: 'wallpaper', label: 'Change Wallpaper', action: () => this.bus.emit('app:launch', 'settings') },
        { icon: 'display_settings', label: 'Display Settings', action: () => this.bus.emit('app:launch', 'settings') },
        { divider: true },
        { icon: 'terminal', label: 'Open Terminal', action: () => this.bus.emit('app:launch', 'terminal') },
        { icon: 'info', label: 'About Archcrylic', action: () => this.bus.emit('notification:show', {
          title: 'Archcrylic OS', body: 'Version 1.0 — Acrylic Desktop Environment', icon: 'info', color: '#C4B5FD'
        })}
      ];
      items.forEach(item => {
        if (item.divider) { menu.insertAdjacentHTML('beforeend', '<div class="ctx-divider"></div>'); return; }
        const el = document.createElement('div');
        el.className = 'ctx-item';
        el.innerHTML = `<span class="material-symbols-rounded">${item.icon}</span>${item.label}`;
        el.addEventListener('click', () => { item.action(); menu.classList.add('hidden'); });
        menu.appendChild(el);
      });
      menu.style.left = Math.min(e.clientX, window.innerWidth - 220) + 'px';
      menu.style.top = Math.min(e.clientY, window.innerHeight - menu.offsetHeight - 10) + 'px';
      menu.classList.remove('hidden');
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#context-menu')) menu.classList.add('hidden');
    });
  }

  _setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Meta' || e.key === 'Super_L') {
        e.preventDefault();
        this.bus.emit('launcher:toggle');
      }
      if (e.key === 'Escape') this.bus.emit('launcher:close');
    });
  }
}
