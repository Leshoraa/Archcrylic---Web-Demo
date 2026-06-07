export class Crylbar {
  constructor(container, bus) {
    this.el = container;
    this.bus = bus;
    this.currentWorkspace = 1;
    this.activeAppTitle = 'Desktop';
    this._buildDOM();
    this._startClock();
    this._startSystemStats();
    this._bindEvents();
  }

  _buildDOM() {
    this.el.classList.add('acryrial');
    this.el.innerHTML = `
      <div class="crylbar-module crylbar-left">
        <button class="crylbar-btn" id="tb-launcher" aria-label="Launcher">
          <svg viewBox="0 0 24 24" class="launcher-svg"><path d="M12 3l9 17H3L12 3z M12 9l6 10H6L12 9z" fill="currentColor"></path></svg>
        </button>
        <span class="crylbar-clock" id="clock-time"></span>
      </div>

      <div class="crylbar-module crylbar-center">
        <div class="cryl-workspaces">
          ${[1, 2, 3, 4, 5].map(w => `
            <button class="workspace-btn ${w === 1 ? 'active' : ''}" data-ws="${w}">${w}</button>
          `).join('')}
        </div>
        <div class="cryl-window-title" id="cryl-win-title">Desktop</div>
      </div>

      <div class="crylbar-module crylbar-right">
        <div class="cryl-stats">
          <span class="stat-item"><span class="material-symbols-rounded">memory</span><span id="stat-ram">4.2 GB</span></span>
          <span class="stat-item"><span class="material-symbols-rounded">monitoring</span><span id="stat-cpu">12%</span></span>
        </div>
        <div id="taskbar-tray" class="cryl-tray">
          <span class="material-symbols-rounded tray-icon" id="tray-wifi">wifi</span>
          <span class="material-symbols-rounded tray-icon" id="tray-vol">volume_up</span>
          <span class="material-symbols-rounded tray-icon" id="tray-bat">battery_full</span>
        </div>
      </div>
    `;
  }

  setWindowFocusTitle(title) {
    this.activeAppTitle = title || 'Desktop';
    const titleEl = this.el.querySelector('#cryl-win-title');
    if (titleEl) titleEl.textContent = this.activeAppTitle;
  }

  _startClock() {
    const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const timeEl = this.el.querySelector('#clock-time');
      if (timeEl) timeEl.textContent = `${h}:${m}`;
    };
    update();
    setInterval(update, 2000);
  }

  _startSystemStats() {
    const update = () => {
      const cpu = Math.floor(Math.random() * 20) + 8;
      const ram = (Math.random() * 0.4 + 3.9).toFixed(1);
      const cpuEl = this.el.querySelector('#stat-cpu');
      const ramEl = this.el.querySelector('#stat-ram');
      if (cpuEl) cpuEl.textContent = `${cpu}%`;
      if (ramEl) ramEl.textContent = `${ram} GB`;
    };
    update();
    setInterval(update, 3000);
  }

  _bindEvents() {
    this.el.querySelector('#tb-launcher').addEventListener('click', () => this.bus.emit('launcher:toggle'));
    this.el.querySelector('.cryl-tray').addEventListener('click', () => this.bus.emit('notifications:toggle'));

    const wsButtons = this.el.querySelectorAll('.workspace-btn');
    wsButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const ws = parseInt(btn.dataset.ws);
        this.switchWorkspace(ws);
      });
    });

    this.bus.on('window:focused', ({ title }) => {
      this.setWindowFocusTitle(title);
    });
  }

  switchWorkspace(ws) {
    if (ws === this.currentWorkspace) return;
    this.currentWorkspace = ws;

    const wsButtons = this.el.querySelectorAll('.workspace-btn');
    wsButtons.forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.ws) === ws);
    });

    this.bus.emit('workspace:changed', ws);
  }
}
