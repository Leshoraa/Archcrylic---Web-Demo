export class Launcher {
  constructor(container, bus) {
    this.el = container;
    this.bus = bus;
    this.apps = [];
    this.visible = false;
    this._buildDOM();
    this._bindEvents();
  }

  _buildDOM() {
    this.el.classList.add('hidden');
    this.el.innerHTML = `
      <div id="launcher-backdrop"></div>
      <div id="launcher-content">
        <div id="launcher-panel">
          <div id="launcher-search">
            <span class="material-symbols-rounded">search</span>
            <input type="text" placeholder="Search apps..." id="launcher-search-input" autocomplete="off">
          </div>
          <div id="launcher-grid"></div>
        </div>
      </div>
    `;
  }

  registerApp(app) {
    this.apps.push(app);
    this._renderGrid();
  }

  _renderGrid(filter = '') {
    const grid = this.el.querySelector('#launcher-grid');
    grid.innerHTML = '';
    const filtered = this.apps.filter(a => a.name.toLowerCase().includes(filter.toLowerCase()));
    filtered.forEach(app => {
      const el = document.createElement('div');
      el.className = 'launcher-app';
      el.innerHTML = `
        <div class="launcher-app-icon" style="background:${app.gradient || 'linear-gradient(135deg,#5B4BA0,#8B5CF6)'}">
          <span class="material-symbols-rounded">${app.icon}</span>
        </div>
        <div class="launcher-app-name">${app.name}</div>
      `;
      el.addEventListener('click', () => {
        this.bus.emit('app:launch', app.id);
        this.close();
      });
      grid.appendChild(el);
    });
  }

  open() {
    this.visible = true;
    this.el.classList.remove('hidden');
    this.el.classList.add('visible');
    const input = this.el.querySelector('#launcher-search-input');
    input.value = '';
    this._renderGrid();
    setTimeout(() => input.focus(), 100);
  }

  close() {
    this.visible = false;
    this.el.classList.remove('visible');
    this.el.classList.add('hidden');
  }

  toggle() { this.visible ? this.close() : this.open(); }

  _bindEvents() {
    this.el.querySelector('#launcher-backdrop').addEventListener('click', () => this.close());
    this.el.querySelector('#launcher-search-input').addEventListener('input', (e) => {
      this._renderGrid(e.target.value);
    });
    this.bus.on('launcher:toggle', () => this.toggle());
    this.bus.on('launcher:close', () => this.close());
  }
}
