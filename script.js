
      /* ==========================================================================
         ELEVEX HOME · interaction layer
         Vanilla JS, no dependencies, safe to enqueue in WordPress footer.
         Everything is queried inside #elevex-home so it cannot touch theme markup.
         ========================================================================== */
      (function () {
        'use strict';

        var ROOT = document.getElementById('elevex-home');
        if (!ROOT) return;

        var $ = function (s, c) { return (c || ROOT).querySelector(s); };
        var $$ = function (s, c) { return Array.prototype.slice.call((c || ROOT).querySelectorAll(s)); };
        var CALM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
        var lerp = function (a, b, t) { return a + (b - a) * t; };

        /* ---------------------------------------------------------------- 1 · PRELOADER */
        /* The preloader was removed. It had already been switched off with a
           `.ex-loader{display:none!important}` override in the stylesheet, but its
           markup still shipped and this block still ran — a 110ms interval writing
           percentages into an invisible bar, plus a 4.2s timer, on every page load.
           Nothing else reads the `ex-ready` class it used to set. */

        /* ---------------------------------------------------------------- 2 · REVEALS */
        (function reveals() {
          var els = $$('[data-rv],[data-clip],[data-split],[data-bars],[data-map],[data-stagger],[data-shine]');
          if (!('IntersectionObserver' in window) || CALM) {
            els.forEach(function (el) { el.classList.add('ex-in'); });
            return;
          }
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
              if (!e.isIntersecting) return;
              e.target.classList.add('ex-in');
              io.unobserve(e.target);
            });
          }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
          els.forEach(function (el) { io.observe(el); });
        })();

        /* ---------------------------------------------------------------- 3 · COUNTERS
           One implementation. There used to be a second copy further down (block 22)
           observing the same [data-count] nodes; the two raced and numbers flickered
           between the two eased values. The `ex-counted` class this adds is also what
           the .ex-score fade-up keyframe hangs off, so it has to stay. */
        (function counters() {
          var els = $$('[data-count]');
          if (!els.length) return;

          function run(el) {
            if (el.classList.contains('ex-counted')) return;
            el.classList.add('ex-counted');
            var target = parseFloat(el.getAttribute('data-count')) || 0;
            var suffix = el.getAttribute('data-suffix') || '';
            var dur = parseInt(el.getAttribute('data-dur'), 10) || 1600;
            if (CALM) { el.textContent = target + suffix; return; }
            var t0 = null;
            function step(ts) {
              if (!t0) t0 = ts;
              var p = clamp((ts - t0) / dur, 0, 1);
              var eased = 1 - Math.pow(1 - p, 4);           // easeOutQuart
              el.textContent = Math.round(target * eased) + suffix;
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
          }, { threshold: 0.4 });
          els.forEach(function (el) { io.observe(el); });
        })();

        /* ---------------------------------------------------------------- 6 · HEADER */
        (function header() {
          var head = document.getElementById('exHeader');
          var pill = document.getElementById('exNavPill');
          var box = document.getElementById('exNavLinks');
          var links = $$('.ex-navlink');
          var last = 0;

          function place(el) {
            if (!pill || !box || !el) { if (pill) pill.style.opacity = '0'; return; }
            var b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
            pill.style.opacity = '1';
            pill.style.width = r.width + 'px';
            pill.style.left = (r.left - b.left) + 'px';
          }
          function active() { return $('.ex-navlink.ex-active') || links[0]; }

          links.forEach(function (l) { l.addEventListener('mouseenter', function () { place(l); }); });
          if (box) box.addEventListener('mouseleave', function () { place(active()); });
          window.addEventListener('resize', function () { place(active()); });
          setTimeout(function () { place(active()); }, 400);

          window.addEventListener('scroll', function () {
            var y = window.pageYOffset;
            head.classList.toggle('ex-stuck', y > 60);
            // hide going down, reveal going up — but never over the hero
            var menuOpen = document.getElementById('exMenu');
            if (menuOpen && menuOpen.classList.contains('ex-open')) { last = y; return; }
            if (y > 420 && y > last + 6) head.classList.add('ex-hide');
            else if (y < last - 6) head.classList.remove('ex-hide');
            last = y;
          }, { passive: true });

          /* scroll-spy */
          var spySections = $$('[data-spy]').map(function (l) {
            return { link: l, el: document.getElementById(l.getAttribute('data-spy')) };
          }).filter(function (s) { return s.el; });

          if (spySections.length && 'IntersectionObserver' in window) {
            var spy = new IntersectionObserver(function (entries) {
              entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                var match = spySections.filter(function (s) { return s.el === e.target; })[0];
                if (!match) return;
                links.forEach(function (l) { l.classList.remove('ex-active'); });
                match.link.classList.add('ex-active');
                place(match.link);
              });
            }, { rootMargin: '-45% 0px -50% 0px' });
            spySections.forEach(function (s) { spy.observe(s.el); });
          }
        })();

        /* ---------------------------------------------------------------- 7 · MENU */
        (function menu() {
          var burger = document.getElementById('exBurger');
          var panel = document.getElementById('exMenu');
          if (!burger || !panel) return;
          var links = $$('.ex-menu__link', panel);

          function setOpen(open) {
            panel.classList.toggle('ex-open', open);
            burger.classList.toggle('ex-open', open);
            burger.setAttribute('aria-expanded', open ? 'true' : 'false');
            burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
            document.body.style.overflow = open ? 'hidden' : '';
            links.forEach(function (l, i) {
              l.style.transitionDelay = open ? (0.14 + i * 0.07) + 's' : '0s';
            });
          }

          burger.addEventListener('click', function () { setOpen(!panel.classList.contains('ex-open')); });
          links.forEach(function (l) { l.addEventListener('click', function () { setOpen(false); }); });
          document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && panel.classList.contains('ex-open')) setOpen(false);
          });
        })();

        /* ---------------------------------------------------------------- 8 · SCROLL PROGRESS + TOP */
        (function progress() {
          var bar = document.getElementById('exProgress');
          var top = document.getElementById('exTop');
          var ring = document.getElementById('exTopRing');
          var wa = ROOT.querySelector('.ex-wa');
          var CIRC = 170;

          function update() {
            var h = document.documentElement.scrollHeight - window.innerHeight;
            var p = h > 0 ? clamp(window.pageYOffset / h, 0, 1) : 0;
            if (bar) bar.style.transform = 'scaleX(' + p + ')';
            if (ring) ring.style.strokeDashoffset = CIRC * (1 - p);
            var past = window.pageYOffset > 700;
            if (top) top.classList.toggle('ex-on', past);
            if (wa) wa.classList.toggle('ex-on', past);
          }
          window.addEventListener('scroll', update, { passive: true });
          window.addEventListener('resize', update);
          update();

          if (top) top.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: CALM ? 'auto' : 'smooth' });
          });
        })();

        /* ---------------------------------------------------------------- 9 · PARALLAX */
        (function parallax() {
          var els = $$('[data-px]');
          if (!els.length || CALM) return;
          var ticking = false;

          function frame() {
            var vh = window.innerHeight;
            els.forEach(function (el) {
              var r = el.getBoundingClientRect();
              if (r.bottom < -200 || r.top > vh + 200) return;
              var speed = parseFloat(el.getAttribute('data-px')) || 0.06;
              var centre = r.top + r.height / 2 - vh / 2;
              el.style.transform = 'translate3d(0,' + (-centre * speed).toFixed(2) + 'px,0)';
            });
            ticking = false;
          }
          window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(frame); }
          }, { passive: true });
          frame();
        })();

        /* ---------------------------------------------------------------- 10 · SPOTLIGHT + TILT */
        (function pointerFx() {
          if (!FINE) return;

          $$('[data-spot]').forEach(function (el) {
            el.addEventListener('mousemove', function (e) {
              var r = el.getBoundingClientRect();
              el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
              el.style.setProperty('--my', (e.clientY - r.top) + 'px');
            });
          });

          if (CALM) return;
          $$('[data-tilt]').forEach(function (el) {
            var max = parseFloat(el.getAttribute('data-tilt-max')) || 7;
            el.addEventListener('mousemove', function (e) {
              var r = el.getBoundingClientRect();
              var px = (e.clientX - r.left) / r.width - 0.5;
              var py = (e.clientY - r.top) / r.height - 0.5;
              el.style.transform = 'perspective(1100px) rotateX(' + (-py * max) + 'deg) rotateY(' + (px * max) + 'deg)';
            });
            el.addEventListener('mouseleave', function () {
              el.style.transform = 'perspective(1100px) rotateX(0) rotateY(0)';
            });
          });

        })();

        /* ---------------------------------------------------------------- 11 · MARQUEES */
        (function marquees() {
          $$('[data-marq]').forEach(function (wrap) {
            var row = wrap.querySelector('.ex-marq__row');
            if (!row) return;
            // clone until the strip is at least twice the viewport, so the loop never gaps
            var guard = 0;
            while (row.scrollWidth < wrap.offsetWidth && guard < 4) {
              row.innerHTML += row.innerHTML;
              guard++;
            }
            var copy = row.cloneNode(true);
            copy.setAttribute('aria-hidden', 'true');
            wrap.appendChild(copy);
          });
        })();

        /* ---------------------------------------------------------------- 12 · HERO EQUIPMENT SWITCHER & HOTSPOTS */
        (function heroEquipment() {
          var tabs = document.getElementById('exHeroTabs');
          var img = document.getElementById('exHeroImg');
          var src = document.getElementById('exHeroSrc');
          var tagTitle = document.getElementById('exHeroTagTitle');
          var tagSub = document.getElementById('exHeroTagSub');
          if (!tabs || !img) return;

          var HERO_DATA = [
            {
              src: 'https://elevex.co.in/wp-content/uploads/2026/08/scissor-lift-main.png',
              alt: 'ELEVEX Electric Scissor Lift',
              title: 'Electric Scissor Lift',
              sub: '14m Working Height • 450kg Load',
              hs: [
                { t: 'Extensible Deck', d: '450kg heavy-duty payload with non-marking platform decks.' },
                { t: 'Li-ion Fast Charge', d: 'Full 8-hour shift per charge with 15A standard socket top-up.' },
                { t: 'Silent 62dB Drive', d: 'Whisper-quiet electric wheel motors & non-marking tyres.' }
              ]
            },
            {
              src: 'https://elevex.co.in/wp-content/uploads/2026/08/boom-lift-main.jpg',
              alt: 'ELEVEX Electric Articulating Boom',
              title: 'Electric Boom Lift',
              sub: '22m Working Height • 230kg Load',
              hs: [
                { t: 'Up-and-Over Reach', d: '22m vertical reach with 12m horizontal articulation.' },
                { t: 'Zero Emission Battery', d: 'Zero tailpipe fumes for indoor cleanrooms & live facilities.' },
                { t: 'Proportional Controls', d: 'Smooth joystick drive and positioning with micro-creep speed.' }
              ]
            },
            {
              src: 'https://elevex.co.in/wp-content/uploads/2026/08/terrain-lift-main.jpg',
              alt: 'ELEVEX Electric Rough-Terrain Lift',
              title: 'Rough-Terrain EV Lift',
              sub: '18m Working Height • 320kg Load',
              hs: [
                { t: 'Oscillating 4WD Axles', d: '4-wheel electric drive with active mud & slope traction.' },
                { t: 'High Ground Clearance', d: 'Engineered for mud, gravel, and unfinished site decks.' },
                { t: 'All-Weather Battery', d: 'IP67 rated power pack for outdoor monsoon & heavy site work.' }
              ]
            },
            {
              src: 'https://elevex.co.in/wp-content/uploads/2026/08/scissor-lift-main.png',
              alt: 'ELEVEX Mast & Low-Level Lift',
              title: 'Low-Level Mast Lift',
              sub: '8m Working Height • 160kg Load',
              hs: [
                { t: 'Compact Doorway Pass', d: 'Narrow width fits inside standard elevators & doorways.' },
                { t: 'Lightweight Floor Rating', d: 'Ultra-low ground pressure for tiles, wood & raised floors.' },
                { t: 'Push-Around / Self-Propelled', d: 'Quick one-person setup for overhead lighting & maintenance.' }
              ]
            }
          ];

          var tabBtns = $$('.ex-hero__tab', tabs);
          var specTag = document.getElementById('exHeroSpecTag');
          var hs1Title = document.getElementById('exHs1Title'), hs1Desc = document.getElementById('exHs1Desc');
          var hs2Title = document.getElementById('exHs2Title'), hs2Desc = document.getElementById('exHs2Desc');
          var hs3Title = document.getElementById('exHs3Title'), hs3Desc = document.getElementById('exHs3Desc');
          var current = 0;
          var autoTimer = null, autoPaused = false, heroVisible = true;
          var hotspots = $$('.ex-hotspot');

          /* Writes the tag through a short fade rather than a hard text swap, and
             does it via a class so the styling stays in the stylesheet. */
          function paintTag(title, sub, highlight) {
            if (!specTag) return;
            specTag.classList.add('ex-swap');
            setTimeout(function () {
              if (tagTitle) tagTitle.textContent = title;
              if (tagSub) tagSub.textContent = sub;
              specTag.classList.toggle('ex-hs', !!highlight);
              specTag.classList.remove('ex-swap');
            }, CALM ? 0 : 180);
          }

          function clearHotspots() {
            hotspots.forEach(function (h) { h.classList.remove('ex-active'); });
          }

          function resetSpecTag() {
            var d = HERO_DATA[current];
            paintTag(d.title, d.sub, false);
          }

          function selectHero(i) {
            if (i === current) return;
            current = i;
            var d = HERO_DATA[i];

            tabBtns.forEach(function (btn, n) { btn.classList.toggle('ex-active', n === i); });
            clearHotspots();
            paintTag(d.title, d.sub, false);

            if (hs1Title && d.hs[0]) { hs1Title.textContent = d.hs[0].t; hs1Desc.textContent = d.hs[0].d; }
            if (hs2Title && d.hs[1]) { hs2Title.textContent = d.hs[1].t; hs2Desc.textContent = d.hs[1].d; }
            if (hs3Title && d.hs[2]) { hs3Title.textContent = d.hs[2].t; hs3Desc.textContent = d.hs[2].d; }

            img.classList.add('ex-swap');
            setTimeout(function () {
              if (src) src.srcset = d.src;
              img.src = d.src;
              img.alt = d.alt;
              img.classList.remove('ex-swap');
            }, 240);
          }

          function startAutoPlay() {
            if (CALM) return;
            clearInterval(autoTimer);
            autoTimer = setInterval(function () {
              if (autoPaused || !heroVisible) return;
              selectHero((current + 1) % HERO_DATA.length);
            }, 5000);
          }

          tabBtns.forEach(function (btn) {
            btn.addEventListener('click', function () { selectHero(parseInt(btn.getAttribute('data-hero-eq'), 10)); startAutoPlay(); });
            if (FINE) btn.addEventListener('mouseenter', function () { selectHero(parseInt(btn.getAttribute('data-hero-eq'), 10)); });
          });

          var heroSec = document.getElementById('home');
          if (heroSec) {
            heroSec.addEventListener('mouseenter', function () { autoPaused = true; });
            heroSec.addEventListener('mouseleave', function () { autoPaused = false; });
            /* Stop cycling once the hero is off screen — on a phone this timer was
               swapping images and repainting for the whole length of the page. */
            if ('IntersectionObserver' in window) {
              new IntersectionObserver(function (entries) {
                heroVisible = entries[0].isIntersecting;
              }, { threshold: 0.05 }).observe(heroSec);
            }
          }

          /* Hotspots. On desktop the floating card does the talking; on a phone that
             card is hidden, so the tapped node's copy is pushed into the spec tag. */
          hotspots.forEach(function (hs, index) {
            var btn = hs.querySelector('.ex-hotspot__btn');
            if (!btn) return;
            btn.addEventListener('click', function (e) {
              e.stopPropagation();
              var wasActive = hs.classList.contains('ex-active');
              clearHotspots();
              if (wasActive) { resetSpecTag(); return; }

              hs.classList.add('ex-active');
              autoPaused = true;                       // don't swap out from under them
              var hsData = HERO_DATA[current].hs[index];
              if (hsData) paintTag(hsData.t, hsData.d, true);
            });
          });

          document.addEventListener('click', function () {
            if (!ROOT.querySelector('.ex-hotspot.ex-active')) return;
            clearHotspots();
            resetSpecTag();
            autoPaused = false;
          });

          startAutoPlay();
        })();

        /* ---------------------------------------------------------------- 13 · EQUIPMENT SWITCHER */
        (function equipment() {
          var list = document.getElementById('exEqList');
          var img = document.getElementById('exEqImg');
          var tag = document.getElementById('exEqTag');
          var src = document.getElementById('exEqSrc');
          if (!list || !img) return;
            var UP = 'https://elevex.co.in/wp-content/uploads/2026/08/';

          var DATA = [
            /* Media library URLs, matching the hero and the markup's own initial src.
               These were relative `assets/cutouts/*` paths with the extension appended
               at swap time, which 404s once the markup is pasted into WordPress —
               nothing is served from /assets there. Each entry now carries the finished
               URL. */
            { src: UP + 'scissor-lift-main.jpg', alt: 'ELEVEX electric scissor lift', tag: 'Electric · Indoor rated', specs: [14, 450, 8, 62] },
            { src: UP + 'boom-lift-main.jpg', alt: 'ELEVEX electric articulating boom', tag: 'Electric · Up-and-over reach', specs: [22, 230, 8, 66] },
            { src: UP + 'terrain-lift-main.jpg', alt: 'ELEVEX rough-terrain lift', tag: 'Electric 4WD · Rough terrain', specs: [18, 320, 7, 68] },
            { src: UP + 'scissor-lift-main.jpg', alt: 'ELEVEX low-level mast lift', tag: 'Electric · Push-around', specs: [8, 160, 10, 58] }
          ];
          var rows = $$('.ex-eqrow', list);
          var specEls = $$('[data-spec]');
          var current = 0;

          function tween(el, from, to) {
            if (CALM) { el.textContent = to; return; }
            var t0 = null, dur = 620;
            function step(ts) {
              if (!t0) t0 = ts;
              var p = clamp((ts - t0) / dur, 0, 1);
              var e = 1 - Math.pow(1 - p, 3);
              el.textContent = Math.round(from + (to - from) * e);
              if (p < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
          }

          function select(i) {
            if (i === current) return;
            current = i;
            var d = DATA[i];

            rows.forEach(function (r, n) { r.classList.toggle('ex-active', n === i); });
            if (tag) tag.textContent = d.tag;

            img.classList.add('ex-swap');
            setTimeout(function () {
              if (src) src.srcset = d.src;
              img.src = d.src;
              img.alt = d.alt;
              img.classList.remove('ex-swap');
            }, 260);

            specEls.forEach(function (el, n) {
              tween(el, parseInt(el.textContent, 10) || 0, d.specs[n]);
            });
          }

          rows.forEach(function (r) {
            r.addEventListener('click', function () { select(parseInt(r.getAttribute('data-eq'), 10)); });
            if (FINE) r.addEventListener('mouseenter', function () { select(parseInt(r.getAttribute('data-eq'), 10)); });
          });
        })();

        /* ---------------------------------------------------------------- 14 · PROCESS RAIL – SCROLL PINNED */
        (function process() {
          var section = document.getElementById('process');
          var rail = document.getElementById('exProcRail');
          var line = document.getElementById('exProcLine');
          if (!section || !rail) return;

          var steps = $$('[data-step]', rail);
          var SCROLL_PX = 1200;           /* extra scroll room for the animation */
          var pinned = false;
          var ticking = false;

          function measure() {
            pinned = !CALM && window.innerWidth >= 1040;
            section.classList.toggle('ex-proc-pinned', pinned);
            /* set the section tall enough so the sticky pin has room to scroll */
            if (pinned) {
              section.style.height = (window.innerHeight + SCROLL_PX) + 'px';
            } else {
              section.style.height = '';
            }
            frame();
          }

          function frame() {
            /* ---- mobile / reduced-motion: classic reveal ---- */
            if (!pinned) {
              var r = rail.getBoundingClientRect();
              var vh = window.innerHeight;
              var start = vh * 0.85, end = vh * 0.25;
              var p = clamp((start - r.top) / ((r.height + start - end) || 1), 0, 1);
              if (line) line.style.width = (p * 100).toFixed(1) + '%';
              steps.forEach(function (s, i) {
                s.classList.toggle('ex-on', p >= (i / (steps.length - 1 || 1)) * 0.85);
              });
              ticking = false;
              return;
            }

            /* ---- desktop pinned: progress driven by section.top ---- */
            var secTop = section.getBoundingClientRect().top;
            var p = clamp(-secTop / SCROLL_PX, 0, 1);

            if (line) line.style.width = (p * 100).toFixed(1) + '%';

            steps.forEach(function (s, i) {
              /* each step activates at its proportional point */
              var threshold = i / (steps.length - 1 || 1);
              s.classList.toggle('ex-on', p >= threshold * 0.92);
            });

            ticking = false;
          }

          window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(frame); }
          }, { passive: true });
          window.addEventListener('resize', measure);
          window.addEventListener('load', measure);
          measure();
        })();

        /* ---------------------------------------------------------------- 15 · INDUSTRY RAIL */
        (function rail() {
          var section = document.getElementById('industries');
          var track = document.getElementById('exIndTrack');
          var bar = document.getElementById('exIndBar');
          var countEl = document.getElementById('exIndCount');
          if (!section || !track) return;

          var SLOWDOWN = 1.45;
          var pinned = false, travel = 0, scrollLen = 0, ticking = false;
          var cards = $$('.ex-card', track);
          var NAMES = ['Construction', 'Warehousing', 'Manufacturing', 'Infrastructure', 'Retail & Malls', 'Utilities & Events'];

          /* Paints the progress bar and the "01 / 06 — Construction" readout from a
             single 0→1 value, whichever input produced it. */
          function paint(p) {
            if (bar) bar.style.transform = 'translateX(' + (p * (100 / 0.22 - 100)) + '%)';
            var centerIdx = Math.min(cards.length - 1, Math.round(p * (cards.length - 1)));
            cards.forEach(function (c, idx) { c.classList.toggle('ex-center', idx === centerIdx); });
            if (countEl) {
              countEl.innerHTML = '<b>0' + (centerIdx + 1) + '</b> / 06 — ' + (NAMES[centerIdx] || 'Sector');
            }
          }

          function measure() {
            pinned = !CALM && window.innerWidth >= 1040 && track.scrollWidth > window.innerWidth;
            section.classList.toggle('ex-pinned', pinned);
            if (!pinned) {
              section.style.height = '';
              track.style.transform = '';
              trackScrolled();          /* keep the rail live in its unpinned form */
              return;
            }
            travel = Math.max(0, track.scrollWidth - window.innerWidth + 48);
            scrollLen = travel * SLOWDOWN;
            section.style.height = (window.innerHeight + scrollLen) + 'px';
            frame();
          }

          /* Unpinned (phone / tablet) the rail is a native horizontal scroller, so the
             bar and the counter follow scrollLeft instead of the page position.
             Previously this only ran while pinned, which left mobile with a dead 22%
             stub of a progress bar and a counter frozen on "01". */
          var trackTicking = false;
          function trackScrolled() {
            if (pinned) return;
            var max = track.scrollWidth - track.clientWidth;
            paint(max > 0 ? clamp(track.scrollLeft / max, 0, 1) : 0);
          }
          track.addEventListener('scroll', function () {
            if (trackTicking) return;
            trackTicking = true;
            requestAnimationFrame(function () { trackTicking = false; trackScrolled(); });
          }, { passive: true });

          function frame() {
            if (!pinned) { ticking = false; return; }
            var top = section.getBoundingClientRect().top;
            var p = scrollLen > 0 ? clamp(-top / scrollLen, 0, 1) : 0;
            track.style.transform = 'translate3d(' + (-p * travel).toFixed(1) + 'px,0,0)';
            paint(p);
            ticking = false;
          }

          window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(frame); }
          }, { passive: true });
          window.addEventListener('resize', measure);
          window.addEventListener('load', measure);
          measure();

          $$('[data-rail]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var card = track.querySelector('.ex-card');
              var step = card ? card.offsetWidth + 20 : 320;
              var dir = btn.getAttribute('data-rail') === 'next' ? 1 : -1;
              if (pinned) window.scrollBy({ top: dir * step * SLOWDOWN, behavior: 'smooth' });
              else track.scrollBy({ left: dir * step, behavior: 'smooth' });
            });
          });

          var down = false, startX = 0, startLeft = 0, moved = 0;
          track.addEventListener('pointerdown', function (e) {
            if (pinned || e.pointerType === 'touch') return;
            down = true; moved = 0;
            startX = e.clientX; startLeft = track.scrollLeft;
            track.setPointerCapture(e.pointerId);
          });
          track.addEventListener('pointermove', function (e) {
            if (!down) return;
            var dx = e.clientX - startX;
            if (Math.abs(dx) > 4) track.classList.add('ex-drag');
            moved = Math.abs(dx);
            track.scrollLeft = startLeft - dx;
          });
          ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
            track.addEventListener(ev, function () { down = false; track.classList.remove('ex-drag'); });
          });
          track.addEventListener('click', function (e) { if (moved > 6) e.preventDefault(); }, true);
        })();

        /* ------------------------------------------------- 15b · SCROLL-LINKED HERO + SHEAR + MARQUEE SPEED */
        (function scrollFx() {
          if (CALM) return;
          var hero = document.getElementById('home');
          var copy = document.getElementById('exHeroCopy');
          var marqs = $$('.ex-marq');
          var lastY = window.pageYOffset, vel = 0, ticking = false;
          /* On a phone the hero is auto-height and content-rich — dissolving the copy
             the moment you scroll hides the headline before it has been read. The
             effect is desktop-only, where the hero is a locked 100svh panel. */
          var wide = window.innerWidth >= 1040;
          window.addEventListener('resize', function () {
            wide = window.innerWidth >= 1040;
            if (!wide && copy) { copy.style.transform = ''; copy.style.opacity = ''; }
          });

          function frame() {
            var y = window.pageYOffset;
            vel = lerp(vel, y - lastY, 0.22);
            lastY = y;

            /* hero lifts and dissolves as it leaves */
            if (hero && copy && wide) {
              var h = hero.offsetHeight || 1;
              var p = clamp(y / h, 0, 1);
              if (p < 1) {
                copy.style.transform = 'translate3d(0,' + (p * 130).toFixed(1) + 'px,0)';
                copy.style.opacity = String(clamp(1 - p * 1.7, 0, 1));
              }
            }

            /* marquee text shears with scroll velocity */
            var sk = clamp(vel * 0.16, -7, 7);
            marqs.forEach(function (m) { m.style.setProperty('--sk', sk.toFixed(2) + 'deg'); });

            ticking = false;
          }

          window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(frame); }
          }, { passive: true });
          frame();
        })();

        /* ---------------------------------------------------------------- 16 · TESTIMONIALS */
        (function testimonials() {
          var txt = document.getElementById('exQuoteTxt');
          if (!txt) return;
          var who = document.getElementById('exQuoteWho');
          var ava = document.getElementById('exQuoteAva');
          var nm = document.getElementById('exQuoteName');
          var rl = document.getElementById('exQuoteRole');
          var idx = document.getElementById('exQuoteIdx');
          var tot = document.getElementById('exQuoteTot');
          var dots = document.getElementById('exQuoteDots');

          var LIST = [
            { q: "The machines turned up charged, the PDI sheet was in the operator's hand, and we were working the same afternoon. That's not normal in this industry.", n: 'Rahul Kulkarni', r: 'Project Manager · L&T Construction', a: 'RK' },
            { q: 'We run a sealed cold-store. Electric lifts meant no exhaust extraction plan, no permit delay, and racking installed two weeks ahead of schedule.', n: 'Meera Pillai', r: 'Operations Lead · DHL Supply Chain', a: 'MP' },
            { q: 'A boom failed on a Sunday night. A replacement was on site before the morning shift and we were never billed for the gap.', n: 'Arjun Shetty', r: 'Site Coordinator · Tata Projects', a: 'AS' },
            { q: 'Signage work in a live mall used to mean night shifts. At 62 dB we did it in trading hours and nobody complained once.', n: 'Nikhil Bansal', r: 'Facilities Head · Phoenix Malls', a: 'NB' }
          ];

          var i = 0, timer = null, DUR = 7000;
          if (tot) tot.textContent = ('0' + LIST.length).slice(-2);

          LIST.forEach(function (_, n) {
            var b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('aria-label', 'Testimonial ' + (n + 1));
            b.innerHTML = '<i></i>';
            b.addEventListener('click', function () { show(n); restart(); });
            dots.appendChild(b);
          });
          var dotEls = $$('button', dots);

          function paintDots() {
            dotEls.forEach(function (d, n) {
              d.classList.toggle('ex-on', n === i);
              var f = d.querySelector('i');
              f.style.transition = 'none';
              f.style.right = '100%';
              if (n === i && !CALM) {
                requestAnimationFrame(function () {
                  f.style.transition = 'right ' + DUR + 'ms linear';
                  f.style.right = '0%';
                });
              } else if (n === i) { f.style.right = '0%'; }
            });
          }

          function show(n) {
            i = (n + LIST.length) % LIST.length;
            var d = LIST[i];
            txt.classList.add('ex-out'); who.classList.add('ex-out');
            setTimeout(function () {
              txt.textContent = d.q; nm.textContent = d.n; rl.textContent = d.r; ava.textContent = d.a;
              idx.textContent = ('0' + (i + 1)).slice(-2);
              txt.classList.remove('ex-out'); who.classList.remove('ex-out');
            }, CALM ? 0 : 320);
            paintDots();
          }

          function restart() {
            clearInterval(timer);
            if (!CALM) timer = setInterval(function () { show(i + 1); }, DUR);
          }

          document.getElementById('exQuoteNext').addEventListener('click', function () { show(i + 1); restart(); });
          document.getElementById('exQuotePrev').addEventListener('click', function () { show(i - 1); restart(); });

          paintDots();
          restart();
        })();

        /* ---------------------------------------------------------------- 17 · ACCORDION */
        (function accordion() {
          var acc = document.getElementById('exAcc');
          if (!acc) return;
          var items = $$('.ex-acc__item', acc);

          items.forEach(function (item) {
            var btn = item.querySelector('.ex-acc__q');
            var panel = item.querySelector('.ex-acc__a');

            btn.addEventListener('click', function () {
              var isOpen = item.classList.contains('ex-open');

              items.forEach(function (other) {
                other.classList.remove('ex-open');
                other.querySelector('.ex-acc__q').setAttribute('aria-expanded', 'false');
                other.querySelector('.ex-acc__a').style.height = '0px';
              });

              if (!isOpen) {
                item.classList.add('ex-open');
                btn.setAttribute('aria-expanded', 'true');
                panel.style.height = panel.scrollHeight + 'px';
              }
            });
          });

          window.addEventListener('resize', function () {
            var open = acc.querySelector('.ex-acc__item.ex-open .ex-acc__a');
            if (open) open.style.height = open.scrollHeight + 'px';
          });
        })();

        /* ---------------------------------------------------------------- 18 · FORMS */
        (function forms() {
          $$('.ex-field input, .ex-field textarea').forEach(function (input) {
            var field = input.closest('.ex-field');
            var sync = function () { field.classList.toggle('ex-filled', !!input.value.trim()); };
            input.addEventListener('input', sync);
            input.addEventListener('blur', sync);
            sync();
          });

          /* Front-end only. In WordPress, point action/method at admin-post.php,
             or replace this handler with your CF7 / WPForms / Gravity Forms shortcode. */
          var form = document.getElementById('exForm');
          if (form) form.addEventListener('submit', function (e) {
            e.preventDefault();
            var ok = true;
            ['fName', 'fPhone'].forEach(function (id) {
              var el = document.getElementById(id);
              if (!el.value.trim()) {
                ok = false;
                el.style.borderColor = 'rgba(255,120,90,.7)';
                setTimeout(function () { el.style.borderColor = ''; }, 1800);
              }
            });
            if (!ok) return;
            document.getElementById('exFormOk').classList.add('ex-show');
            form.reset();
            $$('.ex-field', form).forEach(function (f) { f.classList.remove('ex-filled'); });
          });

          var news = document.getElementById('exNews');
          if (news) news.addEventListener('submit', function (e) {
            e.preventDefault();
            var msg = document.getElementById('exNewsMsg');
            if (msg) msg.style.display = 'block';
            news.reset();
          });
        })();

        /* ---------------------------------------------------------------- 19 · MISC */
        (function misc() {
          var y = document.getElementById('exYear');
          if (y) y.textContent = new Date().getFullYear();

          var clock = document.getElementById('exClock');
          if (clock) {
            var tick = function () {
              clock.textContent = new Date().toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false
              });
            };
            tick();
            setInterval(tick, 30000);
          }

          /* smooth anchor scroll that clears the fixed header */
          $$('a[href^="#"]').forEach(function (a) {
            a.addEventListener('click', function (e) {
              var id = a.getAttribute('href');
              if (id === '#' || id.length < 2) { e.preventDefault(); return; }
              var target = document.querySelector(id);
              if (!target) return;
              e.preventDefault();
              var top = target.getBoundingClientRect().top + window.pageYOffset - 90;
              window.scrollTo({ top: top, behavior: CALM ? 'auto' : 'smooth' });
            });
          });
        })();

        /* ---------------------------------------------------------------- 20 · SECTION PARALLAX */
        (function sectionParallax() {
          if (CALM) return;
          var secs = $$('[data-parallax]');
          if (!secs.length) return;
          var ticking = false;

          function frame() {
            var vh = window.innerHeight;
            secs.forEach(function (el) {
              var r = el.getBoundingClientRect();
              var speed = parseFloat(el.getAttribute('data-parallax')) || 0.04;
              /* 0 when element centre is at viewport centre, ±1 at edges */
              var center = (r.top + r.height / 2 - vh / 2) / vh;
              el.style.transform = 'translate3d(0,' + (center * speed * -100).toFixed(1) + 'px,0)';
            });
            ticking = false;
          }
          window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(frame); }
          }, { passive: true });
          frame();
        })();

        /* ---------------------------------------------------------------- 21 · CURSOR SPOTLIGHT ON DARK SECTIONS */
        (function cursorSpotlight() {
          if (!FINE) return;
          $$('[data-spotlight]').forEach(function (sec) {
            sec.addEventListener('mousemove', function (e) {
              var r = sec.getBoundingClientRect();
              sec.style.setProperty('--cx', (e.clientX - r.left) + 'px');
              sec.style.setProperty('--cy', (e.clientY - r.top) + 'px');
            });
          });
        })();

        /* ---------------------------------------------------------------- 22 · SCROLL-PROGRESS ENGINE
           Writes three normalised values onto every [data-sp] block as it travels
           through the viewport, and CSS does the rest:
      
             --sp      0 when the block's top hits the bottom of the screen,
                       1 when its bottom clears the top of the screen
             --sp-in   0 → 1 across the block's entrance only
             --sp-out  0 → 1 across its exit only
      
           One rAF-throttled listener for the whole page, and only blocks currently
           on screen are touched — so scroll-linked motion costs a handful of custom
           property writes per frame instead of a listener per element. */
        (function scrollProgressEngine() {
          if (CALM) return;
          var blocks = $$('[data-sp]');
          if (!blocks.length) return;
          var ticking = false;

          function frame() {
            var vh = window.innerHeight || 1;
            for (var i = 0; i < blocks.length; i++) {
              var el = blocks[i];
              var r = el.getBoundingClientRect();
              /* skip anything comfortably outside the viewport */
              if (r.bottom < -80 || r.top > vh + 80) continue;
              var span = r.height + vh || 1;
              var sp = clamp((vh - r.top) / span, 0, 1);
              el.style.setProperty('--sp', sp.toFixed(4));
              el.style.setProperty('--sp-in', clamp((vh - r.top) / (vh * 0.85), 0, 1).toFixed(4));
              el.style.setProperty('--sp-out', clamp(-r.top / (r.height || 1), 0, 1).toFixed(4));
            }
            ticking = false;
          }

          window.addEventListener('scroll', function () {
            if (!ticking) { ticking = true; requestAnimationFrame(frame); }
          }, { passive: true });
          window.addEventListener('resize', frame);
          frame();
        })();

        /* ---------------------------------------------------------------- 22b · TOUCH ACTIVATION
           Phones have no hover, so on a coarse pointer the card sitting closest to
           the middle of the screen is marked .ex-live. Every hover treatment on this
           page has a matching .ex-live rule, which turns scrolling itself into the
           interaction instead of leaving mobile with a flat, dead page.
      
           Groups are scoped per container so exactly one card lights up per rail —
           not one across the whole document. */
        (function touchActivation() {
          if (FINE) return;                       // desktop keeps :hover
          if (!('IntersectionObserver' in window)) return;

          /* Only groups that stack vertically on a phone belong here. The industry
             rail drives its own .ex-center off scrollLeft and the process rail drives
             .ex-on off page position — pointing a second system at either would give
             one element two competing "active" states. */
          var GROUPS = [
            { sel: '.ex-hcard', scope: '.ex-hero__cards' },
            { sel: '.ex-cell[data-live]', scope: '.ex-bento' },
            { sel: '.ex-score', scope: '.ex-scoreboard' },
            { sel: '.ex-fig', scope: '.ex-hero__figs' }
          ];

          var watched = [];
          GROUPS.forEach(function (g) {
            var scope = $(g.scope);
            if (!scope) return;
            var items = $$(g.sel, scope);
            if (items.length) watched.push({ items: items, current: null });
          });
          if (!watched.length) return;

          var visible = [];
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
              var at = visible.indexOf(e.target);
              if (e.isIntersecting && at === -1) visible.push(e.target);
              else if (!e.isIntersecting && at !== -1) visible.splice(at, 1);
            });
            settle();
          }, { rootMargin: '-15% 0px -15% 0px' });

          watched.forEach(function (g) {
            g.items.forEach(function (el) { io.observe(el); });
          });

          var ticking = false;
          function settle() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(function () {
              ticking = false;
              var mid = (window.innerHeight || 1) / 2;
              watched.forEach(function (g) {
                var best = null, bestDist = Infinity;
                g.items.forEach(function (el) {
                  if (visible.indexOf(el) === -1) return;
                  var r = el.getBoundingClientRect();
                  var d = Math.abs(r.top + r.height / 2 - mid);
                  if (d < bestDist) { bestDist = d; best = el; }
                });
                if (best === g.current) return;
                if (g.current) g.current.classList.remove('ex-live');
                if (best) best.classList.add('ex-live');
                g.current = best;
              });
            });
          }

          window.addEventListener('scroll', settle, { passive: true });
          window.addEventListener('resize', settle);
          settle();
        })();

        /* Block 22's old duplicate [data-count] observer was folded into block 3. */

        /* Magnetic buttons were removed on purpose. They wrote an inline transform
           onto .ex-btn / .ex-iconbtn, which overrode the lift and scale those
           components already animate in CSS — buttons ended up sliding under the
           cursor instead of responding to it, and the effect did nothing at all on
           touch. The CSS hover states are the single source of truth now. */

        /* Section 24's second scroll-progress writer was removed too: block 8 above
           already drives .ex-progress, the back-to-top ring and the WhatsApp pill
           from one scroll listener. */

      })();
    