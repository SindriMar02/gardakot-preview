/* Garðakot — the Búðir motion machine, re-skinned.
   House ease power3.out. Lenis DESKTOP ONLY. ignoreMobileResize. Width-only resize guard.
   Every value that scrubs is written by the scrub alone and carries no CSS transition. */
(function () {
  'use strict';
  var root = document.documentElement;
  var body = document.body;
  root.classList.add('js');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  /* WebKit delivers scroll events async of rendering, so a raw `scrub: true` steps
     visibly on iOS. 0.15 smooths that without the animation trailing the finger the
     way 0.35 did on skyretreat. */
  var SCRUB = isTouch ? 0.15 : true;

  /* ---------- line splitter ----------
     The probe must wrap EXACTLY as the finished line will, so it is plain inline spans
     with real space text-nodes between them: an inline-block carrying its own trailing
     space measures wider, packs the lines differently, and pushes the last glyph past
     the mask. Words become inline-block only AFTER the line is decided, and the built
     line is nowrap so it cannot re-wrap. */
  function splitLines(el) {
    /* the marker is a SEPARATE attribute: overwriting data-split would make the
       [data-split="lines"] selector stop matching, so every later pass finds nothing */
    if (el.hasAttribute('data-splitdone')) return;
    var text = (el.dataset.text || el.textContent).replace(/\s+/g, ' ').trim();
    el.dataset.text = text;
    var words = text.split(' ');
    el.textContent = '';
    var probes = words.map(function (w, i) {
      var s = document.createElement('span');
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });
    var lines = [], last = null;
    probes.forEach(function (s, i) {
      var top = s.offsetTop;
      if (last === null || top > last + 2) { lines.push([]); last = top; }
      lines[lines.length - 1].push(words[i]);
    });
    el.textContent = '';
    lines.forEach(function (ws) {
      var mask = document.createElement('span');
      mask.className = 'rl';
      var inner = document.createElement('i');
      ws.forEach(function (w, wi) {
        var b = document.createElement('b');
        b.className = 'rw';
        b.style.fontWeight = 'inherit';
        b.textContent = w;
        inner.appendChild(b);
        if (wi < ws.length - 1) inner.appendChild(document.createTextNode(' '));
      });
      mask.appendChild(inner);
      el.appendChild(mask);
    });
    el.setAttribute('data-splitdone', '');
  }

  function fireSplit(el, delay) {
    var n = 0;
    el.querySelectorAll('.rl').forEach(function (l) {
      l.classList.add('in');
      l.querySelectorAll('.rw').forEach(function (w) {
        w.style.transitionDelay = ((delay || 0) + Math.min(n * 0.045, 0.6)) + 's';
        n++;
      });
    });
  }

  /* ---------- the opening reveal ----------
     The whole point of a curtain is that the page is ALIVE when it lifts. So the hero's
     own beats are queued rather than fired, and released against the uncover: the curtain
     retreats downward, so the lede (top of the page) is uncovered first and the wordmark
     (bottom) last, and each starts just after its own moment. */
  var INTRO = root.classList.contains('intro-on');
  var heroBeats = {};
  function heroGo(name, fn) { if (INTRO) heroBeats[name] = fn; else fn(); }
  function releaseHero() {
    var b = heroBeats; heroBeats = {}; INTRO = false;
    if (b.lede) setTimeout(b.lede, 150);
    if (b.wm) setTimeout(b.wm, 330);
    Object.keys(b).forEach(function (k) { if (k !== 'lede' && k !== 'wm') b[k](); });
  }

  (function intro() {
    if (!INTRO) return;
    var curtain = document.getElementById('intro');
    var mark = document.getElementById('introMark');
    var inner = document.getElementById('introMarkIn');
    var coast = document.getElementById('introCoast');
    if (!curtain || !mark || !inner || !coast) { root.classList.remove('intro-on', 'intro-hold'); INTRO = false; return; }
    window.scrollTo(0, 0);
    coast.style.setProperty('--len', coast.getTotalLength().toFixed(1));

    var t = [];
    function at(ms, fn) { t.push(setTimeout(fn, ms)); }

    at(20,  function () { root.classList.add('intro-dot'); });
    at(200, function () { root.classList.add('intro-draw'); });
    at(900, function () {
      /* FLIP the mark onto the nav's own mark: measure both boxes and apply the delta as
         one transform. It does not fade out and a second one fade in — it is the same
         drawing arriving where the logo lives. */
      var svg = inner.querySelector('svg');
      var navMk = document.querySelector('.nav_mark .mk');
      if (navMk) {
        var a = svg.getBoundingClientRect(), b = navMk.getBoundingClientRect();
        if (a.width && b.width) {
          inner.style.transform = 'translate(' + ((b.left + b.width / 2) - (a.left + a.width / 2)).toFixed(1) + 'px,'
            + ((b.top + b.height / 2) - (a.top + a.height / 2)).toFixed(1) + 'px) scale('
            + (b.width / a.width).toFixed(4) + ')';
        }
      }
      curtain.classList.add('is-out');
      mark.classList.add('is-out');
      releaseHero();
    });
    at(1830, function () {
      root.classList.remove('intro-hold');     // the nav mark takes over, in place
      mark.classList.add('is-gone');
      root.classList.remove('intro-on');       // scroll unlocks; .is-out keeps both displayed
      root.classList.remove('intro-dot', 'intro-draw');
      if (window.__lenis) window.__lenis.start();
      window.dispatchEvent(new Event('resize'));
    });
    /* the nodes outlive their own transitions, or they pop out mid-flight */
    at(2350, function () { curtain.remove(); mark.remove(); });

    /* any escape hatch must leave the page usable, not half-covered */
    function bail() {
      t.forEach(clearTimeout);
      root.classList.remove('intro-on', 'intro-hold', 'intro-dot', 'intro-draw');
      curtain.remove(); mark.remove();
      if (window.__lenis) window.__lenis.start();
      releaseHero();
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') bail(); });
    setTimeout(function () { if (document.body.contains(curtain)) bail(); }, 6000);
  })();

  /* ---------- nav state ---------- */
  function syncScrolled() { body.classList.toggle('scrolled', window.scrollY > 12); }
  syncScrolled();
  window.addEventListener('scroll', syncScrolled, { passive: true });

  /* ---------- menu ---------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  var menuOpen = false;
  function setMenu(open) {
    menuOpen = open;
    body.classList.toggle('menu-open', open);
    body.classList.toggle('no-scroll', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) menu.removeAttribute('hidden');
    /* rows rise out of their own rules in sequence; cleared on close so the next
       open replays it instead of showing an already-arrived list */
    menu.querySelectorAll('.menu_links a').forEach(function (a, i) {
      a.style.transitionDelay = open ? (0.08 + i * 0.055) + 's' : '0s';
    });
    if (window.__lenis) { open ? window.__lenis.stop() : window.__lenis.start(); }
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(!menuOpen); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) setMenu(false); });
  }

  /* ---------- ground: ONE scrubbed value, driven by scroll position ----------
     The old version was an IntersectionObserver flipping data-ground with a .3s CSS
     transition: a switch that fired at a threshold and then ran on its own clock, which
     is exactly why it did not feel tied to the scroll. Now every section contributes a
     night value (0 or 1) at its own top, and --night is INTERPOLATED across a band ~90%
     of a viewport tall centred on each boundary. Scroll half the band and you are half
     way between cream and ink; stop, and it stops.

     Written as a custom property on <html> once per frame. Everything downstream —
     the body ground, the opaque nav bar, text, hairlines — is a color-mix along it, so
     they cannot drift apart, which is what keeps the iOS status bar matching. */
  var meta = document.getElementById('themeColor');
  var NIGHT = { night: 1, dusk: 0, day: 0, dawn: 0 };
  var stops = [];        // [{ y, v }] sorted, one per section top
  var band = 600;

  function measureGround() {
    stops = [];
    document.querySelectorAll('[data-ground]').forEach(function (el) {
      if (el === body) return;
      stops.push({ y: el.getBoundingClientRect().top + window.scrollY,
                   v: NIGHT[el.dataset.ground] || 0 });
    });
    stops.sort(function (a, b) { return a.y - b.y; });
    band = Math.min(window.innerHeight * 0.9, 700);
  }

  var lastNight = -1, lastMeta = '';
  var CREAM = [251, 243, 234], INK = [23, 18, 13];
  function mix(t) {
    return '#' + CREAM.map(function (c, i) {
      return Math.round(c + (INK[i] - c) * t).toString(16).padStart(2, '0');
    }).join('').toUpperCase();
  }
  function nightAt(y) {
    if (!stops.length) return 0;
    var mid = y + window.innerHeight * 0.35;    // judge by the upper third, as before
    var v = stops[0].v;
    for (var i = 0; i < stops.length; i++) {
      var s = stops[i];
      if (mid >= s.y + band / 2) { v = s.v; continue; }
      if (mid <= s.y - band / 2) break;
      // inside the band: ease between the value before this boundary and this one
      var prev = i ? stops[i - 1].v : s.v;
      var t = (mid - (s.y - band / 2)) / band;
      t = t * t * (3 - 2 * t);                  // smoothstep, no visible corner at either end
      v = prev + (s.v - prev) * t;
      break;
    }
    return v;
  }

  function paintGround() {
    var n = nightAt(window.scrollY);
    if (Math.abs(n - lastNight) < 0.002) return;
    lastNight = n;
    root.style.setProperty('--night', n.toFixed(3));
    /* iOS tints the status bar from the pixels at the top edge, and the top edge is the
       opaque nav painted in --g-bg. Give theme-color the SAME mix, not the nearest end,
       or the chrome snaps while the ground is still crossing. Quantised to 1/32 so the
       meta is not rewritten every frame. */
    if (meta) {
      var q = Math.round(n * 32) / 32, c = mix(q);
      if (c !== lastMeta) { meta.setAttribute('content', c); lastMeta = c; }
    }
    body.dataset.ground = n > 0.5 ? 'night' : 'dawn';   // kept for the no-color-mix fallback
  }

  measureGround();
  paintGround();
  window.addEventListener('scroll', paintGround, { passive: true });
  window.addEventListener('resize', function () { measureGround(); paintGround(); });
  window.addEventListener('load', function () { measureGround(); paintGround(); });

  /* ---------- ROOMS: expanding cards ----------
     Mechanism from 21st.dev "Expanding Cards" (vaib215). The state is ONE attribute on
     the list — data-active — and the grid tracks in CSS do the animating. Hover opens
     on a fine pointer; focus and tap open everywhere. A tap on a CLOSED card opens it
     and swallows the click, so the Book link inside is only reachable once open.
     This sits BEFORE the reduced-motion return on purpose: opening a room is function,
     not decoration, and must work with motion off and without GSAP. */
  (function xcards() {
    var list = document.getElementById('xcards');
    if (!list) return;
    var cards = [].slice.call(list.querySelectorAll('.xcard'));
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    function open(i) {
      if (String(i) === list.dataset.active) return;
      list.dataset.active = i;
      cards.forEach(function (c, k) { c.classList.toggle('is-on', k === i); });
    }
    cards.forEach(function (c, i) {
      if (fine) c.addEventListener('mouseenter', function () { open(i); });
      c.addEventListener('focus', function () { open(i); });
      c.addEventListener('click', function (e) {
        if (c.classList.contains('is-on')) return;      // open card: links work normally
        e.preventDefault(); open(i);
      });
      c.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
      });
    });
    /* insurance kept from the bug this replaced: three of four room photographs once
       shipped unloaded because their closed cards were clipped to zero area. */
    var wake = new IntersectionObserver(function (es) {
      if (!es.some(function (e) { return e.isIntersecting; })) return;
      list.querySelectorAll('img[loading="lazy"]').forEach(function (im) { im.loading = 'eager'; });
      wake.disconnect();
    }, { rootMargin: '900px 0px' });
    wake.observe(list);
  })();

  /* ---------- no-JS / reduced-motion escape ---------- */
  function showAll() {
    document.querySelectorAll('[data-split="lines"], [data-reveal]').forEach(function (el) {
      el.querySelectorAll('.rl').forEach(function (l) { l.classList.add('in'); });
      el.classList.add('in');
    });

    document.querySelectorAll('.rule').forEach(function (r) { r.classList.add('in'); });
    document.querySelectorAll('.hero_wm, .foot_wm').forEach(function (w) { w.classList.add('in'); });
  }
  if (!hasGSAP || reduced) {
    document.querySelectorAll('[data-split="lines"]').forEach(splitLines);
    showAll();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  /* the iOS URL bar fires resize the moment a fling starts; a refresh mid-fling
     cancels WebKit's momentum dead */
  ScrollTrigger.config({ ignoreMobileResize: true });

  if (!isTouch) {
    var lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    window.__lenis = lenis;
    if (root.classList.contains('intro-on')) lenis.stop();
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    root.classList.add('lenis');
  }

  /* ---------- the hero wordmark rises, then the lede ---------- */
  var heroWm = document.querySelector('.hero_wm');
  requestAnimationFrame(function () {
    heroGo('wm', function () { if (heroWm) heroWm.classList.add('in'); });
  });

  /* ---------- splits + reveals ---------- */
  function armReveals() {
    document.querySelectorAll('[data-split="lines"]').forEach(splitLines);
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      if (el.querySelector('.rl')) {
        if (el.getBoundingClientRect().top <= window.innerHeight * 0.92) {
          heroGo(el.classList.contains('hero_lede') ? 'lede' : 'v' + (+new Date() + Math.random()),
                 function () { fireSplit(el, 0); });
          return;
        }
        ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true,
          onEnter: function () { fireSplit(el, 0); } });
      } else {
        el.setAttribute('data-armed', '');
        el.classList.add('rev');
        if (el.getBoundingClientRect().top <= window.innerHeight * 0.92) {
          heroGo('r' + (+new Date() + Math.random()), function () { el.classList.add('in'); });
          return;
        }
        ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true,
          onEnter: function () { el.classList.add('in'); } });
      }
    });
    document.querySelectorAll('.rule').forEach(function (r) {
      ScrollTrigger.create({ trigger: r, start: 'top 92%', once: true,
        onEnter: function () { r.classList.add('in'); } });
    });
    var footWm = document.querySelector('.foot_wm');
    if (footWm) ScrollTrigger.create({ trigger: footWm, start: 'top 92%', once: true,
      onEnter: function () { footWm.classList.add('in'); } });
    ScrollTrigger.refresh();
  }
  ScrollTrigger.addEventListener('refresh', function () { measureGround(); paintGround(); });
  function armAfterLayout() { requestAnimationFrame(function () { requestAnimationFrame(armReveals); }); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(armAfterLayout);
  else armAfterLayout();

  /* A split is only valid for the width it was measured at. On a real width change the
     lines are rebuilt, or the nowrap lines keep a desktop wrap on a phone. */
  function resplit() {
    document.querySelectorAll('[data-split="lines"][data-splitdone]').forEach(function (el) {
      el.removeAttribute('data-splitdone');
      el.textContent = el.dataset.text;
      splitLines(el);
      fireSplit(el, 0);
    });
    ScrollTrigger.refresh();
  }

  /* ---------- parallax: transform only, gated to a real pointer width ----------
     Búðir's own fork: the journey and its parallax are desktop-only, and below that
     it is a plain vertical document. */
  ScrollTrigger.matchMedia({
    '(min-width: 1024px)': function () {
      document.querySelectorAll('[data-parallax] img').forEach(function (img) {
        gsap.fromTo(img, { yPercent: -4 }, {
          yPercent: 4, ease: 'none',
          scrollTrigger: { trigger: img.closest('[data-parallax]'), start: 'top bottom', end: 'bottom top', scrub: SCRUB }
        });
      });
    },
    '(max-width: 1023px)': function () {
      gsap.set('[data-parallax] img', { yPercent: 0 });
    }
  });

  /* ---------- rails drift ---------- */
  document.querySelectorAll('[data-rail]').forEach(function (r, i) {
    gsap.fromTo(r, { xPercent: i % 2 ? 2.2 : -2.2 }, {
      xPercent: 0, ease: 'none',
      scrollTrigger: { trigger: r, start: 'top bottom', end: 'top 40%', scrub: SCRUB }
    });
  });

  /* ---------- cursor: Búðir's, in this build's accent ---------- */
  (function cursor() {
    if (isTouch || reduced) return;
    var el = document.getElementById('cursor');
    if (!el) return;
    var x = window.innerWidth / 2, y = window.innerHeight / 2, tx = x, ty = y;
    var setX = gsap.quickSetter(el, 'x', 'px'), setY = gsap.quickSetter(el, 'y', 'px');
    window.addEventListener('pointermove', function (e) { tx = e.clientX; ty = e.clientY; }, { passive: true });
    gsap.ticker.add(function () {
      x += (tx - x) * 0.2; y += (ty - y) * 0.2;
      setX(x); setY(y);
    });
  })();

  /* ---------- resize: WIDTH only. On a phone a height change is the URL bar. ---------- */
  var lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (isTouch && window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    resplit();
  });
})();
