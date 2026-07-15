# FOCUS — Verificación de email + Login con Google

Dos piezas: (1) `verify-email.html` (archivo nuevo), (2) cambios en
`firebase-init.js` y `login.html`. Al final, la configuración en la consola
de Firebase. El login con Apple queda aparcado para cuando tengas cuenta de
Apple Developer (hay una nota al final para retomarlo).

---

## 1. Cambios en `firebase-init.js`

### 1.1 Amplía el import de firebase-auth

Sustituye el bloque de import actual:

```js
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
```

por:

```js
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
```

### 1.2 Añade el proveedor de Google (debajo de la sección "Autenticación")

```js
// =======================================================
// Login social: Google
// Google ya verifica el email por su cuenta, así que sus
// usuarios entran directos sin paso de verificación.
// =======================================================

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}
```

> Nota móvil: si más adelante detectas que el popup falla en navegadores
> móviles dentro de apps (Instagram, etc.), cambia `signInWithPopup` por
> `signInWithRedirect` + `getRedirectResult`. Para empezar, el popup es
> más simple y funciona en la gran mayoría de casos.

### 1.3 Bloquea usuarios sin verificar en `requireAuth()`

Dentro de `requireAuth()`, justo después de `if (user) {` y ANTES de guardar
el email en Firestore, añade esta comprobación:

```js
export function requireAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        // --- NUEVO: exigir email verificado a los usuarios de contraseña ---
        const usaPassword = user.providerData.some(p => p.providerId === "password");
        if (usaPassword && !user.emailVerified) {
          window.location.href = "verify-email.html";
          return;
        }
        // -------------------------------------------------------------------

        try {
          await setDoc(doc(db, "users", user.uid), { email: (user.email || "").toLowerCase() }, { merge: true });
        } catch (err) {
          console.error("No se pudo guardar el email del usuario:", err);
        }
        resolve(user);
      } else {
        window.location.href = "login.html";
      }
    });
  });
}
```

Con esto, aunque alguien manipule el flujo del login, ninguna página de la app
(todas llaman a `requireAuth()`) le dejará pasar sin verificar.

---

## 2. Cambios en `login.html`

### 2.1 Import: añade `sendEmailVerification` y el helper de Google

```js
import { auth, loginWithGoogle } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
```

### 2.2 Redirección inicial: respeta la verificación

Sustituye el `onAuthStateChanged` inicial por:

```js
onAuthStateChanged(auth, (user) => {
  if (user) {
    const usaPassword = user.providerData.some(p => p.providerId === "password");
    if (usaPassword && !user.emailVerified) {
      window.location.href = "verify-email.html";
    } else {
      sessionStorage.setItem("focus-entry", "login");
      window.location.href = "index.html";
    }
  }
});
```

### 2.3 Registro: envía el email de verificación

Sustituye el bloque `try` del submit por:

```js
try {
  if (mode === "login") {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (!cred.user.emailVerified) {
      window.location.href = "verify-email.html";
      return;
    }
    sessionStorage.setItem("focus-entry", "login");
    window.location.href = "index.html";
  } else {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    sessionStorage.setItem("focus-entry", "signup");
    window.location.href = "verify-email.html";
  }
} catch (err) {
  errorMsg.textContent = translateError(err.code);
  submitBtn.disabled = false;
}
```

### 2.4 Botón de Google

Debajo del `</form>` (antes del `<p id="errorMsg">`), añade:

```html
<div class="social-divider"><span>o continúa con</span></div>

<button type="button" class="social-btn" id="googleBtn">
  <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l3.7 2.9c2.2-2.1 3.7-5.1 3.7-8.6z"/><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.8-5.1L1.3 17.2C3.3 21.2 7.3 24 12 24z"/><path fill="#FBBC05" d="M5.2 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3L1.3 6.8C.5 8.4 0 10.1 0 12s.5 3.6 1.3 5.2l3.9-2.9z"/><path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.3 0 3.3 2.8 1.3 6.8l3.9 2.9c.9-3 3.6-5 6.8-5z"/></svg>
  Google
</button>
```

Y en el `<style>` de la página:

```css
.social-divider {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin: 1.5rem 0 0.5rem;
  color: #666;
  font-size: 0.8rem;
}
.social-divider::before,
.social-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background-color: #2a2a2a;
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  width: 100%;
  margin-top: 0.8rem;
  padding: 0.8rem;
  background-color: #1f1f1f;
  color: #fff;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background-color 0.3s;
}
.social-btn:hover { background-color: #2a2a2a; }
```

### 2.5 Listener del botón (al final del script)

```js
document.getElementById("googleBtn").addEventListener("click", async () => {
  errorMsg.textContent = "";
  try {
    await loginWithGoogle();
    sessionStorage.setItem("focus-entry", "login");
    window.location.href = "index.html";
  } catch (err) {
    if (err.code !== "auth/popup-closed-by-user") {
      errorMsg.textContent = "No se pudo iniciar sesión con Google.";
    }
  }
});
```

---

## 3. Configuración en la consola de Firebase

### Verificación de email (nada que activar)
Funciona de serie. Opcional: en **Authentication → Templates → Verificación
de dirección de correo** puedes personalizar el texto y ponerlo en español.

### Google (2 minutos)
1. Firebase console → **Authentication → Sign-in method → Google → Habilitar**.
2. Pon un email de soporte y guarda. Listo.

### Dominios autorizados
En **Authentication → Settings → Authorized domains**, asegúrate de que está
el dominio donde sirves la app (localhost ya viene incluido; añade tu dominio
de producción cuando lo tengas).

---

## 4. Detalle importante: cuentas ya existentes

Los usuarios registrados ANTES de este cambio tienen `emailVerified: false`
y quedarán bloqueados en `verify-email.html` hasta que verifiquen. La página
les permite reenviarse el enlace, así que se resuelve solo, pero avísales si
ya tienes usuarios activos.

Otro caso: si alguien se registró con `ana@gmail.com` por contraseña y luego
entra con Google usando ese mismo Gmail, Firebase vincula ambas cuentas por
defecto (el proveedor verificado "gana"). Es el comportamiento deseado aquí.

---

## 5. Para más adelante: añadir Apple

Cuando tengas la cuenta de Apple Developer (99 $/año):

1. En developer.apple.com: crea un App ID con "Sign in with Apple", un
   Services ID (con dominio `focus-app-2746d.firebaseapp.com` y return URL
   `https://focus-app-2746d.firebaseapp.com/__/auth/handler`) y una Key `.p8`.
2. Firebase console → Authentication → Sign-in method → Apple → Habilitar,
   rellenando Services ID, Team ID, Key ID y el `.p8`.
3. En código, basta con añadir en `firebase-init.js`:

```js
import { OAuthProvider } from "..."; // añadir al import existente

export async function loginWithApple() {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  const result = await signInWithPopup(auth, provider);
  return result.user;
}
```

y duplicar el botón de Google en `login.html` con su listener equivalente.
