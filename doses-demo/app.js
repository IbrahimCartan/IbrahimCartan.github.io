// Doses demo: the screens. The logic is in logic.js (a port of the iPhone app's DoseCore).
(function () {
  "use strict";
  const L = window.DoseLogic;
  const STORE_KEY = "dosesDemo.v1";
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const timeText = (ms) => new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const dayText = (ms) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const hhmm = (h, m) => new Date(2000, 0, 1, h, m).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  // The demo clock: real time plus an offset, so a visitor can jump to 10:30 AM and see a dose go missed.
  let clockOffset = 0;
  const now = () => Date.now() + clockOffset;

  // Saved only in this browser. If storage is blocked, the demo still works for the visit.
  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(STORE_KEY));
      if (v && typeof v.trackingStart === "number" && v.schedule && Array.isArray(v.schedule.reminders) &&
          Array.isArray(v.taken) && Array.isArray(v.notes)) return v;
    } catch (e) { /* fall through to a fresh log */ }
    return L.newLog(L.startOfDay(Date.now()));
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(log)); } catch (e) { /* private mode */ }
  }
  let log = load();
  let view = "today";

  const clone = (x) => JSON.parse(JSON.stringify(x));
  function changeSchedule(mutate) {
    const s = clone(log.schedule);
    mutate(s);
    L.changeSchedule(log, s, now());
    save();
    render();
  }

  // ---------- Screens ----------
  const STATUS_TEXT = {
    upcoming: () => "Not yet",
    due: () => "Due now",
    taken: (s) => "Taken at " + timeText(s.at),
    takenLate: (s) => "Taken late, at " + timeText(s.at),
    missed: () => "Not recorded",
  };

  function todayView() {
    const t = now();
    const doses = L.today(log, t);
    const cards = doses.map((o) => {
      const s = L.status(log, o, t);
      const done = s.state === "taken" || s.state === "takenLate";
      const attrs = 'data-rid="' + esc(o.reminderId) + '" data-due="' + o.dueAt + '"';
      const action = done
        ? '<button type="button" class="undo" data-action="undo" ' + attrs + '>\u21B6 Undo</button>'
        : '<button type="button" class="btn-big" data-action="take" ' + attrs + (L.canMarkTaken(log, o, t) ? "" : " disabled") + ">" +
          (s.state === "missed" ? "I took it late" : "I took it") + "</button>";
      return '<article class="card"><div class="row"><h2>' + esc(o.title) + '</h2><span class="time">' + timeText(o.dueAt) + "</span></div>" +
        '<p class="status s-' + s.state + '">' + STATUS_TEXT[s.state](s) + "</p>" + action + "</article>";
    }).join("");
    const last = L.lastMissedOrLate(log, t);
    return (doses.length ? "" : '<p class="empty">No reminders yet. Add one in Settings.</p>') + cards +
      '<section class="card"><p class="label">Last missed or late dose</p><p class="value">' +
      (last ? esc(last.title) + ", " + dayText(last.dueAt) + " at " + timeText(last.dueAt) : '<span class="s-upcoming">None yet</span>') +
      "</p></section>";
  }

  const MARKS = { taken: "✓", takenLate: "!", missed: "✕", due: "", upcoming: "" };
  const DETAIL = {
    taken: (s) => "Taken " + timeText(s.at),
    takenLate: (s) => "Late, taken " + timeText(s.at),
    missed: () => "Missed",
    due: () => "Due now",
    upcoming: () => "Not yet",
  };

  function historyView() {
    const t = now();
    const rows = L.history(log, t).map((o) => {
      const s = L.status(log, o, t);
      return '<div class="li"><div><span class="name">' + esc(o.title) + ", " + dayText(o.dueAt) + "</span><small>" + DETAIL[s.state](s) +
        '</small></div><span class="mark m-' + s.state + '" aria-hidden="true">' + MARKS[s.state] + "</span></div>";
    }).join("");
    const notes = log.notes.slice().sort((a, b) => b.at - a.at).map((n) =>
      '<div class="li"><div><span class="name">' + dayText(n.at) + ", " + timeText(n.at) + "</span>" +
      (n.note ? "<small>" + esc(n.note) + "</small>" : "") + '</div><button type="button" class="link danger" data-action="delnote" data-id="' + esc(n.id) + '">Delete</button></div>'
    ).join("");
    return '<h1 class="title">History</h1>' +
      '<div class="list"><button type="button" class="add" data-action="share">↗ Share my record</button>' +
      '<button type="button" class="add" data-action="addnote">+ Add a note</button></div>' +
      (notes ? '<h3 class="section">Notes</h3><div class="list">' + notes + "</div>" : "") +
      '<h3 class="section">Doses</h3><div class="list">' +
      (rows || '<div class="li"><small>Nothing yet. Doses show up here once they are due.</small></div>') + "</div>";
  }

  function settingsView() {
    const reminders = log.schedule.reminders;
    const rows = reminders.map((r) =>
      '<div class="li"><button type="button" class="row-btn" data-action="edit" data-rid="' + esc(r.id) + '"><span class="name">' + esc(r.title) +
      "</span><small>" + hhmm(r.hour, r.minute) + '</small></button><button type="button" class="switch" role="switch" aria-checked="' + r.isEnabled +
      '" aria-label="' + esc(r.title) + ' reminder" data-action="toggle" data-rid="' + esc(r.id) + '"></button></div>'
    ).join("");
    const total = log.schedule.graceMinutes, g = graceParts(total);
    return '<h1 class="title">Settings</h1><h3 class="section">Reminders</h3><div class="list">' + rows +
      (reminders.length < L.MAX_REMINDERS ? '<button type="button" class="add" data-action="add">+ Add a reminder</button>' : "") + "</div>" +
      '<p class="foot">Up to ' + L.MAX_REMINDERS + ". Names you type are kept only in this browser (in the iPhone app they also show in the reminder on your lock screen). " +
      "Tap a reminder to change or delete it; what you already recorded stays in History.</p>" +
      '<h3 class="section">Repeats</h3><div class="list"><div class="li grace">' +
      '<div class="grace-top"><span id="grace-label">Count as missed after</span><span class="stepper">' +
      '<button type="button" aria-label="Less time" data-action="grace" data-delta="-1"' + (total <= MIN_GRACE ? " disabled" : "") + '>−</button>' +
      '<button type="button" aria-label="More time" data-action="grace" data-delta="1"' + (total >= MAX_GRACE ? " disabled" : "") + '>+</button></span></div>' +
      '<div class="grace-field" role="group" aria-labelledby="grace-label">' +
      '<span class="pair"><input type="text" id="grace-h" class="grace-input" inputmode="numeric" maxlength="2" autocomplete="off" value="' + g.h + '" aria-label="Hours"> <span id="grace-h-unit">' + plural(g.h, "hour", "hours") + "</span></span>" +
      '<span class="pair"><input type="text" id="grace-m" class="grace-input" inputmode="numeric" maxlength="2" autocomplete="off" value="' + g.m + '" aria-label="Minutes"> <span id="grace-m-unit">' + plural(g.m, "min", "mins") + "</span></span></div></div></div>" +
      '<p class="foot">Type hours and minutes (from 1 minute to 24 hours), or use the arrows, which move 15 minutes at a time.</p>' +
      '<p class="foot">In the iPhone app you also get one gentle reminder at the set time, and it repeats until you tap &ldquo;I took it&rdquo;.</p>' +
      '<p class="privacy">In this demo everything stays in your browser. Nothing is sent anywhere. This app is a reminder and a record only. Always follow your doctor\'s and pharmacist\'s instructions.</p>';
  }

  // "Count as missed after": hours and minutes typed in the boxes, or stepped with the arrows (15 minutes).
  // Always kept between 1 minute and 24 hours. Only the Settings row is updated, so tabbing between the
  // two boxes is not interrupted by a redraw.
  const MIN_GRACE = 1, MAX_GRACE = 24 * 60, GRACE_STEP = 15;
  const plural = (n, one, many) => (n === 1 ? one : many);
  const graceParts = (total) => ({ h: Math.floor(total / 60), m: total % 60 });
  function setGraceMinutes(total) {
    const minutes = Math.min(MAX_GRACE, Math.max(MIN_GRACE, Math.round(total)));
    const s = clone(log.schedule);
    s.graceMinutes = minutes;
    L.changeSchedule(log, s, now());
    save();
    syncGraceRow();
  }
  function syncGraceRow() {
    const hb = $("#grace-h"), mb = $("#grace-m");
    if (!hb) return;
    const total = log.schedule.graceMinutes, g = graceParts(total);
    if (hb.value !== String(g.h)) hb.value = g.h;
    if (mb.value !== String(g.m)) mb.value = g.m;
    $("#grace-h-unit").textContent = plural(g.h, "hour", "hours");
    $("#grace-m-unit").textContent = plural(g.m, "min", "mins");
    $('[data-action="grace"][data-delta="-1"]').disabled = total <= MIN_GRACE;
    $('[data-action="grace"][data-delta="1"]').disabled = total >= MAX_GRACE;
  }

  function render() {
    const html = { today: todayView, history: historyView, settings: settingsView }[view]();
    const screen = $("#screen");
    const top = screen.scrollTop;
    screen.innerHTML = html;
    screen.scrollTop = top;
    document.querySelectorAll(".tabs button").forEach((b) => {
      if (b.dataset.view === view) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
    const d = new Date(now());
    $("#status-time").textContent = timeText(now()).replace(/\s?[AP]M$/, "");
    $("#clock").textContent = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) + " · " + timeText(now()) +
      (clockOffset ? " (demo time)" : " (real time)");
    $("#clock-input").value = pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  // ---------- Confetti ----------
  let confettiRun = 0;
  function confetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = $("#confetti");
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth, H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.hidden = false;
    const colors = ["#178556", "#14b8a6", "#facc15", "#ec4899", "#3b82f6", "#fb923c", "#a855f7"];
    const pieces = Array.from({ length: 90 }, () => ({
      x: Math.random(), delay: Math.random() * 0.9, speed: 520 + Math.random() * 430, above: Math.random() * 160,
      sway: 1.5 + Math.random() * 2.5, swayW: 10 + Math.random() * 22, phase: Math.random() * 6.28,
      spin: (Math.random() - 0.5) * 12, w: 7 + Math.random() * 5, h: 11 + Math.random() * 7,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    const DURATION = 3.6, run = ++confettiRun, start = performance.now();
    // Safety net: browsers pause animation frames in background tabs, and the canvas must never stay on screen.
    setTimeout(() => { if (run === confettiRun) canvas.hidden = true; }, (DURATION + 0.4) * 1000);
    (function frame(ts) {
      if (run !== confettiRun) return; // a newer burst took over
      const e = (ts - start) / 1000;
      ctx.clearRect(0, 0, W, H);
      if (e > DURATION) { canvas.hidden = true; return; }
      for (const p of pieces) {
        const age = e - p.delay;
        if (age <= 0) continue;
        const y = -24 - p.above + age * p.speed;
        if (y > H + 24) continue;
        ctx.save();
        ctx.globalAlpha = Math.min(1, Math.max(0, (DURATION - e) / 0.6));
        ctx.translate(p.x * W + Math.sin(age * p.sway + p.phase) * p.swayW, y);
        ctx.rotate(age * p.spin + p.phase);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      requestAnimationFrame(frame);
    })(start);
  }

  // ---------- Actions ----------
  function occurrenceFrom(el) {
    return L.today(log, now()).find((o) => o.reminderId === el.dataset.rid && o.dueAt === Number(el.dataset.due));
  }

  function take(occ) {
    if (!occ || !L.canMarkTaken(log, occ, now())) return;
    L.markTaken(log, occ, now());
    save();
    render();
    confetti();
  }

  function jumpTo(h, m) {
    const t = new Date();
    t.setHours(h, m, 0, 0);
    clockOffset = t.getTime() - Date.now();
    render();
  }

  // The iPhone app's notification, mocked: a banner with an "I took it" button.
  function previewReminder() {
    const t = now();
    const left = L.today(log, t).filter((o) => !["taken", "takenLate"].includes(L.status(log, o, t).state));
    const next = left.find((o) => L.canMarkTaken(log, o, t)) || left[0];
    const banner = $("#banner");
    if (!next) {
      banner.innerHTML = '<div class="top"><span class="app"></span>DOSES · now</div><h4>Nothing to remind you about</h4>' +
        '<p>Every dose today is recorded. Jump the demo clock to another time.</p><div class="acts"><button type="button" data-action="dismiss">OK</button></div>';
    } else {
      const open = L.canMarkTaken(log, next, t);
      banner.innerHTML = '<div class="top"><span class="app"></span>DOSES · now</div><h4>' + esc(next.title) + "</h4>" +
        "<p>" + (open ? "It's time. Tap &ldquo;I took it&rdquo; when you have." : "Due at " + timeText(next.dueAt) + ". The button opens an hour before.") + "</p>" +
        '<div class="acts">' + (open ? '<button type="button" class="go" data-action="banner-take" data-rid="' + esc(next.reminderId) + '" data-due="' + next.dueAt + '">I took it</button>' : "") +
        '<button type="button" data-action="dismiss">Dismiss</button></div>';
    }
    banner.hidden = false;
  }

  // ---------- Dialogs ----------
  let editingId = null;
  function openEditor(id) {
    editingId = id;
    const r = id && log.schedule.reminders.find((x) => x.id === id);
    $("#editor-title").textContent = r ? "Reminder" : "New reminder";
    $("#editor-name").value = r ? r.title : "";
    $("#editor-time").value = r ? pad(r.hour) + ":" + pad(r.minute) : "12:00";
    $("#editor-delete").hidden = !r;
    $("#editor").showModal();
  }

  $("#editor-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const [h, m] = ($("#editor-time").value || "12:00").split(":").map(Number);
    const title = $("#editor-name").value.trim().slice(0, 30) || "Reminder";
    changeSchedule((s) => {
      const existing = s.reminders.find((r) => r.id === editingId);
      if (existing) { existing.title = title; existing.hour = h; existing.minute = m; }
      else if (s.reminders.length < L.MAX_REMINDERS) s.reminders.push({ id: "r" + Date.now(), title: title, hour: h, minute: m, isEnabled: true });
    });
    $("#editor").close();
  });
  $("#editor-cancel").addEventListener("click", () => $("#editor").close());
  $("#editor-delete").addEventListener("click", () => {
    changeSchedule((s) => { s.reminders = s.reminders.filter((r) => r.id !== editingId); });
    $("#editor").close();
  });

  $("#note-form").addEventListener("submit", (e) => {
    e.preventDefault();
    L.addNote(log, now(), $("#note-text").value.trim());
    save();
    render();
    $("#note-dialog").close();
  });
  $("#note-cancel").addEventListener("click", () => $("#note-dialog").close());

  $("#report-close").addEventListener("click", () => $("#report-dialog").close());
  $("#report-copy").addEventListener("click", async () => {
    const btn = $("#report-copy");
    try { await navigator.clipboard.writeText($("#report-text").textContent); btn.textContent = "Copied"; }
    catch (e) { btn.textContent = "Select the text to copy"; }
    setTimeout(() => { btn.textContent = "Copy"; }, 1800);
  });

  // ---------- Events ----------
  document.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-view]");
    if (tab) { view = tab.dataset.view; render(); $("#screen").scrollTop = 0; return; }
    const el = e.target.closest("[data-action]");
    if (!el) return;
    switch (el.dataset.action) {
      case "take": take(occurrenceFrom(el)); break;
      case "undo": { const o = occurrenceFrom(el); if (o) { L.undoTaken(log, o); save(); render(); } break; }
      case "toggle": changeSchedule((s) => { const r = s.reminders.find((x) => x.id === el.dataset.rid); if (r) r.isEnabled = !r.isEnabled; }); break;
      case "edit": openEditor(el.dataset.rid); break;
      case "add": openEditor(null); break;
      case "grace": setGraceMinutes(log.schedule.graceMinutes + Number(el.dataset.delta) * GRACE_STEP); break;
      case "addnote": $("#note-text").value = ""; $("#note-dialog").showModal(); break;
      case "delnote": L.removeNote(log, el.dataset.id); save(); render(); break;
      case "share": $("#report-text").textContent = L.report(log, now()); $("#report-dialog").showModal(); break;
      case "jump": jumpTo(Number(el.dataset.h), Number(el.dataset.m)); break;
      case "realtime": clockOffset = 0; render(); break;
      case "preview": previewReminder(); break;
      case "dismiss": $("#banner").hidden = true; break;
      case "banner-take": { const o = occurrenceFrom(el); $("#banner").hidden = true; take(o); break; }
      case "reset":
        try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
        log = L.newLog(L.startOfDay(Date.now())); clockOffset = 0; view = "today"; $("#banner").hidden = true; render();
        break;
    }
  });

  // The typed time: digits only while typing, applied when a box loses focus or Enter is pressed.
  document.addEventListener("input", (e) => {
    if (e.target.matches(".grace-input")) e.target.value = e.target.value.replace(/\D/g, "");
  });
  function applyTypedGrace() {
    const h = parseInt($("#grace-h").value, 10), m = parseInt($("#grace-m").value, 10);
    if (Number.isNaN(h) && Number.isNaN(m)) syncGraceRow(); // both empty: put the current time back
    else setGraceMinutes((h || 0) * 60 + (m || 0)); // 90 minutes becomes 1 hour 30 mins
  }
  document.addEventListener("change", (e) => { if (e.target.matches(".grace-input")) applyTypedGrace(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches(".grace-input")) applyTypedGrace(); });

  $("#clock-input").addEventListener("change", (e) => {
    const [h, m] = e.target.value.split(":").map(Number);
    if (!Number.isNaN(h)) jumpTo(h, m);
  });

  // Shrink the whole phone to fit narrow windows, so it still looks like an iPhone.
  // The phone keeps the same physical size at every browser zoom. Zooming enlarges everything by the zoom
  // factor, so the phone is scaled by its inverse. (Only a window narrower than the phone makes it shrink.)
  const PHONE_SIZE = 0.9; // the phone's size on screen, as a fraction of its full 384 x 816 design
  const ZOOM_LEVELS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];
  function browserZoom() {
    if (window.__dosesZoom) return window.__dosesZoom; // lets tests set a zoom
    const ratio = window.outerWidth / window.innerWidth; // on desktop browsers this is the page zoom
    if (!isFinite(ratio) || ratio <= 0) return 1;
    const nearest = ZOOM_LEVELS.reduce((a, b) => (Math.abs(b - ratio) < Math.abs(a - ratio) ? b : a));
    return Math.abs(nearest - ratio) <= 0.06 ? nearest : 1; // not a zoom level (e.g. a docked panel): ignore it
  }
  function fitPhone() {
    const host = $("#phone-wrap").parentElement, cs = getComputedStyle(host);
    const avail = host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const scale = Math.min(PHONE_SIZE / browserZoom(), avail / 384);
    document.documentElement.style.setProperty("--phone-scale", scale);
  }
  window.addEventListener("resize", fitPhone);
  window.addEventListener("load", fitPhone);
  fitPhone();

  render();
  // A dose can flip from due to missed while the page is open. Don't redraw while someone is typing in the box.
  setInterval(() => { if (!document.activeElement || !document.activeElement.matches(".grace-input")) render(); }, 15000);
})();
