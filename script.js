(function () {
  var root = document.documentElement;

  // Theme toggle (saved choice overrides the system setting)
  function isDark() {
    var t = root.dataset.theme;
    return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  document.getElementById("theme-toggle").addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
  });

  // Image galleries: one slide at a time with dots
  document.querySelectorAll("[data-gallery]").forEach(function (g) {
    var slides = g.querySelectorAll(".slide");
    var dots = [];
    function show(i) {
      slides.forEach(function (s, n) { s.classList.toggle("active", n === i); });
      dots.forEach(function (d, n) { d.setAttribute("aria-current", n === i ? "true" : "false"); });
    }
    g.showSlide = show;
    slides.forEach(function (s, i) {
      var img = s.querySelector("img");
      if (img) {
        img.title = "Click to enlarge";
        img.addEventListener("click", function () { openViewer(g, i); });
      }
    });
    if (slides.length < 2) return;
    var nav = document.createElement("div");
    nav.className = "gallery-nav";
    slides.forEach(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Show image " + (i + 1) + " of " + slides.length);
      b.addEventListener("click", function () { show(i); });
      nav.appendChild(b); dots.push(b);
    });
    g.appendChild(nav);
    show(0);
  });

  // Enlarged viewer: a large card that fits the whole screenshot on screen,
  // with Previous / Next (also the arrow keys and swiping) and Esc to close
  var viewer, vState = { gallery: null, index: 0 };
  function buildViewer() {
    viewer = document.createElement("dialog");
    viewer.className = "viewer";
    viewer.setAttribute("aria-label", "Screenshot viewer");
    viewer.innerHTML =
      '<div class="viewer-head"><p class="viewer-title"></p><span class="viewer-count"></span>' +
      '<button type="button" class="viewer-close" aria-label="Close">×</button></div>' +
      '<figure class="viewer-body"><div class="viewer-frame"><img alt=""></div><figcaption></figcaption></figure>' +
      '<div class="viewer-foot"><button type="button" class="viewer-step" data-step="-1">← Previous</button>' +
      '<button type="button" class="viewer-step" data-step="1">Next →</button></div>';
    document.body.appendChild(viewer);
    viewer.querySelector(".viewer-close").addEventListener("click", closeViewer);
    viewer.querySelectorAll(".viewer-step").forEach(function (b) {
      b.addEventListener("click", function () { stepViewer(+b.dataset.step); });
    });
    // Clicking the dimmed area outside the card closes it
    viewer.addEventListener("click", function (e) { if (e.target === viewer) closeViewer(); });
    viewer.addEventListener("close", function () { root.classList.remove("viewer-open"); });
    viewer.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); stepViewer(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); stepViewer(1); }
    });
    var startX = null, startY = null;
    viewer.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
    viewer.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX, dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) stepViewer(dx < 0 ? 1 : -1);
      startX = null;
    }, { passive: true });
  }
  function renderViewer() {
    var slides = vState.gallery.querySelectorAll(".slide");
    var s = slides[vState.index], src = s.querySelector("img");
    var img = viewer.querySelector(".viewer-body img");
    img.src = src.currentSrc || src.src;
    img.alt = src.alt;
    viewer.querySelector("figcaption").textContent = (s.querySelector("figcaption") || {}).textContent || "";
    var project = vState.gallery.closest(".project");
    viewer.querySelector(".viewer-title").textContent = project ? project.querySelector("h3").textContent : "";
    viewer.querySelector(".viewer-count").textContent = (vState.index + 1) + " of " + slides.length;
    var steps = viewer.querySelectorAll(".viewer-step");
    steps[0].disabled = vState.index === 0;
    steps[1].disabled = vState.index === slides.length - 1;
    viewer.querySelector(".viewer-foot").hidden = slides.length < 2;
    vState.gallery.showSlide(vState.index);
  }
  function openViewer(g, i) {
    if (!viewer) buildViewer();
    vState.gallery = g; vState.index = i;
    renderViewer();
    root.classList.add("viewer-open");
    viewer.showModal();
    viewer.querySelector(".viewer-close").focus({ focusVisible: false });
  }
  function stepViewer(d) {
    var n = vState.gallery.querySelectorAll(".slide").length, next = vState.index + d;
    if (next < 0 || next >= n) return;
    vState.index = next;
    renderViewer();
  }
  // Unlock page scrolling here for the close button and outside clicks;
  // the dialog's "close" listener above covers Esc
  function closeViewer() {
    viewer.close();
    root.classList.remove("viewer-open");
  }

  // Clicking the email copies it (no mailto, so it never opens a mail app)
  // and briefly says so in place of the "Email" label.
  var copy = document.getElementById("copy-email");
  var label = document.getElementById("email-label");
  var timer;
  if (copy) copy.addEventListener("click", function () {
    var text = document.getElementById("email-text").textContent.trim();
    function done() {
      label.textContent = "\u2713 Copied to clipboard";
      label.classList.add("copied");
      clearTimeout(timer);
      timer = setTimeout(function () { label.textContent = "Email"; label.classList.remove("copied"); }, 2200);
    }
    function fallback() {
      // Older browsers: copy through a hidden text field, so nothing on the page stays highlighted
      var t = document.createElement("textarea");
      t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(t); copy.focus();
      if (ok) done();
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  });

  // Contents list: highlight the section currently on screen
  var links = {};
  document.querySelectorAll(".toc a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
  var sections = Object.keys(links).map(function (id) { return document.getElementById(id); });
  function setCurrent() {
    if (!sections.length) return;
    var line = window.innerHeight * 0.3, current = sections[0];
    sections.forEach(function (sec) { if (sec.getBoundingClientRect().top <= line) current = sec; });
    // At the very bottom of the page, the last section is current
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1];
    Object.keys(links).forEach(function (id) { links[id].setAttribute("aria-current", id === current.id ? "true" : "false"); });
  }
  window.addEventListener("scroll", setCurrent, { passive: true });
  window.addEventListener("resize", setCurrent);
  setCurrent();

  // Opening the page with a section in the address (e.g. "Back to portfolio" -> #projects):
  // jump straight to it once the page has laid out
  if (location.hash.length > 1) {
    var target = document.getElementById(location.hash.slice(1));
    if (target) window.addEventListener("load", function () {
      setTimeout(function () { target.scrollIntoView({ behavior: "instant", block: "start" }); }, 0);
    });
  }

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
