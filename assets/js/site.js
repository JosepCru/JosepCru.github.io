// Site behaviour: no dependencies. Each block is independent and does
// nothing if the elements it needs are not on the page.
(function () {
  "use strict";
  document.documentElement.classList.add("js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Mobile menu */
  var toggle = document.querySelector(".nav-toggle");
  var scrim = document.querySelector(".scrim");
  function setMenu(open) {
    document.body.classList.toggle("nav-open", open);
    if (scrim) scrim.hidden = !open;
    if (toggle) toggle.setAttribute("aria-expanded", String(open));
  }
  if (toggle) toggle.addEventListener("click", function () {
    setMenu(!document.body.classList.contains("nav-open"));
  });
  if (scrim) scrim.addEventListener("click", function () { setMenu(false); });
  document.querySelectorAll(".sidebar-nav a").forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  /* Highlight the menu entry of the section on screen */
  var links = {};
  document.querySelectorAll(".sidebar-nav a[data-section]").forEach(function (a) {
    links[a.dataset.section] = a;
  });
  var sections = Object.keys(links)
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  if (sections.length && "IntersectionObserver" in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        Object.keys(links).forEach(function (id) {
          links[id].classList.toggle("active", id === entry.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { sectionObserver.observe(s); });
  }

  /* Hero: typing effect cycling through the roles */
  var typed = document.querySelector(".typed");
  if (typed && !reduceMotion) {
    var roles = (typed.dataset.roles || "").split("|").filter(Boolean);
    if (roles.length) {
      var roleIndex = 0, length = 0, deleting = false;
      (function tick() {
        var word = roles[roleIndex];
        length += deleting ? -1 : 1;
        typed.textContent = word.slice(0, length);
        var wait = deleting ? 45 : 95;
        if (!deleting && length === word.length) { deleting = true; wait = 1800; }
        else if (deleting && length === 0) { deleting = false; roleIndex = (roleIndex + 1) % roles.length; wait = 350; }
        setTimeout(tick, wait);
      })();
    }
  }

  /* Project filter */
  var filterButtons = document.querySelectorAll(".filters button");
  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var filter = button.dataset.filter;
      filterButtons.forEach(function (b) { b.classList.toggle("active", b === button); });
      document.querySelectorAll(".project-card").forEach(function (card) {
        card.hidden = filter !== "*" && card.dataset.category !== filter;
      });
    });
  });

  /* Project gallery: buttons and dots on top of native scroll-snap */
  document.querySelectorAll("[data-gallery]").forEach(function (gallery) {
    var track = gallery.querySelector(".gallery-track");
    var dots = gallery.querySelectorAll(".gallery-dots span");
    var count = track.children.length;
    function current() { return Math.round(track.scrollLeft / track.clientWidth); }
    function go(index) {
      var target = (index + count) % count;
      track.scrollTo({ left: target * track.clientWidth, behavior: reduceMotion ? "auto" : "smooth" });
    }
    function paint() {
      var index = current();
      dots.forEach(function (d, i) { d.classList.toggle("active", i === index); });
    }
    var prev = gallery.querySelector(".prev"), next = gallery.querySelector(".next");
    if (prev) prev.addEventListener("click", function () { go(current() - 1); });
    if (next) next.addEventListener("click", function () { go(current() + 1); });
    track.addEventListener("scroll", paint, { passive: true });
    paint();
  });

  /* Contact form: send without leaving the page */
  var form = document.getElementById("contact-form");
  var status = document.getElementById("form-status");
  if (form && status) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var button = form.querySelector("button[type=submit]");
      button.disabled = true;
      function show(message, isError) {
        status.textContent = message;
        status.classList.toggle("error", !!isError);
        status.hidden = false;
        button.disabled = false;
      }
      fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (response) {
          if (!response.ok) throw new Error("bad status");
          form.reset();
          show("Your message has been sent. Thank you!");
        })
        .catch(function () {
          show("There was an error sending your message. Please try again later.", true);
        });
    });
  }
})();
