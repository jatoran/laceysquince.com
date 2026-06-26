/* =========================================================
   Lacey's Quinceañera — interactions (hardened, no network deps)
   ========================================================= */
(function () {
  "use strict";

  function $(s, ctx) { return (ctx || document).querySelector(s); }
  function $all(s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); }
  /* run each feature in isolation so one failure can't break the others */
  function safe(fn) { try { fn(); } catch (e) { if (window.console && console.warn) console.warn("[lacey]", e); } }

  /* target date: Sat Nov 21 2026, Central (CST = UTC-6); time TBA → counts to start of day */
  var TARGET = new Date("2026-11-21T00:00:00-06:00").getTime();

  /* number of photos that exist as assets/gallery/{thumbs,full}/pNN.jpg */
  var PHOTO_COUNT = 67;

  /* =====================================================
     HEADER scroll state + active link
     ===================================================== */
  safe(function () {
    var header = $("#siteHeader");
    if (!header) return;
    function onScroll() { header.classList.toggle("scrolled", window.scrollY > 30); }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if ("IntersectionObserver" in window) {
      var anchors = $all(".nav-links a");
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var id = e.target.getAttribute("id");
          anchors.forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === "#" + id); });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      $all("main section[id]").forEach(function (s) { spy.observe(s); });
    }
  });

  /* =====================================================
     MOBILE NAV
     ===================================================== */
  safe(function () {
    var toggle = $("#navToggle"), links = $("#navLinks");
    if (!toggle || !links) return;
    function closeNav() { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $all("a", links).forEach(function (a) { a.addEventListener("click", closeNav); });
  });

  /* =====================================================
     REVEAL ON SCROLL — progressive enhancement.
     Content is visible by default; we only hide+animate when JS is
     alive (adds .js-anim), and a timer guarantees everything shows.
     ===================================================== */
  safe(function () {
    var els = $all(".reveal");
    if (!els.length) return;
    function showAll() { els.forEach(function (el) { el.classList.add("in"); }); }

    if (!("IntersectionObserver" in window)) { return; } // leave fully visible

    document.documentElement.classList.add("js-anim");
    try {
      var io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); obs.unobserve(e.target); }
        });
      }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
      els.forEach(function (el) { io.observe(el); });
    } catch (e) { showAll(); return; }

    /* safety net: never let a section stay hidden, whatever happens */
    setTimeout(showAll, 3500);
    window.addEventListener("load", function () { setTimeout(showAll, 1200); });
  });

  /* =====================================================
     COUNTDOWN
     ===================================================== */
  safe(function () {
    var d = $("[data-days]"), h = $("[data-hours]"), m = $("[data-minutes]"), s = $("[data-seconds]");
    var party = $("#partyCountdown");
    if (!d || !h || !m || !s) return;
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function tick() {
      var diff = TARGET - Date.now();
      if (diff <= 0) {
        d.textContent = h.textContent = m.textContent = s.textContent = "00";
        if (party) party.innerHTML = "Today is the day! ✨";
        return false;
      }
      var t = Math.floor(diff / 1000);
      var days = Math.floor(t / 86400);
      d.textContent = pad(days);
      h.textContent = pad(Math.floor((t % 86400) / 3600));
      m.textContent = pad(Math.floor((t % 3600) / 60));
      s.textContent = pad(t % 60);
      if (party) party.innerHTML = "Just <b>" + days + "</b> days until we celebrate ✨";
      return true;
    }
    if (tick() !== false) {
      var timer = setInterval(function () { if (tick() === false) clearInterval(timer); }, 1000);
    }
  });

  /* =====================================================
     FAVORITES
     ===================================================== */
  safe(function () {
    var grid = $("#favGrid");
    if (!grid) return;
    var FAVORITES = [
      { icon: "🌺", label: "Favorite Flower", value: "Hibiscus" },
      { icon: "🍬", label: "Favorite Treat", value: "Airheads & Reese's" },
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
    grid.innerHTML = FAVORITES.map(function (f) {
      return '<li class="fav-card' + (f.blue ? " is-blue" : "") + '">' +
        '<span class="fav-icon">' + f.icon + '</span>' +
        '<span class="fav-label">' + f.label + '</span>' +
        '<span class="fav-value">' + f.value + '</span></li>';
    }).join("");
  });

  /* =====================================================
     GALLERY + LIGHTBOX — no network dependency.
     Source order: inlined window.LACEY_PHOTOS  →  sequential pNN.jpg.
     ===================================================== */
  safe(function () {
    var gallery = $("#gallery");
    if (!gallery) return;

    var photos = buildList();

    function buildList() {
      var inlined = window.LACEY_PHOTOS;
      if (inlined && inlined.length) return inlined.slice();
      var arr = [];               // fallback: we know files are p01.jpg … pNN.jpg
      for (var i = 1; i <= PHOTO_COUNT; i++) arr.push({ src: "p" + (i < 10 ? "0" + i : i) + ".jpg" });
      return arr;
    }
    function srcOf(p) { return (typeof p === "string") ? p : p.src; }

    function render() {
      var html = "";
      for (var i = 0; i < photos.length; i++) {
        var p = photos[i];
        var wh = (p && p.w && p.h) ? ' width="' + p.w + '" height="' + p.h + '"' : '';
        html += '<figure data-i="' + i + '">' +
          '<img loading="lazy" decoding="async"' + wh +
          ' src="assets/gallery/thumbs/' + srcOf(p) + '"' +
          ' alt="Lacey — photo ' + (i + 1) + '"' +
          ' onerror="var f=this.parentNode; if(f) f.style.display=\'none\';">' +
          '</figure>';
      }
      gallery.innerHTML = html;
    }
    render();

    /* ---- lightbox ---- */
    var lb = $("#lightbox"), lbImg = $("#lbImg"), lbCap = $("#lbCaption");
    if (!lb || !lbImg) return;
    var current = 0;

    function show(i) {
      if (!photos.length) return;
      current = (i + photos.length) % photos.length;
      lbImg.src = "assets/gallery/full/" + srcOf(photos[current]);
      lbImg.alt = "Lacey — photo " + (current + 1);
      if (lbCap) lbCap.textContent = "Photo " + (current + 1) + " of " + photos.length;
    }
    function openLb(i) { show(i); lb.classList.add("open"); lb.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; }
    function closeLb() { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; lbImg.src = ""; }

    gallery.addEventListener("click", function (e) {
      var fig = e.target && e.target.closest ? e.target.closest("figure") : null;
      if (fig) openLb(parseInt(fig.getAttribute("data-i"), 10) || 0);
    });
    var btnClose = $("#lbClose"), btnPrev = $("#lbPrev"), btnNext = $("#lbNext");
    if (btnClose) btnClose.addEventListener("click", closeLb);
    if (btnPrev) btnPrev.addEventListener("click", function () { show(current - 1); });
    if (btnNext) btnNext.addEventListener("click", function () { show(current + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });

    document.addEventListener("keydown", function (e) {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") closeLb();
      else if (e.key === "ArrowLeft") show(current - 1);
      else if (e.key === "ArrowRight") show(current + 1);
    });

    var tx = 0;
    lb.addEventListener("touchstart", function (e) { tx = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    }, { passive: true });
  });

})();
