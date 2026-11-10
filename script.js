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

  // Copy email (no mailto, so it never opens a mail app)
  var copy = document.getElementById("copy-email");
  copy.addEventListener("click", function () {
    var text = document.getElementById("email-text").textContent.trim();
    function done() { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy"; }, 1800); }
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    else {
      var r = document.createRange(); r.selectNodeContents(document.getElementById("email-text"));
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
      try { document.execCommand("copy"); done(); } catch (e) {}
    }
  });

  // Contents list: highlight the section currently on screen
  var links = {};
  document.querySelectorAll(".toc a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
  var sections = Object.keys(links).map(function (id) { return document.getElementById(id); });
  function setCurrent() {
    var line = window.innerHeight * 0.3, current = sections[0];
    sections.forEach(function (sec) { if (sec.getBoundingClientRect().top <= line) current = sec; });
    // At the very bottom of the page, the last section is current
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1];
    Object.keys(links).forEach(function (id) { links[id].setAttribute("aria-current", id === current.id ? "true" : "false"); });
  }
  window.addEventListener("scroll", setCurrent, { passive: true });
  window.addEventListener("resize", setCurrent);
  setCurrent();

  document.getElementById("year").textContent = new Date().getFullYear();
})();
