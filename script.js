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
    function done() { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy email"; }, 1800); }
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    else {
      var r = document.createRange(); r.selectNodeContents(document.getElementById("email-text"));
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
      try { document.execCommand("copy"); done(); } catch (e) {}
    }
  });

  // Resume: if resume.pdf has not been added yet, hide the hero button and mark the contact entry
  fetch("resume.pdf", { method: "HEAD" }).then(function (r) {
    if (!r.ok) throw 0;
  }).catch(function () {
    var hero = document.getElementById("resume-link");
    if (hero) hero.hidden = true;
    document.querySelectorAll('a[data-placeholder="true"]').forEach(function (a) {
      a.removeAttribute("href"); a.setAttribute("aria-disabled", "true");
    });
  });

  document.getElementById("year").textContent = new Date().getFullYear();
})();
