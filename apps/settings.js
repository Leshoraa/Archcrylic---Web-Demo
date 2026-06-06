export const SettingsApp = {
  id: 'settings',
  name: 'Settings',
  icon: 'settings',
  iconColor: '#C9C5D0',
  gradient: 'linear-gradient(135deg, #37474F, #546E7A)',
  pinned: true,

  launch(wm, bus, reniquid) {
    const { body } = wm.createWindow({ title: 'Settings', appId: 'settings', width: 580, height: 480 });
    body.innerHTML = `
      <div class="settings-body">
        <div class="settings-section">
          <div class="settings-section-title">Appearance</div>
          <div class="settings-item">
            <div class="settings-item-label">
              <span class="material-symbols-rounded">dark_mode</span>Dark Mode
            </div>
            <button class="toggle on" id="set-darkmode"></button>
          </div>
          <div class="settings-item">
            <div class="settings-item-label">
              <span class="material-symbols-rounded">water_drop</span>ReniQuid Intensity
            </div>
            <div class="slider-container">
              <input type="range" class="slider" id="set-fluid" min="0" max="100" value="70">
              <span id="set-fluid-val" style="font-size:var(--text-sm);color:var(--color-on-surface-variant);min-width:32px">70%</span>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-label">
              <span class="material-symbols-rounded">blur_on</span>Acrylic Blur
            </div>
            <div class="slider-container">
              <input type="range" class="slider" id="set-blur" min="0" max="60" value="24">
              <span id="set-blur-val" style="font-size:var(--text-sm);color:var(--color-on-surface-variant);min-width:32px">24px</span>
            </div>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">System</div>
          <div class="settings-item">
            <div class="settings-item-label">
              <span class="material-symbols-rounded">notifications</span>Notifications
            </div>
            <button class="toggle on" id="set-notif"></button>
          </div>
          <div class="settings-item">
            <div class="settings-item-label">
              <span class="material-symbols-rounded">animation</span>Animations
            </div>
            <button class="toggle on" id="set-anim"></button>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">About</div>
          <div class="settings-item" style="flex-direction:column;align-items:flex-start;gap:8px">
            <div style="font-size:var(--text-lg);font-weight:600;color:var(--color-primary)">Archcrylic OS</div>
            <div style="font-size:var(--text-sm);color:var(--color-on-surface-variant);line-height:1.6">
              Version 1.0.0<br>
              Engine: ReniQuid WebGL 2.0 Fluid<br>
              Design: Acrylic + Material You (Pixel Shapes)<br>
              Built with vanilla HTML/CSS/JS
            </div>
          </div>
        </div>
      </div>
    `;

    body.querySelectorAll('.toggle').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('on'));
    });

    const fluidSlider = body.querySelector('#set-fluid');
    const fluidVal = body.querySelector('#set-fluid-val');
    fluidSlider.addEventListener('input', () => {
      const v = parseInt(fluidSlider.value);
      fluidVal.textContent = v + '%';
      if (reniquid) reniquid.setIntensity(v / 100);
    });

    const blurSlider = body.querySelector('#set-blur');
    const blurVal = body.querySelector('#set-blur-val');
    blurSlider.addEventListener('input', () => {
      const v = parseInt(blurSlider.value);
      blurVal.textContent = v + 'px';
      document.documentElement.style.setProperty('--acrylic-blur', v + 'px');
    });
  }
};
