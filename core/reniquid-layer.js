export class ReniQuidLayer {
  constructor(canvas, imageSrc) {
    this.canvas = canvas;
    this.imageSrc = imageSrc || 'assets/wallpaper.png';
    this.gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true });
    if (!this.gl) throw new Error('WebGL 2.0 not supported');
    this.running = false;
    this.intensity = 0.7;
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;
    this.idleTime = 0;
    this.lastTime = performance.now();
    this.imageLoaded = false;
    this.NUM_POINTS = 5;
    this.points = Array.from({ length: this.NUM_POINTS }, () => ({
      x: window.innerWidth / 2, y: window.innerHeight / 2, vx: 0, vy: 0
    }));
    this.targetPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.mappedPoints = new Float32Array(this.NUM_POINTS * 2);
    this.idleAngle = 0;
  }

  init() {
    const gl = this.gl;
    const vs = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

    const fs = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_points[5];
uniform sampler2D u_tex;
uniform vec2 u_texRes;
uniform float u_time;
uniform float u_intensity;
out vec4 fragColor;

float hash(float n) { return fract(sin(n) * 1e4); }
float noise(vec3 x) {
  const vec3 step = vec3(110, 241, 171);
  vec3 i = floor(x); vec3 f = fract(x);
  float n = dot(i, step);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(n + dot(step, vec3(0,0,0))), hash(n + dot(step, vec3(1,0,0))), u.x),
                 mix(hash(n + dot(step, vec3(0,1,0))), hash(n + dot(step, vec3(1,1,0))), u.x), u.y),
             mix(mix(hash(n + dot(step, vec3(0,0,1))), hash(n + dot(step, vec3(1,0,1))), u.x),
                 mix(hash(n + dot(step, vec3(0,1,1))), hash(n + dot(step, vec3(1,1,1))), u.x), u.y), u.z);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

vec3 rotateX(vec3 p, float a) {
  float c = cos(a), s = sin(a);
  return vec3(p.x, c*p.y - s*p.z, s*p.y + c*p.z);
}
vec3 rotateY(vec3 p, float a) {
  float c = cos(a), s = sin(a);
  return vec3(c*p.x + s*p.z, p.y, -s*p.x + c*p.z);
}
vec3 rotateZ(vec3 p, float a) {
  float c = cos(a), s = sin(a);
  return vec3(c*p.x - s*p.y, s*p.x + c*p.y, p.z);
}

float sdTriPrism(vec3 p, vec2 h) {
  vec3 q = abs(p);
  float d = max(q.z - h.y, max(q.x * 0.866025 + p.y * 0.5, -p.y) - h.x * 0.5);
  return d - 0.03;
}

float map(vec3 p) {
  float d = 1000.0;
  for(int i = 0; i < 5; i++) {
    vec3 center = vec3(u_points[i], 0.0);
    vec3 pi = p - center;
    float angleY = u_time * 0.5 + float(i) * 0.4;
    float angleX = u_time * 0.3 + float(i) * 0.25;
    float angleZ = u_time * 0.2 + float(i) * 0.15;
    pi = rotateY(pi, angleY);
    pi = rotateX(pi, angleX);
    pi = rotateZ(pi, angleZ);
    float radius = (0.55 - float(i) * 0.07) * u_intensity;
    float dist = sdTriPrism(pi, vec2(radius, radius * 1.1));
    d = (i == 0) ? dist : smin(d, dist, 0.22);
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

vec3 calcRefraction(vec3 rd, vec3 n, vec2 fc, vec2 res, vec2 texRes) {
  vec3 refR = refract(rd, n, 1.0/1.45);
  vec3 refG = refract(rd, n, 1.0/1.49);
  vec3 refB = refract(rd, n, 1.0/1.53);
  float str = 0.15 * res.y;
  vec2 uvR = getCoverUV(fc + (refR.xy-rd.xy)*str, res, texRes);
  vec2 uvG = getCoverUV(fc + (refG.xy-rd.xy)*str, res, texRes);
  vec2 uvB = getCoverUV(fc + (refB.xy-rd.xy)*str, res, texRes);
  return vec3(texture(u_tex, uvR).r, texture(u_tex, uvG).g, texture(u_tex, uvB).b);
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
      points: gl.getUniformLocation(this.program, 'u_points'),
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

    this._setupEvents();
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _setupEvents() {
    const update = (x, y) => {
      this.mouseX = x;
      this.mouseY = y;
      this.idleTime = 0;
    };
    window.addEventListener('pointermove', (e) => update(e.clientX, e.clientY));
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  _updatePhysics(dt) {
    if (dt > 0.03) dt = 0.03;
    const K = 280, M = 1, C = 1.3 * Math.sqrt(K * M);
    const KT = 380, CT = 1.4 * Math.sqrt(KT * M);

    this.idleTime += dt;
    this.idleAngle += dt * 0.3;

    const idleFactor = Math.min(this.idleTime / 3, 1);
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const idleX = cx + Math.sin(this.idleAngle) * 120 * idleFactor;
    const idleY = cy + Math.cos(this.idleAngle * 0.7) * 80 * idleFactor;

    const pullStrength = 1 - idleFactor;
    this.targetPos.x = this.mouseX * pullStrength + idleX * (1 - pullStrength);
    this.targetPos.y = this.mouseY * pullStrength + idleY * (1 - pullStrength);

    const p0 = this.points[0];
    let fx = K * (this.targetPos.x - p0.x) - C * p0.vx;
    let fy = K * (this.targetPos.y - p0.y) - C * p0.vy;
    p0.vx += (fx / M) * dt;
    p0.vy += (fy / M) * dt;
    p0.x += p0.vx * dt;
    p0.y += p0.vy * dt;

    for (let i = 1; i < this.NUM_POINTS; i++) {
      const p = this.points[i];
      const t = this.points[i - 1];
      fx = KT * (t.x - p.x) - CT * p.vx;
      fy = KT * (t.y - p.y) - CT * p.vy;
      p.vx += (fx / M) * dt;
      p.vy += (fy / M) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  _render(time) {
    if (!this.running) return;
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this._updatePhysics(dt);

    const gl = this.gl;
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (let i = 0; i < this.NUM_POINTS; i++) {
      this.mappedPoints[i * 2] = ((this.points[i].x - 0.5 * w) / h) * 3;
      this.mappedPoints[i * 2 + 1] = (((h - this.points[i].y) - 0.5 * h) / h) * 3;
    }

    gl.useProgram(this.program);
    gl.uniform2f(this.uniforms.resolution, this.canvas.width, this.canvas.height);
    gl.uniform2fv(this.uniforms.points, this.mappedPoints);
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
