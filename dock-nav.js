// ==========================================================
// DOCK NAV — navegación inferior tipo dock de macOS (drop-in).
// Puerto vanilla del componente <Dock /> de React Bits
// (original: React + motion), adaptado a la paleta de FOCUS.
//
// USO — una sola línea antes de </body> en cada página:
//
//   <script type="module" src="dock-nav.js"></script>
//
// Al cargarse, este módulo hace todo lo demás por sí solo:
//   1. Inyecta su propio CSS (no hace falta <link>).
//   2. Elimina el <footer class="footer"> antiguo con la
//      .bottom-nav (si existe).
//   3. Monta el dock flotante en su lugar.
//   4. Detecta la página actual por la URL y marca el item
//      activo en dorado.
//   5. Añade padding-bottom al <body> para que el contenido
//      no quede tapado por el dock.
//
// También exporta mountDockNav(container, options) por si en
// el futuro quieres montarlo manualmente con otra configuración.
// ==========================================================

// ---------- iconos (los mismos de la app, línea fina) ----------
const ICONS = {
  memories: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4 17l4.5-4.5a1.5 1.5 0 0 1 2.1 0L13 15l2-2a1.5 1.5 0 0 1 2.1 0L20 16"/></svg>`,
  socialclub: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-7Z"/></svg>`,
  communities: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5.5" r="2.3"/><circle cx="6" cy="17" r="2.3"/><circle cx="18" cy="17" r="2.3"/><path d="M10.3 7.3 7.3 15.1M13.7 7.3l3 7.8M8.3 17h7.4"/></svg>`,
  legacy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-9"/><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6Z"/><path d="M12 15c0-4 3-6 7-6 0 4-3 6-7 6Z"/></svg>`
};

const DEFAULT_ITEMS = [
  { key: "memories",    label: "Memories.",    href: "memories.html" },
  { key: "socialclub",  label: "Socialclub.",  href: "socialclub.html" },
  { key: "communities", label: "Communities.", href: "communities.html" },
  { key: "legacy",      label: "Legacy.",      href: "legacy.html" }
];

// ---------- CSS inyectado (no hace falta fichero aparte) ----------
const DOCK_CSS = `
.dock-outer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 900;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  height: calc(var(--dock-mag, 68px) + 28px);
  padding-bottom: calc(0.6rem + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
}
.dock-panel {
  pointer-events: auto;
  display: flex;
  align-items: flex-end;
  gap: 0.7rem;
  width: fit-content;
  max-width: calc(100vw - 1.5rem);
  padding: 0 0.6rem 0.55rem;
  border-radius: 1.1rem;
  background-color: rgba(18, 15, 23, 0.88);
  border: 1px solid #26232e;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}
.dock-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--dock-base, 46px);
  height: var(--dock-base, 46px);
  border-radius: 12px;
  background-color: #1b1823;
  border: 1px solid #26232e;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.25),
    0 2px 4px -1px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  outline: none;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.2s ease, background-color 0.2s ease;
  flex-shrink: 0;
}
.dock-item:focus-visible { border-color: #D4AF6D; }
.dock-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52%;
  height: 52%;
}
.dock-icon svg {
  width: 100%;
  height: 100%;
  color: #8a8794;
  transition: color 0.2s ease;
}
.dock-item:hover .dock-icon svg { color: #d6d3de; }
.dock-item.is-active {
  background-color: rgba(212, 175, 109, 0.10);
  border-color: rgba(212, 175, 109, 0.45);
}
.dock-item.is-active .dock-icon svg { color: #D4AF6D; }
.dock-item.is-active::after {
  content: "";
  position: absolute;
  bottom: -9px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: #D4AF6D;
}
.dock-label {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translate(-50%, 4px);
  width: fit-content;
  white-space: pre;
  border-radius: 0.4rem;
  border: 1px solid #2a2733;
  background-color: #120F17;
  padding: 0.16rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: #fff;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.dock-item:hover .dock-label,
.dock-item:focus-visible .dock-label {
  opacity: 1;
  transform: translate(-50%, 0);
}
@media (hover: none) {
  .dock-label { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .dock-label { transition: none; }
}
`;

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- física de muelle (equivalente a useSpring de motion) ----------
function createSpring(initial, { mass = 0.1, stiffness = 150, damping = 12 } = {}) {
  let value = initial;
  let velocity = 0;
  let target = initial;
  return {
    setTarget(t) { target = t; },
    snap(t) { target = t; value = t; velocity = 0; },
    step(dt) {
      const steps = Math.max(1, Math.ceil(dt / 0.008));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        const force = -stiffness * (value - target) - damping * velocity;
        velocity += (force / mass) * h;
        value += velocity * h;
      }
      return value;
    },
    get value() { return value; },
    get settled() {
      return Math.abs(value - target) < 0.05 && Math.abs(velocity) < 0.05;
    }
  };
}

/**
 * Monta el dock dentro de `container`. Uso manual opcional;
 * normalmente no hace falta llamarlo: el módulo se auto-monta.
 */
export function mountDockNav(container, options = {}) {
  const {
    active = null,
    items = DEFAULT_ITEMS,
    baseItemSize = 46,
    magnification = 68,
    distance = 130,
    spring = { mass: 0.1, stiffness: 150, damping: 12 }
  } = options;

  container.classList.add("dock-outer");
  container.setAttribute("role", "toolbar");
  container.setAttribute("aria-label", "Navegación principal");
  container.style.setProperty("--dock-base", `${baseItemSize}px`);
  container.style.setProperty("--dock-mag", `${magnification}px`);

  container.innerHTML = `
    <div class="dock-panel">
      ${items.map((item) => `
        <a class="dock-item${item.key === active ? " is-active" : ""}"
           href="${item.href}" data-key="${item.key}"
           aria-label="${item.label}"
           ${item.key === active ? 'aria-current="page"' : ""}>
          <span class="dock-icon">${ICONS[item.key] ?? ""}</span>
          <span class="dock-label" role="tooltip">${item.label}</span>
        </a>`).join("")}
    </div>
  `;

  const panel = container.querySelector(".dock-panel");
  const els = Array.from(container.querySelectorAll(".dock-item"));
  const springs = els.map(() => createSpring(baseItemSize, spring));

  let pointerX = Infinity;
  let raf = 0;
  let running = false;
  let lastT = 0;

  function frame(t) {
    const dt = lastT ? Math.min((t - lastT) / 1000, 0.05) : 0.016;
    lastT = t;

    let anySettling = false;
    els.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const d = pointerX === Infinity ? Infinity : Math.abs(pointerX - center);

      const target = d >= distance
        ? baseItemSize
        : baseItemSize + (magnification - baseItemSize) * (1 - d / distance);

      springs[i].setTarget(target);
      const size = REDUCED_MOTION
        ? (springs[i].snap(target), target)
        : springs[i].step(dt);

      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      if (!springs[i].settled) anySettling = true;
    });

    if (anySettling || pointerX !== Infinity) {
      raf = requestAnimationFrame(frame);
    } else {
      running = false;
      lastT = 0;
    }
  }

  function wake() {
    if (!running) {
      running = true;
      raf = requestAnimationFrame(frame);
    }
  }

  function onMove(e) { pointerX = e.clientX; wake(); }
  function onLeave() { pointerX = Infinity; wake(); }

  panel.addEventListener("pointermove", onMove);
  panel.addEventListener("pointerdown", onMove);
  panel.addEventListener("pointerleave", onLeave);
  panel.addEventListener("pointerup", onLeave);
  panel.addEventListener("pointercancel", onLeave);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      panel.removeEventListener("pointermove", onMove);
      panel.removeEventListener("pointerdown", onMove);
      panel.removeEventListener("pointerleave", onLeave);
      panel.removeEventListener("pointerup", onLeave);
      panel.removeEventListener("pointercancel", onLeave);
      container.innerHTML = "";
      container.classList.remove("dock-outer");
    }
  };
}

// ==========================================================
// AUTO-MONTAJE — se ejecuta al importar el módulo.
// ==========================================================

function detectActiveKey() {
  const path = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const found = DEFAULT_ITEMS.find((item) => path.startsWith(item.key));
  return found ? found.key : null; // index.html u otras -> ninguno activo
}

function injectCss() {
  if (document.getElementById("dock-nav-styles")) return;
  const style = document.createElement("style");
  style.id = "dock-nav-styles";
  style.textContent = DOCK_CSS;
  document.head.appendChild(style);
}

function removeOldFooter() {
  // Elimina el footer antiguo con la .bottom-nav (si sigue en el HTML,
  // no pasa nada por dejarlo: este módulo lo quita solo).
  document.querySelectorAll("footer .bottom-nav").forEach((nav) => {
    const footer = nav.closest("footer");
    (footer ?? nav).remove();
  });
}

function ensureBodyPadding() {
  // Colchón para que el dock flotante no tape el final del contenido.
  const current = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
  if (current < 110) document.body.style.paddingBottom = "110px";
}

function autoInit() {
  injectCss();
  removeOldFooter();
  ensureBodyPadding();
  let mount = document.getElementById("dockNav");
  if (!mount) {
    mount = document.createElement("div");
    mount.id = "dockNav";
  }
  // Colgado de <html>, no de <body>: el body tiene transform
  // (animación pageFadeIn) y un transform en un ancestro rompe
  // el position:fixed — el dock quedaría al final del documento
  // en vez de flotar sobre el viewport. Mismo truco que splash.js.
  document.documentElement.appendChild(mount);
  mountDockNav(mount, { active: detectActiveKey() });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoInit, { once: true });
} else {
  autoInit();
}
