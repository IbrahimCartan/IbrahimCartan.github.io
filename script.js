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
    if (slides.length < 2) return;
    var nav = document.createElement("div");
    nav.className = "gallery-nav";
    var dots = [];
    var index = 0;
    function show(i) {
      index = i;
      slides.forEach(function (s, n) { s.classList.toggle("active", n === i); });
      dots.forEach(function (d, n) { d.setAttribute("aria-current", n === i ? "true" : "false"); });
    }
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
