export const TerminalApp = {
  id: 'terminal',
  name: 'Terminal',
  icon: 'terminal',
  iconColor: '#A5D6A7',
  gradient: 'linear-gradient(135deg, #1B5E20, #388E3C)',
  pinned: true,

  launch(wm, bus) {
    const { body } = wm.createWindow({ title: 'Terminal', appId: 'terminal', width: 680, height: 420 });
    body.style.background = 'rgba(8,8,14,0.92)';
    body.style.backdropFilter = 'none';
    body.innerHTML = '<div class="terminal-body" id="term-output"></div>';
    const output = body.querySelector('#term-output');
    const history = [];
    let histIdx = -1;

    const commands = {
      help: () => 'Available commands: help, clear, echo, neofetch, date, whoami, uname, ls, pwd, archcrylic',
      clear: () => { output.innerHTML = ''; addPrompt(); return null; },
      echo: (args) => args.join(' '),
      neofetch: () => `\n  ╭─────────────────────────╮\n  │     ▄▀▀▀▄   ▄▀▀▀▄     │\n  │    █░▀░▀░█ █░▀░▀░█    │\n  │     ▀▄▄▄▀   ▀▄▄▄▀     │\n  ╰─────────────────────────╯\n  OS:       Archcrylic 1.0\n  Kernel:   WebGL 2.0\n  Shell:    Archcrylic Shell\n  WM:       Archcrylic WM\n  Engine:   ReniQuid Fluid\n  Theme:    Acrylic Dark\n  Font:     Outfit / JetBrains Mono\n  Uptime:   ${Math.floor(performance.now() / 1000)}s`,
      date: () => new Date().toString(),
      whoami: () => 'hyura',
      uname: () => 'Archcrylic 1.0.0 WebGL2 x86_64',
      ls: () => 'Desktop  Documents  Downloads  Music  Pictures  Videos',
      pwd: () => '/home/hyura',
      archcrylic: () => 'Archcrylic OS — Acrylic Desktop Environment powered by ReniQuid Engine',
    };

    const addLine = (html) => { output.insertAdjacentHTML('beforeend', html); };
    const addPrompt = () => {
      const line = document.createElement('div');
      line.className = 'terminal-input-line';
      line.innerHTML = `<span class="prompt">hyura@archcrylic:~$&nbsp;</span><input class="terminal-input" type="text" autofocus>`;
      output.appendChild(line);
      const input = line.querySelector('.terminal-input');
      input.focus();
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = input.value.trim();
          input.disabled = true;
          if (val) {
            history.unshift(val);
            histIdx = -1;
            const parts = val.split(/\s+/);
            const cmd = parts[0];
            const args = parts.slice(1);
            if (commands[cmd]) {
              const result = commands[cmd](args);
              if (result !== null && result !== undefined) addLine(`<div class="cmd-output">${result}</div>`);
            } else {
              addLine(`<div class="cmd-output" style="color:var(--color-error)">command not found: ${cmd}</div>`);
            }
          }
          if (commands[val] !== commands.clear || !val) addPrompt();
          output.scrollTop = output.scrollHeight;
        }
        if (e.key === 'ArrowUp') { e.preventDefault(); histIdx = Math.min(histIdx + 1, history.length - 1); if (history[histIdx]) input.value = history[histIdx]; }
        if (e.key === 'ArrowDown') { e.preventDefault(); histIdx = Math.max(histIdx - 1, -1); input.value = histIdx < 0 ? '' : history[histIdx]; }
      });
      output.scrollTop = output.scrollHeight;
    };

    addLine('<div class="cmd-output" style="color:var(--color-primary)">Archcrylic Terminal v1.0\nType "help" for available commands.\n</div>');
    addPrompt();
    body.addEventListener('click', () => { const i = body.querySelector('.terminal-input:not([disabled])'); if (i) i.focus(); });
  }
};
