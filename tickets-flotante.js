// TICKETS · panel flotante del Centro (25/10/2026)
// Se carga en todas las pestañas: añade la pestaña «🎫 Tickets», un botón fijo a la derecha
// con lo pendiente (lo urgente primero) y, en el Árbol, el contador de tickets de cada producto.
(function () {
  const PRIO = { urgente: 0, alta: 1, normal: 2, baja: 3 };
  const EST = { hacer: { c: "#D33A2C", n: "Por hacer" }, curso: { c: "#2563EB", n: "En curso (Claude)" }, revisar: { c: "#D9A21B", n: "Por revisar" }, hecho: { c: "#19863f", n: "Hecho" } };
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  let lista = [], filtro = "", ultimo = "";

  const css = document.createElement("style");
  css.textContent = `
  .tk-boton{position:fixed;right:calc(14px + env(safe-area-inset-right,0px));bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:50;
    display:flex;align-items:center;gap:8px;background:#241E17;color:#fff;border:0;border-radius:999px;padding:11px 16px;
    font:600 14px "IBM Plex Sans",system-ui,sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.25);cursor:pointer}
  .tk-boton .tk-n{background:#D33A2C;border-radius:999px;padding:1px 8px;font-size:13px}
  .tk-boton .tk-r{background:#D9A21B;border-radius:999px;padding:1px 8px;font-size:13px;color:#241E17}
  .tk-panel{position:fixed;top:0;right:0;bottom:0;width:min(420px,100vw);z-index:60;background:#FFFDF8;border-left:1px solid #D9CFBC;
    box-shadow:-10px 0 30px rgba(0,0,0,.15);display:flex;flex-direction:column;font-family:"IBM Plex Sans",system-ui,sans-serif;color:#241E17;
    padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
  .tk-panel[hidden]{display:none}
  .tk-hechos{border-top:1px dashed #D9CFBC;padding-top:8px;margin-top:4px;display:flex;flex-direction:column;gap:8px}
  .tk-hechos summary{cursor:pointer;font-weight:600;color:#19863f;font-size:14px;padding:4px 2px}
  .tk-hechos .tk-t{opacity:.75}
  .tk-cab{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px;border-bottom:1px solid #E3DBCB}
  .tk-cab b{font:600 18px Fraunces,Georgia,serif}
  .tk-cab button,.tk-acc button{font:inherit;font-size:12px;font-weight:600;border:1px solid #D9CFBC;background:#fff;border-radius:8px;padding:4px 9px;cursor:pointer;color:#241E17}
  .tk-filtro{padding:8px 16px;font-size:12px;color:#8a7f70;display:flex;gap:8px;align-items:center}
  .tk-cuerpo{flex:1;overflow:auto;padding:6px 12px 14px;display:flex;flex-direction:column;gap:8px}
  .tk-t{border:1px solid #E3DBCB;background:#fff;border-radius:12px;padding:9px 11px;display:grid;grid-template-columns:12px 1fr;gap:4px 9px}
  .tk-luz{width:12px;height:12px;border-radius:50%;margin-top:3px}
  .tk-tit{font-weight:600;font-size:14px;line-height:1.3}
  .tk-meta{grid-column:2;font:500 11px "IBM Plex Mono",ui-monospace,monospace;color:#8a7f70;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  .tk-urg{background:#D33A2C;color:#fff;border-radius:5px;padding:0 5px}.tk-alta{background:#F6D7C9;color:#8A2E12;border-radius:5px;padding:0 5px}
  .tk-det{grid-column:2;font-size:12.5px;color:#4a4035;white-space:pre-wrap}
  .tk-acc{grid-column:2;display:flex;gap:6px;margin-top:3px}
  .tk-pie{border-top:1px solid #E3DBCB;padding:10px 16px;font-size:13px;display:flex;justify-content:space-between}
  .tk-pie a{color:#D4622A;font-weight:600;text-decoration:none}
  .tk-vacio{color:#8a7f70;text-align:center;padding:30px 10px;font-size:14px}
  .tk-chapa{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:1px 7px;font:600 11px "IBM Plex Mono",monospace;color:#fff;cursor:pointer;margin-left:2px}
  `;
  document.head.appendChild(css);

  // pestaña en la barra de arriba (si la página no la trae ya)
  const tabs = document.querySelector(".cnav .tabs");
  if (tabs && !tabs.querySelector('a[href="/tickets"]')) {
    const a = document.createElement("a"); a.href = "/tickets"; a.className = "t" + (location.pathname === "/tickets" ? " on" : ""); a.textContent = "🎫 Tickets"; tabs.appendChild(a);
  }
  const enPagina = location.pathname === "/tickets";

  const boton = document.createElement("button"); boton.className = "tk-boton"; boton.type = "button";
  boton.addEventListener("click", () => abrir(""));
  if (!enPagina) document.body.appendChild(boton);

  let panel = null;
  function abrir(producto) { filtro = producto || ""; if (!panel) crearPanel(); panel.hidden = false; pintarPanel(); }
  function crearPanel() {
    panel = document.createElement("aside"); panel.className = "tk-panel"; panel.hidden = true;
    panel.innerHTML = '<div class="tk-cab"><b>🎫 Tickets pendientes</b><button type="button" data-cerrar>Cerrar ✕</button></div><div class="tk-filtro"></div><div class="tk-cuerpo"></div><div class="tk-pie"><span class="tk-res"></span><a href="/tickets">Ver todos y añadir →</a></div>';
    panel.querySelector("[data-cerrar]").addEventListener("click", () => (panel.hidden = true));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel) panel.hidden = true; });
    document.body.appendChild(panel);
  }
  function orden(a, b) { return (PRIO[a.prioridad] ?? 2) - (PRIO[b.prioridad] ?? 2) || (a.estado === "hacer" ? 0 : 1) - (b.estado === "hacer" ? 0 : 1) || String(a.creado).localeCompare(String(b.creado)); }

  function tarjeta(t) {
    const d = document.createElement("div"); d.className = "tk-t";
    const luz = document.createElement("span"); luz.className = "tk-luz"; luz.style.background = (EST[t.estado] || EST.hacer).c; luz.title = (EST[t.estado] || EST.hacer).n; d.appendChild(luz);
    const tit = document.createElement("div"); tit.className = "tk-tit"; tit.textContent = t.titulo; d.appendChild(tit);
    const m = document.createElement("div"); m.className = "tk-meta";
    if (t.prioridad === "urgente" || t.prioridad === "alta") { const u = document.createElement("span"); u.className = t.prioridad === "urgente" ? "tk-urg" : "tk-alta"; u.textContent = t.prioridad.toUpperCase(); m.appendChild(u); }
    const p = document.createElement("span"); p.textContent = [t.producto, t.rama].filter(Boolean).join(" · ") || "general"; m.appendChild(p);
    if (t.quien) { const q = document.createElement("span"); q.textContent = "→ " + t.quien; m.appendChild(q); }
    const e = document.createElement("span"); e.textContent = (EST[t.estado] || EST.hacer).n; m.appendChild(e);
    d.appendChild(m);
    if (t.detalle) { const x = document.createElement("div"); x.className = "tk-det"; x.textContent = t.detalle; d.appendChild(x); }
    const acc = document.createElement("div"); acc.className = "tk-acc";
    const mover = (estado, txt) => { const b = document.createElement("button"); b.type = "button"; b.textContent = txt; b.addEventListener("click", () => cambiar(t.id, estado)); acc.appendChild(b); };
    if (t.estado === "hacer" || t.estado === "revisar") {
      const e = document.createElement("button"); e.type = "button"; e.textContent = t.estado === "hacer" ? "▶ Empezar con Claude" : "▶ Terminar con Claude";
      e.style.cssText = "background:#2563EB;color:#fff;border-color:#2563EB";
      e.addEventListener("click", () => encargar(t));
      acc.appendChild(e);
      if (t.estado === "hacer") mover("revisar", "🟡 A revisión");
    }
    if (t.estado === "curso") {
      // mientras Claude trabaja no hay botón «Hecho»: lo pone él solo al terminar
      const w = document.createElement("div"); w.className = "tk-det"; w.style.color = "#2563EB";
      w.textContent = (t.lanzado ? "🔵 Claude trabajando en el Mac" : "🔵 Arrancando el Claude en el Mac…") + " · se pondrá 🟢 solo al terminar";
      d.appendChild(w);
      const p = document.createElement("button"); p.type = "button"; p.textContent = "⏹ Parar";
      p.addEventListener("click", () => cambiar(t.id, "hacer", { lanzado: "" })); acc.appendChild(p);
    }
    if (t.estado === "hacer" || t.estado === "revisar") mover("hecho", "🟢 Hecho");
    if (t.estado === "revisar") mover("hacer", "🔴 Volver a hacer");
    if (t.estado === "hecho") mover("hacer", "↩ Reabrir");
    d.appendChild(acc);
    return d;
  }
  function pintarPanel() {
    if (!panel) return;
    const f = panel.querySelector(".tk-filtro"); f.textContent = "";
    if (filtro) { f.append("Solo: " + filtro + " "); const b = document.createElement("button"); b.type = "button"; b.textContent = "ver todos"; b.style.cssText = "font-size:11px;border:1px solid #D9CFBC;background:#fff;border-radius:6px;cursor:pointer"; b.addEventListener("click", () => abrir("")); f.appendChild(b); }
    else f.textContent = "Lo más urgente, arriba. 🔴 por hacer · 🟡 por revisar";
    const c = panel.querySelector(".tk-cuerpo"); c.textContent = "";
    const ver = lista.filter((t) => t.estado !== "hecho" && (!filtro || norm(t.producto) === norm(filtro))).sort(orden);
    if (!ver.length) { const v = document.createElement("div"); v.className = "tk-vacio"; v.textContent = "🟢 Nada pendiente aquí. Ciclo cerrado."; c.appendChild(v); }
    ver.forEach((t) => c.appendChild(tarjeta(t)));
    // ✅ Realizados: lo cerrado se ve aparte, plegado, lo último arriba
    const hechos = lista.filter((t) => t.estado === "hecho" && (!filtro || norm(t.producto) === norm(filtro)))
      .sort((a, b) => String(b.actualizado).localeCompare(String(a.actualizado)));
    if (hechos.length) {
      const det = document.createElement("details"); det.className = "tk-hechos";
      const sum = document.createElement("summary"); sum.textContent = "✅ Realizados (" + hechos.length + ")"; det.appendChild(sum);
      hechos.forEach((t) => det.appendChild(tarjeta(t)));
      c.appendChild(det);
    }
    const pend = ver.length;
    panel.querySelector(".tk-res").textContent = "🔴🟡 " + pend + " pendientes · 🟢 " + lista.filter((t) => t.estado === "hecho").length + " hechos";
  }
  function pintarBoton() {
    const hacer = lista.filter((t) => t.estado === "hacer").length, rev = lista.filter((t) => t.estado === "revisar" || t.estado === "curso").length;
    const urg = lista.filter((t) => t.estado !== "hecho" && t.prioridad === "urgente").length;
    boton.textContent = "";
    boton.append("🎫 Tickets");
    const n = document.createElement("span"); n.className = "tk-n"; n.textContent = hacer + (urg ? " · " + urg + "⚠" : ""); n.title = "por hacer"; boton.appendChild(n);
    const r = document.createElement("span"); r.className = "tk-r"; r.textContent = rev; r.title = "por revisar"; boton.appendChild(r);
  }
  // Pone a un Claude (el de Alex o el de Stalin) a trabajar el ticket: manda el encargo
  // al canal (/api/chat) y marca el ticket en curso con quien lo hace. (26/10)
  function encargar(t) {
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;z-index:70;background:rgba(36,30,23,.5);display:flex;align-items:center;justify-content:center;padding:16px";
    const card = document.createElement("div");
    card.style.cssText = "background:#FFFDF8;border-radius:16px;max-width:420px;width:100%;padding:16px;font-family:system-ui,sans-serif;color:#241E17;box-shadow:0 20px 50px rgba(0,0,0,.3)";
    const h = document.createElement("div"); h.style.cssText = "font:600 16px Fraunces,Georgia,serif"; h.textContent = "▶ Poner a un Claude a trabajar"; card.appendChild(h);
    const sub = document.createElement("div"); sub.style.cssText = "font-size:12.5px;color:#8a7f70;margin:2px 0 10px"; sub.textContent = t.titulo || ""; card.appendChild(sub);
    const l1 = document.createElement("div"); l1.style.cssText = "font-size:13px;font-weight:600;margin-bottom:6px"; l1.textContent = "¿Con qué Claude?"; card.appendChild(l1);
    const qw = document.createElement("div"); qw.style.cssText = "display:flex;gap:8px;margin-bottom:10px"; card.appendChild(qw);
    const l2 = document.createElement("div"); l2.style.cssText = "font-size:13px;font-weight:600;margin-bottom:6px"; l2.textContent = "¿Qué le dices? (opcional)"; card.appendChild(l2);
    const ta = document.createElement("textarea"); ta.rows = 3; ta.placeholder = "Ej.: revísalo de verdad, mira el PR y las pruebas antes de darlo por hecho"; ta.style.cssText = "width:100%;border:1px solid #D9CFBC;border-radius:10px;padding:8px;font:inherit;font-size:13px;resize:vertical;box-sizing:border-box"; card.appendChild(ta);
    const pie = document.createElement("div"); pie.style.cssText = "display:flex;gap:8px;justify-content:flex-end;margin-top:12px"; card.appendChild(pie);
    const bx = document.createElement("button"); bx.type = "button"; bx.textContent = "Cancelar"; bx.style.cssText = "font:inherit;font-size:13px;border:1px solid #D9CFBC;background:#fff;border-radius:8px;padding:7px 12px;cursor:pointer"; pie.appendChild(bx);
    const ok = document.createElement("button"); ok.type = "button"; ok.textContent = "Enviar y empezar"; ok.disabled = true; ok.style.cssText = "font:inherit;font-size:13px;font-weight:600;border:0;background:#2563EB;color:#fff;border-radius:8px;padding:7px 14px;cursor:pointer;opacity:.5"; pie.appendChild(ok);
    ov.appendChild(card); document.body.appendChild(ov);
    let quien = "";
    const base = "flex:1;font:inherit;font-size:13px;font-weight:600;border:2px solid #D9CFBC;background:#fff;color:#241E17;border-radius:10px;padding:9px;cursor:pointer";
    const on = "flex:1;font:inherit;font-size:13px;font-weight:600;border:2px solid #2563EB;background:#2563EB;color:#fff;border-radius:10px;padding:9px;cursor:pointer";
    [["Claude de Alex", "El de Alex"], ["Claude de Stalin", "El de Stalin"]].forEach(function (par) {
      const b = document.createElement("button"); b.type = "button"; b.textContent = par[1]; b.style.cssText = base;
      b.addEventListener("click", function () {
        quien = par[0];
        Array.from(qw.children).forEach(function (c) { c.style.cssText = base; });
        b.style.cssText = on; ok.disabled = false; ok.style.opacity = "1";
      });
      qw.appendChild(b);
    });
    const cerrar = function () { ov.remove(); };
    bx.addEventListener("click", cerrar);
    ov.addEventListener("click", function (e) { if (e.target === ov) cerrar(); });
    ok.addEventListener("click", async function () {
      if (!quien) return;
      const msg = ta.value.trim();
      const texto = "📋 ENCARGO para " + quien + ": trabaja el ticket «" + (t.titulo || "") + "» (#" + t.id + (t.producto ? " · " + t.producto : "") + ")." + (msg ? " " + msg : "");
      try { await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ de: "Centro", texto: texto }) }); } catch (e) {}
      await cambiar(t.id, "curso", { quien: quien, lanzado: "" });
      cerrar();
    });
  }

  async function cambiar(id, estado, extra) {
    let de = ""; try { de = localStorage.getItem("tk-quien") || ""; } catch (e) {}
    await fetch("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, estado, ...(extra || {}), de: de || "web" }) });
    cargar();
  }

  // En el Árbol: chapita con los tickets abiertos de cada producto
  const enArbol = location.pathname === "/arbol" && typeof window.pinta === "function" && typeof window.render === "function";
  if (enArbol) {
    const orig = window.pinta;
    window.pinta = function (card, nodo, conEntrar) {
      orig(card, nodo, conEntrar);
      const abiertos = lista.filter((t) => t.estado !== "hecho" && norm(t.producto) === norm(nodo.n));
      if (!abiertos.length) return;
      const hacer = abiertos.filter((t) => t.estado === "hacer").length;
      const ch = document.createElement("span"); ch.className = "tk-chapa";
      ch.style.background = abiertos.some((t) => t.prioridad === "urgente") ? "#D33A2C" : hacer ? "#C0562C" : "#D9A21B";
      ch.textContent = "🎫 " + abiertos.length; ch.title = hacer + " por hacer · " + (abiertos.length - hacer) + " por revisar";
      ch.addEventListener("click", (e) => { e.stopPropagation(); abrir(nodo.n); });
      card.appendChild(ch);
    };
  }

  async function cargar() {
    try {
      const r = await fetch("/api/tickets", { cache: "no-store" }); if (!r.ok) return;
      const txt = await r.text(); if (txt === ultimo) return; ultimo = txt;
      lista = JSON.parse(txt).tickets || [];
      pintarBoton(); pintarPanel();
      if (enArbol) { try { window.render(false); } catch (e) {} }
      document.dispatchEvent(new CustomEvent("tickets", { detail: lista }));
    } catch (e) {}
  }
  window.ticketsAbrir = abrir; window.ticketsCargar = cargar;
  cargar(); setInterval(cargar, 30000);
})();
