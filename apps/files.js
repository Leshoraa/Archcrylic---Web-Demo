export const FilesApp = {
  id: 'files',
  name: 'Files',
  icon: 'folder',
  iconColor: '#FFD54F',
  gradient: 'linear-gradient(135deg, #E65100, #FF8F00)',
  pinned: true,

  launch(wm, bus) {
    const { body } = wm.createWindow({ title: 'Files', appId: 'files', width: 720, height: 500 });
    const structure = {
      'Home': [
        { name: 'Desktop', icon: 'desktop_windows', type: 'folder' },
        { name: 'Documents', icon: 'description', type: 'folder' },
        { name: 'Downloads', icon: 'download', type: 'folder' },
        { name: 'Music', icon: 'music_note', type: 'folder' },
        { name: 'Pictures', icon: 'image', type: 'folder' },
        { name: 'Videos', icon: 'movie', type: 'folder' },
      ],
      'Documents': [
        { name: 'readme.md', icon: 'article', type: 'file' },
        { name: 'notes.txt', icon: 'note', type: 'file' },
        { name: 'project.pdf', icon: 'picture_as_pdf', type: 'file' },
      ],
      'Downloads': [
        { name: 'archcrylic-1.0.tar.gz', icon: 'archive', type: 'file' },
        { name: 'wallpaper.png', icon: 'image', type: 'file' },
      ],
      'Pictures': [
        { name: 'screenshot_01.png', icon: 'image', type: 'file' },
        { name: 'photo_01.jpg', icon: 'image', type: 'file' },
        { name: 'avatar.png', icon: 'image', type: 'file' },
      ],
    };

    let currentDir = 'Home';

    const render = () => {
      const sideItems = ['Home', 'Documents', 'Downloads', 'Pictures', 'Music', 'Videos'];
      body.innerHTML = `
        <div class="files-body" style="height:100%">
          <div class="files-sidebar">
            ${sideItems.map(s => `
              <div class="files-sidebar-item ${s === currentDir ? 'active' : ''}" data-dir="${s}">
                <span class="material-symbols-rounded">${s === 'Home' ? 'home' : s === 'Documents' ? 'description' : s === 'Downloads' ? 'download' : s === 'Pictures' ? 'image' : s === 'Music' ? 'music_note' : 'movie'}</span>
                ${s}
              </div>
            `).join('')}
          </div>
          <div class="files-content">
            <div style="margin-bottom:12px;font-size:var(--text-sm);color:var(--color-on-surface-variant)">/${currentDir.toLowerCase()}</div>
            <div class="files-grid">
              ${(structure[currentDir] || []).map(f => `
                <div class="file-item" data-name="${f.name}" data-type="${f.type}">
                  <span class="material-symbols-rounded" style="color:${f.type === 'folder' ? '#FFD54F' : 'var(--color-on-surface-variant)'}">${f.icon}</span>
                  <span>${f.name}</span>
                </div>
              `).join('')}
              ${!(structure[currentDir] || []).length ? '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--color-outline);font-size:var(--text-sm)">Empty folder</div>' : ''}
            </div>
          </div>
        </div>
      `;

      body.querySelectorAll('.files-sidebar-item').forEach(el => {
        el.addEventListener('click', () => { currentDir = el.dataset.dir; render(); });
      });
      body.querySelectorAll('.file-item[data-type="folder"]').forEach(el => {
        el.addEventListener('dblclick', () => { currentDir = el.dataset.name; render(); });
      });
    };

    render();
  }
};
