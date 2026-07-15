# FIX — Modal descentrado en móvil

## Causa

El `body` de tus páginas tiene la animación de entrada `pageFadeIn` con
`forwards`, que deja aplicado un `transform` permanente:

```css
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }   /* <- este transform se queda para siempre */
}
```

En CSS, un elemento con `transform` (aunque sea de 0px) se convierte en el
contenedor de posicionamiento de sus hijos `position: fixed`. Resultado: los
modales dejan de centrarse en la PANTALLA y se centran en el DOCUMENTO
completo. Con scroll (móvil), el modal aparece arriba del todo, lejos de
donde estás.

## Arreglo (2 cambios de CSS)

### Cambio 1 — el keyframe

En TODAS las páginas que tengan `pageFadeIn` (`index.html`, `socialclub.html`,
`communities.html`, `memories.html`, `legacy.html`), sustituye:

```css
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

por:

```css
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: none; }
}
```

Con `transform: none` en el estado final, cuando la animación termina el
`body` deja de ser contenedor de los `fixed` y los modales vuelven a anclarse
a la pantalla. La animación de entrada se ve exactamente igual.

### Cambio 2 — refuerzo para navegadores móviles

En `index.html`, en el bloque de overlays, sustituye:

```css
.modal-overlay, .modal-overlay-minutes, .modal-overlay-profile {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  ...
}
```

por:

```css
.modal-overlay, .modal-overlay-minutes, .modal-overlay-profile {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;   /* fallback para navegadores antiguos */
  height: 100dvh;  /* altura REAL del viewport en móvil (descuenta la barra del navegador) */
  ...resto igual...
}
```

`100dvh` es la altura dinámica del viewport: en iOS/Android tiene en cuenta
la barra de URL que aparece y desaparece, así que el modal queda centrado de
verdad. Haz lo mismo en los overlays de `communities.html` si usan `100vh`.

### Opcional (calidad de vida en móvil)

En `openMinutesModal()` de `index.html` hay un `minutesInput.focus()` con
`setTimeout`. En móvil eso abre el teclado nada más abrir el modal y desplaza
la vista. Si prefieres que el teclado solo salga cuando el usuario toque el
campo, cambia:

```js
setTimeout(() => minutesInput.focus(), 200);
```

por:

```js
if (!("ontouchstart" in window)) setTimeout(() => minutesInput.focus(), 200);
```

(En escritorio conserva el autofocus; en táctil no fuerza el teclado.)

## Cómo verificarlo

En el móvil: haz scroll hasta la última tarjeta (Sleep), toca para añadir
minutos y el modal debe aparecer centrado sobre lo que estás viendo, con el
fondo oscurecido completo. Prueba también los modales de Yes/No (Prayer/Diet)
y el de perfil.
