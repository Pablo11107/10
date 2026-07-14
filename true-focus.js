// ==========================================================
// TRUE FOCUS — puerto vanilla del componente <TrueFocus /> de
// React Bits (original: React + motion). Las palabras de una
// frase alternan entre desenfocadas y nítidas, y un marco de
// enfoque (4 esquinas, estilo visor de cámara) viaja hasta la
// palabra activa. Encaja con la identidad de FOCUS: es
// literalmente un autofocus recorriendo el wordmark.
//
// Uso:
//   import { mountTrueFocus } from "./true-focus.js";
//   const tf = mountTrueFocus(document.getElementById("focusTitle"), {
//     sentence: "True Focus.",
//     borderColor: "#57e32c",
//     glowColor: "rgba(87, 227, 44, 0.6)"
//   });
//   tf.destroy(); // si hiciera falta desmontarlo
//
// Sin dependencias: inyecta su propio CSS. La tipografía la
// hereda del elemento donde se monta.
// ==========================================================

const TF_CSS = `
.tf-container {
  position: relative;
  display: flex;
  gap: 0.35em;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}
.tf-word {
  position: relative;
  cursor: default;
  transition: filter var(--tf-duration, 0.5s) ease;
}
.tf-frame {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  box-sizing: content-box;
  border: none;
  opacity: 0;
  transition:
    transform var(--tf-duration, 0.5s) cubic-bezier(0.4, 0, 0.2, 1),
    width var(--tf-duration, 0.5s) cubic-bezier(0.4, 0, 0.2, 1),
    height var(--tf-duration, 0.5s) cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.3s ease;
}
.tf-corner {
  position: absolute;
  width: 0.5em;
  height: 0.5em;
  border: 3px solid var(--tf-border-color, #57e32c);
  filter: drop-shadow(0 0 4px var(--tf-glow-color, rgba(87, 227, 44, 0.6)));
  border-radius: 3px;
}
.tf-corner.tl { top: -10px; left: -10px; border-right: none; border-bottom: none; }
.tf-corner.tr { top: -10px; right: -10px; border-left: none; border-bottom: none; }
.tf-corner.bl { bottom: -10px; left: -10px; border-right: none; border-top: none; }
.tf-corner.br { bottom: -10px; right: -10px; border-left: none; border-top: none; }
@media (prefers-reduced-motion: reduce) {
  .tf-word, .tf-frame { transition: none; }
}
`;

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function injectCss() {
  if (document.getElementById("true-focus-styles")) return;
  const style = document.createElement("style");
  style.id = "true-focus-styles";
  style.textContent = TF_CSS;
  document.head.appendChild(style);
}

/**
 * Monta el efecto TrueFocus dentro de `container`.
 * Opciones (mismas que el componente original):
 *   sentence, separator, manualMode, blurAmount, borderColor,
 *   glowColor, animationDuration, pauseBetweenAnimations
 */
export function mountTrueFocus(container, options = {}) {
  const {
    sentence = "True Focus",
    separator = " ",
    manualMode = false,
    blurAmount = 5,
    borderColor = "#57e32c",
    glowColor = "rgba(87, 227, 44, 0.6)",
    animationDuration = 0.5,
    pauseBetweenAnimations = 1
  } = options;

  injectCss();

  const words = sentence.split(separator);
  container.classList.add("tf-container");
  container.style.setProperty("--tf-duration", `${animationDuration}s`);
  container.style.setProperty("--tf-border-color", borderColor);
  container.style.setProperty("--tf-glow-color", glowColor);

  container.innerHTML =
    words.map((w) => `<span class="tf-word">${w}</span>`).join("") +
    `<div class="tf-frame" aria-hidden="true">
       <span class="tf-corner tl"></span><span class="tf-corner tr"></span>
       <span class="tf-corner bl"></span><span class="tf-corner br"></span>
     </div>`;

  const wordEls = Array.from(container.querySelectorAll(".tf-word"));
  const frame = container.querySelector(".tf-frame");

  let currentIndex = 0;
  let lastActiveIndex = 0;
  let interval = null;

  function applyFocus(index) {
    wordEls.forEach((el, i) => {
      el.style.filter = i === index ? "blur(0px)" : `blur(${REDUCED_MOTION ? 0 : blurAmount}px)`;
    });
    const el = wordEls[index];
    if (!el) return;
    const parentRect = container.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    frame.style.opacity = "1";
    frame.style.width = `${rect.width}px`;
    frame.style.height = `${rect.height}px`;
    frame.style.transform =
      `translate(${rect.left - parentRect.left}px, ${rect.top - parentRect.top}px)`;
  }

  function start() {
    if (manualMode || words.length < 2) return;
    interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % words.length;
      applyFocus(currentIndex);
    }, (animationDuration + pauseBetweenAnimations) * 1000);
  }

  // Modo manual (o interacción extra en modo auto no la hay,
  // fiel al original): hover enfoca la palabra señalada.
  if (manualMode) {
    wordEls.forEach((el, i) => {
      el.addEventListener("mouseenter", () => {
        lastActiveIndex = i;
        currentIndex = i;
        applyFocus(i);
      });
      el.addEventListener("mouseleave", () => {
        currentIndex = lastActiveIndex;
        applyFocus(lastActiveIndex);
      });
    });
  }

  const onResize = () => applyFocus(currentIndex);
  window.addEventListener("resize", onResize);

  // Primer posicionado cuando la fuente ya está cargada (si el
  // marco se midiera con la fuente fallback quedaría descuadrado).
  const initialPaint = () => { applyFocus(0); start(); };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(initialPaint);
  } else {
    setTimeout(initialPaint, 60);
  }

  return {
    destroy() {
      clearInterval(interval);
      window.removeEventListener("resize", onResize);
      container.innerHTML = "";
      container.classList.remove("tf-container");
    }
  };
}
