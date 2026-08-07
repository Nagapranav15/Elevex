/* ==========================================================================
   ELEVEX RENTALS · CRANE RENTAL — interaction layer
   Vanilla ES5-safe JS. No build step, no modules, no npm.

   Design rules this file follows:
     · Everything is optional. If GSAP, Lenis or Swiper fail to load, each
       module degrades to a CSS-only or native-scroll equivalent instead of
       throwing and taking the rest of the page down with it.
     · One scroll listener drives the cheap per-frame work; ScrollTrigger owns
       the rest. No module adds its own listener.
     · prefers-reduced-motion is honoured at the module level, not just in CSS.

   Contents
     1  Environment & helpers
     2  Loader
     3  Lenis + ScrollTrigger bootstrap
     4  Reveal / split text
     5  Counters
     6  Header, scroll spy, mega, drawer
     7  Hero: parallax, particles, hook, video
     8  Marquee duplication
     9  Fleet swiper + modal
    10  Pinned horizontal rails (process, projects)
    11  Testimonials swiper
    12  Accordion smoothing
    13  Form validation, newsletter, toasts
    14  Theme toggle
    15  Scroll progress, back-to-top, sticky CTA
    16  Magnetic buttons, tilt, spotlight
    17  Lazy map, misc
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- 1 · ENV */
  var doc = document;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel));
  };
  var CALM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasST = hasGSAP && typeof window.ScrollTrigger !== 'undefined';

  if (hasST) gsap.registerPlugin(ScrollTrigger);

  /* Loads a script or stylesheet once, resolving through a callback. Used for
     Swiper so the carousels cost nothing until they are close to the viewport. */
  var loaded = {};
  function loadAsset(url, type, cb) {
    if (loaded[url] === 'done') { cb && cb(); return; }
    if (loaded[url]) { loaded[url].push(cb); return; }
    loaded[url] = cb ? [cb] : [];
    var el;
    if (type === 'css') {
      el = doc.createElement('link');
      el.rel = 'stylesheet';
      el.href = url;
    } else {
      el = doc.createElement('script');
      el.src = url;
      el.async = true;
    }
    el.onload = function () {
      var queue = loaded[url] || [];
      loaded[url] = 'done';
      queue.forEach(function (fn) { fn && fn(); });
    };
    el.onerror = function () { loaded[url] = 'done'; };
    doc.head.appendChild(el);
  }

  /* ---------------------------------------------------------------- 2 · LOADER
     Deliberately short-lived: it hides on `load`, or after 2.6s, whichever
     comes first. A loader that can trap the page is worse than no loader. */
  (function loader() {
    var box = $('#exLoader');
    if (!box) return;
    var bar = $('#exLoaderBar');
    var pctEl = $('#exLoaderPct');
    var pct = 0;
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      if (bar) bar.style.right = '0%';
      if (pctEl) pctEl.textContent = '100';
      setTimeout(function () {
        box.classList.add('is-done');
        doc.documentElement.classList.add('is-ready');
        setTimeout(function () { box.remove(); }, 800);
        if (hasST) ScrollTrigger.refresh();
      }, 260);
    }

    if (CALM) { finish(); return; }

    var tick = setInterval(function () {
      pct = Math.min(96, pct + Math.random() * 14 + 5);
      if (pctEl) pctEl.textContent = Math.floor(pct);
      if (bar) bar.style.right = (100 - pct) + '%';
    }, 120);

    function stop() { clearInterval(tick); finish(); }
    if (doc.readyState === 'complete') stop();
    else window.addEventListener('load', stop);
    setTimeout(stop, 2600);
  })();

  /* ------------------------------------------------- 3 · LENIS + SCROLLTRIGGER
     Lenis must hand its scroll position to ScrollTrigger and run off the GSAP
     ticker, otherwise pinned sections lag one frame behind the content. */
  var lenis = null;
  (function smoothScroll() {
    if (CALM || typeof window.Lenis === 'undefined') return;
    /* Touch devices keep native scrolling — hijacking it there costs battery
       and breaks the browser's own overscroll behaviours. */
    lenis = new Lenis({
      duration: 1.1,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      syncTouch: false
    });

    if (hasST) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  })();

  function scrollToTarget(target, offset) {
    var off = offset === undefined ? -84 : offset;
    if (lenis) lenis.scrollTo(target, { offset: off });
    else {
      var el = typeof target === 'string' ? $(target) : target;
      if (!el) return;
      var y = el.getBoundingClientRect().top + window.pageYOffset + off;
      window.scrollTo({ top: y, behavior: CALM ? 'auto' : 'smooth' });
    }
  }

  /* ------------------------------------------------------ 4 · REVEAL / SPLIT
     IntersectionObserver rather than ScrollTrigger: these are one-shot state
     flips, and IO is both cheaper and available even if GSAP never arrives. */
  (function reveals() {
    /* Wrap each direct child of a [data-split="lines"] heading in the clip
       structure the CSS expects, and stagger them. Markup already ships the
       inner spans, so this only adds the clipping wrapper. */
    $$('[data-split="lines"]').forEach(function (host) {
      var kids = Array.prototype.slice.call(host.children);
      kids.forEach(function (kid, i) {
        var line = doc.createElement('span');
        line.className = 'ex-line';
        line.style.setProperty('--ld', (i * 110) + 'ms');
        host.insertBefore(line, kid);
        line.appendChild(kid);
      });
    });

    var targets = $$('[data-reveal], [data-stagger], [data-split], .ex-safety__chart, .ex-h2');

    if (!('IntersectionObserver' in window) || CALM) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    $$('[data-reveal][data-reveal-delay]').forEach(function (el) {
      el.style.setProperty('--rd', el.getAttribute('data-reveal-delay') + 'ms');
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

    targets.forEach(function (el) { io.observe(el); });
  })();

  /* ------------------------------------------------------------ 5 · COUNTERS */
  (function counters() {
    var els = $$('[data-count]');
    if (!els.length) return;

    function run(el) {
      if (el.dataset.counted) return;
      el.dataset.counted = '1';
      var target = parseFloat(el.getAttribute('data-count')) || 0;
      var suffix = el.getAttribute('data-suffix') || '';
      if (CALM) { el.textContent = target + suffix; return; }

      var start = null;
      var dur = 1700;
      function step(ts) {
        if (!start) start = ts;
        var p = clamp((ts - start) / dur, 0, 1);
        var eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(target * eased).toLocaleString('en-IN') + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        run(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* --------------------------------------------- 6 · HEADER / SPY / MEGA / NAV */
  (function header() {
    var head = $('#exHead');
    if (!head) return;
    var last = 0;

    function onScroll() {
      var y = window.pageYOffset;
      head.classList.toggle('is-stuck', y > 40);
      /* Hide on the way down, reveal on the way up — but never while the
         drawer is open, or the close button rides off screen with it. */
      var drawer = $('#exDrawer');
      if (drawer && drawer.classList.contains('is-open')) { last = y; return; }
      if (y > 400 && y > last + 6) head.classList.add('is-hidden');
      else if (y < last - 6) head.classList.remove('is-hidden');
      last = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* Scroll spy */
    var links = $$('.ex-nav__link[href^="#"]');
    var sections = links.map(function (l) {
      return { link: l, el: $(l.getAttribute('href')) };
    }).filter(function (s) { return s.el; });

    if (sections.length && 'IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (l) { l.classList.remove('is-active'); });
          sections.forEach(function (s) {
            if (s.el === e.target) s.link.classList.add('is-active');
          });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      sections.forEach(function (s) { spy.observe(s.el); });
    }

    /* Mega panel — hover is CSS; this adds the keyboard/click path. */
    var megaBtn = $('.ex-nav__item--mega .ex-nav__link');
    var mega = $('#megaFleet');
    if (megaBtn && mega) {
      megaBtn.addEventListener('click', function () {
        var open = mega.classList.toggle('is-open');
        megaBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      doc.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        mega.classList.remove('is-open');
        megaBtn.setAttribute('aria-expanded', 'false');
      });
      doc.addEventListener('click', function (e) {
        if (mega.contains(e.target) || megaBtn.contains(e.target)) return;
        mega.classList.remove('is-open');
        megaBtn.setAttribute('aria-expanded', 'false');
      });
    }

    /* Drawer */
    var burger = $('#exBurger');
    var drawer = $('#exDrawer');
    if (burger && drawer) {
      var lastFocus = null;
      function setOpen(open) {
        if (open) {
          lastFocus = doc.activeElement;
          drawer.hidden = false;
          requestAnimationFrame(function () { drawer.classList.add('is-open'); });
          if (lenis) lenis.stop();
          doc.body.style.overflow = 'hidden';
          var first = $('a', drawer);
          if (first) first.focus();
        } else {
          drawer.classList.remove('is-open');
          if (lenis) lenis.start();
          doc.body.style.overflow = '';
          setTimeout(function () { drawer.hidden = true; }, 600);
          if (lastFocus) lastFocus.focus();
        }
        burger.classList.toggle('is-open', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      }
      burger.addEventListener('click', function () {
        setOpen(!drawer.classList.contains('is-open'));
      });
      $$('a', drawer).forEach(function (a) {
        a.addEventListener('click', function () { setOpen(false); });
      });
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && drawer.classList.contains('is-open')) setOpen(false);
      });
    }
  })();

  /* ---------------------------------------------------------------- 7 · HERO */
  (function hero() {
    var heroSec = $('.ex-hero');
    if (!heroSec) return;

    /* — Mouse parallax on the mesh and grid — */
    if (FINE && !CALM) {
      var mesh = $('.ex-hero__mesh');
      var grid = $('.ex-hero__grid');
      var raf = null;
      heroSec.addEventListener('mousemove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          var r = heroSec.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          if (mesh) mesh.style.transform = 'translate3d(' + (px * 26) + 'px,' + (py * 20) + 'px,0)';
          if (grid) grid.style.transform = 'translate3d(' + (px * -14) + 'px,' + (py * -10) + 'px,0)';
        });
      });
    }

    /* — Scroll parallax: copy drifts up and fades as the hero leaves — */
    if (hasST && !CALM && window.innerWidth >= 1040) {
      gsap.to('.ex-hero__inner', {
        y: 120, opacity: 0.15, ease: 'none',
        scrollTrigger: { trigger: heroSec, start: 'top top', end: 'bottom top', scrub: 0.6 }
      });
      /* The hook rides down the cable in step with the scroll. */
      gsap.to('#exHook', {
        y: 300, ease: 'none',
        scrollTrigger: { trigger: heroSec, start: 'top top', end: 'bottom top', scrub: 0.8 }
      });
    }

    /* — Particles: a light dust field, capped and paused off-screen — */
    (function particles() {
      var cv = $('#exParticles');
      if (!cv || CALM || !FINE) return;
      var ctx = cv.getContext && cv.getContext('2d');
      if (!ctx) return;

      var dots = [];
      var running = true;
      var w = 0, h = 0;

      function size() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = cv.clientWidth; h = cv.clientHeight;
        cv.width = w * dpr; cv.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var count = Math.min(70, Math.round(w / 22));
        dots = [];
        for (var i = 0; i < count; i++) {
          dots.push({
            x: Math.random() * w, y: Math.random() * h,
            r: Math.random() * 1.6 + 0.4,
            vy: -(Math.random() * 0.22 + 0.05),
            vx: (Math.random() - 0.5) * 0.12,
            a: Math.random() * 0.4 + 0.1
          });
        }
      }

      function frame() {
        if (!running) return;
        ctx.clearRect(0, 0, w, h);
        for (var i = 0; i < dots.length; i++) {
          var d = dots[i];
          d.y += d.vy; d.x += d.vx;
          if (d.y < -6) { d.y = h + 6; d.x = Math.random() * w; }
          if (d.x < -6) d.x = w + 6;
          if (d.x > w + 6) d.x = -6;
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(245,158,75,' + d.a + ')';
          ctx.fill();
        }
        requestAnimationFrame(frame);
      }

      size();
      frame();
      window.addEventListener('resize', size);

      /* Stop burning frames once the hero is scrolled past. */
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          var vis = entries[0].isIntersecting;
          if (vis && !running) { running = true; frame(); }
          running = vis;
        }, { threshold: 0.02 }).observe(heroSec);
      }
    })();

    /* — Background video: attached only where it will actually pay off — */
    (function heroVideo() {
      var v = $('#exHeroVideo');
      if (!v || CALM) return;
      var conn = navigator.connection || {};
      if (conn.saveData) return;
      if (/2g/.test(conn.effectiveType || '')) return;
      if (window.innerWidth < 900) return;
      var src = v.getAttribute('data-src');
      if (!src) return;
      v.src = src;
      var p = v.play();
      if (p && p.catch) p.catch(function () { /* autoplay refused — poster stands in */ });
    })();
  })();

  /* ------------------------------------------------------------- 8 · MARQUEE */
  (function marquee() {
    $$('[data-marquee]').forEach(function (wrap) {
      var row = wrap.querySelector('.ex-marquee__row');
      if (!row) return;
      var guard = 0;
      /* Fill the viewport first, then clone — a half-empty row shows a gap
         every time the animation wraps. */
      while (row.scrollWidth < wrap.offsetWidth && guard < 4) {
        row.innerHTML += row.innerHTML;
        guard++;
      }
      var copy = row.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      wrap.appendChild(copy);
    });
  })();

  /* -------------------------------------------------- 9 · FLEET + MODAL
     Specs live here rather than in the DOM so the modal has one source of
     truth and the markup stays readable. */
  var FLEET = [
    {
      name: 'Liebherr LTM 1250', tag: 'Mobile · All-terrain',
      img: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1000&q=75&auto=format',
      alt: 'All-terrain mobile crane with boom extended on a construction site',
      desc: 'A 250-tonne all-terrain machine that travels on public roads under its own power and rigs in under three hours. The default choice when a lift is heavy but the site is reachable.',
      specs: [['Capacity', '250 t'], ['Main boom', '72 m'], ['Max tip', '104 m'], ['Axles', '7']],
      apps: ['Precast erection', 'Tower crane assembly', 'Bridge girders', 'Plant maintenance']
    },
    {
      name: 'Sany SCC 6300A', tag: 'Crawler · Lattice boom',
      img: 'https://images.unsplash.com/photo-1590644365607-1c5b1d0f4d19?w=1000&q=75&auto=format',
      alt: 'Lattice boom crawler crane silhouetted against the sky',
      desc: 'Our heaviest unit at 600 tonnes. Tracks let it travel under load across a prepared pad, which is what makes long erection campaigns economic rather than a sequence of set-ups.',
      specs: [['Capacity', '600 t'], ['Main boom', '108 m'], ['Luffing jib', '96 m'], ['Counterweight', '210 t']],
      apps: ['Wind nacelle erection', 'Refinery vessels', 'Power plant boilers', 'Heavy modules']
    },
    {
      name: 'Escorts F15', tag: 'Hydra · Pick & carry',
      img: 'https://images.unsplash.com/photo-1573167507387-6b4b98cb7c13?w=1000&q=75&auto=format',
      alt: 'Compact pick and carry hydra crane on a plant road',
      desc: 'The workhorse of Indian sites. Fifteen tonnes, tight turning circle, and it carries the load rather than setting up for every pick — which is why it moves more material per shift than anything else in the yard.',
      specs: [['Capacity', '15 t'], ['Boom', '13 m'], ['Turning radius', '4.2 m'], ['Travel speed', '28 kmph']],
      apps: ['Material shifting', 'Yard handling', 'Steel fabrication', 'Congested plant roads']
    },
    {
      name: 'JLG 1350SJP', tag: 'Access · Telescopic boom',
      img: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1000&q=75&auto=format',
      alt: 'Telescopic boom lift raised beside a steel structure',
      desc: 'Forty-three metres of working height with a jib for the last few metres of up-and-over reach. Rated for two operators and their tools at full extension.',
      specs: [['Working height', '43 m'], ['Horizontal reach', '24 m'], ['Platform', '450 kg'], ['Drive', '4WD diesel']],
      apps: ['Facade access', 'Structural steel', 'Cladding', 'Inspection work']
    },
    {
      name: 'Kalmar DCG 250', tag: 'Handling · Diesel forklift',
      img: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1000&q=75&auto=format',
      alt: 'Heavy duty forklift handling a palletised load in a yard',
      desc: 'A 25-tonne heavy forklift for container and machinery handling where a crane would be over-specified and slower to reposition.',
      specs: [['Capacity', '25 t'], ['Lift height', '6 m'], ['Load centre', '1200 mm'], ['Fork length', '2.4 m']],
      apps: ['Container handling', 'Machinery offloading', 'Laydown yards', 'Port logistics']
    }
  ];

  (function fleet() {
    var host = $('#exFleetSwiper');
    var modal = $('#exModal');
    if (!host) return;

    /* — Modal — */
    var lastFocus = null;
    function openModal(i) {
      var d = FLEET[i];
      if (!d || !modal) return;
      lastFocus = doc.activeElement;

      $('#exModalImg').src = d.img;
      $('#exModalImg').alt = d.alt;
      $('#exModalTag').textContent = d.tag;
      $('#exModalName').textContent = d.name;
      $('#exModalDesc').textContent = d.desc;

      $('#exModalSpecs').innerHTML = d.specs.map(function (s) {
        return '<div><dt>' + s[0] + '</dt><dd>' + s[1] + '</dd></div>';
      }).join('');
      $('#exModalApps').innerHTML = d.apps.map(function (a) {
        return '<li>' + a + '</li>';
      }).join('');

      modal.hidden = false;
      requestAnimationFrame(function () { modal.classList.add('is-open'); });
      if (lenis) lenis.stop();
      doc.body.style.overflow = 'hidden';
      $('.ex-modal__x', modal).focus();
    }

    function closeModal() {
      if (!modal) return;
      modal.classList.remove('is-open');
      if (lenis) lenis.start();
      doc.body.style.overflow = '';
      setTimeout(function () { modal.hidden = true; }, 400);
      if (lastFocus) lastFocus.focus();
    }

    if (modal) {
      $$('[data-close]', modal).forEach(function (el) {
        el.addEventListener('click', closeModal);
      });
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !modal.hidden) closeModal();
      });
      /* Focus trap — a modal you can tab out of is not modal. */
      modal.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') return;
        var f = $$('a[href], button, input, select, textarea', modal)
          .filter(function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      });
      var quote = $('#exModalQuote');
      if (quote) quote.addEventListener('click', function (e) {
        e.preventDefault();
        closeModal();
        setTimeout(function () { scrollToTarget('#contact'); }, 320);
      });
    }

    $$('.ex-unit').forEach(function (unit) {
      var btn = $('.ex-unit__btn', unit);
      if (!btn) return;
      btn.addEventListener('click', function () {
        openModal(parseInt(unit.getAttribute('data-unit'), 10) || 0);
      });
    });

    /* — Swiper, loaded on approach — */
    function initSwiper() {
      if (typeof window.Swiper === 'undefined') return;
      var bar = $('#exFleetBar');
      var sw = new Swiper(host, {
        slidesPerView: 1.15,
        spaceBetween: 20,
        grabCursor: true,
        speed: 620,
        a11y: { enabled: true },
        keyboard: { enabled: true },
        breakpoints: {
          620: { slidesPerView: 2.15 },
          1000: { slidesPerView: 3.15 },
          1400: { slidesPerView: 4.15 }
        },
        navigation: { prevEl: '#exFleetPrev', nextEl: '#exFleetNext' },
        on: {
          progress: function (s, p) {
            if (bar) bar.style.transform = 'translateX(' + (p * 400) + '%)';
          }
        }
      });
      return sw;
    }

    function boot() {
      loadAsset('https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css', 'css');
      loadAsset('https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js', 'js', function () {
        initSwiper();
        if (window.__exSaysBoot) window.__exSaysBoot();
      });
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        boot();
      }, { rootMargin: '400px' });
      io.observe(host);
    } else {
      boot();
    }
  })();

  /* ------------------------------------------- 10 · PINNED HORIZONTAL RAILS
     Desktop only, and only when the rail is genuinely wider than the screen.
     Below that breakpoint the markup is already a native snap-scroller, which
     is the better interaction on touch anyway. */
  function pinRail(sectionSel, trackSel) {
    var section = $(sectionSel);
    var track = $(trackSel);
    if (!section || !track || !hasST || CALM) return;

    var st = null;
    function build() {
      if (st) { st.kill(true); st = null; }
      section.classList.remove('is-pinned');
      gsap.set(track, { x: 0 });

      if (window.innerWidth < 1040) return;
      var distance = track.scrollWidth - window.innerWidth + 80;
      if (distance <= 0) return;

      section.classList.add('is-pinned');
      st = gsap.to(track, {
        x: -distance,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=' + distance * 1.15,
          pin: true,
          scrub: 0.7,
          invalidateOnRefresh: true,
          anticipatePin: 1
        }
      }).scrollTrigger;
    }

    build();
    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(build, 220);
    });
  }
  pinRail('.ex-proc', '#exProcTrack');
  pinRail('.ex-work', '#exWorkTrack');

  /* ------------------------------------------------------- 11 · TESTIMONIALS */
  window.__exSaysBoot = function () {
    var host = $('#exSaysSwiper');
    if (!host || typeof window.Swiper === 'undefined' || host.swiper) return;
    new Swiper(host, {
      slidesPerView: 1.1,
      spaceBetween: 20,
      speed: 600,
      grabCursor: true,
      autoplay: CALM ? false : { delay: 6000, disableOnInteraction: true },
      a11y: { enabled: true },
      pagination: { el: '#exSaysDots', clickable: true },
      breakpoints: { 700: { slidesPerView: 2.05 }, 1160: { slidesPerView: 2.6 } }
    });
  };

  /* ---------------------------------------------------------- 12 · ACCORDION
     <details> already works with no JS. This only animates the open/close and
     keeps the group to one panel at a time in browsers without `name=`. */
  (function accordion() {
    var items = $$('.ex-acc__item');
    if (!items.length) return;
    var supportsName = 'name' in doc.createElement('details');

    items.forEach(function (item) {
      var body = $('.ex-acc__body', item);
      var summary = $('summary', item);
      if (!body || !summary) return;

      summary.addEventListener('click', function (e) {
        if (CALM) return;
        e.preventDefault();
        var isOpen = item.hasAttribute('open');

        if (!isOpen && !supportsName) {
          items.forEach(function (o) {
            if (o === item || !o.hasAttribute('open')) return;
            var ob = $('.ex-acc__body', o);
            slide(o, ob, false);
          });
        }
        slide(item, body, !isOpen);
      });

      function slide(el, panel, open) {
        if (open) {
          el.setAttribute('open', '');
          panel.style.height = '0px';
          requestAnimationFrame(function () {
            panel.style.transition = 'height .45s cubic-bezier(.16,1,.3,1)';
            panel.style.height = panel.scrollHeight + 'px';
          });
          panel.addEventListener('transitionend', function done() {
            panel.style.height = 'auto';
            panel.style.transition = '';
            panel.removeEventListener('transitionend', done);
            if (hasST) ScrollTrigger.refresh();
          });
        } else {
          panel.style.height = panel.scrollHeight + 'px';
          requestAnimationFrame(function () {
            panel.style.transition = 'height .38s cubic-bezier(.65,0,.35,1)';
            panel.style.height = '0px';
          });
          panel.addEventListener('transitionend', function done() {
            el.removeAttribute('open');
            panel.style.height = '';
            panel.style.transition = '';
            panel.removeEventListener('transitionend', done);
            if (hasST) ScrollTrigger.refresh();
          });
        }
      }
    });
  })();

  /* ------------------------------------------------- 13 · FORMS + TOASTS */
  function toast(msg, kind) {
    var host = $('#exToasts');
    if (!host) return;
    var t = doc.createElement('div');
    t.className = 'ex-toast' + (kind === 'err' ? ' ex-toast--err' : '');
    t.textContent = msg;
    host.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('is-on'); });
    setTimeout(function () {
      t.classList.remove('is-on');
      setTimeout(function () { t.remove(); }, 400);
    }, 4200);
  }

  (function forms() {
    /* Floating-label sync */
    $$('.ex-field input, .ex-field textarea').forEach(function (input) {
      var field = input.closest('.ex-field');
      function sync() { field.classList.toggle('is-filled', !!input.value.trim()); }
      input.addEventListener('input', sync);
      input.addEventListener('blur', sync);
      sync();
    });

    var form = $('#exForm');
    if (form) {
      var RULES = [
        { id: 'fName', err: 'fNameErr', test: function (v) { return v.trim().length >= 2; }, msg: 'Please enter your name.' },
        { id: 'fPhone', err: 'fPhoneErr', test: function (v) { return /^[+\d][\d\s-]{7,}$/.test(v.trim()); }, msg: 'Enter a reachable phone number.' },
        { id: 'fMail', err: 'fMailErr', test: function (v) { return !v.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()); }, msg: 'That email address looks incomplete.' }
      ];

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = true;
        var firstBad = null;

        RULES.forEach(function (r) {
          var el = $('#' + r.id);
          var errEl = $('#' + r.err);
          var field = el.closest('.ex-field');
          var valid = r.test(el.value);
          field.classList.toggle('is-invalid', !valid);
          el.setAttribute('aria-invalid', valid ? 'false' : 'true');
          if (errEl) errEl.textContent = valid ? '' : r.msg;
          if (!valid) { ok = false; if (!firstBad) firstBad = el; }
        });

        if (!ok) {
          firstBad.focus();
          toast('Please check the highlighted fields.', 'err');
          return;
        }

        /* Front-end only. In WordPress, point this at admin-post.php or swap
           the whole <form> for a CF7 / WPForms / Gravity Forms shortcode —
           the styling hooks off .ex-field, so markup parity is all it needs. */
        toast('Request received. We will call you within four working hours.');
        form.reset();
        $$('.ex-field', form).forEach(function (f) {
          f.classList.remove('is-filled', 'is-invalid');
        });
        $$('.ex-field__err', form).forEach(function (s) { s.textContent = ''; });
      });
    }

    var news = $('#exNews');
    if (news) news.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('input', news);
      if (!input.value.trim() || input.value.indexOf('@') < 0) {
        toast('Enter a valid email address.', 'err');
        return;
      }
      toast('Subscribed. Yard notes land once a month.');
      news.reset();
    });
  })();

  /* ------------------------------------------------------------- 14 · THEME */
  (function theme() {
    var btn = $('#exTheme');
    if (!btn) return;
    function sync() {
      var dark = doc.documentElement.getAttribute('data-theme') === 'dark';
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
      btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    }
    sync();
    btn.addEventListener('click', function () {
      var dark = doc.documentElement.getAttribute('data-theme') === 'dark';
      if (dark) doc.documentElement.removeAttribute('data-theme');
      else doc.documentElement.setAttribute('data-theme', 'dark');
      try { localStorage.setItem('elevex-theme', dark ? 'light' : 'dark'); } catch (e) { }
      sync();
    });
  })();

  /* ------------------------------- 15 · PROGRESS · BACK TO TOP · STICKY CTA
     One listener for all three — they read the same scroll number. */
  (function chrome() {
    var bar = $('#exProgress i');
    var top = $('#exTop');
    var ring = $('#exTopRing');
    var sticky = $('#exSticky');
    var CIRC = 126;
    var ticking = false;

    function paint() {
      ticking = false;
      var h = doc.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? clamp(window.pageYOffset / h, 0, 1) : 0;
      if (bar) bar.style.transform = 'scaleX(' + p + ')';
      if (ring) ring.style.strokeDashoffset = String(CIRC * (1 - p));
      var past = window.pageYOffset > 640;
      if (top) top.classList.toggle('is-on', past);
      /* Hide the sticky bar once the contact form is on screen — it would be
         pointing at something the user is already looking at. */
      if (sticky) {
        var contact = $('#contact');
        var atForm = contact && contact.getBoundingClientRect().top < window.innerHeight * 0.75;
        sticky.classList.toggle('is-on', past && !atForm);
      }
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(paint);
    }, { passive: true });
    window.addEventListener('resize', paint);
    paint();

    if (top) top.addEventListener('click', function () { scrollToTarget(0, 0); });
  })();

  /* ------------------------------------- 16 · MAGNETIC · TILT · SPOTLIGHT
     All pointer-driven, all skipped entirely on touch and reduced motion. */
  (function pointerFx() {
    if (!FINE || CALM) return;

    $$('[data-magnetic]').forEach(function (el) {
      var raf = null;
      el.addEventListener('mousemove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          var r = el.getBoundingClientRect();
          var x = (e.clientX - r.left - r.width / 2) * 0.28;
          var y = (e.clientY - r.top - r.height / 2) * 0.42;
          el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        });
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });

    $$('[data-tilt]').forEach(function (el) {
      var raf = null;
      el.addEventListener('mousemove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform =
            'perspective(900px) rotateX(' + (-py * 5) + 'deg) rotateY(' + (px * 5) + 'deg)';
        });
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });

    $$('.ex-ind__card').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  })();

  /* ----------------------------------------------------- 17 · LAZY MAP + MISC */
  (function misc() {
    /* Map: 500 KB of Google iframe that nobody scrolls to on most visits. */
    var map = $('[data-map]');
    if (map && 'IntersectionObserver' in window) {
      var mio = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        mio.disconnect();
        var f = doc.createElement('iframe');
        f.src = map.getAttribute('data-src');
        f.loading = 'lazy';
        f.title = 'ELEVEX Rentals yard location, Balanagar, Hyderabad';
        f.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        map.innerHTML = '';
        map.appendChild(f);
      }, { rootMargin: '300px' });
      mio.observe(map);
    }

    var yr = $('#exYear');
    if (yr) yr.textContent = String(new Date().getFullYear());

    /* Anchor scrolling routed through Lenis so it matches the page's easing. */
    $$('a[href^="#"]').forEach(function (a) {
      var id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      a.addEventListener('click', function (e) {
        var target = $(id);
        if (!target) return;
        e.preventDefault();
        scrollToTarget(target);
        history.replaceState(null, '', id);
      });
    });

    /* Images that finish late shift the pinned rails' measurements. */
    window.addEventListener('load', function () {
      if (hasST) ScrollTrigger.refresh();
    });
  })();
})();
