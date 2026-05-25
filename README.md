# 👜 Acuarella · Agente de Compras AI

[![Version](https://img.shields.io/badge/version-1.0.0-BDBEF4.svg)](https://github.com/)
[![License](https://img.shields.io/badge/license-MIT-F68FC1.svg)](LICENSE)
[![Powered by Claude](https://img.shields.io/badge/Powered%20by-Claude%20Sonnet%204-406FD2.svg)](https://www.anthropic.com/)
[![Netlify](https://img.shields.io/badge/Deploy-Netlify-FF824D.svg)](https://www.netlify.com/)

> Tu amiga fashionista confiable, lista para encontrar los **mejores proveedores** de accesorios femeninos alineados con los 5 valores de Acuarella. 💜✨

---

## ✨ ¿Qué es esto?

Un **Agente de Compras AI** especializado en sourcing de accesorios femeninos para la marca colombiana **Acuarella**. Evalúa cada proveedor y tendencia bajo el ADN de la marca:

1. **Versatilidad** — Para cualquier ocasión.
2. **Tendencia** — Siempre al día.
3. **Autenticidad** — Empodera y celebra a la mujer.
4. **Comodidad** — Materiales de calidad, precio justo.
5. **Comunidad** — Compartible, conecta mujeres.

---

## 🚀 Características

- 🔎 **Búsqueda de proveedores** con evaluación detallada de 100 puntos.
- ✨ **Análisis de tendencias** con paletas HEX, materiales y siluetas.
- ⭐ **Evaluación de proveedores** bajo los 5 valores Acuarella.
- 👜 **Ideas de colección** alineadas con la personalidad de marca.
- 💬 **Personalidad "amiga fashionista"** en cada respuesta.
- 🎨 **UI 100% Acuarella** (lila, crema, tipografía Lexend Deca).
- 📱 **Responsive** — funciona perfecto en móvil y desktop.
- 🆓 **Stack gratuito** — GitHub + Netlify + API Claude pay-as-you-go.

---

## 🧱 Stack Tecnológico

| Capa | Tech |
|------|------|
| Frontend | HTML5 · CSS3 (Variables) · JavaScript Vanilla |
| Backend | Netlify Functions (Node.js, `https` nativo) |
| IA | Anthropic Claude Sonnet 4 |
| Hosting | Netlify (frontend + functions) o GitHub Pages |

Sin frameworks, sin npm packages en el frontend. Limpio y mantenible.

---

## ⚡ Instalación rápida (5 minutos)

```bash
# 1. Clona el repo
git clone https://github.com/<tu-usuario>/agente-compras-acuarella.git
cd agente-compras-acuarella

# 2. Sube a tu propio GitHub
git remote set-url origin https://github.com/<tu-usuario>/agente-compras-acuarella.git
git push -u origin main

# 3. Conecta el repo a Netlify (netlify.com → New site from Git)

# 4. Añade la variable ANTHROPIC_API_KEY en Netlify → Site settings → Environment

# 5. Listo. Tu agente está en línea. 💜
```

> Guía paso a paso (con capturas y troubleshooting): [docs/setup-guide.md](docs/setup-guide.md)

---

## 📂 Estructura del proyecto

```
agente-compras-acuarella/
├── README.md
├── LICENSE
├── .gitignore
├── netlify.toml
│
├── frontend/
│   ├── index.html
│   ├── css/
│   │   ├── reset.css
│   │   ├── variables.css
│   │   ├── components.css
│   │   └── main.css
│   └── js/
│       ├── config.js
│       └── app.js
│
├── backend/
│   └── functions/
│       └── chat.js
│
├── context/
│   ├── system-prompt.md
│   └── brand-manual.md
│
└── docs/
    └── setup-guide.md
```

---

## 💸 Costos

| Servicio | Costo |
|----------|-------|
| GitHub (público) | Gratis ✅ |
| Netlify (Starter) | Gratis ✅ |
| Anthropic API | Pay-as-you-go (~$3 USD/1M tokens input · ~$15 USD/1M tokens output con Sonnet 4) |

**Estimación real:** una conversación promedio cuesta entre **$0,01 USD y $0,05 USD**.

---

## 🗺️ Roadmap

- [ ] Soporte para **streaming** de respuestas
- [ ] **Historial persistente** (localStorage opcional)
- [ ] Exportar conversación a PDF
- [ ] **Multi-idioma** (ES / EN)
- [ ] Integración con **Shopify Acuarella** para ver inventario actual
- [ ] **Modo oscuro** acorde a paleta Acuarella

---

## 🤝 Contribuir

1. Haz un fork.
2. Crea una rama: `git checkout -b mi-feature`.
3. Commitea tus cambios: `git commit -m "feat: nueva funcionalidad"`.
4. Push: `git push origin mi-feature`.
5. Abre un Pull Request.

Cualquier contribución se evalúa con los 5 valores de Acuarella 💜.

---

## 📄 Licencia

[MIT](LICENSE) © 2026 Acuarella.

---

### Mantra del proyecto

> ¿Es **VERSÁTIL**, **TRENDY**, **AUTÉNTICO**, **CÓMODO** y **CREA COMUNIDAD**?
>
> Si todas = SÍ → Es perfecto para Acuarella 💜
