const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true });

if (!gl) throw new Error("WebGL 2.0 not supported");

const vertexShaderSource = `#version 300 es
in vec2 a_position;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec3 u_win_pos[5];
uniform vec3 u_win_size[5];
uniform float u_win_active[5];
uniform sampler2D u_tex;
uniform vec2 u_texRes;
uniform float u_time;
uniform float u_freeze;
uniform float u_ior;
uniform float u_surface_noise;

out vec4 fragColor;

float hash(float n) { return fract(sin(n) * 1e4); }

float noise(vec3 x) {
    const vec3 step = vec3(110, 241, 171);
    vec3 i = floor(x);
    vec3 f = fract(x);
    float n = dot(i, step);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(n + dot(step, vec3(0, 0, 0))), hash(n + dot(step, vec3(1, 0, 0))), u.x),
                   mix(hash(n + dot(step, vec3(0, 1, 0))), hash(n + dot(step, vec3(1, 1, 0))), u.x), u.y),
               mix(mix(hash(n + dot(step, vec3(0, 0, 1))), hash(n + dot(step, vec3(1, 0, 1))), u.x),
                   mix(hash(n + dot(step, vec3(0, 1, 1))), hash(n + dot(step, vec3(1, 1, 1))), u.x), u.y), u.z);
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float sdRoundBox(vec3 p, vec3 center, vec3 size, float r) {
    vec3 q = abs(p - center) - size + r;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

vec2 map(vec3 p) {
    float surfaceNoise = noise(p * 2.0 + u_time * 0.5) * u_surface_noise;
    vec2 d = vec2(1000.0, 0.0);
    
    for(int i = 0; i < 5; i++) {
        if (u_win_active[i] > 0.5) {
            float dWin = sdRoundBox(p, u_win_pos[i], u_win_size[i], 0.05) + surfaceNoise;
            float matId = 1.0;
            if (d.x > 900.0) {
                d = vec2(dWin, matId);
            } else {
                float k = mix(0.42, 0.06, u_freeze);
                float h = clamp(0.5 + 0.5 * (dWin - d.x) / k, 0.0, 1.0);
                float dist = mix(dWin, d.x, h) - k * h * (1.0 - h);
                float blendedMat = mix(matId, d.y, h);
                d = vec2(dist, blendedMat);
            }
        }
    }
    return d;
}

vec3 calcNormal(vec3 p) {
    const vec2 e = vec2(1.0, -1.0) * 0.0005;
    return normalize(
        e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x +
        e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x
    );
}

vec2 getCoverUV(vec2 fragCoord, vec2 resolution, vec2 texResolution) {
    float rs = resolution.x / resolution.y;
    float ri = texResolution.x / texResolution.y;
    vec2 newSize = rs < ri ? vec2(texResolution.x * resolution.y / texResolution.y, resolution.y) 
                           : vec2(resolution.x, texResolution.y * resolution.x / texResolution.x);
    vec2 offset = (rs < ri ? vec2((newSize.x - resolution.x) / 2.0, 0.0) 
                           : vec2(0.0, (newSize.y - resolution.y) / 2.0)) / newSize;
    return (fragCoord / resolution) * (resolution / newSize) + offset;
}


vec3 calcRefraction(vec3 rd, vec3 n, vec2 fragCoord, vec2 resolution, vec2 texRes) {
    vec3 ref = refract(rd, n, 1.0 / u_ior);
    
    float strength = 0.006 * resolution.y; 
    float blur = 0.022 * resolution.y; 
    
    float randomAngle = hash(fragCoord.x * 0.15 + fragCoord.y * 0.23) * 6.2831853;
    float cosA = cos(randomAngle);
    float sinA = sin(randomAngle);
    mat2 rot = mat2(cosA, -sinA, sinA, cosA);
    
    float rs = resolution.x / resolution.y;
    float ri = texRes.x / texRes.y;
    vec2 newSize = rs < ri ? vec2(texRes.x * resolution.y / texRes.y, resolution.y) 
                           : vec2(resolution.x, texRes.y * resolution.x / texRes.x);
    vec2 uvScale = 1.0 / newSize;
    vec2 uvOffset = (rs < ri ? vec2((newSize.x - resolution.x) / 2.0, 0.0) 
                             : vec2(0.0, (newSize.y - resolution.y) / 2.0)) / newSize;
    
    vec2 baseCoord = fragCoord + (ref.xy - rd.xy) * strength;
    vec3 col = vec3(0.0);
    
    vec2 offsets[16];
    offsets[0] = vec2(0.0, 0.0);
    offsets[1] = rot * vec2(0.08, 0.25);
    offsets[2] = rot * vec2(-0.21, 0.18);
    offsets[3] = rot * vec2(0.18, -0.32);
    offsets[4] = rot * vec2(-0.12, -0.45);
    offsets[5] = rot * vec2(0.42, 0.18);
    offsets[6] = rot * vec2(-0.35, -0.35);
    offsets[7] = rot * vec2(0.28, 0.52);
    offsets[8] = rot * vec2(-0.55, 0.25);
    offsets[9] = rot * vec2(0.12, -0.68);
    offsets[10] = rot * vec2(-0.38, -0.62);
    offsets[11] = rot * vec2(0.68, 0.35);
    offsets[12] = rot * vec2(-0.62, -0.48);
    offsets[13] = rot * vec2(0.48, 0.78);
    offsets[14] = rot * vec2(-0.78, 0.28);
    offsets[15] = rot * vec2(0.22, -0.92);
    
    for(int i = 0; i < 16; i++) {
        vec2 coord = baseCoord + offsets[i] * blur;
        col += texture(u_tex, coord * uvScale + uvOffset).rgb;
    }
    
    return col / 16.0;
}

void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 uv = (fragCoord - 0.5 * u_resolution.xy) / u_resolution.y;
    vec3 ro = vec3(0.0, 0.0, 3.0);
    vec3 rd = normalize(vec3(uv, -1.0));
    vec3 shadowPos = vec3((uv + vec2(0.0, 0.05)) * 3.0, 0.0); 
    float shadowAlpha = mix(0.82, 1.0, smoothstep(0.0, 0.28, map(shadowPos).x));
    float t = 0.0;
    float maxD = 10.0;
    vec3 p;
    
    for(int i = 0; i < 32; i++) {
        p = ro + rd * t;
        float d = map(p).x;
        if(d < 0.001 || t > maxD) break;
        t += d;
    }
    
    vec2 texRes = u_texRes.x > 0.0 ? u_texRes : vec2(1.0);
    vec3 col = texture(u_tex, getCoverUV(fragCoord, u_resolution.xy, texRes)).rgb * shadowAlpha; 
    
    if(t < maxD) {
        vec3 n = calcNormal(p);
        vec3 l = normalize(vec3(1.2, 1.6, 2.0)); 
        vec3 refrCol = calcRefraction(rd, n, fragCoord, u_resolution.xy, texRes);
        float edge = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
        
        float matId = map(p).y;
        vec3 localBg = texture(u_tex, getCoverUV(fragCoord, u_resolution.xy, texRes)).rgb;
        vec3 darkTint = max(localBg, vec3(0.2, 0.18, 0.22)) * 0.32;
        vec3 darkWater = refrCol * 0.4 + darkTint * 0.6;
        vec3 colTint = mix(refrCol, darkWater, matId);
        
        col = mix(colTint, vec3(0.85, 0.9, 0.95), edge * 0.22);
        col += vec3(1.0) * pow(max(dot(n, normalize(-rd + l)), 0.0), 600.0) * 1.6;
    }
    
    fragColor = vec4(col, 1.0);
}`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

const positionLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

const uResolutionLoc = gl.getUniformLocation(program, "u_resolution");
const uWinPosLoc = gl.getUniformLocation(program, "u_win_pos");
const uWinSizeLoc = gl.getUniformLocation(program, "u_win_size");
const uWinActiveLoc = gl.getUniformLocation(program, "u_win_active");
const uTexLoc = gl.getUniformLocation(program, "u_tex");
const uTexResLoc = gl.getUniformLocation(program, "u_texRes");
const uTimeLoc = gl.getUniformLocation(program, "u_time");
const uFreezeLoc = gl.getUniformLocation(program, "u_freeze");
const uIorLoc = gl.getUniformLocation(program, "u_ior");
const uSurfaceNoiseLoc = gl.getUniformLocation(program, "u_surface_noise");

const bgTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, bgTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

const bgImage = new Image();
bgImage.src = 'bg.jpg';
let imageLoaded = false;
bgImage.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bgImage);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    imageLoaded = true;
};

function resize() {
    const dpr = Math.min(window.devicePixelRatio, 1.0);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

const layoutSelectors = ['.top-bar', '#top-bar-dropdown', '#win-monitor', '#win-control', '#win-terminal'];
const winPosData = new Float32Array(5 * 3);
const winSizeData = new Float32Array(5 * 3);
const winActiveData = new Float32Array(5);

let lastTime = performance.now();
let shaderFreezeVal = 0.0;
let targetFreezeVal = 0.0;
let shaderIorVal = 1.33;
let shaderNoiseVal = 0.02;

function render(time) {
    let now = performance.now();
    let dt = (now - lastTime) / 1000.0;
    lastTime = now;

    shaderFreezeVal += (targetFreezeVal - shaderFreezeVal) * 5.0 * dt;
    if (Math.abs(shaderFreezeVal - targetFreezeVal) < 0.001) {
        shaderFreezeVal = targetFreezeVal;
    }

    for (let i = 0; i < 5; i++) {
        const el = document.querySelector(layoutSelectors[i]);
        if (el) {
            let isVisible = true;
            if (layoutSelectors[i] === '#top-bar-dropdown') {
                const topBar = document.querySelector('.top-bar');
                isVisible = topBar && topBar.matches(':hover');
            } else if (layoutSelectors[i].startsWith('#')) {
                isVisible = el.classList.contains('visible') && !el.classList.contains('minimized');
            }

            if (isVisible) {
                winActiveData[i] = 1.0;
                const rect = el.getBoundingClientRect();
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;

                winPosData[i * 3] = ((cx - 0.5 * window.innerWidth) / window.innerHeight) * 3.0;
                winPosData[i * 3 + 1] = (((window.innerHeight - cy) - 0.5 * window.innerHeight) / window.innerHeight) * 3.0;
                winPosData[i * 3 + 2] = 0.0;

                winSizeData[i * 3] = (rect.width / 2 / window.innerHeight) * 3.0;
                winSizeData[i * 3 + 1] = (rect.height / 2 / window.innerHeight) * 3.0;
                winSizeData[i * 3 + 2] = 0.04;
            } else {
                winActiveData[i] = 0.0;
            }
        } else {
            winActiveData[i] = 0.0;
        }
    }

    gl.useProgram(program);
    gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
    gl.uniform3fv(uWinPosLoc, winPosData);
    gl.uniform3fv(uWinSizeLoc, winSizeData);
    gl.uniform1fv(uWinActiveLoc, winActiveData);

    gl.uniform1f(uTimeLoc, time * 0.001);
    gl.uniform1f(uFreezeLoc, shaderFreezeVal);
    gl.uniform1f(uIorLoc, shaderIorVal);
    gl.uniform1f(uSurfaceNoiseLoc, shaderNoiseVal);

    if (imageLoaded) gl.uniform2f(uTexResLoc, bgImage.width, bgImage.height);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, bgTexture);
    gl.uniform1i(uTexLoc, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
}
requestAnimationFrame(render);

let highestZIndex = 10;
let activeDraggedWindow = null;
let dragOffset = { x: 0, y: 0 };

function initWindowManagement() {
    const windows = document.querySelectorAll('.window');
    windows.forEach(win => {
        const header = win.querySelector('.window-header');
        header.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('control')) return;
            bringToFront(win);
            activeDraggedWindow = win;
            const rect = win.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            win.style.transition = 'none';
        });

        header.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('control')) return;
            bringToFront(win);
            activeDraggedWindow = win;
            const rect = win.getBoundingClientRect();
            dragOffset.x = e.touches[0].clientX - rect.left;
            dragOffset.y = e.touches[0].clientY - rect.top;
            win.style.transition = 'none';
        }, { passive: true });
    });

    window.addEventListener('mousemove', (e) => {
        if (activeDraggedWindow) {
            let left = e.clientX - dragOffset.x;
            let top = e.clientY - dragOffset.y;
            activeDraggedWindow.style.left = `${left}px`;
            activeDraggedWindow.style.top = `${top}px`;
        }
    });

    window.addEventListener('touchmove', (e) => {
        if (activeDraggedWindow) {
            let left = e.touches[0].clientX - dragOffset.x;
            let top = e.touches[0].clientY - dragOffset.y;
            activeDraggedWindow.style.left = `${left}px`;
            activeDraggedWindow.style.top = `${top}px`;
        }
    });

    window.addEventListener('mouseup', () => {
        if (activeDraggedWindow) {
            activeDraggedWindow.style.transition = '';
            activeDraggedWindow = null;
        }
    });

    window.addEventListener('touchend', () => {
        if (activeDraggedWindow) {
            activeDraggedWindow.style.transition = '';
            activeDraggedWindow = null;
        }
    });
}

function bringToFront(win) {
    document.querySelectorAll('.window').forEach(w => w.classList.remove('active'));
    highestZIndex++;
    win.style.zIndex = highestZIndex;
    win.classList.add('active');
}

function closeWindow(id) {
    const win = document.getElementById(id);
    win.classList.remove('visible');
}

function minimizeWindow(id) {
    const win = document.getElementById(id);
    win.classList.add('minimized');
    win.classList.remove('visible');
}

function maximizeWindow(id) {
    const win = document.getElementById(id);
    win.classList.toggle('maximized');
}

function toggleWindow(id) {
    const win = document.getElementById(id);
    if (win.classList.contains('visible') && !win.classList.contains('minimized')) {
        minimizeWindow(id);
    } else {
        win.classList.remove('minimized');
        win.classList.add('visible');
        bringToFront(win);
    }
}

window.closeWindow = closeWindow;
window.minimizeWindow = minimizeWindow;
window.maximizeWindow = maximizeWindow;
window.toggleWindow = toggleWindow;

function initSettings() {
    const iorSlider = document.getElementById('param-ior');
    const iorVal = document.getElementById('val-ior');
    if (iorSlider) {
        iorSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            shaderIorVal = val;
            iorVal.textContent = val.toFixed(2);
        });
    }

    const dampingSlider = document.getElementById('param-damping');
    const dampingVal = document.getElementById('val-damping');
    if (dampingSlider) {
        dampingSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            dampingVal.textContent = val.toFixed(1);
        });
    }

    const tensionSlider = document.getElementById('param-tension');
    const tensionVal = document.getElementById('val-tension');
    if (tensionSlider) {
        tensionSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            tensionVal.textContent = val;
        });
    }

    const noiseSlider = document.getElementById('param-noise');
    const noiseVal = document.getElementById('val-noise');
    if (noiseSlider) {
        noiseSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            shaderNoiseVal = val;
            noiseVal.textContent = val.toFixed(3);
        });
    }

    const toggleBtn = document.getElementById('btn-state-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (targetFreezeVal === 0.0) {
                targetFreezeVal = 1.0;
                toggleBtn.textContent = 'Freeze';
                toggleBtn.classList.add('active');
                appendTerminalOutput("System State: Acrylic (Frozen)");
            } else {
                targetFreezeVal = 0.0;
                toggleBtn.textContent = 'Liquify';
                toggleBtn.classList.remove('active');
                appendTerminalOutput("System State: ReniQuid (Liquid)");
            }
        });
    }

    const resetBtn = document.getElementById('btn-settings-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            shaderIorVal = 1.33;
            shaderNoiseVal = 0.02;
            targetFreezeVal = 0.0;

            if (iorSlider) {
                iorSlider.value = 1.33;
                iorVal.textContent = "1.33";
            }
            if (dampingSlider) {
                dampingSlider.value = 2.0;
                dampingVal.textContent = "2.0";
            }
            if (tensionSlider) {
                tensionSlider.value = 300;
                tensionVal.textContent = "300";
            }
            if (noiseSlider) {
                noiseSlider.value = 0.02;
                noiseVal.textContent = "0.020";
            }
            if (toggleBtn) {
                toggleBtn.textContent = 'Liquify';
                toggleBtn.classList.remove('active');
            }
            appendTerminalOutput("System Settings reset to factory defaults.");
        });
    }
}

const termHistory = document.getElementById('term-history');
const termInput = document.getElementById('term-input');

function appendTerminalOutput(text, isError = false) {
    if (!termHistory) return;
    const div = document.createElement('div');
    div.textContent = text;
    if (isError) div.style.color = '#ff5f56';
    termHistory.appendChild(div);
    termHistory.scrollTop = termHistory.scrollHeight;
}

function initTerminal() {
    if (!termInput) return;
    appendTerminalOutput("Archcrylic OS Core Initialization...");
    appendTerminalOutput("ReniQuid Engine WebGL 2.0: Active");
    appendTerminalOutput("Type 'help' to view available commands.");

    termInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const inputVal = termInput.value.trim();
            if (inputVal !== "") {
                appendTerminalOutput(`reniquid@archcrylic:~$ ${inputVal}`);
                processCommand(inputVal);
                termInput.value = "";
            }
        }
    });
}

function processCommand(cmd) {
    const parts = cmd.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
        case 'help':
            appendTerminalOutput("Available commands:");
            appendTerminalOutput("  help               Show this information");
            appendTerminalOutput("  freeze             Crystallize liquid into acrylic state");
            appendTerminalOutput("  liquify            Convert acrylic panels back to liquid");
            appendTerminalOutput("  ior <value>        Set Refraction Index (1.05 - 2.0)");
            appendTerminalOutput("  clear              Clear terminal history");
            appendTerminalOutput("  status             Display engine performance metrics");
            break;
        case 'freeze':
            targetFreezeVal = 1.0;
            const tbtnF = document.getElementById('btn-state-toggle');
            if (tbtnF) {
                tbtnF.textContent = 'Freeze';
                tbtnF.classList.add('active');
            }
            appendTerminalOutput("Transitioning to Acrylic state...");
            break;
        case 'liquify':
            targetFreezeVal = 0.0;
            const tbtnL = document.getElementById('btn-state-toggle');
            if (tbtnL) {
                tbtnL.textContent = 'Liquify';
                tbtnL.classList.remove('active');
            }
            appendTerminalOutput("Transitioning to Liquid state...");
            break;
        case 'ior':
            if (args.length > 0) {
                const val = parseFloat(args[0]);
                if (!isNaN(val) && val >= 1.05 && val <= 2.0) {
                    shaderIorVal = val;
                    const iorS = document.getElementById('param-ior');
                    if (iorS) iorS.value = val;
                    const iorV = document.getElementById('val-ior');
                    if (iorV) iorV.textContent = val.toFixed(2);
                    appendTerminalOutput(`Refraction Index set to ${val}`);
                } else {
                    appendTerminalOutput("Invalid value. Range: 1.05 - 2.0", true);
                }
            } else {
                appendTerminalOutput("Usage: ior <value>", true);
            }
            break;
        case 'clear':
            if (termHistory) termHistory.innerHTML = "";
            break;
        case 'status':
            appendTerminalOutput(`Engine: WebGL 2.0`);
            appendTerminalOutput(`FPS: 60`);
            appendTerminalOutput(`State: ${targetFreezeVal === 1.0 ? 'Acrylic' : 'Liquid'}`);
            appendTerminalOutput(`Refraction Index: ${shaderIorVal}`);
            break;
        default:
            appendTerminalOutput(`Command not found: ${command}. Type 'help' for instructions.`, true);
    }
}

function initClock() {
    const clock = document.getElementById('topbar-clock');
    if (!clock) return;
    const updateClock = () => {
        const d = new Date();
        clock.textContent = d.toTimeString().split(' ')[0];
    };
    setInterval(updateClock, 1000);
    updateClock();
}

function initSystemMetrics() {
    const cpuVal = document.getElementById('cpu-load');
    const ramVal = document.getElementById('ram-usage');
    const monCpu = document.getElementById('monitor-cpu');
    const monRam = document.getElementById('monitor-ram');

    const cpuCanvas = document.getElementById('cpu-graph-canvas');
    const ramCanvas = document.getElementById('ram-graph-canvas');
    if (!cpuCanvas || !ramCanvas) return;

    const cpuCtx = cpuCanvas.getContext('2d');
    const ramCtx = ramCanvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    cpuCanvas.width = cpuCanvas.offsetWidth * dpr;
    cpuCanvas.height = cpuCanvas.offsetHeight * dpr;
    ramCanvas.width = ramCanvas.offsetWidth * dpr;
    ramCanvas.height = ramCanvas.offsetHeight * dpr;
    cpuCtx.scale(dpr, dpr);
    ramCtx.scale(dpr, dpr);

    let cpuHistory = Array(50).fill(0);
    let ramHistory = Array(50).fill(1.5);

    let ramTotal = 16.0;
    let currentCpu = 12.5;
    let currentRam = 2.4;

    const drawGraph = (ctx, canvasEl, history, minVal, maxVal, color) => {
        const w = canvasEl.offsetWidth;
        const h = canvasEl.offsetHeight;
        ctx.clearRect(0, 0, w, h);

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        const step = w / (history.length - 1);
        for (let i = 0; i < history.length; i++) {
            const val = history[i];
            const ratio = (val - minVal) / (maxVal - minVal || 1);
            const x = i * step;
            const y = h - ratio * h * 0.8 - h * 0.1;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = color.replace('1)', '0.05)');
        ctx.fill();
    };

    setInterval(() => {
        currentCpu = 8.0 + Math.random() * 18.0;
        if (Math.random() > 0.8) currentCpu += 40.0;
        if (cpuVal) cpuVal.textContent = `${Math.round(currentCpu)}%`;
        if (monCpu) monCpu.textContent = `${currentCpu.toFixed(1)}%`;
        cpuHistory.push(currentCpu);
        cpuHistory.shift();
        drawGraph(cpuCtx, cpuCanvas, cpuHistory, 0, 100, 'rgba(0, 229, 255, 1)');
    }, 800);

    setInterval(() => {
        currentRam = 2.2 + Math.random() * 0.4;
        const percent = (currentRam / ramTotal) * 100;
        if (ramVal) ramVal.textContent = `${Math.round(percent)}%`;
        if (monRam) monRam.textContent = `${currentRam.toFixed(2)} GB`;
        ramHistory.push(currentRam);
        ramHistory.shift();
        drawGraph(ramCtx, ramCanvas, ramHistory, 0, 4, 'rgba(0, 255, 102, 1)');
    }, 1500);

    drawGraph(cpuCtx, cpuCanvas, cpuHistory, 0, 100, 'rgba(0, 229, 255, 1)');
    drawGraph(ramCtx, ramCanvas, ramHistory, 0, 4, 'rgba(0, 255, 102, 1)');
}

document.addEventListener('DOMContentLoaded', () => {
    initWindowManagement();
    initSettings();
    initTerminal();
    initClock();
    initSystemMetrics();
});
