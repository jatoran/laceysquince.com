/* =========================================================
   Lacey's Quinceañera — interactions
   ========================================================= */
(function () {
  "use strict";

  /* ---- target date: Sat Nov 21 2026, Central (CST = UTC-6); time TBA → counts to start of day ---- */
  var TARGET = new Date("2026-11-21T00:00:00-06:00").getTime();

  /* =====================================================
     HEADER scroll state + active link
     ===================================================== */
  var header = document.getElementById("siteHeader");
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  var navAnchors = Array.prototype.slice.call(document.querySelectorAll(".nav-links a"));

  function onScroll() {
    header.classList.toggle("scrolled", window.scrollY > 30);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.getAttribute("id");
        navAnchors.forEach(function (a) {
          a.classList.toggle("active", a.getAttribute("href") === "#" + id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* =====================================================
     MOBILE NAV
     ===================================================== */
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  function closeNav() {
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
  toggle.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  navAnchors.forEach(function (a) { a.addEventListener("click", closeNav); });

  /* =====================================================
     REVEAL ON SCROLL
     ===================================================== */
  if ("IntersectionObserver" in window) {
    var revealer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (el) { revealer.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  /* =====================================================
     COUNTDOWN
     ===================================================== */
  var elDays = document.querySelector("[data-days]");
  var elHours = document.querySelector("[data-hours]");
  var elMins = document.querySelector("[data-minutes]");
  var elSecs = document.querySelector("[data-seconds]");
  var partyCd = document.getElementById("partyCountdown");

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function tick() {
    var diff = TARGET - Date.now();
    if (diff <= 0) {
      elDays.textContent = elHours.textContent = elMins.textContent = elSecs.textContent = "00";
      if (partyCd) partyCd.innerHTML = "Today is the day! ✨";
      return false;
    }
    var s = Math.floor(diff / 1000);
    var d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    elDays.textContent = pad(d);
    elHours.textContent = pad(h);
    elMins.textContent = pad(m);
    elSecs.textContent = pad(sec);
    if (partyCd) partyCd.innerHTML = "Just <b>" + d + "</b> days until we celebrate ✨";
    return true;
  }
  tick();
  var cdTimer = setInterval(function () { if (tick() === false) clearInterval(cdTimer); }, 1000);

  /* =====================================================
     FAVORITES
     ===================================================== */
  var FAVORITES = [
    { icon: "🌺", label: "Favorite Flower", value: "Hibiscus" },
    { icon: "🍬", label: "Favorite Treat", value: "Airheads & Preezes (sunflower seeds)" },
    { icon: "🕯️", label: "Favorite Scent", value: "Vanilla" },
    { icon: "🧸", label: "Favorite Collectibles", value: "Sonny Angels, stuffies, ocean life & stickers" },
    { icon: "🎮", label: "Favorite Game", value: "Roblox & Fortnite" },
    { icon: "🛍️", label: "Favorite Stores", value: "Target, 5 Below, Sephora, Ulta, Pandora, Lego Store & Hollister" },
    { icon: "🍽️", label: "Favorite Food", value: "Chick-fil-A, Chipotle, P. Terry's & Red Lobster" },
    { icon: "🧋", label: "Favorite Drink", value: "Starbucks, Teapioca & Dutch Bros" },
    { icon: "🎬", label: "Favorite Movies", value: "Avatar, The Way of Water, Fire & Ash & Twilight" },
    { icon: "💙", label: "Favorite Color", value: "Blue", blue: true },
    { icon: "🏐", label: "Hobbies", value: "Volleyball, taking photos, Legos & drawing" }
  ];
  var favGrid = document.getElementById("favGrid");
  if (favGrid) {
    var favHtml = FAVORITES.map(function (f) {
      return '<li class="fav-card' + (f.blue ? " is-blue" : "") + '">' +
        '<span class="fav-icon">' + f.icon + '</span>' +
        '<span class="fav-label">' + f.label + '</span>' +
        '<span class="fav-value">' + f.value + '</span>' +
        '</li>';
    }).join("");
    favGrid.innerHTML = favHtml;
  }

  /* =====================================================
     GALLERY + LIGHTBOX
     ===================================================== */
  var gallery = document.getElementById("gallery");
  var photos = [];

  function buildGallery(list) {
    photos = list;
    var html = list.map(function (p, i) {
      return '<figure data-i="' + i + '">' +
        '<img loading="lazy" src="assets/gallery/thumbs/' + p.src + '" ' +
        'width="' + (p.w || 4) + '" height="' + (p.h || 3) + '" ' +
        'alt="Lacey — photo ' + (i + 1) + '">' +
        '</figure>';
    }).join("");
    gallery.innerHTML = html;
  }

  fetch("assets/gallery/manifest.json")
    .then(function (r) { return r.json(); })
    .then(buildGallery)
    .catch(function () {
      gallery.innerHTML = '<p style="color:var(--mauve)">Photos coming soon.</p>';
    });

  /* ---- lightbox ---- */
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lbImg");
  var lbCap = document.getElementById("lbCaption");
  var current = 0;

  function showPhoto(i) {
    if (!photos.length) return;
    current = (i + photos.length) % photos.length;
    var p = photos[current];
    lbImg.src = "assets/gallery/full/" + p.src;
    lbImg.alt = "Lacey — photo " + (current + 1);
    lbCap.textContent = "Photo " + (current + 1) + " of " + photos.length;
  }
  function openLb(i) {
    showPhoto(i);
    lb.classList.add("open");
    lb.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeLb() {
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    lbImg.src = "";
  }

  gallery.addEventListener("click", function (e) {
    var fig = e.target.closest("figure");
    if (fig) openLb(parseInt(fig.getAttribute("data-i"), 10));
  });
  document.getElementById("lbClose").addEventListener("click", closeLb);
  document.getElementById("lbPrev").addEventListener("click", function () { showPhoto(current - 1); });
  document.getElementById("lbNext").addEventListener("click", function () { showPhoto(current + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });

  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLb();
    else if (e.key === "ArrowLeft") showPhoto(current - 1);
    else if (e.key === "ArrowRight") showPhoto(current + 1);
  });

  /* swipe on touch */
  var tx = 0;
  lb.addEventListener("touchstart", function (e) { tx = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) showPhoto(current + (dx < 0 ? 1 : -1));
  }, { passive: true });

})();
