export const SettingsApp = {
  id: 'settings',
  name: 'Settings',
  icon: 'settings',
  iconColor: '#C9C5D0',
  gradient: 'linear-gradient(135deg, #37474F, #546E7A)',
  pinned: true,

  launch(wm, bus, reniquid) {
    const { body } = wm.createWindow({ title: 'Settings', appId: 'settings', width: 580, height: 480 });
    
    const intensityVal = localStorage.getItem('archcrylic_intensity') || '70';
    const blurValInit = localStorage.getItem('archcrylic_blur') || '0';
    const opacityValInit = localStorage.getItem('archcrylic_opacity') || '45';
    
    const darkmodeOn = localStorage.getItem('archcrylic_darkmode') !== 'false';
    const notifOn = localStorage.getItem('archcrylic_notifications') !== 'false';
    const animOn = localStorage.getItem('archcrylic_animations') !== 'false';

    body.innerHTML = `
      <div class="settings-body">
        <div class="settings-section">
          <div class="settings-section-title">Appearance</div>
          <div class="settings-item">
            <div class="settings-item-label">
              <span class="material-symbols-rounded">dark_mode</span>Dark Mode
            </div>
            <button class="toggle ${darkmodeOn ? 'on' : ''}" id="set-darkmode"></button>
          </div>
          <div class="settings-item">
            <div class="settings-item-label">
              <span class="material-symbols-rounded">wallpaper</span>Change Wallpaper
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <input type="file" id="wallpaper-upload" accept="image/*" style="display:none">
              <button class="taskbar-btn" id="btn-upload-wallpaper" style="width:auto;height:auto;padding:6px 12px;font-size:var(--text-xs);border-radius:var(--shape-sm)">Choose Image</button>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-label">
              <span class="material-symbols-rounded">water_drop</span>ReniQuid Intensity
            </div>
            <div class="slider-container">
              <input type="range" class="slider" id="set-fluid" min="0" max="100" value="${intensityVal}">
              <span id="set-fluid-val" style="font-size:var(--text-sm);color:var(--color-on-surface-variant);min-width:32px">${intensityVal}%</span>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-label">
              <span class="material-symbols-rounded">blur_on</span>Acrylic Blur
            </div>
            <div class="slider-container">
              <input type="range" class="slider" id="set-blur" min="0" max="60" value="${blurValInit}">
              <span id="set-blur-val" style="font-size:var(--text-sm);color:var(--color-on-surface-variant);min-width:32px">${blurValInit}px</span>
            </div>
          </div>
          <div class="settings-item">
            <div class="settings-item-label">
              <span class="material-symbols-rounded">opacity</span>Acrylic Opacity
            </div>
            <div class="slider-container">
              <input type="range" class="slider" id="set-opacity" min="10" max="100" value="${opacityValInit}">
              <span id="set-opacity-val" style="font-size:var(--text-sm);color:var(--color-on-surface-variant);min-width:32px">${opacityValInit}%</span>
            </div>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-section-title">System</div>
          <div class="settings-item">
            <div class="settings-item-label">
              <span class="material-symbols-rounded">notifications</span>Notifications
            </div>
            <button class="toggle ${notifOn ? 'on' : ''}" id="set-notif"></button>
          </div>
          <div class="settings-item">
            <div class="settings-item-label">
              <span class="material-symbols-rounded">animation</span>Animations
            </div>
            <button class="toggle ${animOn ? 'on' : ''}" id="set-anim"></button>
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

    body.querySelector('#set-darkmode').addEventListener('click', (e) => {
      const on = e.currentTarget.classList.contains('on');
      localStorage.setItem('archcrylic_darkmode', on ? 'true' : 'false');
    });

    body.querySelector('#set-notif').addEventListener('click', (e) => {
      const on = e.currentTarget.classList.contains('on');
      localStorage.setItem('archcrylic_notifications', on ? 'true' : 'false');
    });

    body.querySelector('#set-anim').addEventListener('click', (e) => {
      const on = e.currentTarget.classList.contains('on');
      localStorage.setItem('archcrylic_animations', on ? 'true' : 'false');
    });

    const fluidSlider = body.querySelector('#set-fluid');
    const fluidVal = body.querySelector('#set-fluid-val');
    fluidSlider.addEventListener('input', () => {
      const v = parseInt(fluidSlider.value);
      fluidVal.textContent = v + '%';
      if (reniquid) reniquid.setIntensity(v / 100);
      localStorage.setItem('archcrylic_intensity', v);
    });

    const blurSlider = body.querySelector('#set-blur');
    const blurVal = body.querySelector('#set-blur-val');
    blurSlider.addEventListener('input', () => {
      const v = parseInt(blurSlider.value);
      blurVal.textContent = v + 'px';
      document.documentElement.style.setProperty('--acrylic-blur', v + 'px');
      if (reniquid) reniquid.setBlur(v / 60);
      localStorage.setItem('archcrylic_blur', v);
    });

    const opacitySlider = body.querySelector('#set-opacity');
    const opacityVal = body.querySelector('#set-opacity-val');
    opacitySlider.addEventListener('input', () => {
      const v = parseInt(opacitySlider.value);
      opacityVal.textContent = v + '%';
      document.documentElement.style.setProperty('--acrylic-opacity', v / 100);
      localStorage.setItem('archcrylic_opacity', v);
    });

    const wallpaperUpload = body.querySelector('#wallpaper-upload');
    const btnUpload = body.querySelector('#btn-upload-wallpaper');
    if (btnUpload && wallpaperUpload) {
      btnUpload.addEventListener('click', () => wallpaperUpload.click());
      wallpaperUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (reniquid) reniquid.setImage(event.target.result);
            try {
              localStorage.setItem('archcrylic_wallpaper', event.target.result);
            } catch (err) {
              console.error('Wallpaper too large for localStorage:', err);
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }
};
