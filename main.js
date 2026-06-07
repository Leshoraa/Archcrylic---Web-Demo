import { ReniQuidLayer } from './core/reniquid-layer.js';
import { Shell } from './core/shell.js';
import { Taskbar } from './core/taskbar.js';
import { Launcher } from './core/launcher.js';
import { WindowManager } from './core/window-manager.js';
import { NotificationCenter } from './core/notifications.js';
import { TerminalApp } from './apps/terminal.js';
import { SettingsApp } from './apps/settings.js';
import { FilesApp } from './apps/files.js';

const BrowserApp = {
  id: 'browser', name: 'Browser', icon: 'public',
  iconColor: '#64B5F6', gradient: 'linear-gradient(135deg, #1565C0, #1E88E5)',
  pinned: true,
  launch(wm) {
    const { body } = wm.createWindow({ title: 'Browser', appId: 'browser', width: 800, height: 540 });
    body.innerHTML = `
      <div class="browser-body">
        <div class="browser-navbar">
          <button class="taskbar-btn" style="width:30px;height:30px"><span class="material-symbols-rounded" style="font-size:16px">arrow_back</span></button>
          <button class="taskbar-btn" style="width:30px;height:30px"><span class="material-symbols-rounded" style="font-size:16px">arrow_forward</span></button>
          <button class="taskbar-btn" style="width:30px;height:30px"><span class="material-symbols-rounded" style="font-size:16px">refresh</span></button>
          <div style="flex:1;padding:8px 16px;border-radius:var(--shape-pill);background:rgba(255,255,255,0.06);font-size:var(--text-sm);color:var(--color-on-surface-variant)">archcrylic://home</div>
        </div>
        <div class="browser-content">
          <span class="material-symbols-rounded" style="font-size:64px;color:var(--color-outline-variant)">public</span>
          <div style="font-size:var(--text-lg);font-weight:500;color:var(--color-on-surface-variant)">Archcrylic Browser</div>
          <div style="font-size:var(--text-sm);color:var(--color-outline)">Start exploring the web</div>
        </div>
      </div>
    `;
  }
};

const CalculatorApp = {
  id: 'calculator', name: 'Calculator', icon: 'calculate',
  iconColor: '#F48FB1', gradient: 'linear-gradient(135deg, #880E4F, #C2185B)',
  launch(wm) {
    const { body } = wm.createWindow({ title: 'Calculator', appId: 'calculator', width: 320, height: 440 });
    let display = '0';
    let prev = null;
    let op = null;
    let reset = false;

    const render = () => {
      body.innerHTML = `
        <div style="padding:24px 20px 16px;text-align:right;font-size:var(--text-2xl);font-weight:300;color:var(--color-on-surface);overflow:hidden;text-overflow:ellipsis">${display}</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:8px 12px">
          ${['C','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','0','.','='].map((b,i) => {
            const isOp = ['÷','×','−','+','='].includes(b);
            const isFunc = ['C','±','%'].includes(b);
            const bg = isOp ? 'var(--color-primary)' : isFunc ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)';
            const color = isOp ? 'var(--color-surface)' : 'var(--color-on-surface)';
            const span = (i === 16) ? 'grid-column:span 2;' : '';
            return `<button data-val="${b}" style="${span}padding:16px;border:none;border-radius:var(--shape-md);background:${bg};color:${color};font-family:var(--font-sans);font-size:var(--text-lg);cursor:pointer;transition:filter var(--dur-fast)" onmouseover="this.style.filter='brightness(1.2)'" onmouseout="this.style.filter=''">${b}</button>`;
          }).join('')}
        </div>
      `;
      body.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => handleInput(btn.dataset.val));
      });
    };

    const calc = (a, o, b) => {
      a = parseFloat(a); b = parseFloat(b);
      if (o === '+') return a + b;
      if (o === '−') return a - b;
      if (o === '×') return a * b;
      if (o === '÷') return b !== 0 ? a / b : 'Error';
      return b;
    };

    const handleInput = (v) => {
      if (v >= '0' && v <= '9') {
        if (reset) { display = ''; reset = false; }
        display = display === '0' ? v : display + v;
      } else if (v === '.') {
        if (reset) { display = '0'; reset = false; }
        if (!display.includes('.')) display += '.';
      } else if (v === 'C') { display = '0'; prev = null; op = null; }
      else if (v === '±') { display = String(-parseFloat(display)); }
      else if (v === '%') { display = String(parseFloat(display) / 100); }
      else if (v === '=') {
        if (prev !== null && op) { display = String(calc(prev, op, display)); prev = null; op = null; }
      } else {
        if (prev !== null && op) display = String(calc(prev, op, display));
        prev = display; op = v; reset = true;
      }
      render();
    };
    render();
  }
};

async function boot() {
  const bootScreen = document.getElementById('boot-screen');

  const canvas = document.getElementById('reniquid-canvas');
  const reniquid = new ReniQuidLayer(canvas, 'assets/wallpaper.png');
  reniquid.init();
  reniquid.start();

  const shell = new Shell();
  const bus = shell.bus;

  const taskbar = new Taskbar(document.getElementById('taskbar'), bus);
  const launcher = new Launcher(document.getElementById('launcher'), bus);
  const wm = new WindowManager(document.getElementById('window-container'), bus);
  const notifications = new NotificationCenter(document.getElementById('notification-panel'), bus);

  const allApps = [TerminalApp, SettingsApp, FilesApp, BrowserApp, CalculatorApp];

  allApps.forEach(app => {
    shell.registerApp(app);
    launcher.registerApp(app);
    if (app.pinned) taskbar.addPinnedApp(app);
  });

  bus.on('app:launch', (appId) => {
    const app = allApps.find(a => a.id === appId);
    if (app) app.launch(wm, bus, reniquid);
  });

  bus.on('window:created', ({ appId }) => taskbar.setActive(appId, true));
  bus.on('window:closed', ({ appId }) => {
    if (!wm.getWindowsByApp(appId).length) taskbar.setActive(appId, false);
  });

  shell.boot();

  await new Promise(r => setTimeout(r, 1500));
  bootScreen.classList.add('fade-out');
  setTimeout(() => bootScreen.remove(), 1000);

  setTimeout(() => {
    notifications.notify({
      title: 'Welcome to Archcrylic',
      body: 'Your acrylic desktop environment is ready. Enjoy the fluid experience.',
      icon: 'waving_hand',
      color: 'linear-gradient(135deg, #5B4BA0, #8B5CF6)'
    });
  }, 2500);
}

boot();
