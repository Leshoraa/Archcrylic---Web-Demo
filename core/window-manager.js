export class WindowManager {
  constructor(container, bus) {
    this.container = container;
    this.bus = bus;
    this.windows = new Map();
    this.zCounter = 100;
    this.windowCounter = 0;
  }

  createWindow(opts) {
    const id = `win-${++this.windowCounter}`;
    const w = opts.width || 700;
    const h = opts.height || 480;
    const x = opts.x ?? (window.innerWidth / 2 - w / 2 + (this.windowCounter % 5) * 30);
    const y = opts.y ?? (window.innerHeight / 2 - h / 2 + (this.windowCounter % 5) * 30);

    const el = document.createElement('div');
    el.className = 'os-window acrylic-heavy focused';
    el.id = id;
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${++this.zCounter}`;

    el.innerHTML = `
      <div class="window-titlebar">
        <div class="window-controls">
          <button class="win-ctrl close" data-action="close"></button>
          <button class="win-ctrl minimize" data-action="minimize"></button>
          <button class="win-ctrl maximize" data-action="maximize"></button>
        </div>
        <div class="window-title">${opts.title || 'Window'}</div>
      </div>
      <div class="window-body"></div>
      <div class="window-resize-handle"></div>
    `;

    this.container.appendChild(el);
    const state = { id, el, appId: opts.appId, maximized: false, prevRect: null, minimized: false };
    this.windows.set(id, state);

    this._setupDrag(state);
    this._setupResize(state);
    this._setupControls(state);
    el.addEventListener('mousedown', () => this.focusWindow(id));
    this.focusWindow(id);
    this.bus.emit('window:created', { id, appId: opts.appId });

    return { id, body: el.querySelector('.window-body'), el };
  }

  closeWindow(id) {
    const state = this.windows.get(id);
    if (!state) return;
    state.el.style.animation = 'windowClose var(--dur-normal) var(--ease) forwards';
    setTimeout(() => {
      state.el.remove();
      this.windows.delete(id);
      this.bus.emit('window:closed', { id, appId: state.appId });
    }, 250);
  }

  minimizeWindow(id) {
    const state = this.windows.get(id);
    if (!state) return;
    state.minimized = true;
    state.el.style.transition = 'transform var(--dur-normal) var(--ease), opacity var(--dur-normal) var(--ease)';
    state.el.style.transform = 'scale(0.8) translateY(40px)';
    state.el.style.opacity = '0';
    state.el.style.pointerEvents = 'none';
    this.bus.emit('window:minimized', { id, appId: state.appId });
  }

  restoreWindow(id) {
    const state = this.windows.get(id);
    if (!state) return;
    state.minimized = false;
    state.el.style.transition = 'transform var(--dur-normal) var(--ease-spring), opacity var(--dur-normal) var(--ease)';
    state.el.style.transform = '';
    state.el.style.opacity = '';
    state.el.style.pointerEvents = '';
    this.focusWindow(id);
  }

  maximizeWindow(id) {
    const state = this.windows.get(id);
    if (!state) return;
    if (state.maximized) {
      const r = state.prevRect;
      state.el.style.transition = 'all var(--dur-normal) var(--ease)';
      state.el.style.left = r.left + 'px';
      state.el.style.top = r.top + 'px';
      state.el.style.width = r.width + 'px';
      state.el.style.height = r.height + 'px';
      state.el.style.borderRadius = 'var(--shape-lg)';
      state.maximized = false;
    } else {
      state.prevRect = {
        left: state.el.offsetLeft, top: state.el.offsetTop,
        width: state.el.offsetWidth, height: state.el.offsetHeight
      };
      state.el.style.transition = 'all var(--dur-normal) var(--ease)';
      state.el.style.left = '4px';
      state.el.style.top = '4px';
      state.el.style.width = (window.innerWidth - 8) + 'px';
      state.el.style.height = (window.innerHeight - 72) + 'px';
      state.el.style.borderRadius = 'var(--shape-md)';
      state.maximized = true;
    }
    setTimeout(() => { state.el.style.transition = ''; }, 300);
  }

  focusWindow(id) {
    this.windows.forEach((s) => s.el.classList.remove('focused'));
    const state = this.windows.get(id);
    if (state) {
      state.el.style.zIndex = ++this.zCounter;
      state.el.classList.add('focused');
      this.bus.emit('window:focused', { id, appId: state.appId });
    }
  }

  getWindowsByApp(appId) {
    return [...this.windows.values()].filter(w => w.appId === appId);
  }

  _setupDrag(state) {
    const titlebar = state.el.querySelector('.window-titlebar');
    let startX, startY, origX, origY;
    const onMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      state.el.style.left = (origX + dx) + 'px';
      state.el.style.top = Math.max(0, origY + dy) + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.win-ctrl')) return;
      if (state.maximized) return;
      startX = e.clientX;
      startY = e.clientY;
      origX = state.el.offsetLeft;
      origY = state.el.offsetTop;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    titlebar.addEventListener('dblclick', () => this.maximizeWindow(state.id));
  }

  _setupResize(state) {
    const handle = state.el.querySelector('.window-resize-handle');
    let startX, startY, origW, origH;
    const onMove = (e) => {
      state.el.style.width = Math.max(420, origW + (e.clientX - startX)) + 'px';
      state.el.style.height = Math.max(300, origH + (e.clientY - startY)) + 'px';
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      startX = e.clientX; startY = e.clientY;
      origW = state.el.offsetWidth; origH = state.el.offsetHeight;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  _setupControls(state) {
    state.el.querySelector('.win-ctrl.close').addEventListener('click', () => this.closeWindow(state.id));
    state.el.querySelector('.win-ctrl.minimize').addEventListener('click', () => this.minimizeWindow(state.id));
    state.el.querySelector('.win-ctrl.maximize').addEventListener('click', () => this.maximizeWindow(state.id));
  }
}
