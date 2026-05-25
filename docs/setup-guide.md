# 🚀 Guía de Setup · Agente de Compras Acuarella

Guía paso a paso para subir el proyecto a **GitHub** y desplegarlo en **Netlify** con tu API key de Anthropic.

> ⏱️ Tiempo total estimado: **10-15 minutos**.

---

## 📋 Requisitos previos

Necesitas:

1. ✅ Una cuenta de **GitHub** (gratis): https://github.com
2. ✅ Una cuenta de **Netlify** (gratis): https://www.netlify.com
3. ✅ Una cuenta de **Anthropic Console**: https://console.anthropic.com
4. ✅ **Git** instalado localmente (opcional, también puedes subir vía web): https://git-scm.com
5. ✅ Una **API key de Anthropic** con créditos disponibles.

---

## 1️⃣ Crear el repositorio en GitHub

### Opción A — Vía interfaz web (sin git)

1. Entra a https://github.com/new
2. **Repository name:** `agente-compras-acuarella`
3. Marca **Public** (o Private si prefieres).
4. **NO** marques "Add a README" (ya tenemos uno).
5. Click en **Create repository**.

### Opción B — Vía Git CLI (recomendado)

```bash
cd "C:\Users\JEDC\Downloads\claude code\agente-compras-acuarella"
git init
git add .
git commit -m "feat: agente de compras Acuarella v1.0.0"
git branch -M main
git remote add origin https://github.com/<TU-USUARIO>/agente-compras-acuarella.git
git push -u origin main
```

> Reemplaza `<TU-USUARIO>` por tu usuario de GitHub.

---

## 2️⃣ Subir archivos vía web (si no usas git)

1. Ve a tu repo recién creado.
2. Click en **uploading an existing file** (en el banner azul).
3. Arrastra **todo el contenido** de la carpeta `agente-compras-acuarella/` al área de drop.
4. Asegúrate de que se mantenga la estructura: `frontend/`, `backend/`, `context/`, `docs/`.
5. Mensaje del commit: `Initial commit · Acuarella v1.0.0`.
6. Click en **Commit changes**.

> 💡 GitHub aplana subcarpetas en algunos casos. Si pasa, sube cada carpeta por separado.

---

## 3️⃣ Crear cuenta y conectar Netlify

1. Ve a https://app.netlify.com/signup
2. Regístrate con tu cuenta de GitHub (más rápido).
3. Autoriza a Netlify a leer tus repos.

---

## 4️⃣ Deploy del proyecto en Netlify

1. En el dashboard de Netlify, click **Add new site** → **Import an existing project**.
2. Selecciona **Deploy with GitHub**.
3. Busca y selecciona `agente-compras-acuarella`.
4. Configuración:
   - **Branch to deploy:** `main`
   - **Base directory:** *(déjalo vacío)*
   - **Build command:** *(déjalo vacío)*
   - **Publish directory:** `frontend`
   - **Functions directory:** `backend/functions`

   > Todas estas se autocompletan desde `netlify.toml`, no hace falta tocar nada.

5. Click en **Deploy site**.

---

## 5️⃣ Obtener la API Key de Anthropic

1. Entra a https://console.anthropic.com
2. Login o crea una cuenta.
3. Carga **créditos** (mínimo $5 USD): **Settings → Billing → Add credits**.
4. Crea una API key: **Settings → API Keys → Create Key**.
5. **Copia la key** (empieza por `sk-ant-…`). ⚠️ Solo se muestra una vez.

---

## 6️⃣ Configurar la variable de entorno en Netlify

1. En tu site de Netlify: **Site settings → Environment variables**.
2. Click **Add a variable** → **Add a single variable**.
3. **Key:** `ANTHROPIC_API_KEY`
4. **Value:** tu key `sk-ant-…`
5. **Scopes:** marca **Functions**.
6. Click **Create variable**.

---

## 7️⃣ Re-deploy y verificación

1. Ve a **Deploys** en tu site.
2. Click **Trigger deploy → Deploy site**.
3. Espera ~1-2 minutos al ✅ verde.
4. Abre tu URL Netlify (ej. `https://acuarella-agente.netlify.app`).
5. Escribe en el chat: *"Hola, ¿cómo me ayudas?"* — debes recibir respuesta de tu agente 💜.

---

## 🆘 Solución de problemas comunes

### ❌ El chat responde "ANTHROPIC_API_KEY no configurada"
- Verifica en **Site settings → Environment variables** que la key existe y su scope incluye **Functions**.
- Re-deploy desde **Deploys → Trigger deploy**.

### ❌ Error 502 / "Error de red"
- Probablemente tu key no tiene créditos. Carga créditos en Anthropic Console.
- Si recientemente la creaste, espera 1 minuto a que se propague.

### ❌ El sitio carga pero el chat no responde
- Abre **DevTools → Network** y revisa la respuesta de `/api/chat`.
- Comprueba que `netlify.toml` se subió correctamente.

### ❌ Las funciones no aparecen en Netlify
- Verifica que la ruta es exactamente `backend/functions/chat.js`.
- Asegúrate de que `netlify.toml` está en la raíz del repo.

### ❌ "Module not found: https"
- No debería pasar (es nativo de Node). Asegúrate de tener Node 18+ en Netlify (configurado en `netlify.toml`).

---

## 📈 Próximos pasos opcionales

- 🌐 **Dominio personalizado:** Site settings → Domain management.
- 🔒 **Restringir CORS:** edita `CORS_HEADERS` en `backend/functions/chat.js`.
- 🧠 **Cambiar el modelo:** edita `MODEL` en `backend/functions/chat.js`.
- ✏️ **Editar el system prompt:** modifica `SYSTEM_PROMPT` en `chat.js` y `context/system-prompt.md`.

---

## 💬 ¿Preguntas?

Si algo no funciona, revisa primero la sección **Solución de problemas comunes**. La mayoría de los errores se resuelven con un re-deploy o validando la API key.

¡Listo! Tu agente fashionista ya está en línea para Acuarella 💜✨.
