// ==========================================================
// YOU VS YOU — componente visual aislado y reutilizable
// Silueta humana frontal, plana y vectorial, estilo plantilla
// médica/fitness: relleno sólido turquesa, contorno blanco fino,
// sin gradientes, sin brillo, sin textura. + 3 puntos interactivos
// tipo "masa/chicle". Fondo negro plano, sin líneas de fondo.
//
// Uso:
//   import { mountYouVsYou } from "./you-vs-you.js";
//   const instance = mountYouVsYou(containerEl, {
//     onSelect: (zone) => { ... } // zone: "mind" | "heart" | "body"
//   });
//   instance.setActive("heart");
//   instance.destroy();
//
// No depende de ningún otro módulo ni estilo de la página que lo monta
// (salvo you-vs-you.css). No modifica nada fuera del contenedor recibido.
// ==========================================================

const ZONES = ["mind", "heart", "body"];
const ZONE_LABELS = { mind: "Mente", heart: "Corazón", body: "Cuerpo" };
// Posición relativa (0..1) de cada punto sobre el contenedor.
const ZONE_POSITIONS = {
  mind:  { x: 0.5,  y: 0.135 },
  heart: { x: 0.5,  y: 0.33 },
  body:  { x: 0.70, y: 0.375 }
};

// Silueta humana vectorial, dibujada como media figura y espejada con
// <use> para garantizar simetría perfecta. Relleno con gradiente sutil
// (sin trazo: la unión central queda invisible), halo suave detrás y
// sombra elíptica de suelo para anclarla.
const HALF_FIGURE_PATH =
  "M100,16 " +
  "C118,16 131,29 131,47 " +          // cráneo
  "C131,60 125,70 117,75 " +          // mandíbula
  "L117,86 " +                        // cuello
  "C124,90 133,92 141,96 " +          // trapecio
  "C151,101 156,108 158,117 " +       // hombro
  "C161,130 163,150 164,168 " +       // brazo (exterior)
  "L167,230 " +
  "C168,240 169,247 168,253 " +       // antebrazo
  "C173,259 174,267 170,271 " +       // mano
  "C166,275 160,273 158,267 " +
  "C156,261 155,254 154,247 " +
  "C152,235 150,221 149,209 " +       // brazo (interior)
  "L145,160 " +
  "C144,148 142,136 139,127 " +
  "C137,122 134,119 130,118 " +       // axila
  "C131,132 130,150 128,166 " +       // costado
  "C126,182 125,196 127,210 " +
  "C131,220 134,232 134,244 " +       // cadera
  "C134,262 131,286 128,308 " +       // pierna (exterior)
  "C126,330 124,352 123,372 " +
  "L123,392 " +
  "C123,400 129,404 137,406 " +       // pie
  "C141,408 139,412 133,412 " +
  "L112,412 " +
  "C108,412 106,408 107,402 " +
  "L108,388 " +
  "C109,368 110,348 109,328 " +       // pierna (interior)
  "C108,308 106,290 104,276 " +
  "C103,272 101,270 100,268 " +       // entrepierna
  "L100,16 Z";

function figureSvgMarkup() {
  return `
    <svg class="yvy2-figure" viewBox="0 0 200 420" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="yvy2Body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0"   stop-color="#2E2D3C"/>
          <stop offset="0.55" stop-color="#211F2C"/>
          <stop offset="1"   stop-color="#181722"/>
        </linearGradient>
        <radialGradient id="yvy2Halo" cx="0.5" cy="0.42" r="0.6">
          <stop offset="0"   stop-color="rgba(212,175,109,0.14)"/>
          <stop offset="0.6" stop-color="rgba(212,175,109,0.05)"/>
          <stop offset="1"   stop-color="rgba(212,175,109,0)"/>
        </radialGradient>
        <radialGradient id="yvy2Floor" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0"   stop-color="rgba(0,0,0,0.55)"/>
          <stop offset="0.7" stop-color="rgba(0,0,0,0.25)"/>
          <stop offset="1"   stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="200" height="420" fill="url(#yvy2Halo)"/>
      <ellipse cx="100" cy="410" rx="72" ry="9" fill="url(#yvy2Floor)"/>
      <g class="yvy2-figure-body">
        <path d="${HALF_FIGURE_PATH}" fill="url(#yvy2Body)"/>
        <use href="#yvy2HalfRef" transform="translate(200,0) scale(-1,1)"/>
        <path id="yvy2HalfRef" d="${HALF_FIGURE_PATH}" fill="url(#yvy2Body)"/>
      </g>
    </svg>`;
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
        <span class="yvy2-hotspot-dot"></span>
        <span class="yvy2-tooltip">${ZONE_LABELS[z]}</span>
      </button>`
    ).join("")}
  `;

  const hotspots = Array.from(container.querySelectorAll(".yvy2-hotspot"));

  let activeZone = initialActive;
  function applyActiveClass() {
    hotspots.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.zone === activeZone);
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
      container.innerHTML = "";
      container.classList.remove("yvy2-wrap");
    }
  };
}
