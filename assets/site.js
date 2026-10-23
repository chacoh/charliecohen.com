/* charliecohen.com: scroll-triggered entrance animations, header hide-on-scroll,
   background scroll effects, slideshow and hamburger menu (replicating the Wix site). */
(function () {
  var d = document, root = d.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desktop = window.matchMedia ? matchMedia('(min-width: 768px)') : { matches: true };

  /* entrance animations: Wix "viewEnter" -> play once */
  function play(el) {
    if (el._mo) return; el._mo = 1;
    var group = [el];
    (el.getAttribute('data-mo-group') || '').split(' ').forEach(function (id) { var e = id && d.getElementById(id); if (e) group.push(e); });
    group.forEach(function (e) {
      var names = getComputedStyle(e).animationName;
      if (!names || names === 'none') { e.classList.add('mo-done'); return; }
      var total = names.split(',').length, n = 0;
      function fin() { e.classList.add('mo-done'); e.classList.remove('mo-run'); }
      e.addEventListener('animationend', function h(ev) { if (ev.target !== e) return; if (++n >= total) { e.removeEventListener('animationend', h); fin(); } });
      setTimeout(fin, 4000);
      e.classList.add('mo-run');
    });
  }
  if (root.classList.contains('mo')) {
    var els = [].slice.call(d.querySelectorAll('[data-mo]'));
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && (en.intersectionRatio >= 0.15 || en.intersectionRect.height >= innerHeight * 0.15)) { play(en.target); io.unobserve(en.target); }
      });
    }, { threshold: [0, 0.15] });
    els.forEach(function (e) { io.observe(e); });
    addEventListener('beforeprint', function () { els.forEach(play); });
  }

  /* header: hides when scrolling down, comes back when scrolling up (Wix "HeaderHideToTop", desktop) */
  var hdr = d.querySelector('.hdr'), last = scrollY;
  function onHeader() {
    if (!hdr) return;
    var y = scrollY;
    if (desktop.matches && !reduce && y > 350 && y > last + 2 && !hdr.contains(d.activeElement)) hdr.classList.add('hdr-hide');
    else if (y < last - 2 || y <= 350 || !desktop.matches) hdr.classList.remove('hdr-hide');
    last = y;
  }
  if (hdr) hdr.addEventListener('focusin', function () { hdr.classList.remove('hdr-hide'); });

  /* background scroll effects (Wix BgFadeOut / BgParallax, desktop only) */
  var fx = [].slice.call(d.querySelectorAll('[data-fx]'));
  function onFx() {
    var on = desktop.matches && !reduce, vh = innerHeight;
    fx.forEach(function (el) {
      var name = el.getAttribute('data-fx'), r = el.getBoundingClientRect();
      if (name === 'BgFadeOut') {
        var t = Math.min(1, Math.max(0, -r.top / (r.height || 1)));
        var o = on ? String(1 - Math.sin(t * Math.PI / 2)) : '';
        el.querySelectorAll(':scope > .dc, :scope > .bgm').forEach(function (l) { l.style.opacity = o; });
      } else if (name === 'BgParallax') {
        var img = el.querySelector(':scope > .bgm');
        if (!img) return;
        if (on) { el.style.overflow = 'hidden'; img.style.bottom = 'auto'; img.style.height = Math.max(vh, r.height) + 'px'; img.style.transform = 'translateY(' + (-0.8 * r.top) + 'px)'; }
        else { el.style.overflow = img.style.bottom = img.style.height = img.style.transform = ''; }
      }
    });
  }
  var ticking = false;
  function onScroll() { if (ticking) return; ticking = true; requestAnimationFrame(function () { ticking = false; onHeader(); onFx(); }); }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onFx();

  /* slideshows: crossfade, autoplay every 4s, arrows */
  [].slice.call(d.querySelectorAll('.ss')).forEach(function (ss) {
    var slides = [].slice.call(d.querySelectorAll('[data-ss-of="' + ss.id + '"]')), i = 0, timer;
    if (slides.length < 2) return;
    function show(k) {
      i = (k + slides.length) % slides.length;
      slides.forEach(function (s, j) { s.classList.toggle('is-on', j === i); if (j === i) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true'); });
    }
    function auto() { clearInterval(timer); if (!reduce) timer = setInterval(function () { show(i + 1); }, +ss.getAttribute('data-interval') || 4000); }
    ss.querySelectorAll('[data-ss]').forEach(function (b) { b.addEventListener('click', function () { show(i + (b.getAttribute('data-ss') === 'prev' ? -1 : 1)); auto(); }); });
    auto();
  });

  /* hamburger menu */
  var hbm = d.getElementById('hbm'), openers = [].slice.call(d.querySelectorAll('.hb-open, .hb-m')), opener = openers[0];
  if (hbm && opener) {
    function open(e) { opener = (e && e.currentTarget) || opener; hbm.hidden = false; opener.setAttribute('aria-expanded', 'true'); requestAnimationFrame(function () { requestAnimationFrame(function () { hbm.classList.add('open'); }); }); var x = hbm.querySelector('.hbm-x'); if (x) x.focus(); }
    function close() { hbm.classList.remove('open'); opener.setAttribute('aria-expanded', 'false'); setTimeout(function () { hbm.hidden = true; }, reduce ? 0 : 400); opener.focus(); }
    openers.forEach(function (b) { b.addEventListener('click', open); });
    hbm.querySelectorAll('[data-hb-close]').forEach(function (b) { b.addEventListener('click', close); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !hbm.hidden) close(); });
    var top = hbm.querySelector('.hbm-top');
    if (top) top.addEventListener('click', function () { var it = top.parentNode, o = it.classList.toggle('open'); top.setAttribute('aria-expanded', o ? 'true' : 'false'); });
  }



  /* home gallery on touch: first tap shows the overlay + title, second tap on the same tile opens it,
     tapping anywhere else clears it (Wix pro-gallery mobile behaviour). Mouse and keyboard unaffected. */
  var tiles = [].slice.call(d.querySelectorAll('a.gl'));
  if (tiles.length) {
    var lastPtr = '', noHover = window.matchMedia ? matchMedia('(hover: none)') : { matches: false };
    d.addEventListener('pointerdown', function (e) { lastPtr = e.pointerType || ''; }, true);
    d.addEventListener('keydown', function () { lastPtr = 'key'; }, true);
    var clearTaps = function (except) { tiles.forEach(function (t) { if (t !== except) t.classList.remove('is-tap'); }); };
    tiles.forEach(function (t) {
      t.addEventListener('click', function (e) {
        var touch = lastPtr === 'touch' || lastPtr === 'pen' || (lastPtr === '' && noHover.matches);
        if (!touch) return;
        if (t.classList.contains('is-tap')) return; /* second tap: follow the link */
        e.preventDefault(); /* first tap: reveal only (page-transition handler skips defaultPrevented) */
        clearTaps(t); t.classList.add('is-tap');
      });
    });
    d.addEventListener('click', function (e) { if (!(e.target.closest && e.target.closest('a.gl'))) clearTaps(null); });
    addEventListener('pageshow', function (e) { if (e.persisted) clearTaps(null); });
  }

  /* page transition fallback (browsers without cross-document view transitions):
     fade the page content out on internal link clicks, fade it in on the next page */
  var root = d.documentElement;
  if (!window.CSSViewTransitionRule && !reduce) {
    if (root.classList.contains('pt-pre')) {
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        root.classList.add('pt-in'); root.classList.remove('pt-pre');
        setTimeout(function () { root.classList.remove('pt-in'); }, 450);
      }); });
    }
    d.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
      var u = new URL(a.href, location.href);
      if (u.origin !== location.origin || /\.(pdf|png|jpe?g|webp|mp4)$/i.test(u.pathname)) return;
      if (u.pathname === location.pathname && u.search === location.search) return; /* same page / hash link */
      e.preventDefault();
      try { sessionStorage.setItem('pt', String(Date.now())); } catch (err) {}
      root.classList.add('pt-out');
      setTimeout(function () { location.href = u.href; }, 350);
    });
  }
  /* back/forward cache: never come back to a faded-out page */
  addEventListener('pageshow', function (e) { if (e.persisted) root.classList.remove('pt-out', 'pt-pre', 'pt-in'); });

  /* respect reduced motion for the background video */
  if (reduce) d.querySelectorAll('video[autoplay]').forEach(function (v) { v.removeAttribute('autoplay'); v.pause(); });
})();
