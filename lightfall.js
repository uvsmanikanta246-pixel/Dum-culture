/**
 * Lightfall - High Performance WebGL Shader Background
 * Based on OGL raymarching light streak simulation.
 */

const MAX_COLORS = 8;

const hexToRGB = hex => {
  const c = (hex || '#000000').replace('#', '').padEnd(6, '0');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b];
};

const prepColors = input => {
  const base = (input && input.length ? input : ['#D97706', '#B45309', '#F59E0B', '#EA580C', '#C2410C', '#EAB308']).slice(0, MAX_COLORS);
  const count = base.length;
  const arr = [];
  for (let i = 0; i < MAX_COLORS; i++) {
    arr.push(hexToRGB(base[Math.min(i, base.length - 1)]));
  }
  const avg = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    avg[0] += arr[i][0];
    avg[1] += arr[i][1];
    avg[2] += arr[i][2];
  }
  avg[0] /= count;
  avg[1] /= count;
  avg[2] /= count;
  return { arr, count, avg };
};

const vertexShaderSource = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3  iResolution;
uniform vec2  iMouse;
uniform float iTime;

uniform vec3  uColor0;
uniform vec3  uColor1;
uniform vec3  uColor2;
uniform vec3  uColor3;
uniform vec3  uColor4;
uniform vec3  uColor5;
uniform vec3  uColor6;
uniform vec3  uColor7;
uniform int   uColorCount;

uniform vec3  uBgColor;
uniform vec3  uMouseColor;
uniform float uSpeed;
uniform int   uStreakCount;
uniform float uStreakWidth;
uniform float uStreakLength;
uniform float uGlow;
uniform float uDensity;
uniform float uTwinkle;
uniform float uZoom;
uniform float uBgGlow;
uniform float uOpacity;
uniform float uMouseEnabled;
uniform float uMouseStrength;
uniform float uMouseRadius;

varying vec2 vUv;

vec3 palette(float h) {
  int count = uColorCount;
  if (count < 1) count = 1;
  int idx = int(floor(clamp(h, 0.0, 0.999999) * float(count)));
  if (idx <= 0) return uColor0;
  if (idx == 1) return uColor1;
  if (idx == 2) return uColor2;
  if (idx == 3) return uColor3;
  if (idx == 4) return uColor4;
  if (idx == 5) return uColor5;
  if (idx == 6) return uColor6;
  return uColor7;
}

vec3 tanhv(vec3 x) {
  vec3 e = exp(-2.0 * x);
  return (1.0 - e) / (1.0 + e);
}

vec2 sceneC(vec2 frag, vec2 r) {
  vec2 P = (frag + frag - r) / r.x;
  float z = 0.0;
  float d = 1e3;
  vec4 O = vec4(0.0);
  for (int k = 0; k < 39; k++) {
    if (d <= 1e-4) break;
    O = z * normalize(vec4(P, uZoom, 0.0)) - vec4(0.0, 4.0, 1.0, 0.0) / 4.5;
    d = 1.0 - sqrt(length(O * O));
    z += d;
  }
  return vec2(O.x, atan(O.z, O.y));
}

void mainImage(out vec4 o, vec2 C) {
  vec2 r = iResolution.xy;
  vec2 uv0 = (C + C - r) / r.x;
  float T = 0.1 * iTime * uSpeed + 9.0;
  float angRings = max(1.0, floor(6.28318530718 * max(uDensity, 0.05) + 0.5));
  vec2 Y = vec2(5e-3, 6.28318530718 / angRings);

  vec2 c0 = sceneC(C, r);
  vec2 cdx = sceneC(C + vec2(1.0, 0.0), r);
  vec2 cdy = sceneC(C + vec2(0.0, 1.0), r);
  vec2 dCx = cdx - c0;
  vec2 dCy = cdy - c0;
  dCx.y -= 6.28318530718 * floor(dCx.y / 6.28318530718 + 0.5);
  dCy.y -= 6.28318530718 * floor(dCy.y / 6.28318530718 + 0.5);
  vec2 fw = abs(dCx) + abs(dCy);
  C = c0;

  vec2 P = vec2(2.0, 1.0) * uv0 - (r / r.x) * vec2(0.0, 1.0);
  vec4 O = vec4(uBgColor * 90.0 * uBgGlow / (1e3 * dot(P, P) + 6.0), 0.0);

  float mGlow = 0.0;
  if (uMouseEnabled > 0.5) {
    vec2 mN = (iMouse + iMouse - r) / r.x;
    float md = length(uv0 - mN);
    mGlow = exp(-md * md / max(uMouseRadius * uMouseRadius, 1e-4)) * uMouseStrength;
    O.rgb += uMouseColor * mGlow * 0.25;
  }

  float zr = 5e-4 * uStreakWidth;
  vec2 rr = vec2(max(length(fw), 1e-5));
  float tail = 19.0 / max(uStreakLength, 0.05);

  for (int m = 0; m < 16; m++) {
    if (m >= uStreakCount) break;
    float jf = float(m) + 1.0;
    float ic = fract(sin(dot(vec2(jf, floor(C.x / Y.x + 0.5)), vec2(7.0, 11.0)) * 73.0));
    vec2 Pp = C - (T + T * ic) * vec2(0.0, 1.0);
    Pp -= floor(Pp / Y + 0.5) * Y;
    float h = fract(8663.0 * ic);
    vec3 col = palette(h);
    float weight = mix(1.5, 1.0 + sin(T + 7.0 * h + 4.0), uTwinkle);
    weight *= (1.0 + mGlow * 2.0);
    vec2 inner = vec2(length(max(Pp, vec2(-1.0, 0.0))), length(Pp) - zr) - zr;
    vec2 sm = vec2(1.0) - smoothstep(-rr, rr, inner);
    O.rgb += dot(sm, vec2(exp(tail * Pp.y), 3.0)) * col * weight;
    C.x += Y.x / 8.0;
  }

  vec3 colr = sqrt(tanhv(max(O.rgb * uGlow - vec3(0.04, 0.08, 0.02), 0.0)));
  o = vec4(colr, uOpacity);
}

void main() {
  vec4 color;
  mainImage(color, vUv * iResolution.xy);
  gl_FragColor = color;
}
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('Could not compile WebGL shader: ' + info);
  }
  return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error('Could not link WebGL program: ' + info);
  }
  return program;
}

export function initLightfall(container, userOptions = {}) {
  if (!container) return null;

  const options = {
    colors: ['#D97706', '#B45309', '#F59E0B', '#EA580C', '#C2410C', '#EAB308'],
    backgroundColor: '#FFFBEB',
    speed: 0.35,
    streakCount: 2,
    streakWidth: 0.85,
    streakLength: 1.1,
    glow: 0.65,
    density: 0.55,
    twinkle: 0.5,
    zoom: 3,
    backgroundGlow: 0.25,
    opacity: 0.85,
    mouseInteraction: true,
    mouseStrength: 0.25,
    mouseRadius: 1.0,
    mouseDampening: 0.15,
    paused: false,
    dpr: (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1),
    ...userOptions
  };

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.position = 'absolute';
  canvas.style.inset = '0';
  container.appendChild(canvas);

  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (!gl) {
    console.error('WebGL is not supported in this browser.');
    return null;
  }

  // Create shaders & program
  const vertShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = createProgram(gl, vertShader, fragShader);
  gl.useProgram(program);

  // Full-screen triangle buffer (OGL style Triangle)
  // Positions: (-1, -1), (3, -1), (-1, 3)
  // UVs: (0, 0), (2, 0), (0, 2)
  const vertexData = new Float32Array([
    -1.0, -1.0,  0.0, 0.0,
     3.0, -1.0,  2.0, 0.0,
    -1.0,  3.0,  0.0, 2.0
  ]);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  const posAttrib = gl.getAttribLocation(program, 'position');
  const uvAttrib = gl.getAttribLocation(program, 'uv');

  gl.enableVertexAttribArray(posAttrib);
  gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 16, 0);

  if (uvAttrib !== -1) {
    gl.enableVertexAttribArray(uvAttrib);
    gl.vertexAttribPointer(uvAttrib, 2, gl.FLOAT, false, 16, 8);
  }

  // Uniform locations cache
  const uniforms = {
    iResolution: gl.getUniformLocation(program, 'iResolution'),
    iMouse: gl.getUniformLocation(program, 'iMouse'),
    iTime: gl.getUniformLocation(program, 'iTime'),
    uColorCount: gl.getUniformLocation(program, 'uColorCount'),
    uBgColor: gl.getUniformLocation(program, 'uBgColor'),
    uMouseColor: gl.getUniformLocation(program, 'uMouseColor'),
    uSpeed: gl.getUniformLocation(program, 'uSpeed'),
    uStreakCount: gl.getUniformLocation(program, 'uStreakCount'),
    uStreakWidth: gl.getUniformLocation(program, 'uStreakWidth'),
    uStreakLength: gl.getUniformLocation(program, 'uStreakLength'),
    uGlow: gl.getUniformLocation(program, 'uGlow'),
    uDensity: gl.getUniformLocation(program, 'uDensity'),
    uTwinkle: gl.getUniformLocation(program, 'uTwinkle'),
    uZoom: gl.getUniformLocation(program, 'uZoom'),
    uBgGlow: gl.getUniformLocation(program, 'uBgGlow'),
    uOpacity: gl.getUniformLocation(program, 'uOpacity'),
    uMouseEnabled: gl.getUniformLocation(program, 'uMouseEnabled'),
    uMouseStrength: gl.getUniformLocation(program, 'uMouseStrength'),
    uMouseRadius: gl.getUniformLocation(program, 'uMouseRadius')
  };

  const colorUniforms = [];
  for (let i = 0; i < MAX_COLORS; i++) {
    colorUniforms.push(gl.getUniformLocation(program, `uColor${i}`));
  }

  const { arr, count, avg } = prepColors(options.colors);

  // Set constant / initial uniforms
  gl.uniform1i(uniforms.uColorCount, count);
  for (let i = 0; i < MAX_COLORS; i++) {
    gl.uniform3fv(colorUniforms[i], arr[i]);
  }
  gl.uniform3fv(uniforms.uBgColor, hexToRGB(options.backgroundColor));
  gl.uniform3fv(uniforms.uMouseColor, avg);
  gl.uniform1f(uniforms.uSpeed, options.speed);
  gl.uniform1i(uniforms.uStreakCount, Math.max(1, Math.min(16, Math.round(options.streakCount))));
  gl.uniform1f(uniforms.uStreakWidth, options.streakWidth);
  gl.uniform1f(uniforms.uStreakLength, options.streakLength);
  gl.uniform1f(uniforms.uGlow, options.glow);
  gl.uniform1f(uniforms.uDensity, options.density);
  gl.uniform1f(uniforms.uTwinkle, options.twinkle);
  gl.uniform1f(uniforms.uZoom, options.zoom);
  gl.uniform1f(uniforms.uBgGlow, options.backgroundGlow);
  gl.uniform1f(uniforms.uOpacity, options.opacity);
  gl.uniform1f(uniforms.uMouseEnabled, options.mouseInteraction ? 1.0 : 0.0);
  gl.uniform1f(uniforms.uMouseStrength, options.mouseStrength);
  gl.uniform1f(uniforms.uMouseRadius, options.mouseRadius);

  let currentMouse = [0, 0];
  let mouseTarget = [0, 0];
  let lastTime = 0;
  let rafId = null;

  // Resize handler
  const resize = () => {
    const rect = container.getBoundingClientRect();
    const dpr = Math.min(options.dpr || window.devicePixelRatio || 1, 2); // Cap at 2 for performance
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform3f(uniforms.iResolution, width, height, 1.0);
    }
  };

  resize();
  let ro = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(resize);
    ro.observe(container);
  }
  window.addEventListener('resize', resize);

  // Mouse / Pointer handler
  const onPointerMove = e => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(options.dpr || window.devicePixelRatio || 1, 2);
    const x = (e.clientX - rect.left) * dpr;
    const y = (rect.height - (e.clientY - rect.top)) * dpr;
    mouseTarget = [x, y];
    if (options.mouseDampening <= 0) {
      currentMouse = [x, y];
      gl.uniform2f(uniforms.iMouse, currentMouse[0], currentMouse[1]);
    }
  };

  if (options.mouseInteraction) {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
  }

  // Render animation loop
  const loop = t => {
    rafId = requestAnimationFrame(loop);
    gl.uniform1f(uniforms.iTime, t * 0.001);

    if (options.mouseDampening > 0) {
      if (!lastTime) lastTime = t;
      const dt = (t - lastTime) / 1000;
      lastTime = t;
      const tau = Math.max(1e-4, options.mouseDampening);
      let factor = 1 - Math.exp(-dt / tau);
      if (factor > 1) factor = 1;
      currentMouse[0] += (mouseTarget[0] - currentMouse[0]) * factor;
      currentMouse[1] += (mouseTarget[1] - currentMouse[1]) * factor;
      gl.uniform2f(uniforms.iMouse, currentMouse[0], currentMouse[1]);
    } else {
      lastTime = t;
    }

    if (!options.paused) {
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
  };

  rafId = requestAnimationFrame(loop);

  return {
    destroy: () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (options.mouseInteraction) {
        window.removeEventListener('pointermove', onPointerMove);
      }
      window.removeEventListener('resize', resize);
      if (ro) ro.disconnect();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
      gl.deleteBuffer(vbo);
      gl.deleteProgram(program);
      gl.deleteShader(vertShader);
      gl.deleteShader(fragShader);
    },
    updateOptions: newOpts => {
      Object.assign(options, newOpts);
      if (newOpts.colors) {
        const { arr: newArr, count: newCount, avg: newAvg } = prepColors(newOpts.colors);
        gl.uniform1i(uniforms.uColorCount, newCount);
        for (let i = 0; i < MAX_COLORS; i++) {
          gl.uniform3fv(colorUniforms[i], newArr[i]);
        }
        gl.uniform3fv(uniforms.uMouseColor, newAvg);
      }
      if (newOpts.backgroundColor) {
        gl.uniform3fv(uniforms.uBgColor, hexToRGB(newOpts.backgroundColor));
      }
      if (newOpts.speed !== undefined) gl.uniform1f(uniforms.uSpeed, newOpts.speed);
      if (newOpts.streakCount !== undefined) gl.uniform1i(uniforms.uStreakCount, Math.max(1, Math.min(16, Math.round(newOpts.streakCount))));
      if (newOpts.streakWidth !== undefined) gl.uniform1f(uniforms.uStreakWidth, newOpts.streakWidth);
      if (newOpts.streakLength !== undefined) gl.uniform1f(uniforms.uStreakLength, newOpts.streakLength);
      if (newOpts.glow !== undefined) gl.uniform1f(uniforms.uGlow, newOpts.glow);
      if (newOpts.density !== undefined) gl.uniform1f(uniforms.uDensity, newOpts.density);
      if (newOpts.twinkle !== undefined) gl.uniform1f(uniforms.uTwinkle, newOpts.twinkle);
      if (newOpts.zoom !== undefined) gl.uniform1f(uniforms.uZoom, newOpts.zoom);
      if (newOpts.backgroundGlow !== undefined) gl.uniform1f(uniforms.uBgGlow, newOpts.backgroundGlow);
      if (newOpts.opacity !== undefined) gl.uniform1f(uniforms.uOpacity, newOpts.opacity);
    }
  };
}

if (typeof window !== 'undefined') {
  window.initLightfall = initLightfall;
}

// Auto-initialize if #lightfall-bg element exists on page load
if (typeof document !== 'undefined') {
  const initAuto = () => {
    const el = document.getElementById('lightfall-bg');
    if (el) {
      initLightfall(el, {
        colors: ['#D97706', '#B45309', '#F59E0B', '#EA580C', '#C2410C', '#EAB308'],
        backgroundColor: '#FFFBEB',
        speed: 0.35,
        streakCount: 2,
        streakWidth: 0.85,
        streakLength: 1.1,
        glow: 0.65,
        density: 0.55,
        twinkle: 0.5,
        zoom: 3,
        backgroundGlow: 0.25,
        opacity: 0.85,
        mouseInteraction: true,
        mouseStrength: 0.25,
        mouseRadius: 1.0,
        mouseDampening: 0.15
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuto);
  } else {
    initAuto();
  }
}
