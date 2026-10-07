# La IA propia de Chispa — qué hardware hace falta

**7 de octubre de 2026 · Informe de decisión para Stalin · Imágenes (FLUX), vídeo y voz · Documento interno**

---

## En una frase

**No hace falta comprar nada para empezar.** Chispa puede producir imágenes, vídeo y voz de nivel profesional **hoy mismo, con 0 € de hardware**, pagando por uso en la nube (y los conectores ya están hechos). Comprar un PC con GPU propia solo compensa **cuando el volumen mensual sea grande y sostenido** — y aun así, el vídeo "de cine" conviene seguir sacándolo por API de pago, porque ahí la IA abierta todavía no llega.

---

## El punto de partida (lo medido en esta Mesa, 07/10/2026)

Esta Mesa **no sirve para IA pesada**, y está confirmado midiéndolo:

- **CPU:** AMD Athlon 220GE — 2 núcleos / 4 hilos (muy justo).
- **RAM:** 5,9 GB (una sesión de IA de imagen pide bastante más).
- **GPU:** **ninguna NVIDIA.** Solo Radeon Vega 3 integrada → **sin CUDA**, que es lo que necesitan FLUX y los modelos de vídeo.
- **Sistema:** Windows 10.

**Qué SÍ corre aquí:** el motor ligero. **Piper (voz)** funciona bien — generó 5,5 s de audio en 3,4 s — y **FFmpeg** (montaje) va. **Qué NO:** FLUX (imágenes), LTX-Video / Wan (vídeo) ni `faster-whisper` (que aquí crashea). Para eso hace falta una GPU NVIDIA con VRAM, que esta Mesa no tiene y no se le puede añadir de forma razonable.

**Conclusión:** la Mesa se queda como lo que ya es — montaje y voz locales gratis. La IA de imagen y vídeo sale **fuera de la Mesa**, y hay tres formas de hacerlo.

---

## 1 · Los tres caminos

### (a) Pago por uso en la nube — 0 € de hardware

Mandas la petición a un servicio, te devuelve la imagen/vídeo/voz y pagas por lo que gastes. Sin instalar nada, sin GPU.

- **Imágenes (FLUX en fal.ai):** ~**0,003–0,025 $/imagen** (schnell barato, dev algo más). *Estimación 2026.*
- **Vídeo (Replicate y similares):** ~**0,08 $/segundo** de vídeo generado → un clip de 5 s ≈ 0,40 $. *Estimación 2026.*
- **Avatares que hablan (HeyGen):** ~**0,30–0,50 $/minuto**. *Estimación 2026.*
- **Voz premium (ElevenLabs):** por caracteres; de céntimos a pocos euros por vídeo. (La voz básica ya la tenemos gratis con Piper en la Mesa.)

**A favor:** cero inversión, profesional desde el día 1, siempre el último modelo, **y los conectores ya están hechos**. **En contra:** pagas cada vez; si el volumen se dispara, la factura sube.

### (b) GPU en la nube por horas — alquilar una tarjeta potente

Alquilas una RTX 4090 o una A100 por horas (Runpod, Vast.ai) y corres **modelos open-source** tú mismo. Pagas el tiempo que la tienes encendida.

- **Precio:** ~**0,30–1 €/hora** según tarjeta. *Estimación 2026.*

**A favor:** pruebas los modelos abiertos (FLUX, Wan) con potencia real **sin comprar nada**; ideal para decidir si merece la pena comprar. **En contra:** hay que apagar para no pagar de más, y montarlo es más técnico que el pago por uso.

### (c) Comprar un PC con GPU NVIDIA propia

Compras la máquina y corres todo en casa. Pagas una vez (y la luz).

**A favor:** una vez amortizado, generar sale "gratis"; privacidad total; sin límites de uso. **En contra:** inversión grande de golpe, se queda anticuado, y **el vídeo de cine sigue sin estar a la altura en open-source** (ver punto 3).

---

## 2 · Si vamos por hardware propio: qué GPU

Lo que manda en IA no es tanto la velocidad como la **VRAM** (la memoria de la tarjeta): define qué modelos entran y qué tamaño de vídeo puedes generar.

| GPU | VRAM | Precio orient. (est. 2026) | Qué permite |
|---|---|---|---|
| **RTX 4060 Ti 16GB** | 16 GB | ~450–500 € | FLUX schnell/dev en ~10–30 s. Vídeo corto, justo de memoria. Entrada digna. |
| **RTX 3090 24GB (2ª mano)** | 24 GB | ~700–900 € | **La mejor relación calidad/precio.** FLUX rápido, LTX/Wan de vídeo, clonación de voz — todo cabe por sus 24 GB. |
| **RTX 4090 24GB** | 24 GB | ~1.800–2.000 € | Lo top práctico. FLUX en 2–5 s, vídeo con holgura. Más rápida que la 3090, misma VRAM. |
| **RTX 5090 32GB** | 32 GB | ~2.500 €+ | Más memoria y velocidad. Para empezar es pasarse. |

**La recomendación clara dentro de esta tabla: la RTX 3090 de segunda mano.** 24 GB de VRAM (lo mismo que una 4090) por menos de la mitad de precio. Es la tarjeta con la que más gente monta IA en casa sin arruinarse.

### El resto del PC (no solo la GPU)

- **CPU:** Ryzen 5 / 7 (6–8 núcleos) — ~150–250 €.
- **RAM:** **32 GB mínimo, 64 GB mejor** — ~80–180 €.
- **Disco:** SSD NVMe 1 TB (los modelos pesan mucho) — ~60–90 €.
- **Fuente:** 750–850 W de calidad (la 3090/4090 tiran mucho) — ~90–140 €.
- **Placa, caja, refrigeración** — ~200–300 €.

**Coste total del PC montado (estimación 2026):**

- Con **RTX 4060 Ti 16GB** → ~**1.000 €**
- Con **RTX 3090 24GB (2ª mano)** → ~**1.300–1.500 €**
- Con **RTX 4090 24GB** → ~**2.300–2.500 €**

Más la **luz**: una 3090/4090 bajo carga tira ~350 W → si la usas 4 h/día, ~6–8 €/mes. Poco, pero cuenta.

---

## 3 · Qué modelos open-source correría cada opción

Tanto la GPU por horas (b) como el PC propio (c) corren lo mismo. Esto es lo bueno y gratis que hay hoy:

- **Imágenes — FLUX.1:** `schnell` (rapidísimo, 4 pasos, licencia libre) y `dev` (más calidad). Es **lo mejor que hay en abierto** y rivaliza con lo de pago. Va cómodo en 24 GB; con 16 GB o menos funciona cuantizado, más lento.
- **Vídeo — LTX-Video y Wan 2.2:** generan clips cortos (unos segundos). **Piden mucha VRAM** — Wan 2.2 va de verdad con 24 GB. Sirven para planos y animaciones.
- **Voz — Kokoro y Chatterbox:** TTS abierto de muy buena calidad; Chatterbox además **clona voces**. Ligero: incluso la Mesa ya corre Piper, que es de la misma familia.

### Lo honesto sobre el vídeo

**El vídeo IA "de cine" tipo Veo 3 / Sora / Kling NO tiene equivalente open-source a ese nivel todavía.** LTX y Wan están bien para clips cortos y planos de relleno, pero el vídeo largo, coherente y realista que impresiona sigue siendo de los servicios de pago. 

**Conclusión práctica:** aunque compres la GPU, **el vídeo premium conviene seguir sacándolo por API de pago**. La GPU propia cubre bien **imágenes, vídeo corto y voz** — ahí sí ahorra. El vídeo de cine, no.

---

## 4 · Recomendación por fases

### Fase 1 — AHORA: pago por uso (0 € de hardware)

Empezar aquí, sin dudarlo. **Profesional desde el día 1, los conectores ya están hechos, y no se invierte nada.** FLUX por fal.ai para imágenes, Replicate/Kling para vídeo, ElevenLabs para voz premium y **Piper gratis en la Mesa** para la voz del día a día. Cobramos a clientes antes de haber gastado un euro en máquinas.

### Fase 2 — Validar: GPU en la nube por horas

Cuando queramos ver si los modelos abiertos nos valen, alquilamos una **RTX 4090 por horas** (~0,30–1 €/h) y probamos FLUX y Wan **sin comprar nada**. Así sabemos si la calidad open-source nos sirve antes de poner 1.300 €.

### Fase 3 — Comprar: cuando el volumen lo justifique

Montar un PC con **RTX 3090 (mejor precio) o 4090 (si queremos velocidad)** cuando el gasto mensual por uso se vuelva grande y constante. Y aun entonces, **mantener la API solo para el vídeo de cine**.

---

## El cálculo: ¿cuándo compensa comprar?

Lo que decide no es el capricho, son los números. Un ejemplo con volumen realista de Chispa (10 clientes activos):

| Concepto | Volumen/mes | Coste por uso (est. 2026) |
|---|---|---|
| Imágenes (FLUX) | 300 img × ~0,01 € | ~3 €/mes |
| Vídeo corto IA | 200 clips × 15 s × ~0,07 € | ~210 €/mes |
| Voz | mayormente **Piper gratis** en la Mesa | ~0–10 €/mes |

- **Las imágenes casi nunca justifican comprar:** a 1 céntimo cada una, harían falta **más de 100.000 imágenes** para igualar el precio de un PC de 1.300 €. Por imágenes solas, el pago por uso gana siempre.
- **La voz tampoco:** Piper ya es gratis en la Mesa, y la voz premium por uso es barata.
- **El vídeo es lo que mueve la aguja.** Si el gasto de vídeo por uso ronda **~200 €/mes de forma sostenida**, un PC con RTX 3090 (~1.300 €) se amortiza en **~6–9 meses** — pero solo para el vídeo que los modelos abiertos cubren bien (clips cortos). El vídeo de cine seguirá siendo API.

**La regla sencilla:** mientras el gasto por uso esté **por debajo de ~150 €/mes**, **no compres** — pago por uso gana. Cuando pase de ~150–200 €/mes **de forma estable varios meses seguidos** (y sobre todo si es por vídeo corto y hacemos muchas imágenes), entonces **una RTX 3090 se paga sola** y toca comprar.

---

**La decisión de hoy:** arrancar en **Fase 1 (pago por uso, 0 €)**. No comprar nada todavía. Vigilar el gasto mensual: en cuanto el vídeo pase de ~150–200 €/mes constantes, probar la **Fase 2** (GPU por horas) y, si convence, comprar una **RTX 3090** en **Fase 3**.

---

*Compilado el 07/10/2026. Hardware de la Mesa verificado por medición directa (Athlon 220GE, 5,9 GB RAM, sin GPU NVIDIA; Piper OK, faster-whisper crashea). Precios de GPU, de servicios de pago por uso y de alquiler por horas son **estimaciones orientativas de 2026** y varían por proveedor, oferta y mercado de segunda mano; verificar antes de comprar. El break-even depende del volumen real: recalcular con las cifras verdaderas cuando las haya. El vídeo IA de cine (Veo/Sora/Kling) no tiene equivalente open-source equiparable a fecha de hoy. Documento interno de Chispa.*
