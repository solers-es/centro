// CENTRO DE DINERO · solers
// Pantalla privada (aparte del árbol) que lee/escribe la base del Centro
// (clientes · suscripciones · pagos) con la LLAVE DE SERVICIO por detrás,
// así el navegador NUNCA ve la clave. Entrada con "llave" en el enlace (sin contraseña).
//
// Variables de entorno (en /etc/webs/dinero.env):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  -> base del Centro
//   LLAVE                                    -> el secreto del enlace (?k=...)
//   PORT                                     -> puerto local
import http from "node:http";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { createHmac } from "node:crypto";

const SB   = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const LLAVE= process.env.LLAVE || "";
const ABIERTO = false; // Protegido con llave + cookie: se entra 1 vez con ?k= y queda recordado 1 año en ese navegador (Alex y Stalin entran cómodos; nadie más). true = abierto a cualquiera.
const PORT = Number(process.env.PORT || 3210);
// Botones "Entrar" (superadmin) del Centro: nombre en el arbol -> dominio en Hetzner.
// /e/<app> genera una llave /solers firmada al vuelo con SOLERS_LLAVE_SECRETO (nunca en el HTML).
const DOMINIOS = { brasa: "universo-bistro", gestoros: "gestoros", pulso: "pulso", brigada: "brigada", apoteosicas: "solers", cgb: "multiservicescgb.com" };
const SBH  = { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" };
// La pestaña del ÁRBOL es un fichero propio subido al lado (no se cruza con el dinero).
const ARBOL_HTML = (() => { try { return readFileSync(new URL("./arbol.html", import.meta.url), "utf8"); } catch (e) { return "<!doctype html><meta charset=utf-8><body style='font-family:system-ui;padding:30px'>Falta arbol.html</body>"; } })();
// --- PWA: instalar el Centro como app (manifest + service worker + iconos) ---
const ICONOS = {};
try { ICONOS["/icono-192.png"] = readFileSync(new URL("./icono-192.png", import.meta.url)); ICONOS["/icono-512.png"] = readFileSync(new URL("./icono-512.png", import.meta.url)); } catch (e) {}
const MANIFEST = JSON.stringify({ name: "solers · Centro", short_name: "Centro", description: "Centro de trabajo de solers (árbol · obra · dinero · chat)", start_url: "/arbol", scope: "/", display: "standalone", background_color: "#F5F0E7", theme_color: "#D4622A", icons: [ { src: "/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" } ] });
const SW_JS = `self.addEventListener("install",e=>self.skipWaiting());self.addEventListener("activate",e=>self.clients.claim());self.addEventListener("fetch",e=>{});`;
// "Obra": qué construyen las nubes ahora (se relee en cada peticion; el bucle de coordinacion refresca obra.json)
// Pendientes cerrados: los que Alex/Stalin marcan como hechos (fichero propio; no se borran de obra.json, solo se ocultan).
const CERRADOS_PATH = new URL("./cerrados.json", import.meta.url);
function cerrados(){ try { const j = JSON.parse(readFileSync(CERRADOS_PATH, "utf8")); return Array.isArray(j.cerrados) ? j.cerrados : []; } catch (e) { return []; } }
function cerrarPendiente(que, cerrar){ const set = new Set(cerrados()); if (cerrar) set.add(String(que)); else set.delete(String(que)); writeFileSync(CERRADOS_PATH, JSON.stringify({ cerrados: [...set] })); return [...set]; }
function obra(){ try { const p = new URL("./obra.json", import.meta.url); const j = JSON.parse(readFileSync(p, "utf8")); j.actualizado = statSync(p).mtime.toISOString(); const cer = new Set(cerrados()); j.pendientes = (j.pendientes||[]).filter(x => !cer.has(String(x.que))); j.cerrados = cer.size; return j; } catch (e) { return { nubes: [], pendientes: [], error: String(e && e.message || e) }; } }
// "Chat": canal en vivo entre los DOS Claude (y Alex/Stalin). Fichero propio al lado; los Claude escriben/leen por /api/chat.
const CHAT_PATH = new URL("./chat.json", import.meta.url);
function chat(){ try { const j = JSON.parse(readFileSync(CHAT_PATH, "utf8")); return Array.isArray(j.mensajes) ? j : { mensajes: [] }; } catch (e) { return { mensajes: [] }; } }
function chatAdd(de, texto){ const c = chat(); c.mensajes.push({ de: String(de||"?").slice(0,40), texto: String(texto||"").slice(0,2000), ts: new Date().toISOString() }); if (c.mensajes.length > 500) c.mensajes = c.mensajes.slice(-500); writeFileSync(CHAT_PATH, JSON.stringify(c)); return c; }
// --- El Paraíso: lee (SOLO lectura) la base de Brasa con la service_role que vive en el servidor. Nunca llega al navegador. ---
const SB_BRASA = (process.env.SB_BRASA_URL || "").replace(/\/+$/, "");
const KEY_BRASA = process.env.SB_BRASA_KEY || "";
const PARAISO_ORG = process.env.PARAISO_ORG || "";
const BRH = { apikey: KEY_BRASA, Authorization: "Bearer " + KEY_BRASA };
async function sbBrasa(path){ try { const r = await fetch(`${SB_BRASA}/rest/v1/${path}`, { headers: BRH }); return r.ok ? await r.json() : []; } catch (e) { return []; } }
async function paraiso(){
  if (!SB_BRASA || !KEY_BRASA || !PARAISO_ORG) return { hay: false };
  const org = `org_id=eq.${PARAISO_ORG}`;
  const [mesas, categorias, productos, pedidos, pagos] = await Promise.all([
    sbBrasa(`tables?${org}&select=id,name,seats,state&order=name.asc`),
    sbBrasa(`categories?${org}&select=id,name,sort&order=sort.asc`),
    sbBrasa(`products?${org}&select=id,name,sell_price_gross,category_id,active&order=name.asc`),
    sbBrasa(`orders?${org}&select=id,table_id,status,opened_at,closed_at&order=opened_at.desc&limit=30`),
    sbBrasa(`payments?${org}&select=amount,method,created_at&order=created_at.desc&limit=300`),
  ]);
  return { hay: true, mesas, categorias, productos, pedidos, pagos, ts: new Date().toISOString() };
}

// "Tickets": tareas pendientes de cada producto y rama, en semáforo (🔴 hacer · 🟡 revisar · 🟢 hecho).
// Los rellenan los DOS Claude por /api/tickets. La página y el panel flotante son ficheros aparte (tickets.html, tickets-flotante.js).
const TICKETS_PATH = new URL("./tickets.json", import.meta.url);
const T_ESTADOS = ["hacer", "curso", "revisar", "hecho"], T_PRIOS = ["urgente", "alta", "normal", "baja"];
function tickets(){ try { const j = JSON.parse(readFileSync(TICKETS_PATH, "utf8")); return Array.isArray(j.tickets) ? j : { tickets: [] }; } catch (e) { return { tickets: [] }; } }
function ticketGuardar(c){
  const t = tickets(); const ahora = new Date().toISOString(); const txt = (v, n) => String(v ?? "").slice(0, n);
  if (c.borrar && c.id) { t.tickets = t.tickets.filter(x => x.id !== c.id); writeFileSync(TICKETS_PATH, JSON.stringify(t)); return { borrado: c.id }; }
  let x = c.id && t.tickets.find(y => y.id === c.id);
  if (!x) {
    if (!c.titulo || !String(c.titulo).trim()) throw new Error("falta el título");
    x = { id: c.id ? txt(c.id, 60) : "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), creado: ahora, estado: "hacer", prioridad: "normal" };
    t.tickets.push(x);
  }
  for (const [k, n] of [["producto", 60], ["rama", 120], ["titulo", 200], ["detalle", 1500], ["quien", 40], ["enlace", 400], ["lanzado", 60], ["donde", 40]]) if (c[k] !== undefined) x[k] = txt(c[k], n);
  if (T_ESTADOS.includes(c.estado)) x.estado = c.estado;
  if (T_PRIOS.includes(c.prioridad)) x.prioridad = c.prioridad;
  x.actualizado = ahora; if (c.de) x.por = txt(c.de, 40);
  writeFileSync(TICKETS_PATH, JSON.stringify(t)); return x;
}
function fichero(nombre){ try { return readFileSync(new URL("./" + nombre, import.meta.url), "utf8"); } catch (e) { return ""; } }
const conTickets = (html) => html.replace("</body>", '<script src="/tickets-flotante.js" defer></script></body>');

// --- Supabase REST con service_role (salta RLS, solo en el servidor) ---
async function sbGet(path) {
  const r = await fetch(`${SB}/rest/v1/${path}`, { headers: SBH });
  return r.ok ? r.json() : [];
}
async function sbPost(tabla, fila) {
  const r = await fetch(`${SB}/rest/v1/${tabla}`, {
    method: "POST", headers: { ...SBH, Prefer: "return=representation" }, body: JSON.stringify(fila),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}

function mes(iso) { return (iso || "").slice(0, 7); }
const hoyMes = new Date().toISOString().slice(0, 7);

async function datos() {
  const [clientes, subs, pagos] = await Promise.all([
    sbGet("clientes?select=*&order=nombre.asc"),
    sbGet("suscripciones?select=*"),
    sbGet("pagos?select=*&order=fecha.desc&limit=50"),
  ]);
  const recurrente = subs.filter(s => s.activa).reduce((a, s) => a + Number(s.euros_mes || 0), 0);
  const facturadoMes = pagos.filter(p => mes(p.fecha) === hoyMes).reduce((a, p) => a + Number(p.importe || 0), 0);
  const activos = clientes.filter(c => c.estado === "activo").length;
  // suscripciones por cliente
  const porCliente = {};
  for (const s of subs) (porCliente[s.cliente_id] = porCliente[s.cliente_id] || []).push(s);
  return { clientes, subs, pagos, porCliente, resumen: { recurrente, facturadoMes, activos, totalClientes: clientes.length }, mes: hoyMes };
}

// --- helpers http ---
function leerCuerpo(req) {
  return new Promise((res) => { let b = ""; req.on("data", d => (b += d)); req.on("end", () => res(b)); });
}
function cookie(req, nombre) {
  const c = (req.headers.cookie || "").split(";").map(s => s.trim());
  const hit = c.find(s => s.startsWith(nombre + "="));
  return hit ? decodeURIComponent(hit.slice(nombre.length + 1)) : "";
}
function json(res, code, obj) { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify(obj)); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  // --- portero con LLAVE (sin contraseña: el secreto va en el enlace una vez) ---
  const k = url.searchParams.get("k") || cookie(req, "llave");
  const autorizado = ABIERTO || (LLAVE && k === LLAVE);

  if (url.pathname === "/salud") return json(res, 200, { ok: true });
  // PWA (sin llave: el navegador los pide para instalar la app)
  if (url.pathname === "/manifest.webmanifest") { res.writeHead(200, { "Content-Type": "application/manifest+json; charset=utf-8" }); return res.end(MANIFEST); }
  if (url.pathname === "/sw.js") { res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" }); return res.end(SW_JS); }
  if (ICONOS[url.pathname]) { res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "max-age=86400" }); return res.end(ICONOS[url.pathname]); }

  if (!autorizado) {
    res.writeHead(url.searchParams.get("k") ? 403 : 401, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(`<!doctype html><meta charset=utf-8><body style="font-family:system-ui;background:#F5F0E7;color:#241E17;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h1 style="color:#B07D16">Centro de dinero</h1><p>Falta la llave en el enlace. Abre el enlace completo que te pasó Claude.</p></div></body>`);
  }
  // si entró con ?k= correcto, fijamos la cookie para no repetir el enlace
  const setCookie = url.searchParams.get("k") === LLAVE
    ? { "Set-Cookie": `llave=${encodeURIComponent(LLAVE)}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax` } : {};

  try {
    if (url.pathname === "/api/datos") { json(res, 200, await datos()); return; }
    if (url.pathname === "/api/obra")  { json(res, 200, obra()); return; }
    if (req.method === "GET" && url.pathname === "/api/chat") { json(res, 200, chat()); return; }
    if (req.method === "GET" && url.pathname === "/api/tickets") { json(res, 200, tickets()); return; }
    if (req.method === "GET" && url.pathname === "/api/paraiso") { json(res, 200, await paraiso()); return; }

    if (req.method === "POST" && url.pathname.startsWith("/api/")) {
      const cuerpo = JSON.parse((await leerCuerpo(req)) || "{}");
      if (url.pathname === "/api/cliente") {
        const f = await sbPost("clientes", { nombre: cuerpo.nombre, contacto: cuerpo.contacto || null, estado: cuerpo.estado || "prueba" });
        return json(res, 200, { ok: true, fila: f });
      }
      if (url.pathname === "/api/suscripcion") {
        const f = await sbPost("suscripciones", {
          cliente_id: cuerpo.cliente_id, producto: cuerpo.producto, edicion: cuerpo.edicion || "base",
          euros_mes: Number(cuerpo.euros_mes || 0), activa: cuerpo.activa !== false,
        });
        return json(res, 200, { ok: true, fila: f });
      }
      if (url.pathname === "/api/pago") {
        const f = await sbPost("pagos", {
          cliente_id: cuerpo.cliente_id || null, importe: Number(cuerpo.importe || 0),
          concepto: cuerpo.concepto || null, metodo: cuerpo.metodo || null,
          fecha: cuerpo.fecha || new Date().toISOString().slice(0, 10),
        });
        return json(res, 200, { ok: true, fila: f });
      }
      if (url.pathname === "/api/tickets") {
        try { return json(res, 200, { ok: true, ticket: ticketGuardar(cuerpo) }); } catch (e) { return json(res, 400, { error: String(e.message) }); }
      }
      if (url.pathname === "/api/chat") {
        if (!cuerpo.texto || !String(cuerpo.texto).trim()) return json(res, 400, { error: "texto vacío" });
        const c = chatAdd(cuerpo.de, cuerpo.texto);
        return json(res, 200, { ok: true, n: c.mensajes.length });
      }
      if (url.pathname === "/api/pendiente") {
        if (!cuerpo.que) return json(res, 400, { error: "falta que" });
        cerrarPendiente(cuerpo.que, cuerpo.cerrar !== false);
        return json(res, 200, { ok: true });
      }
      return json(res, 404, { error: "ruta desconocida" });
    }

    // Boton "Entrar" como superadmin (admin@solers.es, sin teclear): firma una llave /solers al vuelo y redirige.
    if (url.pathname.startsWith("/e/")) {
      const dom = DOMINIOS[url.pathname.slice(3)];
      if (!dom) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("app desconocida"); }
      const sec = process.env.SOLERS_LLAVE_SECRETO || "";
      if (!sec) { res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("falta SOLERS_LLAVE_SECRETO en el Centro"); }
      const base = `solers1.alex.${Math.floor(Date.now() / 1000)}`;
      const llave = `${base}.${createHmac("sha256", sec).update(base).digest("base64url")}`;
      const host = dom.includes(".") ? dom : `${dom}.solers.es`;
      res.writeHead(302, { Location: `https://${host}/solers?llave=${llave}`, "Cache-Control": "no-store", ...setCookie });
      return res.end();
    }
    // dos pestañas del Centro
    if (url.pathname === "/dinero") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...setCookie }); return res.end(conTickets(PAGINA)); }
    if (url.pathname === "/arbol")  { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...setCookie }); return res.end(conTickets(ARBOL_HTML)); }
    if (url.pathname === "/obra")   { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...setCookie }); return res.end(conTickets(OBRA)); }
    if (url.pathname === "/tickets") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...setCookie }); return res.end(fichero("tickets.html") || "Falta tickets.html"); }
    if (url.pathname === "/tickets-flotante.js") { res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-cache" }); return res.end(fichero("tickets-flotante.js")); }
    if (url.pathname === "/chat")   { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...setCookie }); return res.end(conTickets(CHAT_HTML)); }
    if (url.pathname === "/paraiso"){ res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", ...setCookie }); return res.end(PARAISO_HTML); }
    // raíz u otra ruta → al árbol
    res.writeHead(302, { Location: "/arbol", ...setCookie }); res.end();
  } catch (e) {
    json(res, 500, { error: String(e && e.message || e) });
  }
});
server.listen(PORT, () => console.log("Centro de dinero en :" + PORT));

const PAGINA = `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>solers · Dinero</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
 :root{ --sol:#D4622A;--tinta:#241E17;--hueso:#F5F0E7;--carta:#fff;--suave:#8a7f70;--linea:#E3DBCB;
   --oro:#B07D16;--oro-bg:#FBF1D9;--verde:#19863f;--verde-bg:#E6F3EA;
   --serif:"Fraunces",Georgia,serif;--sans:"IBM Plex Sans",system-ui,sans-serif;--mono:"IBM Plex Mono",ui-monospace,monospace; color-scheme:light;}
 *{box-sizing:border-box;margin:0} body{background:var(--hueso);color:var(--tinta);font-family:var(--sans);-webkit-font-smoothing:antialiased}
 .wrap{max-width:900px;margin:0 auto;padding:20px max(16px,env(safe-area-inset-left)) 60px max(16px,env(safe-area-inset-right))}
 h1{font-family:var(--serif);font-weight:600;font-size:24px} h1 b{color:var(--sol)}
 h2{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--suave);margin:26px 0 12px}
 .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
 .card{background:var(--carta);border:1px solid var(--linea);border-radius:14px;padding:16px;box-shadow:0 1px 2px rgba(36,30,23,.05)}
 .card .et{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--suave)}
 .card .big{font-family:var(--serif);font-size:32px;font-variant-numeric:tabular-nums;margin-top:4px}
 .oro{color:var(--oro)} .meta{margin-top:10px}
 .barra{height:8px;background:var(--oro-bg);border-radius:6px;overflow:hidden} .barra > i{display:block;height:100%;background:var(--oro)}
 .meta small{font-family:var(--mono);font-size:11px;color:var(--suave)}
 table{width:100%;border-collapse:collapse;background:var(--carta);border:1px solid var(--linea);border-radius:14px;overflow:hidden}
 th,td{text-align:left;padding:10px 12px;font-size:13.5px;border-bottom:1px solid var(--linea)} th{font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--suave);background:#fbf7ef}
 tr:last-child td{border-bottom:0} td.num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
 .pill{font-family:var(--mono);font-size:10px;padding:2px 7px;border-radius:20px} .p-activo{background:var(--verde-bg);color:var(--verde)} .p-prueba{background:var(--oro-bg);color:var(--oro)} .p-baja{background:#eee;color:#888}
 .vacio{color:var(--suave);font-size:13px;padding:14px;text-align:center}
 details{background:var(--carta);border:1px solid var(--linea);border-radius:14px;padding:4px 14px;margin-top:10px}
 summary{cursor:pointer;font-weight:600;padding:10px 0} .form{display:grid;gap:8px;padding:6px 0 14px;grid-template-columns:1fr 1fr}
 .form label{font-size:11px;color:var(--suave);display:flex;flex-direction:column;gap:3px}
 input,select{font:inherit;padding:8px 10px;border:1px solid var(--linea);border-radius:9px;background:#fff;color:inherit;min-width:0}
 .form .ancho{grid-column:1/-1} button{font:inherit;font-weight:600;background:var(--sol);color:#fff;border:0;border-radius:10px;padding:10px 16px;cursor:pointer}
 button:active{transform:translateY(1px)} .aviso{font-size:12px;color:var(--suave);margin-top:4px}
 footer{margin-top:30px;font-family:var(--mono);font-size:11px;color:var(--suave);text-align:center}
 .cnav{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px max(16px,env(safe-area-inset-left,0px));background:var(--carta);border-bottom:1px solid var(--linea);position:sticky;top:0;z-index:20}
 .cnav .marca{font-family:var(--serif);font-weight:600;font-size:16px}.cnav .marca b{color:var(--sol)}
 .cnav .tabs{display:flex;gap:6px} .cnav .t{text-decoration:none;font-size:13px;font-weight:600;color:var(--suave);padding:6px 12px;border-radius:9px;border:1px solid transparent}
 .cnav .t.on{background:var(--sol);color:#fff} .cnav .t:not(.on):hover{border-color:var(--linea)}
</style></head><body>
<nav class="cnav"><span class="marca"><b>solers</b> · Centro</span><span class="tabs"><a href="/arbol" class="t">🌳 Árbol</a><a href="/obra" class="t">🔨 Obra</a><a href="/dinero" class="t on">💰 Dinero</a><a href="/chat" class="t">💬 Chat</a><a href="/paraiso" class="t">🍽️ El Paraíso</a></span></nav>
<div class="wrap">

 <div class="cards" style="margin-top:16px">
  <div class="card"><div class="et">Facturado este mes</div><div class="big oro" id="facturado">—</div></div>
  <div class="card"><div class="et">Recurrente / mes</div><div class="big" id="recurrente">—</div>
    <div class="meta"><div class="barra"><i id="barra" style="width:0%"></i></div><small id="metaTxt">meta 1.000 €/mes</small></div></div>
  <div class="card"><div class="et">Clientes</div><div class="big" id="clientes">—</div><small class="et" id="clientesSub"></small></div>
 </div>

 <h2>Quién paga, cuánto al mes</h2>
 <table id="tablaClientes"><thead><tr><th>Cliente</th><th>Producto</th><th></th><th class="num">€/mes</th></tr></thead><tbody id="cuerpoClientes"></tbody></table>

 <h2>Últimos pagos</h2>
 <table id="tablaPagos"><thead><tr><th>Fecha</th><th>Concepto</th><th>Cómo</th><th class="num">Importe</th></tr></thead><tbody id="cuerpoPagos"></tbody></table>

 <h2>Añadir</h2>
 <details><summary>+ Cliente nuevo</summary>
  <div class="form"><label>Nombre<input id="c_nombre"></label><label>Contacto<input id="c_contacto" placeholder="email / teléfono"></label>
   <label>Estado<select id="c_estado"><option value="prueba">prueba</option><option value="activo">activo</option><option value="baja">baja</option></select></label>
   <div class="ancho"><button onclick="addCliente()">Guardar cliente</button></div></div></details>
 <details><summary>+ Cobro recurrente (cada mes)</summary>
  <div class="form"><label>Cliente<select id="s_cliente"></select></label>
   <label>Producto<select id="s_producto"><option>Brasa</option><option>GestorOS</option><option>Apoteósicas</option><option>Chispa</option><option>Brigada</option><option>PULSO</option><option>RUTA</option><option>CGB</option><option>Web</option><option>Otro</option></select></label>
   <label>Edición<select id="s_edicion"><option value="base">base</option><option value="plus">Plus</option></select></label>
   <label>€ al mes<input id="s_euros" type="number" step="1" inputmode="decimal"></label>
   <div class="ancho"><button onclick="addSus()">Guardar cobro recurrente</button></div></div></details>
 <details><summary>+ Pago recibido</summary>
  <div class="form"><label>Cliente<select id="p_cliente"></select></label><label>Importe €<input id="p_importe" type="number" step="0.01" inputmode="decimal"></label>
   <label>Concepto<input id="p_concepto"></label><label>Cómo<select id="p_metodo"><option>transferencia</option><option>stripe</option><option>efectivo</option><option>bizum</option></select></label>
   <div class="ancho"><button onclick="addPago()">Guardar pago</button></div></div></details>

 <footer id="pie">cargando…</footer>
</div>
<script>
const META=1000; const eur=n=>new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n||0);
let D={clientes:[]};
async function cargar(){
  const r=await fetch("/api/datos"); D=await r.json();
  document.getElementById("facturado").textContent=eur(D.resumen.facturadoMes);
  document.getElementById("recurrente").textContent=eur(D.resumen.recurrente)+" ";
  const pct=Math.min(100,Math.round(D.resumen.recurrente/META*100));
  document.getElementById("barra").style.width=pct+"%";
  document.getElementById("metaTxt").textContent=pct+"% de la meta (1.000 €/mes)";
  document.getElementById("clientes").textContent=D.resumen.totalClientes;
  document.getElementById("clientesSub").textContent=D.resumen.activos+" activos";
  // clientes
  const nombre=id=>{const c=D.clientes.find(x=>x.id===id);return c?c.nombre:"—"};
  const cc=document.getElementById("cuerpoClientes"); cc.innerHTML="";
  if(!D.clientes.length) cc.innerHTML='<tr><td colspan=4 class=vacio>Todavía no hay clientes. Añade el primero abajo.</td></tr>';
  for(const c of D.clientes){
    const subs=(D.porCliente[c.id]||[]);
    const prod=subs.map(s=>s.producto+(s.edicion==="plus"?" Plus":"")).join(", ")||"—";
    const mes=subs.filter(s=>s.activa).reduce((a,s)=>a+Number(s.euros_mes||0),0);
    const est='<span class="pill p-'+(c.estado||"prueba")+'">'+(c.estado||"prueba")+'</span>';
    cc.insertAdjacentHTML("beforeend",'<tr><td>'+esc(c.nombre)+'</td><td>'+esc(prod)+'</td><td>'+est+'</td><td class=num>'+(mes?eur(mes):"—")+'</td></tr>');
  }
  // pagos
  const cp=document.getElementById("cuerpoPagos"); cp.innerHTML="";
  if(!D.pagos.length) cp.innerHTML='<tr><td colspan=4 class=vacio>Aún no hay pagos registrados.</td></tr>';
  for(const p of D.pagos.slice(0,20)) cp.insertAdjacentHTML("beforeend",'<tr><td>'+(p.fecha||"")+'</td><td>'+esc(p.concepto||nombre(p.cliente_id))+'</td><td>'+esc(p.metodo||"")+'</td><td class=num>'+eur(p.importe)+'</td></tr>');
  // selects de cliente
  const opc='<option value="">—</option>'+D.clientes.map(c=>'<option value="'+c.id+'">'+esc(c.nombre)+'</option>').join("");
  for(const id of ["s_cliente","p_cliente"]) document.getElementById(id).innerHTML=opc;
  document.getElementById("pie").textContent="Centro de dinero · lee la base del Centro · "+new Date().toLocaleString("es-ES");
}
function esc(s){return String(s==null?"":s).replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]))}
async function post(ruta,obj){const r=await fetch(ruta,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(obj)});const j=await r.json();if(!j.ok)throw new Error(j.error||"error");}
async function addCliente(){try{await post("/api/cliente",{nombre:val("c_nombre"),contacto:val("c_contacto"),estado:val("c_estado")});limpiar(["c_nombre","c_contacto"]);cargar();}catch(e){alert("No se pudo: "+e.message)}}
async function addSus(){try{await post("/api/suscripcion",{cliente_id:val("s_cliente"),producto:val("s_producto"),edicion:val("s_edicion"),euros_mes:val("s_euros")});limpiar(["s_euros"]);cargar();}catch(e){alert("No se pudo: "+e.message)}}
async function addPago(){try{await post("/api/pago",{cliente_id:val("p_cliente"),importe:val("p_importe"),concepto:val("p_concepto"),metodo:val("p_metodo")});limpiar(["p_importe","p_concepto"]);cargar();}catch(e){alert("No se pudo: "+e.message)}}
const val=id=>document.getElementById(id).value.trim();
const limpiar=ids=>ids.forEach(id=>document.getElementById(id).value="");
cargar();
</script></body></html>`;

const OBRA = `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>solers · Obra</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<style>
 :root{ --sol:#D4622A;--tinta:#241E17;--hueso:#F5F0E7;--carta:#fff;--suave:#8a7f70;--linea:#E3DBCB;--oro:#B07D16;--oro-bg:#FBF1D9;--verde:#19863f;--verde-bg:#E6F3EA;
   --serif:"Fraunces",Georgia,serif;--sans:"IBM Plex Sans",system-ui,sans-serif;--mono:"IBM Plex Mono",ui-monospace,monospace; color-scheme:light;}
 *{box-sizing:border-box;margin:0} body{background:var(--hueso);color:var(--tinta);font-family:var(--sans);-webkit-font-smoothing:antialiased}
 .wrap{max-width:900px;margin:0 auto;padding:20px max(16px,env(safe-area-inset-left)) 60px max(16px,env(safe-area-inset-right))}
 h2{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--suave);margin:26px 0 12px}
 .cnav{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px max(16px,env(safe-area-inset-left,0px));background:var(--carta);border-bottom:1px solid var(--linea);position:sticky;top:0;z-index:20}
 .cnav .marca{font-family:var(--serif);font-weight:600;font-size:16px}.cnav .marca b{color:var(--sol)}
 .cnav .tabs{display:flex;gap:6px} .cnav .t{text-decoration:none;font-size:13px;font-weight:600;color:var(--suave);padding:6px 12px;border-radius:9px;border:1px solid transparent}
 .cnav .t.on{background:var(--sol);color:#fff} .cnav .t:not(.on):hover{border-color:var(--linea)}
 .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
 .n{background:var(--carta);border:1px solid var(--linea);border-radius:14px;padding:16px;box-shadow:0 1px 2px rgba(36,30,23,.05)}
 .n .nom{font-family:var(--serif);font-size:18px;font-weight:600} .n .cli{font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--suave);margin-top:2px}
 .dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:7px;vertical-align:middle} .dot-on{background:var(--verde);box-shadow:0 0 0 3px var(--verde-bg)} .dot-off{background:var(--oro);box-shadow:0 0 0 3px var(--oro-bg)}
 .n .hace{font-size:13.5px;margin-top:10px;color:#4a4137} .n .links{margin-top:12px;display:flex;gap:8px;flex-wrap:wrap}
 .n a{font-size:12px;font-weight:600;text-decoration:none;padding:5px 10px;border-radius:8px;border:1px solid var(--linea);color:var(--tinta)}
 .n a.pr{background:var(--oro-bg);border-color:var(--oro-bg);color:var(--oro)} .n a.ses{color:var(--sol)}
 .pend{background:var(--carta);border:1px solid var(--linea);border-radius:14px;padding:6px 16px;list-style:none}
 .pend li{padding:10px 0;border-bottom:1px solid var(--linea);font-size:13.5px;display:flex;align-items:center;gap:8px} .pend li:last-child{border-bottom:0} .pend .txt{flex:1;min-width:0} .cerrar{flex:none;font:inherit;font-size:11px;font-weight:600;background:var(--verde-bg);color:var(--verde);border:0;border-radius:7px;padding:5px 10px;cursor:pointer} .cerrar:hover{background:var(--verde);color:#fff} .cerrar:disabled{opacity:.5}
 .pend .tag{font-family:var(--mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;color:var(--suave);margin-right:8px}
 .res{font-family:var(--mono);font-size:11px;color:var(--suave);margin:-4px 0 14px}
 footer{margin-top:30px;font-family:var(--mono);font-size:11px;color:var(--suave);text-align:center}
</style></head><body>
<nav class="cnav"><span class="marca"><b>solers</b> · Centro</span><span class="tabs"><a href="/arbol" class="t">🌳 Árbol</a><a href="/obra" class="t on">🔨 Obra</a><a href="/dinero" class="t">💰 Dinero</a><a href="/chat" class="t">💬 Chat</a><a href="/paraiso" class="t">🍽️ El Paraíso</a></span></nav>
<div class="wrap">
 <h2>Qué se está construyendo ahora</h2>
 <div class="res" id="resObra"></div>
 <div class="grid" id="nubes"></div>
 <h2>Para Alex — lo que necesita que mires</h2>
 <ul class="pend" id="pend"></ul>
 <footer id="pie">cargando…</footer>
</div>
<script>
const esc=s=>String(s==null?"":s).replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]));
async function cargar(){
 let d; try{ d=await (await fetch("/api/obra")).json(); }catch(e){ return; }
 const g=document.getElementById("nubes"); g.innerHTML="";
 for(const n of (d.nubes||[])){
  const pr=n.pr?'<a class="pr" href="https://github.com/solers-es/'+esc(n.repo)+'/pull/'+n.pr.num+'" target="_blank" rel="noopener">PR #'+n.pr.num+' · '+esc(n.pr.estado||"")+'</a>':'<span style="font-size:12px;color:var(--suave)">trabajando…</span>';
  const ses=n.sesion?'<a class="ses" href="'+esc(n.sesion)+'" target="_blank" rel="noopener">ver sesión</a>':'';
  g.insertAdjacentHTML("beforeend",'<div class="n"><div class="nom"><span class="dot dot-'+(n.estado==="running"?"on":"off")+'"></span>'+esc(n.nombre)+'</div><div class="cli">'+esc(n.cliente||"")+'</div><div class="hace">'+esc(n.hace||"")+'</div><div class="links">'+pr+ses+'</div></div>');
 }
 const run=(d.nubes||[]).filter(x=>x.estado==="running").length; const ro=document.getElementById("resObra"); if(ro) ro.textContent=(d.nubes||[]).length+" nubes · "+run+" trabajando ahora · act. "+(d.actualizado?new Date(d.actualizado).toLocaleTimeString("es-ES"):"—"); try{const dd=await (await fetch("/api/datos")).json(); if(ro&&dd&&dd.resumen) ro.textContent+=" · "+Math.round(dd.resumen.recurrente)+"€/mes rec · "+Math.round(dd.resumen.facturadoMes)+"€ este mes";}catch(e){} const p=document.getElementById("pend"); p.innerHTML="";
 for(const x of (d.pendientes||[])) p.insertAdjacentHTML("beforeend",'<li><span class="tag">'+esc(x.tipo||"")+'</span><span class="txt">'+esc(x.que)+'</span><button class="cerrar" data-que="'+esc(x.que).replace(/"/g,"&quot;")+'">✓ hecho</button></li>');
 if(!(d.pendientes||[]).length) p.insertAdjacentHTML("beforeend",'<li style="color:var(--suave);justify-content:center">Nada pendiente. Todo cerrado 🎉</li>');
 document.getElementById("pie").textContent="Obra · actualizado "+(d.actualizado?new Date(d.actualizado).toLocaleString("es-ES"):"—");
}
document.getElementById("pend").addEventListener("click", async e=>{ const b=e.target.closest(".cerrar"); if(!b) return; b.disabled=true; try{ await fetch("/api/pendiente",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({que:b.dataset.que,cerrar:true})}); cargar(); }catch(err){ b.disabled=false; alert("No se pudo cerrar: "+err.message); } });
cargar(); setInterval(cargar,30000);
</script></body></html>`;

const CHAT_HTML = `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>solers · Chat</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
 :root{ --sol:#D4622A;--tinta:#241E17;--hueso:#F5F0E7;--carta:#fff;--suave:#8a7f70;--linea:#E3DBCB;--azul:#2563EB;--azul-bg:#E1EAFB;--verde:#19863f;--verde-bg:#E6F3EA;
   --serif:"Fraunces",Georgia,serif;--sans:"IBM Plex Sans",system-ui,sans-serif;--mono:"IBM Plex Mono",ui-monospace,monospace; color-scheme:light;}
 *{box-sizing:border-box;margin:0} html,body{height:100%} body{background:var(--hueso);color:var(--tinta);font-family:var(--sans);-webkit-font-smoothing:antialiased;display:flex;flex-direction:column}
 .cnav{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;flex:none;padding:10px max(16px,env(safe-area-inset-left,0px));background:var(--carta);border-bottom:1px solid var(--linea)}
 .cnav .marca{font-family:var(--serif);font-weight:600;font-size:16px}.cnav .marca b{color:var(--sol)}
 .cnav .tabs{display:flex;gap:6px;flex-wrap:wrap} .cnav .t{text-decoration:none;font-size:13px;font-weight:600;color:var(--suave);padding:6px 12px;border-radius:9px;border:1px solid transparent}
 .cnav .t.on{background:var(--sol);color:#fff} .cnav .t:not(.on):hover{border-color:var(--linea)}
 .hilo{flex:1;overflow:auto;padding:16px max(16px,env(safe-area-inset-left)) 16px max(16px,env(safe-area-inset-right));display:flex;flex-direction:column;gap:10px;max-width:820px;margin:0 auto;width:100%}
 .msg{background:var(--carta);border:1px solid var(--linea);border-radius:14px;padding:10px 13px;max-width:88%;align-self:flex-start;box-shadow:0 1px 2px rgba(36,30,23,.05)}
 .msg .de{font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--sol);font-weight:600;margin-bottom:3px}
 .msg .tx{font-size:14px;line-height:1.45;white-space:pre-wrap;word-break:break-word} .msg .h{font-family:var(--mono);font-size:10px;color:var(--suave);margin-top:4px}
 .msg.mio{align-self:flex-end;background:var(--azul-bg);border-color:var(--azul-bg)} .msg.mio .de{color:var(--azul)}
 .msg.claude{background:var(--verde-bg);border-color:var(--verde-bg)} .msg.claude .de{color:var(--verde)}
 .vacio{color:var(--suave);font-size:13px;text-align:center;margin:auto;max-width:360px}
 .barra{flex:none;border-top:1px solid var(--linea);background:var(--carta);padding:10px max(16px,env(safe-area-inset-left)) calc(10px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-right))}
 .barra .fila{max-width:820px;margin:0 auto;display:flex;gap:8px;align-items:flex-end}
 .barra input#quien{flex:none;width:96px} .barra textarea{flex:1;resize:none;height:42px;max-height:120px}
 input,textarea{font:inherit;padding:9px 11px;border:1px solid var(--linea);border-radius:10px;background:#fff;color:inherit;min-width:0}
 button{font:inherit;font-weight:600;background:var(--sol);color:#fff;border:0;border-radius:10px;padding:10px 16px;cursor:pointer;flex:none} button:active{transform:translateY(1px)}
 .pie{font-family:var(--mono);font-size:10px;color:var(--suave);text-align:center;padding:4px}
</style></head><body>
<nav class="cnav"><span class="marca"><b>solers</b> · Centro</span><span class="tabs"><a href="/arbol" class="t">🌳 Árbol</a><a href="/obra" class="t">🔨 Obra</a><a href="/dinero" class="t">💰 Dinero</a><a href="/chat" class="t on">💬 Chat</a><a href="/paraiso" class="t">🍽️ El Paraíso</a></span></nav>
<div class="hilo" id="hilo"><div class="vacio">cargando…</div></div>
<div class="barra"><div class="fila">
  <input id="quien" placeholder="tú" maxlength="40">
  <textarea id="texto" placeholder="Escribe para los dos Claude y para Stalin…"></textarea>
  <button onclick="enviar()">Enviar</button>
</div><div class="pie">canal en vivo · se refresca solo cada 4 s</div></div>
<script>
const esc=s=>String(s==null?"":s).replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]));
const quien=document.getElementById("quien");
try{ quien.value=localStorage.getItem("chat_quien")||""; }catch(e){}
quien.addEventListener("change",()=>{try{localStorage.setItem("chat_quien",quien.value.trim())}catch(e){}});
let ultimo="";
async function cargar(){
  let d; try{ d=await (await fetch("/api/chat")).json(); }catch(e){ return; }
  const ms=d.mensajes||[]; const firma=ms.length+":"+(ms.length?ms[ms.length-1].ts:""); if(firma===ultimo) return; ultimo=firma;
  const h=document.getElementById("hilo"); const abajo=h.scrollHeight-h.scrollTop-h.clientHeight<90;
  h.innerHTML=""; if(!ms.length){ h.innerHTML='<div class="vacio">Aún no hay mensajes. Escribe el primero — lo verán los dos Claude y Stalin.</div>'; return; }
  const yo=(quien.value||"").trim().toLowerCase();
  for(const m of ms){ const de=(m.de||"?"); const esClaude=/claude/i.test(de); const mio=yo&&de.toLowerCase()===yo&&!esClaude;
    const cls="msg"+(esClaude?" claude":(mio?" mio":"")); const hora=m.ts?new Date(m.ts).toLocaleString("es-ES"):"";
    h.insertAdjacentHTML("beforeend",'<div class="'+cls+'"><div class="de">'+esc(de)+'</div><div class="tx">'+esc(m.texto)+'</div><div class="h">'+hora+'</div></div>'); }
  if(abajo) h.scrollTop=h.scrollHeight;
}
async function enviar(){ const t=document.getElementById("texto"); const texto=t.value.trim(); if(!texto) return;
  const de=(quien.value||"").trim()||"anónimo";
  try{ await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({de,texto})}); t.value=""; ultimo=""; cargar(); }catch(e){ alert("No se pudo enviar: "+e.message); } }
document.getElementById("texto").addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); enviar(); } });
cargar(); setInterval(cargar,4000);
</script></body></html>`;

const PARAISO_HTML = `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>solers · El Paraíso</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
 :root{ --sol:#D4622A;--tinta:#241E17;--hueso:#F5F0E7;--carta:#fff;--suave:#8a7f70;--linea:#E3DBCB;--oro:#B07D16;--oro-bg:#FBF1D9;--verde:#19863f;--verde-bg:#E6F3EA;--rojo:#b3402e;--rojo-bg:#f7e3df;
   --serif:"Fraunces",Georgia,serif;--sans:"IBM Plex Sans",system-ui,sans-serif;--mono:"IBM Plex Mono",ui-monospace,monospace; color-scheme:light;}
 *{box-sizing:border-box;margin:0} body{background:var(--hueso);color:var(--tinta);font-family:var(--sans);-webkit-font-smoothing:antialiased}
 .wrap{max-width:960px;margin:0 auto;padding:18px max(16px,env(safe-area-inset-left)) 60px max(16px,env(safe-area-inset-right))}
 .cnav{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:10px max(16px,env(safe-area-inset-left,0px));background:var(--carta);border-bottom:1px solid var(--linea);position:sticky;top:0;z-index:20}
 .cnav .marca{font-family:var(--serif);font-weight:600;font-size:16px}.cnav .marca b{color:var(--sol)}
 .cnav .tabs{display:flex;gap:6px;flex-wrap:wrap} .cnav .t{text-decoration:none;font-size:13px;font-weight:600;color:var(--suave);padding:6px 12px;border-radius:9px;border:1px solid transparent}
 .cnav .t.on{background:var(--sol);color:#fff} .cnav .t:not(.on):hover{border-color:var(--linea)}
 h1{font-family:var(--serif);font-weight:600;font-size:24px;margin-top:14px} h1 b{color:var(--sol)}
 h2{font-family:var(--mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--suave);margin:26px 0 12px}
 .res{font-family:var(--mono);font-size:11px;color:var(--suave);margin:4px 0 0}
 .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:10px}
 .card{background:var(--carta);border:1px solid var(--linea);border-radius:14px;padding:14px}
 .card .et{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--suave)} .card .big{font-family:var(--serif);font-size:28px;font-variant-numeric:tabular-nums;margin-top:3px}
 .mesas{display:grid;grid-template-columns:repeat(auto-fill,minmax(94px,1fr));gap:10px}
 .mesa{background:var(--carta);border:1px solid var(--linea);border-radius:12px;padding:12px 8px;text-align:center}
 .mesa .nm{font-weight:600;font-size:14px} .mesa .st{font-family:var(--mono);font-size:10px;margin-top:4px;padding:2px 7px;border-radius:20px;display:inline-block}
 .libre{background:var(--verde-bg);color:var(--verde)} .ocupada{background:var(--rojo-bg);color:var(--rojo)}
 .mesa .seats{font-size:11px;color:var(--suave);margin-top:3px}
 .cat{margin-top:14px} .cat h3{font-family:var(--serif);font-size:16px;font-weight:600;margin-bottom:4px}
 .prod{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--linea);font-size:14px} .prod:last-child{border-bottom:0}
 .prod .pr{font-variant-numeric:tabular-nums;font-weight:600;flex:none;color:var(--sol)}
 table{width:100%;border-collapse:collapse;background:var(--carta);border:1px solid var(--linea);border-radius:14px;overflow:hidden;margin-top:4px}
 th,td{text-align:left;padding:9px 12px;font-size:13px;border-bottom:1px solid var(--linea)} th{font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--suave);background:#fbf7ef}
 tr:last-child td{border-bottom:0} td.num{text-align:right;font-variant-numeric:tabular-nums;font-weight:600}
 footer{margin-top:30px;font-family:var(--mono);font-size:11px;color:var(--suave);text-align:center}
</style></head><body>
<nav class="cnav"><span class="marca"><b>solers</b> · Centro</span><span class="tabs"><a href="/arbol" class="t">🌳 Árbol</a><a href="/obra" class="t">🔨 Obra</a><a href="/dinero" class="t">💰 Dinero</a><a href="/chat" class="t">💬 Chat</a><a href="/paraiso" class="t on">🍽️ El Paraíso</a></span></nav>
<div class="wrap">
 <h1><b>El Paraíso</b> · en vivo</h1>
 <div class="res" id="res">cargando…</div>
 <div class="cards" id="cards"></div>
 <h2>Mesas</h2><div class="mesas" id="mesas"></div>
 <h2>Carta</h2><div id="carta"></div>
 <h2>Últimos cobros</h2><table><thead><tr><th>Fecha</th><th>Cómo</th><th class="num">Importe</th></tr></thead><tbody id="ventas"></tbody></table>
 <footer id="pie"></footer>
</div>
<script>
const esc=s=>String(s==null?"":s).replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]));
const eur=n=>new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR"}).format(n||0);
const fh=s=>{try{return new Date(s).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}catch(e){return""}};
async function cargar(){
 let d; try{ d=await (await fetch("/api/paraiso")).json(); }catch(e){ return; }
 if(!d.hay){ document.getElementById("res").textContent="Falta la conexión con la base del bar."; return; }
 const prods=d.productos||[], mesas=d.mesas||[], cats=d.categorias||[], peds=d.pedidos||[], pagos=d.pagos||[];
 const total=pagos.reduce((a,p)=>a+Number(p.amount||0),0);
 const libres=mesas.filter(m=>m.state==="free").length;
 document.getElementById("res").textContent=mesas.length+" mesas · "+prods.length+" productos · "+peds.length+" pedidos recientes · act. "+new Date(d.ts).toLocaleTimeString("es-ES");
 document.getElementById("cards").innerHTML=
  '<div class="card"><div class="et">Mesas libres</div><div class="big">'+libres+' / '+mesas.length+'</div></div>'+
  '<div class="card"><div class="et">Productos (carta)</div><div class="big">'+prods.length+'</div></div>'+
  '<div class="card"><div class="et">Cobrado (histórico)</div><div class="big" style="color:var(--oro)">'+eur(total)+'</div></div>';
 const mh=mesas.map(m=>{const ocup=m.state!=="free";return '<div class="mesa"><div class="nm">'+esc(m.name)+'</div><div class="st '+(ocup?"ocupada":"libre")+'">'+(ocup?"ocupada":"libre")+'</div><div class="seats">'+(m.seats||0)+' pax</div></div>';}).join("");
 document.getElementById("mesas").innerHTML=mh||'<div style="color:var(--suave)">Sin mesas.</div>';
 const porCat={}; for(const p of prods){ (porCat[p.category_id]=porCat[p.category_id]||[]).push(p); }
 let ch=""; for(const c of cats){ const ps=porCat[c.id]||[]; if(!ps.length) continue; ch+='<div class="cat"><h3>'+esc(c.name)+'</h3>'+ps.map(p=>'<div class="prod"><span>'+esc(p.name)+(p.active===false?' <small style="color:var(--suave)">(inactivo)</small>':'')+'</span><span class="pr">'+eur(p.sell_price_gross)+'</span></div>').join("")+'</div>'; }
 document.getElementById("carta").innerHTML=ch||'<div style="color:var(--suave)">Sin productos.</div>';
 const vb=document.getElementById("ventas"); vb.innerHTML="";
 if(!pagos.length) vb.innerHTML='<tr><td colspan=3 style="color:var(--suave);text-align:center">Sin cobros.</td></tr>';
 for(const p of pagos.slice(0,25)) vb.insertAdjacentHTML("beforeend",'<tr><td>'+fh(p.created_at)+'</td><td>'+esc(p.method||"")+'</td><td class=num>'+eur(p.amount)+'</td></tr>');
 document.getElementById("pie").textContent="El Paraíso · solo lectura (de momento) · se actualiza solo cada 5 s";
}
cargar(); setInterval(cargar,5000);
</script></body></html>`;
