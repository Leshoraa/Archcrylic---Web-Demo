export class ReniQuidLayer {
  constructor(canvas, imageSrc) {
    this.canvas = canvas;
    this.imageSrc = imageSrc || 'assets/wallpaper.png';
    this.gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true });
    if (!this.gl) throw new Error('WebGL 2.0 not supported');
    this.running = false;
    this.intensity = 0.7;
    this.imageLoaded = false;
    this.mappedBoxes = new Float32Array(16 * 4);
    this.numBoxes = 0;
    this.lastTime = performance.now();
  }

  init() {
    const gl = this.gl;
    const vs = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

    const fs = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec4 u_boxes[16];
uniform int u_numBoxes;
uniform sampler2D u_tex;
uniform vec2 u_texRes;
uniform float u_time;
uniform float u_intensity;
out vec4 fragColor;

float sdPrismBox(vec3 p, vec3 b, float r, float c) {
  vec3 d = abs(p) - b;
  float box = length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0) - r;
  vec3 pCut = abs(p);
  float cut1 = dot(pCut.xy, vec2(0.70710678)) - (b.x + b.y - c) * 0.70710678;
  return max(box, cut1);
}

float map(vec3 p) {
  float d = 1000.0;
  float c = 54.0 / max(u_resolution.y, 1.0);
  for(int i = 0; i < 16; i++) {
    if (i >= u_numBoxes) break;
    vec4 box = u_boxes[i];
    vec3 center = vec3(box.xy, 0.0);
    vec3 size = vec3(box.zw, 0.1);
    float dist = sdPrismBox(p - center, size, 0.015, c);
    d = min(d, dist);
  }
  return d;
}

vec3 calcNormal(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0005;
  return normalize(e.xyy*map(p+e.xyy) + e.yyx*map(p+e.yyx) + e.yxy*map(p+e.yxy) + e.xxx*map(p+e.xxx));
}

vec2 getCoverUV(vec2 fc, vec2 res, vec2 texRes) {
  float rs = res.x/res.y, ri = texRes.x/texRes.y;
  vec2 ns = rs < ri ? vec2(texRes.x*res.y/texRes.y, res.y) : vec2(res.x, texRes.y*res.x/texRes.x);
  vec2 off = (rs < ri ? vec2((ns.x-res.x)/2.0, 0.0) : vec2(0.0, (ns.y-res.y)/2.0)) / ns;
  return (fc/res)*(res/ns) + off;
}

vec3 sampleTexBlurred(sampler2D tex, vec2 fc, vec2 res, vec2 texRes, float blurSize) {
  vec3 sum = vec3(0.0);
  sum += texture(tex, getCoverUV(fc + vec2(-1.0, -1.0) * blurSize, res, texRes)).rgb * 0.0625;
  sum += texture(tex, getCoverUV(fc + vec2( 0.0, -1.0) * blurSize, res, texRes)).rgb * 0.125;
  sum += texture(tex, getCoverUV(fc + vec2( 1.0, -1.0) * blurSize, res, texRes)).rgb * 0.0625;
  sum += texture(tex, getCoverUV(fc + vec2(-1.0,  0.0) * blurSize, res, texRes)).rgb * 0.125;
  sum += texture(tex, getCoverUV(fc, res, texRes)).rgb * 0.25;
  sum += texture(tex, getCoverUV(fc + vec2( 1.0,  0.0) * blurSize, res, texRes)).rgb * 0.125;
  sum += texture(tex, getCoverUV(fc + vec2(-1.0,  1.0) * blurSize, res, texRes)).rgb * 0.0625;
  sum += texture(tex, getCoverUV(fc + vec2( 0.0,  1.0) * blurSize, res, texRes)).rgb * 0.125;
  sum += texture(tex, getCoverUV(fc + vec2( 1.0,  1.0) * blurSize, res, texRes)).rgb * 0.0625;
  return sum;
}

vec3 calcRefraction(vec3 rd, vec3 n, vec2 fc, vec2 res, vec2 texRes) {
  vec3 refR = refract(rd, n, 1.0/1.45);
  vec3 refG = refract(rd, n, 1.0/1.49);
  vec3 refB = refract(rd, n, 1.0/1.53);
  float str = 0.15 * res.y;
  
  vec2 coordR = fc + (refR.xy - rd.xy) * str;
  vec2 coordG = fc + (refG.xy - rd.xy) * str;
  vec2 coordB = fc + (refB.xy - rd.xy) * str;
  
  float blurSize = 24.0 * u_intensity;
  
  float r = sampleTexBlurred(u_tex, coordR, res, texRes, blurSize).r;
  float g = sampleTexBlurred(u_tex, coordG, res, texRes, blurSize).g;
  float b = sampleTexBlurred(u_tex, coordB, res, texRes, blurSize).b;
  
  return vec3(r, g, b);
}

void main() {
  vec2 fc = gl_FragCoord.xy;
  vec2 uv = (fc - 0.5*u_resolution.xy) / u_resolution.y;
  vec3 ro = vec3(0.0, 0.0, 3.0);
  vec3 rd = normalize(vec3(uv, -1.0));
  vec3 sp = vec3((uv + vec2(0.0, 0.05))*3.0, 0.0);
  float sa = mix(0.85, 1.0, smoothstep(0.0, 0.25, map(sp)));
  float t = 0.0; float maxD = 10.0; vec3 p;
  for(int i = 0; i < 48; i++) {
    p = ro + rd*t; float d = map(p);
    if(d < 0.001 || t > maxD) break; t += d;
  }
  vec2 texRes = u_texRes.x > 0.0 ? u_texRes : vec2(1.0);
  vec3 col = texture(u_tex, getCoverUV(fc, u_resolution.xy, texRes)).rgb * sa;
  if(t < maxD) {
    vec3 n = calcNormal(p);
    vec3 l1 = normalize(vec3(2.0, 3.0, 4.0));
    vec3 l2 = normalize(vec3(-3.0, -1.0, 2.0));
    vec3 refrCol = calcRefraction(rd, n, fc, u_resolution.xy, texRes);
    vec3 reflDir = reflect(rd, n);
    vec2 uvRefl = getCoverUV(fc + reflDir.xy * 0.18 * u_resolution.y, u_resolution.xy, texRes);
    vec3 reflCol = texture(u_tex, uvRefl).rgb;
    float fresnel = 0.04 + 0.96 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
    col = mix(refrCol, reflCol, fresnel);
    col *= vec3(0.95, 0.98, 1.0);
    vec3 h1 = normalize(-rd + l1);
    float spec1 = pow(max(dot(n, h1), 0.0), 512.0);
    vec3 h2 = normalize(-rd + l2);
    float spec2 = pow(max(dot(n, h2), 0.0), 128.0);
    col += vec3(1.0) * spec1 * 1.8 + vec3(0.7, 0.85, 1.0) * spec2 * 0.6;
    float edgeGlow = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
    col += vec3(0.9, 0.95, 1.0) * edgeGlow * 0.25;
  }
  fragColor = vec4(col, 1.0);
}`;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };

    const vShader = compile(gl.VERTEX_SHADER, vs);
    const fShader = compile(gl.FRAGMENT_SHADER, fs);
    this.program = gl.createProgram();
    gl.attachShader(this.program, vShader);
    gl.attachShader(this.program, fShader);
    gl.linkProgram(this.program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    this.uniforms = {
      resolution: gl.getUniformLocation(this.program, 'u_resolution'),
      boxes: gl.getUniformLocation(this.program, 'u_boxes'),
      numBoxes: gl.getUniformLocation(this.program, 'u_numBoxes'),
      tex: gl.getUniformLocation(this.program, 'u_tex'),
      texRes: gl.getUniformLocation(this.program, 'u_texRes'),
      time: gl.getUniformLocation(this.program, 'u_time'),
      intensity: gl.getUniformLocation(this.program, 'u_intensity'),
    };

    this.bgTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.bgTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

    this.bgImage = new Image();
    this.bgImage.src = this.imageSrc;
    this.bgImage.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, this.bgTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.bgImage);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      this.imageLoaded = true;
    };

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  _updateElements() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const elements = [];

    const taskbar = document.getElementById('taskbar');
    if (taskbar && !taskbar.classList.contains('hidden-bar')) {
      elements.push(taskbar.getBoundingClientRect());
    }

    const notif = document.getElementById('notification-panel');
    if (notif && notif.classList.contains('visible')) {
      elements.push(notif.getBoundingClientRect());
    }

    const launcher = document.getElementById('launcher');
    const launcherPanel = document.getElementById('launcher-panel');
    if (launcher && launcher.classList.contains('visible') && launcherPanel) {
      elements.push(launcherPanel.getBoundingClientRect());
    }

    const contextMenu = document.getElementById('context-menu');
    if (contextMenu && !contextMenu.classList.contains('hidden')) {
      elements.push(contextMenu.getBoundingClientRect());
    }

    const windows = document.querySelectorAll('.os-window');
    windows.forEach(win => {
      if (win.style.opacity !== '0' && win.style.display !== 'none') {
        elements.push(win.getBoundingClientRect());
      }
    });

    this.numBoxes = Math.min(elements.length, 16);
    for (let i = 0; i < this.numBoxes; i++) {
      const el = elements[i];
      const cx = el.left + el.width / 2;
      const cy = el.top + el.height / 2;
      const rx = el.width / 2;
      const ry = el.height / 2;

      this.mappedBoxes[i * 4] = ((cx - 0.5 * w) / h) * 3;
      this.mappedBoxes[i * 4 + 1] = (((h - cy) - 0.5 * h) / h) * 3;
      this.mappedBoxes[i * 4 + 2] = (rx / h) * 3;
      this.mappedBoxes[i * 4 + 3] = (ry / h) * 3;
    }
  }

  _render(time) {
    if (!this.running) return;
    const now = performance.now();
    this.lastTime = now;
    
    this._updateElements();

    const gl = this.gl;

    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    gl.uniform4fv(this.uniforms.boxes, this.mappedBoxes);
    gl.uniform1i(this.uniforms.numBoxes, this.numBoxes);
    gl.uniform1f(this.uniforms.time, time * 0.001);
    gl.uniform1f(this.uniforms.intensity, this.intensity);
    if (this.imageLoaded) gl.uniform2f(this.uniforms.texRes, this.bgImage.width, this.bgImage.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.bgTexture);
    gl.uniform1i(this.uniforms.tex, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame((t) => this._render(t));
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this._render(t));
  }

  pause() { this.running = false; }

  resume() {
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this._render(t));
    }
  }

  setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); }

  setImage(src) {
    this.bgImage.src = src;
    this.imageLoaded = false;
  }
}
