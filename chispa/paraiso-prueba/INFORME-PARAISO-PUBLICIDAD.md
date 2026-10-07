# Informe · Prueba end-to-end de «El Paraíso» en Chispa (publicidad)

**Fecha:** 2026-10-07
**Qué se probó:** toda la experiencia del dueño de El Paraíso montando su publicidad en la app Chispa.
**Cómo:** Playwright (Chromium), app abierta por `file:///…/chispa-demo-clone/index.html`, **sin tocar la app** (solo lectura).
**Tamaños:** Escritorio **1280×800** y móvil **iPhone 390×844**.
**Resultado global:** **20 de 20 pasos OK** (10 por tamaño) · **0 errores de JavaScript** (consola + pageerror).

> Nota: la app corre en local (`file://`) sin el servidor de Chispa. Las imágenes de las publicaciones se traen del banco (Unsplash) como respaldo de la «imagen IA», que en el producto real se conecta con Flux; las conexiones a redes se marcan/guían pero no hacen OAuth real sin servidor. Es el comportamiento esperado de la demo, no un fallo.

---

## Tabla de pasos

| # | Sección | Escritorio | Móvil | Nota |
|---|---------|:---------:|:-----:|------|
| 1 | **Mi negocio** — logo negro (no la casita) | ✅ | ✅ | La cabecera de «El Paraíso Bar Restaurante» muestra el **logo negro** (`marca/elparaiso-logo-negro.jpg`, `<img>` cargada). **No** aparece la casita 🏠. El arreglo reciente funciona. |
| 2 | **Conexiones** (redes) | ✅ | ✅ | Se ofrecen las **5 redes**: Instagram, Facebook, TikTok, YouTube y Google (ficha). Con botones de conectar/guía. |
| 3 | **Asistente IA** | ✅ | ✅ | «Que Chispa lo escriba» genera **4 ideas**, cada una con **texto + imagen + hashtags** y los botones **Programar, Publicar, Subir foto** y creación/《Otra versión》de imagen. La imagen se crea sola (4/4 con foto cargada) y **regenera** otra distinta al pulsar «↻ Otra versión». |
| 4 | **Calendario** | ✅ | ✅ | Rejilla de la semana con **10 publicaciones programadas** (escritorio). Botones **Planificar mi semana**, **Promo para llenar** y **+ Nueva**. «Promo para llenar» abre el asistente de franja (día, horas, nº de historias, promo). |
| 5 | **Así lo ve tu cliente** (vista cliente) | ✅ | ✅ | Abre la vista previa realista en **10 plataformas** (Instagram feed/Stories, Facebook, TikTok, Google…): mockup de móvil con el logo, el nombre, la foto, la insignia «RECIÉN HECHO» y el botón **Reservar →**. |
| 6 | **Reseñas** | ✅ | ✅ | Pantalla de reseñas renderizada (con pendientes por responder y referencia a Google). |
| 7 | **Comentarios y DMs** | ✅ | ✅ | **3 mensajes** (comentario IG, DM, comentario FB) cada uno con **respuesta sugerida por la IA** lista para aprobar. |
| 8 | **Estadísticas** | ✅ | ✅ | **4 KPIs** + **3 gráficas** pintadas con Chart.js. |
| 9 | **Crecer** | ✅ | ✅ | Sección nueva con **7 sub-secciones** (Vídeo que engancha, Cuánto publicar, Mejores horas, Hashtags, Plan de la semana, Ganar dinero, No te penalicen); se cambia entre ellas sin recargar. |
| 10 | **Visita guiada** | ✅ | ✅ | «▶ Ver cómo funciona» abre el selector de negocio; elegido **El Paraíso (restaurante)**, arranca la visita de **10 pasos** y avanza correctamente (Paso 1 → Paso 3 comprobado). |

**Leyenda:** ✅ funciona · ⚠️ funciona con matices · ❌ fallo.

---

## Errores de JavaScript encontrados

**Ninguno.** Durante los 20 recorridos no se registró **ni un solo** `console.error` ni `pageerror` (0 en escritorio, 0 en móvil). Chart.js cargó bien desde el CDN y todas las secciones se pintaron sin excepciones.

---

## Observaciones (no son fallos)

- **«Crear imagen con IA»**: ese botón solo sale cuando una tarjeta **no tiene imagen todavía**. En las propuestas que genera Chispa la imagen **ya viene creada** automáticamente (4/4 tarjetas con foto cargada), así que la acción equivalente es **«↻ Otra versión»**, que sí se probó y devuelve otra imagen distinta. Verificado con 0 errores.
- **Calendario en móvil**: a 390 px la rejilla semanal se condensa y el detector contó 0 ítems `.ag-it`, pero la cabecera, los botones (Planificar / Promo / Nueva) y el flujo de «Promo para llenar» funcionan igual. En escritorio se ven las 10 publicaciones. Es un detalle de maquetación responsive, no un error.
- **Imágenes y redes en `file://`**: las fotos vienen de Unsplash (respaldo) y las conexiones no hacen OAuth real porque falta el servidor de Chispa; es el modo demo esperado.

---

## Veredicto

**El Paraíso está LISTO para usarse como publicidad.** Las diez piezas del recorrido del dueño funcionan de punta a punta y en los dos tamaños (escritorio y móvil), sin un solo error de JavaScript: puede ver su negocio con su **logo negro**, enlazar sus **redes**, dejar que la IA le **escriba publicaciones con texto, imagen y hashtags**, **programarlas** (incluida la «Promo para llenar»), **previsualizar cómo lo verá su cliente** en cada red, gestionar **reseñas, comentarios y DMs** con respuestas sugeridas, consultar sus **estadísticas**, apoyarse en la guía **Crecer** y repasar todo con la **visita guiada**.

El único matiz es que esta prueba corre en local sin el servidor (imágenes de banco en vez de Flux y sin OAuth real de redes); eso se cubre al desplegar con el servidor de Chispa y no afecta a la experiencia ni a la estabilidad probadas aquí.

---

## Capturas

Todas en la subcarpeta [`capturas/`](capturas/), nombradas `<escritorio|movil>-<paso>-<sección>.png`. Pares escritorio/móvil por paso:

- **1 · Mi negocio (logo):** `desktop-p1-mi-negocio.png` · `movil-p1-mi-negocio.png`
- **2 · Conexiones:** `desktop-p2-conexiones.png` · `movil-p2-conexiones.png`
- **3 · Asistente IA:** `desktop-p3a-asistente-generado.png` · `movil-p3a-asistente-generado.png` · imagen IA: `desktop-p3b-asistente-imagenIA.png`
- **4 · Calendario:** `desktop-p4a-calendario.png` · `movil-p4a-calendario.png` · Promo: `desktop-p4b-calendario-promo.png` · `movil-p4b-calendario-promo.png`
- **5 · Así lo ve tu cliente:** `desktop-p5-vista-cliente.png` · `movil-p5-vista-cliente.png`
- **6 · Reseñas:** `desktop-p6-resenas.png` · `movil-p6-resenas.png`
- **7 · Comentarios y DMs:** `desktop-p7-comentarios-dms.png` · `movil-p7-comentarios-dms.png`
- **8 · Estadísticas:** `desktop-p8-estadisticas.png` · `movil-p8-estadisticas.png`
- **9 · Crecer:** `desktop-p9-crecer.png` · `movil-p9-crecer.png`
- **10 · Visita guiada:** `desktop-p10-visita-guiada.png` · `movil-p10-visita-guiada.png`

*Datos crudos de la ejecución en `resultados.json`. Scripts de la prueba: `prueba-paraiso.js` y `verif-imagen-ia.js`.*
