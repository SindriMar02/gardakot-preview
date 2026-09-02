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
    if (b.lede) setTimeout(b.lede, 120);
    Object.keys(b).forEach(function (k) { if (k !== 'lede' && k !== 'wm') b[k](); });
  }

  (function intro() {
    if (!INTRO) return;
    var el = document.getElementById('intro');
    var card = document.getElementById('introCard');
    var word = document.getElementById('introWord');
    var heroWmEl = document.querySelector('.hero_wm');
    if (!el || !card || !word || !heroWmEl) { root.classList.remove('intro-on', 'intro-hold'); INTRO = false; return; }
    window.scrollTo(0, 0);

    var t = [];
    function at(ms, fn) { t.push(setTimeout(fn, ms)); }
    function done() {
      root.classList.remove('intro-on', 'intro-hold', 'intro-in', 'intro-go');
      if (window.__lenis) window.__lenis.start();
    }

    at(30, function () { root.classList.add('intro-in'); });

    at(1150, function () {
      /* The name travels from the card into its slot in the hero. Both are the same face
         at the same size, so this is a pure translate — measured, never guessed, because
         the hero wordmark's position depends on the hero's own layout. */
      var from = word.getBoundingClientRect();
      var to = heroWmEl.getBoundingClientRect();
      word.style.transform = 'translate(' + (to.left - from.left).toFixed(1) + 'px,'
                                          + (to.top - from.top).toFixed(1) + 'px)';
      root.classList.add('intro-go');       // the card furniture clears, the name stays
      el.classList.add('is-out');           // the cream ground fades off the hero beneath
      releaseHero();                        // and the hero is moving before it is visible
    });

    at(2150, function () {
      /* hand over: the real wordmark takes the same pixels with no animation of its own */
      heroWmEl.classList.add('in', 'no-anim');
      root.classList.remove('intro-hold');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { heroWmEl.classList.remove('no-anim'); });
      });
      done();
      window.dispatchEvent(new Event('resize'));
    });
    at(2400, function () { el.remove(); });

    /* any escape hatch must leave the page usable, not half-covered */
    function bail() {
      t.forEach(clearTimeout);
      heroWmEl.classList.add('in');
      el.remove(); done(); releaseHero();
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') bail(); });
    setTimeout(function () { if (document.body.contains(el)) bail(); }, 6000);
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

  /* ---------- the booking picker ----------
     Behaviour ported from 02-clients/aurora-hills StayPicker (see the stay-picker
     memory: copy the implementation, not the spec). Sits BEFORE the reduced-motion
     return — booking is function, not decoration, and must work with motion off. */
  (function picker() {
    var host = document.getElementById('bp');
    if (!host) return;
    var MIN_STAY = 2, RATE = 968, SLEEPS = 8, MONTHS_SHOWN = 2;
    var WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    var MN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var DAY = 86400000;
    var sod = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
    var addD = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); };
    var addM = function (d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); };
    var nights = function (a, b) { return Math.round((b - a) / DAY); };
    var same = function (a, b) { return !!a && !!b && a.getTime() === b.getTime(); };
    /* local key, never toISOString(): that shifts the day in UTC-negative zones and
       would block the wrong night for a guest reading this in Reykjavík */
    var key = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    var fmt = function (d) { return WD[(d.getDay() + 6) % 7] + ' ' + d.getDate() + ' ' + MN[d.getMonth()].slice(0, 3); };
    var fmtLong = function (d) { return d.getDate() + ' ' + MN[d.getMonth()] + ' ' + d.getFullYear(); };

    /* Hashed, never random: a reload must not reshuffle which nights are taken, or the
       calendar contradicts itself between visits. FNV-1a WITH the murmur3 finalizer —
       plain FNV has poor avalanche across near-identical keys and lands every value in
       one narrow band, which once rendered a house nobody could book. */
    function hash(str) {
      var h = 0x811c9dc5;
      for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
      h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
      h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
      h ^= h >>> 16;
      return (h >>> 0) / 0x100000000;
    }
    /* Load is tuned so the house reads BUSY BUT BOOKABLE. The first pass ran .17/.30 and
       put a taken night every day or two: 10 of 30 nights gone and not one legal 2-night
       range in the fortnight ahead, so the picker refused everything and demonstrated
       nothing. Weekends still go first, which is what makes the pattern look real. */
    function taken(d) {
      var dow = d.getDay(), load = (dow === 5 || dow === 6) ? 0.17 : 0.09;
      return hash('gardakot:' + key(d)) < load;
    }

    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var today = sod(new Date());
    /* open on a month that can be booked: landing on the 29th shows a grid that is
       almost entirely greyed-out past and reads as a full house */
    var daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
    var month = new Date(today.getFullYear(), today.getMonth() + (daysLeft < 7 ? 1 : 0), 1);
    var start = null, end = null, hover = null, guests = 2;

    var grids = document.getElementById('bpGrids'), monthsEl = document.getElementById('bpMonths');
    var prev = document.getElementById('bpPrev'), next = document.getElementById('bpNext');
    var noteEl = document.getElementById('bpNote'), sum = document.getElementById('bpSum');
    var fromEl = document.getElementById('bpFrom'), toEl = document.getElementById('bpTo');
    var fromBox = document.getElementById('bpFromBox'), toBox = document.getElementById('bpToBox');
    var nEl = document.getElementById('bpNights'), nL = document.getElementById('bpNightsL');
    var tEl = document.getElementById('bpTotal'), gEl = document.getElementById('bpGuests');
    var minus = document.getElementById('bpMinus'), plus = document.getElementById('bpPlus');
    var go = document.getElementById('bpGo');

    function note(text, warn) {
      noteEl.textContent = text;
      noteEl.classList.toggle('is-warn', !!warn);
    }
    /* a night is the date it STARTS on, so a stay start..end occupies start .. end-1.
       Checking out on a taken date is legal — you leave that morning and the next guest
       arrives that afternoon. Testing [start, end] instead refuses bookable stays. */
    function crosses(a, b) {
      for (var d = a; d < b; d = addD(d, 1)) if (taken(d)) return true;
      return false;
    }

    /* Once an arrival is chosen, only a WINDOW of checkouts is legal: no earlier than
       start+MIN_STAY, and no later than the first taken night after start — because that
       night is the last legal checkout (you leave the morning it begins). Outside that
       window every click used to be refused with a message, which is how a picker ends up
       feeling broken: on a 2 Sep arrival with the 4th taken, the 3rd failed the minimum
       and everything from the 5th crossed the 4th, so nothing the guest could see worked.
       The window is now disabled in the grid, so there is nothing left to refuse. */
    function checkoutWindow(from) {
      var min = addD(from, MIN_STAY), max = null;
      for (var d = addD(from, 1), i = 0; i < 400; d = addD(d, 1), i++) {
        if (taken(d)) { max = d; break; }
      }
      if (!max) max = addD(from, 400);
      return (max < min) ? null : { min: min, max: max };
    }

    function pick(day) {
      if (day < today) return;
      if (taken(day) && (!start || end)) {
        note(fmtLong(day) + ' is already taken. The nights in grey are booked.', true); return;
      }
      if (!start || (start && end) || day <= start) {
        var w = checkoutWindow(day);
        if (!w) {
          /* say it at the moment of choosing, not after five refused clicks */
          note(fmtLong(addD(day, 1)) + ' is already booked, so a ' + MIN_STAY
             + '-night stay cannot start on ' + fmtLong(day) + '. Try a later arrival.', true);
          start = null; end = null; hover = null; paint(); return;
        }
        start = day; end = null; hover = null;
        note('Now pick your departure — ' + fmtLong(w.min) + ' at the earliest.');
        paint(); return;
      }
      if (crosses(start, day)) {
        note('There is a booked night inside those dates. Pick a checkout before it, or start later.', true); paint(); return;
      }
      if (nights(start, day) < MIN_STAY) {
        note('The minimum stay is ' + MIN_STAY + ' nights, so the earliest checkout is ' + fmtLong(addD(start, MIN_STAY)) + '.', true); paint(); return;
      }
      end = day; hover = null; note('Send these dates and Eva Dögg answers with a confirmation.'); paint();
    }

    /* BUILD ONCE, THEN ONLY REPAINT.
       The first version rebuilt the whole grid inside render(), and render() ran on
       hover. So moving the mouse onto a day after choosing an arrival destroyed the very
       button being pressed, between mousedown and mouseup — no click event ever fired and
       the checkout could not be chosen at all with a real mouse. (Gating hover to fine
       pointers had fixed the touch symptom and left the desktop one.) Nodes are now
       created once per month; hover and selection only toggle classes on them. */
    var cells = [];

    function build() {
      var frag = document.createDocumentFragment();
      cells = [];
      for (var mi = 0; mi < MONTHS_SHOWN; mi++) {
        var m = addM(month, mi);
        var wrap = document.createElement('div');
        wrap.className = 'bp_grid' + (mi ? ' bp_grid--2' : '');
        var dows = document.createElement('div');
        dows.className = 'bp_dows'; dows.setAttribute('aria-hidden', 'true');
        WD.forEach(function (w) { var e = document.createElement('span'); e.textContent = w.slice(0, 1); dows.appendChild(e); });
        wrap.appendChild(dows);
        var days = document.createElement('div');
        days.className = 'bp_grid_days'; days.setAttribute('role', 'group');
        days.setAttribute('aria-label', MN[m.getMonth()] + ' ' + m.getFullYear());
        var first = new Date(m.getFullYear(), m.getMonth(), 1);
        var lead = (first.getDay() + 6) % 7;
        /* always six rows, or the panel jumps height when you page months */
        for (var i = 0; i < 42; i++) {
          var d = addD(first, i - lead);
          var el = document.createElement('button');
          el.type = 'button'; el.className = 'bp_day';
          var sp = document.createElement('span'); sp.textContent = d.getDate();
          el.appendChild(sp);
          var rec = { el: el, date: d, inMonth: d.getMonth() === m.getMonth() };
          cells.push(rec);
          (function (day, inMonth) {
            el.addEventListener('click', function () { if (inMonth) pick(day); });
            if (finePointer) {
              el.addEventListener('pointerenter', function () {
                if (inMonth && start && !end && !el.disabled) { hover = day; paint(); }
              });
            }
          })(d, rec.inMonth);
          days.appendChild(el);
        }
        wrap.appendChild(days);
        frag.appendChild(wrap);
      }
      grids.textContent = '';
      grids.appendChild(frag);
    }

    function paint() {
      var win = (start && !end) ? checkoutWindow(start) : null;
      var pe = (start && !end && hover && hover > start) ? hover : null;
      var to = end || pe;
      /* the range only reads as one continuous bar once it HAS two ends; a lone
         check-in stays a full disc rather than half a pill pointing at nothing */
      if (to) grids.setAttribute('data-range', ''); else grids.removeAttribute('data-range');

      cells.forEach(function (c) {
        var el = c.el, d = c.date, cl = el.classList;
        cl.toggle('bp_day--out', !c.inMonth);
        if (!c.inMonth) { el.disabled = true; el.tabIndex = -1; cl.remove('bp_day--taken', 'bp_day--in', 'bp_day--out2', 'bp_day--mid'); return; }
        var past = d < today, tk = taken(d);
        var off = past;
        if (win) off = off || d < win.min || d > win.max;      // choosing a checkout
        else off = off || tk;                                   // choosing an arrival
        el.disabled = off; el.tabIndex = off ? -1 : 0;
        cl.toggle('bp_day--off', off && !past && !tk);
        /* While a departure is being chosen the cell no longer means "a night you book";
           it means "the morning you leave". The last legal checkout IS the first taken
           night, so striking it through and dimming it made the one date that completes
           the stay look unavailable. Inside the window, nothing is struck. */
        cl.toggle('bp_day--taken', !past && tk && !win);
        cl.toggle('bp_day--in', same(d, start));
        cl.toggle('bp_day--out2', !!to && same(d, to));
        cl.toggle('bp_day--mid', !!(start && to && d > start && d < to));
        el.setAttribute('aria-label', fmtLong(d) + (tk ? ', booked' : past ? ', past' : ''));
        el.setAttribute('aria-pressed', String(same(d, start) || (!!to && same(d, to))));
      });

      var wide = window.matchMedia('(min-width: 1024px)').matches;
      var m2 = addM(month, 1);
      monthsEl.textContent = MN[month.getMonth()] + ' ' + month.getFullYear()
        + (wide ? '  ·  ' + MN[m2.getMonth()] + ' ' + m2.getFullYear() : '');
      prev.disabled = !(month > new Date(today.getFullYear(), today.getMonth(), 1));

      fromEl.textContent = start ? fmt(start) : 'Pick a date';
      toEl.textContent = end ? fmt(end) : '—';
      fromBox.classList.toggle('is-armed', !start || !!(start && end));
      toBox.classList.toggle('is-armed', !!start && !end);
      gEl.textContent = guests;
      minus.disabled = guests <= 1; plus.disabled = guests >= SLEEPS;

      var n = (start && end) ? nights(start, end) : 0;
      sum.hidden = !n;
      if (n) {
        nL.textContent = n === 1 ? 'Night' : 'Nights';
        nEl.textContent = n + ' × US$' + RATE.toLocaleString('en-US');
        tEl.textContent = 'US$' + (n * RATE).toLocaleString('en-US');
      }

      var body = start && end
        ? 'We would like to stay at Garðakot from ' + fmtLong(start) + ' to ' + fmtLong(end)
          + ' (' + n + (n === 1 ? ' night' : ' nights') + ').\nGuests: ' + guests
          + '\nRate shown on the site: US$' + RATE.toLocaleString('en-US') + ' a night, US$'
          + (n * RATE).toLocaleString('en-US') + ' in total.\n\nName:\nPhone:'
        : 'We would like to ask about staying at Garðakot.\nGuests: ' + guests + '\n\nDates:\nName:\nPhone:';
      go.href = 'mailto:gardakot@gmail.com?subject=' + encodeURIComponent('Booking request · Garðakot')
        + '&body=' + encodeURIComponent(body);
      go.textContent = start && end ? 'Request these dates' : 'Send an enquiry';
    }

    function render() { build(); paint(); }

    prev.addEventListener('click', function () { month = addM(month, -1); render(); });
    next.addEventListener('click', function () { month = addM(month, 1); render(); });
    minus.addEventListener('click', function () { if (guests > 1) { guests--; paint(); } });
    plus.addEventListener('click', function () { if (guests < SLEEPS) { guests++; paint(); } });
    if (finePointer) grids.addEventListener('pointerleave', function () { if (hover) { hover = null; paint(); } });
    window.addEventListener('resize', paint);   // the second month is hidden by CSS, not rebuilt
    render();
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
  /* with an intro running, the wordmark is handed over by the FLIP, not raised here */
  if (!INTRO) requestAnimationFrame(function () { if (heroWm) heroWm.classList.add('in'); });

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
