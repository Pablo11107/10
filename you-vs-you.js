// ==========================================================
// YOU VS YOU — componente visual aislado y reutilizable
// Silueta humana frontal (contorno blanco fino sobre negro)
// + 3 masas interactivas renderizadas en WebGL: esferas de
// cristal con hebras luminosas dentro (efecto "Strands"),
// una sobre la cabeza (mente), otra sobre el corazón y otra
// sobre el bíceps (cuerpo).
//
// Uso (sin cambios respecto a la versión anterior):
//   import { mountYouVsYou } from "./you-vs-you.js";
//   const instance = mountYouVsYou(containerEl, {
//     onSelect: (zone) => { ... } // zone: "mind" | "heart" | "body"
//   });
//   instance.setActive("heart");
//   instance.destroy();
//
// Dependencia: ogl (cargado como módulo ES desde CDN). Si WebGL2
// no está disponible o el CDN falla, se usa automáticamente la
// masa CSS anterior como fallback (clase .yvy2-hotspot-dot).
// ==========================================================

import {
  Renderer,
  Program,
  Mesh,
  Color,
  Triangle,
  RenderTarget
} from "https://cdn.jsdelivr.net/npm/ogl@1.0.11/src/index.js";

const ZONES = ["mind", "heart", "body"];
const ZONE_LABELS = { mind: "Mente", heart: "Corazón", body: "Cuerpo" };
// Posición relativa (0..1) de cada masa sobre el contenedor:
// cabeza, corazón y bíceps.
const ZONE_POSITIONS = {
  mind:  { x: 0.49,  y: 0.07 },
  heart: { x: 0.515, y: 0.265 },
  body:  { x: 0.64,  y: 0.275 }
};

// Paleta de hebras por zona (coherente con la marca: fondo
// oscuro, dorado #D4AF6D como acento).
const ZONE_COLORS = {
  mind:  ["#7C3AED", "#06B6D4", "#EAB308"],
  heart: ["#FF4D6D", "#FF9AB5", "#D4AF6D"],
  body:  ["#D4AF6D", "#E8CA8E", "#06B6D4"]
};

// ---------- silueta (sin cambios) ----------
const FIGURE_OUTLINE_PATH =
  "M95.64,6.22 L90.09,7.83 L85.19,11.06 L81.47,15.8 L79.37,22.11 L79.26,27.82 " +
  "L80.39,32.07 L79.05,31.53 L78.02,32.4 L77.64,34.01 L77.81,38.05 L80.93,43.49 " +
  "L83.79,43.92 L84.43,47.91 L86.21,50.87 L86.75,60.14 L68.81,70.05 L61.16,72.15 " +
  "L55.99,75.33 L52.65,78.29 L50.44,81.2 L46.45,89.66 L44.89,97.31 L45.59,108.57 " +
  "L42.52,119.18 L40.69,127.53 L39.72,135.72 L40.15,144.33 L37.57,152.31 L36.27,159.9 " +
  "L33.69,195.67 L32.66,198.2 L26.79,205.85 L24.05,216.73 L20.92,222.55 L21.68,223.57 " +
  "L24.58,223.63 L28.79,220.13 L27.28,235.21 L27.28,238.01 L27.82,238.6 L28.95,238.07 " +
  "L30.62,235.43 L33.8,223.47 L33.8,239.74 L35.3,240.17 L36.22,239.09 L38.64,226.32 " +
  "L39.24,238.28 L40.26,238.87 L41.28,238.17 L42.15,233.27 L43.49,236.4 L45.11,236.4 " +
  "L45.27,224.22 L46.08,219.27 L46.62,208.98 L46.35,203.05 L45.38,197.93 L48.82,188.34 " +
  "L55.77,165.45 L57.07,157.86 L57.39,145.2 L61.05,136.85 L63.69,128.23 L65.09,131.41 " +
  "L66.87,147.67 L67.3,165.07 L68.06,169.98 L66.28,178.49 L66.71,185.6 L61.11,215.33 " +
  "L59.38,231.6 L59.65,249.92 L62.08,268.02 L62.4,275.45 L61.27,284.61 L61.11,293.5 " +
  "L58.63,303.08 L57.39,318.01 L57.23,334.38 L58.58,370.31 L57.17,376.56 L53.94,382.7 " +
  "L48.88,389.76 L40.53,399.94 L35.57,404.09 L34.33,406.24 L34.17,408.99 L36.0,410.93 " +
  "L37.73,411.14 L39.4,412.22 L41.39,411.63 L44.03,413.46 L46.99,413.14 L51.79,409.69 " +
  "L55.07,408.72 L58.14,406.67 L64.88,398.05 L72.47,392.51 L75.54,388.41 L76.03,386.1 " +
  "L74.52,378.55 L75.17,377.32 L75.27,375.65 L74.3,370.74 L75.27,358.84 L78.61,340.95 " +
  "L80.5,335.19 L84.05,327.54 L85.56,320.59 L85.46,310.14 L83.73,296.84 L85.56,293.07 " +
  "L86.59,288.97 L87.66,275.72 L91.33,267.8 L94.34,259.29 L101.29,230.36 L108.13,257.51 " +
  "L111.04,265.7 L115.68,275.67 L116.91,288.76 L117.99,293.12 L119.88,297.11 L119.93,301.25 " +
  "L118.8,310.79 L119.07,321.35 L120.52,327.59 L124.29,335.3 L125.86,339.61 L128.44,351.46 " +
  "L130.92,368.43 L130.11,375.21 L130.33,377.05 L131.19,378.45 L130.27,385.5 L130.65,388.9 " +
  "L133.13,392.45 L140.83,398.16 L145.79,404.95 L148.16,407.32 L150.58,408.77 L153.98,409.85 " +
  "L158.23,413.3 L160.82,413.95 L162.43,413.41 L164.43,411.58 L166.2,412.17 L167.98,411.14 " +
  "L169.76,410.93 L171.43,409.26 L171.59,408.29 L171.16,407.48 L171.38,406.24 L170.46,404.52 " +
  "L165.23,399.99 L149.77,378.99 L148.37,376.24 L147.03,371.12 L147.3,337.88 L146.7,315.31 " +
  "L145.79,305.4 L142.39,292.47 L142.23,284.12 L140.94,273.62 L141.32,264.46 L143.26,248.03 " +
  "L143.09,231.06 L140.46,211.24 L134.75,184.36 L135.07,178.0 L133.24,169.17 L133.78,165.24 " +
  "L133.67,152.25 L135.28,131.24 L136.63,128.44 L138.95,136.36 L142.66,144.77 L142.88,156.89 " +
  "L144.06,164.32 L150.26,185.11 L154.68,197.56 L153.6,202.73 L153.33,207.85 L153.92,218.94 " +
  "L154.73,222.77 L154.84,235.7 L156.35,235.86 L157.75,232.84 L158.72,237.58 L159.52,238.23 " +
  "L160.71,237.63 L161.14,235.32 L161.3,225.68 L163.73,238.5 L164.75,239.52 L166.2,239.04 " +
  "L166.1,222.82 L169.44,234.94 L171.65,238.01 L172.18,237.96 L172.72,236.56 L171.21,219.32 " +
  "L173.75,222.07 L175.47,222.98 L178.16,222.98 L179.03,221.85 L175.85,215.87 L173.1,205.21 " +
  "L166.37,195.72 L163.56,158.23 L162.27,151.12 L159.85,143.85 L160.22,134.64 L159.09,125.91 " +
  "L154.46,108.24 L155.11,96.71 L154.51,92.35 L153.11,87.77 L148.59,79.21 L145.95,76.35 " +
  "L143.04,74.09 L138.46,71.5 L129.41,68.97 L112.23,60.3 L112.28,52.22 L112.61,49.9 " +
  "L113.9,47.21 L114.38,43.92 L115.89,43.87 L116.75,43.33 L119.23,39.45 L119.82,37.51 " +
  "L119.61,32.61 L118.53,31.53 L117.24,31.96 L118.15,25.07 L117.35,18.71 L114.54,13.33 " +
  "L111.96,10.58 L109.43,8.75 L103.07,6.38 Z";

function figureSvgMarkup() {
  return `
    <svg class="yvy2-figure" viewBox="0 0 200 420" preserveAspectRatio="xMidYMid meet">
      <path d="${FIGURE_OUTLINE_PATH}" fill="none" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
}

// ==========================================================
// STRANDS ORB — puerto vanilla del componente React "Strands"
// (ogl). Hebras luminosas dentro de una esfera de cristal con
// refracción y dispersión en el borde. Un renderer por masa.
// ==========================================================

const MAX_STRANDS = 12;
const MAX_COLORS = 8;

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColors[${MAX_COLORS}];
uniform int uColorCount;
uniform int uStrandCount;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaviness;
uniform float uThickness;
uniform float uGlow;
uniform float uTaper;
uniform float uSpread;
uniform float uHueShift;
uniform float uIntensity;
uniform float uOpacity;
uniform float uScale;
uniform float uSaturation;

out vec4 fragColor;

const float PI = 3.14159265;

vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(2.0 * PI * (t + vec3(0.00, 0.33, 0.67)));
}

vec3 samplePalette(float t) {
  t = fract(t);
  float scaled = t * float(uColorCount);
  int idx = int(floor(scaled));
  float blend = fract(scaled);
  int nextIdx = idx + 1;
  if (nextIdx >= uColorCount) nextIdx = 0;
  return mix(uColors[idx], uColors[nextIdx], blend);
}

vec3 strandColor(float t) {
  if (uColorCount > 0) return samplePalette(t);
  return spectrum(t);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  uv /= max(uScale, 0.0001);

  float e = 0.06 + uIntensity * 0.94;
  float env = pow(max(cos(uv.x * PI * 1.3), 0.0), uTaper);

  vec3 col = vec3(0.0);

  for (int i = 0; i < ${MAX_STRANDS}; i++) {
    if (i >= uStrandCount) break;

    float fi = float(i);
    float ph = fi * 1.7 * uSpread;
    float freq = (2.0 + fi * 0.35) * uWaviness;
    float spd = 1.4 + fi * 1.2;

    float tt = uTime * uSpeed;
    float w = sin(uv.x * freq + tt * spd + ph) * 0.60
            + sin(uv.x * freq * 1.1 - tt * spd * 0.7 + ph * 1.7) * 0.40;

    float amp = (0.1 + 0.02 * e) * env * uAmplitude;
    float y = w * amp;

    float d = abs(uv.y - y);
    float thick = (0.001 + 0.05 * e) * (0.35 + env) * uThickness;
    float g = thick / (d + thick * 0.45);
    g = g * g;

    float h = fi / float(uStrandCount) + uv.x * 0.30 + uTime * 0.04 + uHueShift;
    col += strandColor(h) * g * env;
  }

  col *= 0.45 + 0.7 * e;
  col = 1.0 - exp(-col * uGlow);

  float gray = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(gray), col, uSaturation), 0.0);

  float lum = max(max(col.r, col.g), col.b);
  float alpha = clamp(lum, 0.0, 1.0) * uOpacity;

  fragColor = vec4(col * uOpacity, alpha);
}
`;

const GLASS_FRAG = `#version 300 es
precision highp float;

uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uRadius;
uniform float uRefraction;
uniform float uDispersion;

out vec4 fragColor;

vec2 toUv(vec2 p) {
  return p * (uResolution.y / uResolution) + 0.5;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float d = length(p);
  float r = uRadius;

  float edge = fwidth(d) * 1.5;
  float mask = 1.0 - smoothstep(r - edge, r + edge, d);
  if (mask <= 0.0) {
    fragColor = vec4(0.0);
    return;
  }

  float z = sqrt(max(r * r - d * d, 0.0)) / r;
  float nd = d / r;

  vec2 dir = d > 0.0 ? p / d : vec2(0.0);
  float lens = smoothstep(0.85, 1.0, nd) * pow(nd, 6.0);
  vec2 offset = -dir * lens * uRefraction * 0.15;
  vec2 disp = -dir * lens * uDispersion * 0.012;

  vec3 light;
  light.r = texture(uScene, toUv(p + offset - disp)).r;
  light.g = texture(uScene, toUv(p + offset)).g;
  light.b = texture(uScene, toUv(p + offset + disp)).b;

  float fres = pow(1.0 - z, 3.0);
  vec3 rim = vec3(1.0) * fres * 0.18;

  vec2 lightDir = normalize(vec2(-0.55, 0.6));
  float spec = pow(max(dot(p / max(r, 1e-4), lightDir), 0.0), 6.0);
  spec *= smoothstep(r, r * 0.55, d);

  vec3 emissive = light + rim + vec3(spec) * 0.4;
  float emissiveA = clamp(max(max(emissive.r, emissive.g), emissive.b), 0.0, 1.0);

  float bodyA = 0.05 + fres * 0.05;

  float outA = emissiveA + bodyA * (1.0 - emissiveA);
  vec3 outRGB = emissive;

  outRGB *= mask;
  outA *= mask;

  fragColor = vec4(outRGB, outA);
}
`;

function buildPalette(colors) {
  const filled = colors && colors.length ? colors : ["#ffffff"];
  const padded = [];
  for (let i = 0; i < MAX_COLORS; i++) {
    const hex = filled[i] ?? filled[filled.length - 1];
    const c = new Color(hex);
    padded.push([c.r, c.g, c.b]);
  }
  return padded;
}

// Parámetros afinados para una masa pequeña (≈56-68 px) en móvil.
const ORB_BASE = {
  count: 4,
  speed: 0.5,
  amplitude: 1.1,
  waviness: 1.2,
  thickness: 0.9,
  glow: 2.6,
  taper: 2.4,
  spread: 1,
  hueShift: 0,
  intensity: 0.6,
  saturation: 1.5,
  opacity: 1,
  scale: 1.15,
  refraction: 1,
  dispersion: 1,
  glassSize: 1
};

// Estado "activa/hover": las hebras se aceleran e iluminan.
const ORB_EXCITED = {
  speed: 1.25,
  intensity: 1.0,
  glow: 3.3,
  thickness: 1.05
};

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Crea una masa Strands dentro de `host` (un elemento posicionado
 * del tamaño de la masa). Devuelve { setExcited(bool), destroy() }
 * o `null` si WebGL2 no está disponible.
 */
function createStrandsOrb(host, colors) {
  let renderer;
  try {
    renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      webgl: 2
    });
  } catch {
    return null;
  }
  const gl = renderer.gl;
  if (!gl || typeof WebGL2RenderingContext === "undefined" ||
      !(gl instanceof WebGL2RenderingContext)) {
    return null;
  }

  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.canvas.classList.add("yvy2-orb-canvas");

  const geometry = new Triangle(gl);
  if (geometry.attributes.uv) delete geometry.attributes.uv;

  const state = { ...ORB_BASE, colors, excited: false };

  const program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: [1, 1] },
      uColors: { value: buildPalette(colors) },
      uColorCount: { value: Math.min(colors.length, MAX_COLORS) },
      uStrandCount: { value: state.count },
      uSpeed: { value: state.speed },
      uAmplitude: { value: state.amplitude },
      uWaviness: { value: state.waviness },
      uThickness: { value: state.thickness },
      uGlow: { value: state.glow },
      uTaper: { value: state.taper },
      uSpread: { value: state.spread },
      uHueShift: { value: state.hueShift },
      uIntensity: { value: state.intensity },
      uOpacity: { value: state.opacity },
      uScale: { value: state.scale },
      uSaturation: { value: state.saturation }
    }
  });
  const mesh = new Mesh(gl, { geometry, program });

  const renderTarget = new RenderTarget(gl, { width: 2, height: 2 });
  const glassProgram = new Program(gl, {
    vertex: VERT,
    fragment: GLASS_FRAG,
    uniforms: {
      uScene: { value: renderTarget.texture },
      uResolution: { value: [1, 1] },
      uRadius: { value: 0.46 * state.glassSize },
      uRefraction: { value: state.refraction },
      uDispersion: { value: state.dispersion }
    }
  });
  const glassMesh = new Mesh(gl, { geometry, program: glassProgram });

  host.appendChild(gl.canvas);

  function resize() {
    const w = host.offsetWidth || 56;
    const h = host.offsetHeight || 56;
    renderer.setSize(w, h);
    program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
    renderTarget.setSize(gl.canvas.width, gl.canvas.height);
    glassProgram.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
  }
  resize();
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  ro?.observe(host);

  // Transición suave entre reposo y excitado.
  let mix = 0; // 0 = reposo, 1 = excitado
  let animateId = 0;
  let lastT = 0;

  function update(t) {
    animateId = requestAnimationFrame(update);
    const dt = lastT ? Math.min((t - lastT) / 1000, 0.1) : 0.016;
    lastT = t;

    const target = state.excited ? 1 : 0;
    mix += (target - mix) * Math.min(dt * 7, 1);

    const lerp = (a, b) => a + (b - a) * mix;
    program.uniforms.uTime.value = REDUCED_MOTION ? 0 : t * 0.001;
    program.uniforms.uSpeed.value = REDUCED_MOTION ? 0 : lerp(ORB_BASE.speed, ORB_EXCITED.speed);
    program.uniforms.uIntensity.value = lerp(ORB_BASE.intensity, ORB_EXCITED.intensity);
    program.uniforms.uGlow.value = lerp(ORB_BASE.glow, ORB_EXCITED.glow);
    program.uniforms.uThickness.value = lerp(ORB_BASE.thickness, ORB_EXCITED.thickness);

    renderer.render({ scene: mesh, target: renderTarget });
    glassProgram.uniforms.uScene.value = renderTarget.texture;
    renderer.render({ scene: glassMesh });
  }
  animateId = requestAnimationFrame(update);

  return {
    setExcited(on) {
      state.excited = !!on;
    },
    destroy() {
      cancelAnimationFrame(animateId);
      ro?.disconnect();
      if (gl.canvas.parentNode === host) host.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  };
}

/**
 * Monta el componente YOU VS YOU dentro de `container`.
 * @param {HTMLElement} container
 * @param {{ onSelect?: (zone: "mind"|"heart"|"body") => void, initialActive?: string }} options
 */
export function mountYouVsYou(container, options = {}) {
  const { onSelect, initialActive = null } = options;

  container.classList.add("yvy2-wrap");
  container.innerHTML = `
    ${figureSvgMarkup()}
    ${ZONES.map(
      (z) => `
      <button type="button" class="yvy2-hotspot" data-zone="${z}" aria-label="${ZONE_LABELS[z]}"
        style="left:${ZONE_POSITIONS[z].x * 100}%; top:${ZONE_POSITIONS[z].y * 100}%;">
        <span class="yvy2-orb" aria-hidden="true"></span>
        <span class="yvy2-hotspot-dot" aria-hidden="true"></span>
        <span class="yvy2-tooltip">${ZONE_LABELS[z]}</span>
      </button>`
    ).join("")}
  `;

  const hotspots = Array.from(container.querySelectorAll(".yvy2-hotspot"));
  const orbs = new Map(); // zone -> instancia strands (o null si fallback CSS)

  hotspots.forEach((btn) => {
    const zone = btn.dataset.zone;
    const host = btn.querySelector(".yvy2-orb");
    let orb = null;
    try {
      orb = createStrandsOrb(host, ZONE_COLORS[zone]);
    } catch {
      orb = null;
    }
    if (orb) {
      btn.classList.add("has-orb"); // oculta el dot CSS de fallback
    }
    orbs.set(zone, orb);

    // Hover/focus también excita la masa (además del estado activo).
    const excite = (on) => {
      const isActive = btn.classList.contains("is-active");
      orbs.get(zone)?.setExcited(on || isActive);
    };
    btn.addEventListener("pointerenter", () => excite(true));
    btn.addEventListener("pointerleave", () => excite(false));
    btn.addEventListener("focus", () => excite(true));
    btn.addEventListener("blur", () => excite(false));
  });

  let activeZone = initialActive;
  function applyActiveClass() {
    hotspots.forEach((btn) => {
      const isActive = btn.dataset.zone === activeZone;
      btn.classList.toggle("is-active", isActive);
      orbs.get(btn.dataset.zone)?.setExcited(isActive);
    });
  }
  function setActive(zone, { silent = false } = {}) {
    activeZone = zone;
    applyActiveClass();
    if (!silent && typeof onSelect === "function") onSelect(zone);
  }
  if (initialActive) applyActiveClass();

  hotspots.forEach((btn) => {
    const zone = btn.dataset.zone;
    btn.addEventListener("click", () => setActive(zone));
  });

  return {
    setActive,
    destroy() {
      orbs.forEach((orb) => orb?.destroy());
      orbs.clear();
      container.innerHTML = "";
      container.classList.remove("yvy2-wrap");
    }
  };
}
