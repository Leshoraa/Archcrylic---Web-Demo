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
          <button class="taskbar-btn" id="br-back" style="width:30px;height:30px"><span class="material-symbols-rounded" style="font-size:16px">arrow_back</span></button>
          <button class="taskbar-btn" id="br-forward" style="width:30px;height:30px"><span class="material-symbols-rounded" style="font-size:16px">arrow_forward</span></button>
          <button class="taskbar-btn" id="br-refresh" style="width:30px;height:30px"><span class="material-symbols-rounded" style="font-size:16px">refresh</span></button>
          <input type="text" class="browser-address-input" id="br-addr" value="archcrylic://home">
        </div>
        <div class="browser-content"></div>
      </div>
    `;

    const btnBack = body.querySelector('#br-back');
    const btnForward = body.querySelector('#br-forward');
    const btnRefresh = body.querySelector('#br-refresh');
    const addrInput = body.querySelector('#br-addr');

    let history = ['archcrylic://home'];
    let historyIndex = 0;

    const renderPage = (url) => {
      const content = body.querySelector('.browser-content');
      btnBack.disabled = historyIndex === 0;
      btnForward.disabled = historyIndex === history.length - 1;
      addrInput.value = url;

      if (url === 'archcrylic://home') {
        content.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:24px;padding:40px">
            <div style="font-size:42px;font-weight:700;color:var(--color-on-surface);letter-spacing:1px">Archcrylic Search</div>
            <div style="width:100%;max-width:500px;position:relative">
              <span class="material-symbols-rounded" style="position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--color-outline)">search</span>
              <input type="text" id="home-search-input" placeholder="Search the web or type a URL..." style="width:100%;padding:14px 16px 14px 48px;border-radius:var(--shape-pill);background:rgba(255,255,255,0.08);border:1px solid var(--acrylic-border);outline:none;font-family:var(--font-sans);font-size:var(--text-base);color:var(--color-on-surface);caret-color:var(--color-primary);transition:background 0.2s">
            </div>
            <div style="display:flex;gap:12px">
              <button class="taskbar-btn" id="home-search-btn" style="width:auto;height:auto;padding:8px 16px;font-size:var(--text-sm);border-radius:var(--shape-md)">Search</button>
              <button class="taskbar-btn" id="home-lucky-btn" style="width:auto;height:auto;padding:8px 16px;font-size:var(--text-sm);border-radius:var(--shape-md)">I'm Feeling Lucky</button>
            </div>
          </div>
        `;
        
        const homeSearchInput = content.querySelector('#home-search-input');
        const searchHandler = () => {
          const query = homeSearchInput.value.trim();
          if (query) handleUrlOrQuery(query);
        };
        homeSearchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') searchHandler();
        });
        content.querySelector('#home-search-btn').addEventListener('click', searchHandler);
        content.querySelector('#home-lucky-btn').addEventListener('click', () => {
          handleUrlOrQuery('reniquid engine');
        });
        return;
      }

      if (url.startsWith('search://')) {
        const query = new URLSearchParams(url.split('?')[1] || '').get('q') || '';
        content.innerHTML = `
          <div style="width:100%;height:100%;display:flex;flex-direction:column;background:rgba(0,0,0,0.18)">
            <div style="padding:16px 24px;border-bottom:1px solid var(--acrylic-border);display:flex;align-items:center;gap:20px">
              <div style="font-size:var(--text-lg);font-weight:600;color:var(--color-primary)">Archcrylic</div>
              <div style="flex:1;max-width:460px;position:relative">
                <input type="text" id="search-bar-input" value="${query}" style="width:100%;padding:8px 16px 8px 36px;border-radius:var(--shape-pill);background:rgba(255,255,255,0.06);border:1px solid var(--acrylic-border);outline:none;font-family:var(--font-sans);font-size:var(--text-sm);color:var(--color-on-surface);caret-color:var(--color-primary)">
                <span class="material-symbols-rounded" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:16px;color:var(--color-outline)">search</span>
              </div>
            </div>
            <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:12px">
              <div class="boot-spinner" style="width:24px;height:24px"></div>
              <div style="font-size:var(--text-sm);color:var(--color-outline)">Fetching search results...</div>
            </div>
          </div>
        `;

        fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`)
          .then(res => res.json())
          .then(data => {
            let resultsHtml = '';
            if (data.AbstractText) {
              resultsHtml += `
                <div style="background:rgba(255,255,255,0.03);border:1px solid var(--acrylic-border);border-radius:var(--shape-md);padding:16px;display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
                  <div style="font-size:var(--text-xs);color:var(--color-outline)">Featured Answer from ${data.AbstractSource || 'Web'}</div>
                  <div class="result-title search-result-item" data-url="${data.AbstractURL}" style="font-size:var(--text-base);font-weight:500;color:var(--color-primary);cursor:pointer">${data.Heading || query}</div>
                  <div style="font-size:var(--text-sm);color:var(--color-on-surface-variant);line-height:1.5">${data.AbstractText}</div>
                </div>
              `;
            }

            const topics = (data.RelatedTopics || []).slice(0, 5).filter(t => t.FirstURL && t.Text);
            if (topics.length > 0) {
              resultsHtml += topics.map(t => {
                const title = t.Text.split(' - ')[0] || query;
                const desc = t.Text;
                return `
                  <div class="search-result-item" data-url="${t.FirstURL}" style="cursor:pointer;display:flex;flex-direction:column;gap:4px">
                    <div style="font-size:var(--text-xs);color:var(--color-outline);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.FirstURL}</div>
                    <div class="result-title" style="font-size:var(--text-base);font-weight:500;color:var(--color-primary);text-decoration:none">${title}</div>
                    <div style="font-size:var(--text-sm);color:var(--color-on-surface-variant);line-height:1.4">${desc}</div>
                  </div>
                `;
              }).join('');
            } else {
              const fallback = [
                {
                  title: `${query} on Wikipedia`,
                  link: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
                  desc: `Read about ${query} on Wikipedia, the free collaborative online encyclopedia.`
                },
                {
                  title: `Search ${query} on GitHub`,
                  link: `https://github.com/search?q=${encodeURIComponent(query)}`,
                  desc: `Explore code, repositories, and developers matching ${query} on GitHub.`
                }
              ];
              resultsHtml += fallback.map(r => `
                <div class="search-result-item" data-url="${r.link}" style="cursor:pointer;display:flex;flex-direction:column;gap:4px">
                  <div style="font-size:var(--text-xs);color:var(--color-outline);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.link}</div>
                  <div class="result-title" style="font-size:var(--text-base);font-weight:500;color:var(--color-primary);text-decoration:none">${r.title}</div>
                  <div style="font-size:var(--text-sm);color:var(--color-on-surface-variant);line-height:1.4">${r.desc}</div>
                </div>
              `).join('');
            }

            content.innerHTML = `
              <div style="width:100%;height:100%;display:flex;flex-direction:column;background:rgba(0,0,0,0.18)">
                <div style="padding:16px 24px;border-bottom:1px solid var(--acrylic-border);display:flex;align-items:center;gap:20px">
                  <div style="font-size:var(--text-lg);font-weight:600;color:var(--color-primary)">Archcrylic</div>
                  <div style="flex:1;max-width:460px;position:relative">
                    <input type="text" id="search-bar-input" value="${query}" style="width:100%;padding:8px 16px 8px 36px;border-radius:var(--shape-pill);background:rgba(255,255,255,0.06);border:1px solid var(--acrylic-border);outline:none;font-family:var(--font-sans);font-size:var(--text-sm);color:var(--color-on-surface);caret-color:var(--color-primary)">
                    <span class="material-symbols-rounded" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:16px;color:var(--color-outline)">search</span>
                  </div>
                </div>
                <div style="flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:20px">
                  <div style="font-size:var(--text-xs);color:var(--color-outline)">Real-world search results for "${query}"</div>
                  ${resultsHtml}
                </div>
              </div>
            `;

            const searchBarInput = content.querySelector('#search-bar-input');
            searchBarInput.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                const q = searchBarInput.value.trim();
                if (q) handleUrlOrQuery(q);
              }
            });

            content.querySelectorAll('.search-result-item').forEach(item => {
              item.addEventListener('click', () => {
                handleUrlOrQuery(item.dataset.url);
              });
              const titleEl = item.querySelector('.result-title');
              if (titleEl) {
                item.addEventListener('mouseenter', () => { titleEl.style.textDecoration = 'underline'; });
                item.addEventListener('mouseleave', () => { titleEl.style.textDecoration = 'none'; });
              }
            });
          })
          .catch(() => {
            content.innerHTML = `
              <div style="padding:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px">
                <span class="material-symbols-rounded" style="font-size:48px;color:var(--color-outline)">error</span>
                <div style="font-size:var(--text-base);font-weight:500">Failed to fetch search results</div>
                <div style="font-size:var(--text-sm);color:var(--color-outline)">Please check your network connection and try again.</div>
              </div>
            `;
          });
        return;
      }

      let siteTitle = 'Website';
      let siteIcon = 'public';
      let siteHtml = '';

      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        siteTitle = 'YouTube';
        siteIcon = 'play_circle';
        
        let videoId = null;
        if (url.includes('v=')) {
          videoId = url.split('v=')[1].split('&')[0];
        } else if (url.includes('embed/')) {
          videoId = url.split('embed/')[1].split('?')[0];
        } else if (url.includes('youtu.be/')) {
          videoId = url.split('youtu.be/')[1].split('?')[0];
        }

        const videos = [
          { id: 'jfKfPfyJRdk', title: 'lofi hip hop radio 📚 - beats to relax/study to', author: 'Lofi Girl', views: '4.2M watching', duration: 'LIVE' },
          { id: 'hQy7BdfS9OI', title: 'How I Customized My Linux Desktop!', author: 'Linux Customizer', views: '320K views', duration: '12:45' },
          { id: '7Ddf1gS139g', title: "Apple Vision Pro Review: Tomorrow's Tech Today", author: 'Marques Brownlee', views: '8.9M views', duration: '28:12' },
          { id: 'aqz-KE-bpKQ', title: 'Big Buck Bunny - HD Open Source Movie', author: 'Blender Foundation', views: '12M views', duration: '10:34' },
          { id: 'RgpXNEvUxMc', title: 'Linux in 100 Seconds', author: 'Fireship', views: '1.2M views', duration: '2:14' },
          { id: 'PQgyW10xD8s', title: 'Arch Linux Installation Guide - The Perfect Setup', author: 'Arch Linux Fan', views: '450K views', duration: '18:50' }
        ];

        if (videoId) {
          const currentVideo = videos.find(v => v.id === videoId) || { title: 'Playing Video', author: 'YouTube Creator', views: 'Unknown views' };
          const otherVideos = videos.filter(v => v.id !== videoId);

          siteHtml = `
            <div style="display:flex;height:100%;background:#0f0f0f;color:#fff;overflow:hidden">
              <div style="flex:1;display:flex;flex-direction:column;padding:16px;overflow-y:auto;gap:12px">
                <div style="position:relative;width:100%;padding-top:56.25%;background:#000;border-radius:12px;overflow:hidden">
                  <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allow="autoplay; encrypted-media" allowfullscreen></iframe>
                </div>
                <div style="font-size:var(--text-lg);font-weight:600;line-height:1.4">${currentVideo.title}</div>
                <div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:12px">
                  <div style="width:36px;height:36px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;font-weight:600">${currentVideo.author[0]}</div>
                  <div>
                    <div style="font-size:var(--text-sm);font-weight:500">${currentVideo.author}</div>
                    <div style="font-size:var(--text-xs);color:#aaa">${currentVideo.views}</div>
                  </div>
                </div>
              </div>
              <div style="width:280px;border-left:1px solid rgba(255,255,255,0.1);padding:16px;display:flex;flex-direction:column;gap:12px;overflow-y:auto">
                <div style="font-size:var(--text-sm);font-weight:600;color:#aaa">Up Next</div>
                ${otherVideos.map(v => `
                  <div class="yt-sidebar-card" data-id="${v.id}" style="cursor:pointer;display:flex;gap:8px">
                    <img src="https://img.youtube.com/vi/${v.id}/mqdefault.jpg" style="width:100px;height:56px;border-radius:6px;object-fit:cover">
                    <div style="flex:1;min-width:0">
                      <div class="yt-title" style="font-size:var(--text-xs);font-weight:500;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.2;margin-bottom:2px">${v.title}</div>
                      <div style="font-size:10px;color:#aaa">${v.author}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        } else {
          siteHtml = `
            <div style="display:flex;flex-direction:column;height:100%;background:#0f0f0f;color:#fff;overflow-y:auto">
              <div style="padding:16px 24px;border-bottom:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:space-between">
                <div style="display:flex;align-items:center;gap:8px">
                  <span class="material-symbols-rounded" style="color:#ff0000;font-size:28px">play_circle</span>
                  <span style="font-size:var(--text-md);font-weight:600;letter-spacing:-0.5px">YouTube</span>
                </div>
                <div style="max-width:320px;width:100%;position:relative">
                  <input type="text" id="yt-search-input" placeholder="Search YouTube..." style="width:100%;padding:6px 12px;border-radius:var(--shape-pill);background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);color:#fff;outline:none;font-size:var(--text-xs)">
                </div>
              </div>
              <div style="padding:20px 24px;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px">
                ${videos.map(v => `
                  <div class="yt-video-card" data-id="${v.id}" style="cursor:pointer;display:flex;flex-direction:column;gap:8px">
                    <div style="position:relative;width:100%;padding-top:56.25%;border-radius:8px;overflow:hidden;background:#222">
                      <img src="https://img.youtube.com/vi/${v.id}/mqdefault.jpg" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover">
                      <span style="position:absolute;bottom:6px;right:6px;background:rgba(0,0,0,0.8);padding:2px 4px;border-radius:4px;font-size:10px;font-weight:500">${v.duration}</span>
                    </div>
                    <div style="display:flex;gap:10px">
                      <div style="width:32px;height:32px;border-radius:50%;background:#333;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0">${v.author[0]}</div>
                      <div style="flex:1">
                        <div class="yt-title" style="font-size:var(--text-xs);font-weight:500;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:2px">${v.title}</div>
                        <div style="font-size:10px;color:#aaa">${v.author}</div>
                        <div style="font-size:10px;color:#aaa">${v.views}</div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }

        setTimeout(() => {
          const content = body.querySelector('.browser-content');
          content.querySelectorAll('.yt-video-card, .yt-sidebar-card').forEach(card => {
            card.addEventListener('click', () => {
              handleUrlOrQuery(`https://www.youtube.com/watch?v=${card.dataset.id}`);
            });
            const titleEl = card.querySelector('.yt-title');
            card.addEventListener('mouseenter', () => { if(titleEl) titleEl.style.color = '#ff0000'; });
            card.addEventListener('mouseleave', () => { if(titleEl) titleEl.style.color = '#fff'; });
          });

          const ytSearch = content.querySelector('#yt-search-input');
          if (ytSearch) {
            ytSearch.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                const q = ytSearch.value.trim();
                if (q) handleUrlOrQuery(q);
              }
            });
          }
        }, 50);
      } else if (url.includes('wikipedia.org')) {
        siteTitle = 'Wikipedia';
        siteIcon = 'menu_book';
        siteHtml = `
          <div style="padding:32px 40px;display:flex;flex-direction:column;gap:16px;max-width:720px;margin:0 auto">
            <h1 style="font-size:32px;font-weight:300;border-bottom:1px solid var(--acrylic-border);padding-bottom:8px">${decodeURIComponent(url.split('/').pop() || 'Query')}</h1>
            <p style="font-size:var(--text-base);line-height:1.6;color:var(--color-on-surface-variant)">From Wikipedia, the free encyclopedia.</p>
            <p style="font-size:var(--text-base);line-height:1.6">This is a simulated entry on the Wikipedia encyclopedia. In a real-world scenario, the browser app would fetch this information live from the API. However, due to cross-origin resource sharing (CORS) security guidelines and X-Frame-Options constraints, embedding modern interactive sites in frame containers is restricted.</p>
            <p style="font-size:var(--text-base);line-height:1.6">Wikipedia is hosted by the Wikimedia Foundation, a non-profit organization that also hosts a range of other projects.</p>
          </div>
        `;
      } else if (url.includes('github.com')) {
        siteTitle = 'GitHub - hyprlan/Archcrylic';
        siteIcon = 'code';
        siteHtml = `
          <div style="padding:24px 32px;display:flex;flex-direction:column;gap:20px;height:100%;overflow-y:auto">
            <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--acrylic-border);padding-bottom:16px">
              <div style="display:flex;align-items:center;gap:12px">
                <span class="material-symbols-rounded" style="font-size:28px">code</span>
                <span style="font-size:var(--text-lg);font-weight:600">hyprlan / Archcrylic</span>
                <span style="font-size:var(--text-xs);padding:2px 8px;border-radius:var(--shape-pill);background:rgba(255,255,255,0.08);border:1px solid var(--acrylic-border)">Public</span>
              </div>
              <div style="display:flex;gap:8px">
                <button class="taskbar-btn" style="width:auto;height:auto;padding:6px 12px;font-size:var(--text-xs);border-radius:var(--shape-sm);display:flex;align-items:center;gap:4px"><span class="material-symbols-rounded" style="font-size:14px">star</span> Star <span style="background:rgba(255,255,255,0.12);padding:0 6px;border-radius:4px">42</span></button>
              </div>
            </div>
            <div style="background:rgba(255,255,255,0.03);border:1px solid var(--acrylic-border);border-radius:var(--shape-md);padding:20px">
              <h2 style="font-size:var(--text-base);font-weight:600;margin-bottom:8px">README.md</h2>
              <div style="font-size:var(--text-sm);line-height:1.6;color:var(--color-on-surface-variant)">
                <h3>Archcrylic OS</h3>
                <p style="margin-top:6px">An acrylic desktop environment concept with real-time fluid simulation and refraction drawing. Built using pure WebGL 2.0 shaders and custom HTML/CSS frameworks.</p>
              </div>
            </div>
          </div>
        `;
      } else if (url.includes('reniquid.org')) {
        siteTitle = 'ReniQuid Engine';
        siteIcon = 'water_drop';
        siteHtml = `
          <div style="padding:32px 40px;display:flex;flex-direction:column;gap:16px;max-width:720px;margin:0 auto">
            <h1 style="font-size:32px;font-weight:700;color:var(--color-primary)">ReniQuid Fluid Simulation</h1>
            <p style="font-size:var(--text-base);line-height:1.6">The core engine powering Archcrylic OS background blur and glass refraction.</p>
            <div style="background:rgba(196,181,253,0.08);border:1px solid var(--color-primary);border-radius:var(--shape-md);padding:16px">
              <strong>Engine Specifications:</strong><br>
              - Renderer: WebGL 2.0 with custom frag shaders<br>
              - Physics: Real-time 2D Navier-Stokes solver<br>
              - Blur Algorithm: Dual-pass kawase blur with dynamic scaling
            </div>
          </div>
        `;
      } else {
        siteTitle = url.replace('https://', '').replace('http://', '').split('/')[0];
        siteHtml = `
          <div style="padding:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px">
            <span class="material-symbols-rounded" style="font-size:48px;color:var(--color-outline)">public</span>
            <div style="font-size:var(--text-base);font-weight:500">${siteTitle}</div>
            <div style="font-size:var(--text-sm);color:var(--color-on-surface-variant);max-width:400px;text-align:center;line-height:1.5">You are visiting a mock portal for <strong>${url}</strong>. X-Frame-Options prevent loading the live page, but you can search and browse simulated links.</div>
          </div>
        `;
      }

      content.innerHTML = `
        <div style="width:100%;height:100%;display:flex;flex-direction:column;background:var(--color-surface-container)">
          <div style="padding:10px 24px;background:rgba(255,255,255,0.02);border-bottom:1px solid var(--acrylic-border);display:flex;align-items:center;gap:10px">
            <span class="material-symbols-rounded" style="font-size:18px;color:var(--color-primary)">${siteIcon}</span>
            <span style="font-size:var(--text-xs);font-weight:500;color:var(--color-on-surface-variant)">${siteTitle}</span>
          </div>
          <div style="flex:1;overflow-y:auto">
            ${siteHtml}
          </div>
        </div>
      `;
    };

    const handleUrlOrQuery = (inputStr) => {
      let destUrl = '';
      const trimmed = inputStr.trim();
      if (!trimmed) return;

      const isUrl = trimmed.startsWith('http://') || 
                    trimmed.startsWith('https://') || 
                    trimmed.startsWith('archcrylic://') ||
                    /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/\S*)?$/.test(trimmed);

      if (isUrl) {
        destUrl = trimmed;
        if (!destUrl.includes('://')) {
          destUrl = 'https://' + destUrl;
        }
      } else {
        destUrl = `search://?q=${encodeURIComponent(trimmed)}`;
      }

      if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
      }
      history.push(destUrl);
      historyIndex = history.length - 1;

      const content = body.querySelector('.browser-content');
      content.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px">
          <div class="boot-spinner" style="width:32px;height:32px"></div>
          <div style="font-size:var(--text-sm);color:var(--color-outline)">Loading page...</div>
        </div>
      `;

      setTimeout(() => {
        renderPage(destUrl);
      }, 500);
    };

    btnBack.addEventListener('click', () => {
      if (historyIndex > 0) {
        historyIndex--;
        renderPage(history[historyIndex]);
      }
    });

    btnForward.addEventListener('click', () => {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        renderPage(history[historyIndex]);
      }
    });

    btnRefresh.addEventListener('click', () => {
      renderPage(history[historyIndex]);
    });

    addrInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleUrlOrQuery(addrInput.value);
      }
    });

    renderPage(history[historyIndex]);
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
