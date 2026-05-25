# Deploy del Shop Manager a Netlify

Guía paso a paso para subir el Shop Manager a GitHub y desplegarlo en Netlify con conexión a Shopify Admin.

---

## 1. Subir el proyecto a GitHub

Desde la carpeta raíz del proyecto (`agente-compras-acuarella/`):

```bash
git init
git add .
git commit -m "Initial commit · Shop Manager"
git branch -M main
git remote add origin https://github.com/<TU-USUARIO>/agente-compras-acuarella.git
git push -u origin main
```

> ⚠️ El archivo `shopify_config.env` está en `.gitignore`, NO se sube a GitHub.
> El token de Shopify NUNCA va al repositorio.

---

## 2. Crear el token de Shopify (read-only)

1. Entra a `https://jdc-luxury-shop.myshopify.com/admin`
2. **Settings** (abajo izquierda) → **Apps and sales channels**
3. Click en **Develop apps for your store** → habilítalo si pide
4. **Create an app** → Nombre: `Shop Manager AI (read-only)` → **Create app**
5. Pestaña **Configuration** → **Configure** en *Admin API access scopes*
6. Marca SOLO estos (busca con el filtro):
   - ✅ `read_products`
   - ✅ `read_inventory`
   - ✅ `read_locations`
   - ✅ `read_orders` (opcional, para analytics)
7. **Save**
8. Pestaña **API credentials** → **Install app** (arriba derecha) → **Install**
9. **Reveal token once** → **copia el token** (empieza con `shpat_...`)
10. Guárdalo en un sitio seguro (lo necesitas para Netlify)

---

## 3. Conectar el repo a Netlify

1. Entra a `https://app.netlify.com/`
2. **Add new site** → **Import an existing project**
3. **Deploy with GitHub** → autoriza si pide
4. Selecciona el repo `agente-compras-acuarella`
5. **Site settings** importante:
   - **Base directory:** `shopify-manager`
   - **Build command:** (vacío)
   - **Publish directory:** `shopify-manager`
   - **Functions directory:** `shopify-manager/netlify/functions`

   > Estos se autocompletan desde `shopify-manager/netlify.toml`, no toques nada
6. Click **Deploy site**

---

## 4. Configurar las variables de entorno en Netlify

🔐 Aquí es donde se guarda el token de Shopify de forma segura.

1. En tu site de Netlify: **Site configuration** → **Environment variables**
2. Click **Add a variable** → **Add a single variable**

   Añade estas dos:

   | Key | Value |
   |-----|-------|
   | `SHOPIFY_SHOP` | `jdc-luxury-shop.myshopify.com` |
   | `SHOPIFY_TOKEN` | `shpat_TU_TOKEN_AQUI` |

3. En **Scopes**, marca **Functions** para cada una
4. Click **Create variable**

---

## 5. Re-deploy y verificación

1. Ve a **Deploys** en tu site
2. Click **Trigger deploy** → **Deploy site**
3. Espera el ✅ verde (~1-2 minutos)
4. Abre tu URL Netlify (ej: `https://jdc-shop-mgr.netlify.app`)
5. En el topbar debe aparecer: `Conectado · Sonnet · +doc · 🛍 Shopify`
   - El icono 🛍 confirma que el backend está conectado a Shopify
6. Prueba: *"dame el stock de PACK RELAX x3"*
   - Debería responder con números reales en el formato del Word

---

## 6. Verificar permisos (importante)

Después del primer deploy, en la consola del navegador (F12) puedes ejecutar:

```js
fetch('/api/health').then(r => r.json()).then(console.log)
```

Debes ver: `{ ok: true, shop: "JDC LUXURY STORE" }`

Si ves `{ ok: false, reason: "..." }` → revisa:
- Las variables de entorno están bien escritas (sin espacios)
- El token tiene los scopes correctos
- El token está instalado en la app de Shopify

---

## 7. Mantenimiento

### Si cambian los packs / productos
Solo me dices "actualízame el documento" → te lo regenero → lo pegas en Settings del Shop Manager (textarea "Documento de contexto").

### Si cambia el token de Shopify
Solo actualizas la variable `SHOPIFY_TOKEN` en Netlify → re-deploy.

### Si quieres añadir más endpoints (ej: ventas, customers)
Crea otra Netlify Function en `shopify-manager/netlify/functions/` con el patrón de `inventory.js` y los scopes adicionales del token.

---

## 🔒 Seguridad

- ✅ Token NUNCA en GitHub (está en `.gitignore`)
- ✅ Token NUNCA en el navegador del usuario (vive en variables Netlify)
- ✅ Solo scopes READ-ONLY (no puede modificar nada)
- ✅ HTTPS forzado por Netlify
- ✅ CORS controlado en las functions

---

## 🆘 Troubleshooting

| Problema | Solución |
|----------|----------|
| El topbar no muestra `🛍 Shopify` | Verifica las env vars en Netlify y re-deploya |
| Error 500 en `/api/inventory` | Revisa logs de la function: Deploys → Functions tab |
| Error 401 / 403 | Token inválido o sin scopes → genera uno nuevo |
| Error 502 timeout | Shopify API lenta o caída → reintentar |
| El sitio carga pero `/api/*` falla | El `netlify.toml` no detectó las functions → revisa `shopify-manager/netlify.toml` |
