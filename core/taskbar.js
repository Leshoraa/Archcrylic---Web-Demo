export class Taskbar {
  constructor(container, bus) {
    this.el = container;
    this.bus = bus;
    this._buildDOM();
    this._startClock();
    this._bindEvents();
  }

  _buildDOM() {
    this.el.classList.add('acrylic');
    this.el.innerHTML = `
      <button class="taskbar-btn" id="tb-launcher"><span class="material-symbols-rounded">apps</span></button>
      <div class="taskbar-divider"></div>
      <div id="taskbar-pinned"></div>
      <div style="flex:1"></div>
      <div class="taskbar-divider"></div>
      <div id="taskbar-tray">
        <span class="material-symbols-rounded tray-icon" id="tray-wifi">wifi</span>
        <span class="material-symbols-rounded tray-icon" id="tray-vol">volume_up</span>
        <span class="material-symbols-rounded tray-icon" id="tray-bat">battery_full</span>
      </div>
      <div id="taskbar-clock">
        <span id="clock-time"></span>
        <span id="clock-date"></span>
      </div>
    `;
  }

  addPinnedApp(app) {
    const pinned = this.el.querySelector('#taskbar-pinned');
    const btn = document.createElement('button');
    btn.className = 'pinned-app';
    btn.dataset.appId = app.id;
    btn.innerHTML = `<span class="material-symbols-rounded" style="color:${app.iconColor || '#fff'}">${app.icon}</span>`;
    btn.addEventListener('click', () => this.bus.emit('app:launch', app.id));
    pinned.appendChild(btn);
  }

  setActive(appId, active) {
    const btn = this.el.querySelector(`.pinned-app[data-app-id="${appId}"]`);
    if (btn) btn.classList.toggle('active', active);
  }

  _startClock() {
    const update = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      this.el.querySelector('#clock-time').textContent = `${h}:${m}`;
      this.el.querySelector('#clock-date').textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
    };
    update();
    setInterval(update, 10000);
  }

  _bindEvents() {
    this.el.querySelector('#tb-launcher').addEventListener('click', () => this.bus.emit('launcher:toggle'));
    this.el.querySelector('#taskbar-clock').addEventListener('click', () => this.bus.emit('notifications:toggle'));
    this.el.querySelector('#taskbar-tray').addEventListener('click', () => this.bus.emit('notifications:toggle'));
  }
}
