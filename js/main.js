/* Shared behaviour: header, footer, cursor, reveal, timecode, marquee */
(function () {
  'use strict';

  var S = window.SITE || {};
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var current = document.body.getAttribute('data-page');

  var PAGES = [
    { k: 'home',       href: 'index.html',      label: 'Home' },
    { k: 'about',      href: 'about.html',      label: 'About' },
    { k: 'skills',     href: 'skills.html',     label: 'Skills' },
    { k: 'work',       href: 'work.html',       label: 'Editing Styles' },
    { k: 'references', href: 'references.html', label: 'References' },
    { k: 'contact',    href: 'contact.html',    label: 'Contact' }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }

  /* ---------- shared creative-interface backdrop ---------- */
  function buildAmbientInterface() {
    if (document.querySelector('.ambient-interface')) return;
    var layer = document.createElement('div');
    layer.className = 'ambient-interface';
    layer.setAttribute('data-page', current || 'home');
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML =
      '<div class="ambient-grid"></div>' +
      /* Full Viewport Motion & Speed Curves SVG */
      '<svg class="ambient-motion-svg" viewBox="0 0 1600 950" preserveAspectRatio="none">' +
        /* Motion Curves & Speed Graph */
        '<path class="ambient-path ambient-path-primary" d="M0 760 C320 760 360 210 680 210 S960 840 1260 460 S1460 120 1600 120" />' +
        '<path class="ambient-path ambient-path-secondary" d="M0 180 C260 180 340 680 720 680 S1080 240 1600 360" />' +
        '<path class="ambient-path ambient-path-tertiary" d="M0 480 C360 480 400 820 840 820 S1260 340 1600 580" />' +
        '<path class="ambient-speed-ramp" d="M0 880 L280 880 C440 880 500 340 700 340 L980 340 C1140 340 1220 720 1380 720 L1600 720" />' +
        /* Tangent Handles */
        '<line class="ambient-tangent" x1="610" y1="210" x2="750" y2="210" />' +
        '<line class="ambient-tangent" x1="1200" y1="460" x2="1320" y2="460" />' +
        /* Animation Keyframe Nodes */
        '<circle class="path-node" cx="680" cy="210" r="5" />' +
        '<circle class="path-node" cx="1260" cy="460" r="5" />' +
        '<circle class="path-node path-node-secondary" cx="720" cy="680" r="4.5" />' +
        '<circle class="path-node path-node-secondary" cx="1080" cy="240" r="4" />' +
        '<circle class="path-node" cx="700" cy="340" r="4" />' +
        '<circle class="path-node" cx="980" cy="340" r="4" />' +
      '</svg>' +
      /* Secondary Fine Graph */
      '<svg class="ambient-graph" viewBox="0 0 1200 700" preserveAspectRatio="none">' +
        '<path class="ambient-curve" d="M-20 510 C170 510 140 210 340 210 S520 500 720 405 S930 110 1220 160" />' +
        '<path class="ambient-curve ambient-curve-alt" d="M-20 180 C180 180 230 540 440 540 S700 250 900 315 S1080 570 1220 570" />' +
        '<circle cx="340" cy="210" r="4"/><circle cx="720" cy="405" r="4"/><circle cx="900" cy="315" r="3.5"/>' +
      '</svg>' +
      /* Tracking Crosshairs */
      '<i class="ambient-cross ambient-cross-a"></i><i class="ambient-cross ambient-cross-b"></i>' +
      '<i class="ambient-cross ambient-cross-c"></i><i class="ambient-cross ambient-cross-d"></i>' +
      '<i class="ambient-cross ambient-cross-e"></i>' +
      /* VFX Tracking Reticles */
      '<div class="ambient-tracker tracker-tl"><span class="track-box"></span><span class="track-coord">TRK 01 [TRACKING]</span></div>' +
      '<div class="ambient-tracker tracker-br"><span class="track-box"></span><span class="track-coord">TRK 02 [LOCKED 24FPS]</span></div>' +
      /* Floating Keyframe Diamonds */
      '<i class="ambient-key ambient-key-a"></i><i class="ambient-key ambient-key-b"></i>' +
      '<i class="ambient-key ambient-key-c"></i><i class="ambient-key ambient-key-d"></i>' +
      '<i class="ambient-key ambient-key-e"></i>' +
      /* Cut Markers & Sweeping Ticks */
      '<i class="interface-tick tick-a"></i><i class="interface-tick tick-b"></i><i class="interface-tick tick-c"></i>' +
      '<div class="cut-marker cut-marker-a"><span>IN [00:04:12]</span></div>' +
      '<div class="cut-marker cut-marker-b"><span>OUT [00:18:05]</span></div>' +
      /* Audio Frequency Spectrum Visualizer */
      '<div class="ambient-audio-strip" aria-hidden="true">' +
        '<span class="audio-bar" style="--h:40%;--d:0.1s"></span><span class="audio-bar" style="--h:78%;--d:0.35s"></span>' +
        '<span class="audio-bar" style="--h:55%;--d:0.2s"></span><span class="audio-bar" style="--h:92%;--d:0.5s"></span>' +
        '<span class="audio-bar" style="--h:34%;--d:0.15s"></span><span class="audio-bar" style="--h:70%;--d:0.42s"></span>' +
        '<span class="audio-bar" style="--h:85%;--d:0.28s"></span><span class="audio-bar" style="--h:48%;--d:0.38s"></span>' +
        '<span class="audio-bar" style="--h:96%;--d:0.6s"></span><span class="audio-bar" style="--h:62%;--d:0.18s"></span>' +
        '<span class="audio-bar" style="--h:76%;--d:0.45s"></span><span class="audio-bar" style="--h:38%;--d:0.22s"></span>' +
      '</div>' +
      '<span class="ambient-wave" aria-hidden="true"></span>' +
      /* Drifting Editing Terminology */
      '<span class="edit-term term-cut">CUT</span>' +
      '<span class="edit-term term-render">RENDER</span>' +
      '<span class="edit-term term-keyframes">KEYFRAMES</span>' +
      '<span class="edit-term term-timeline">TIMELINE</span>' +
      '<span class="edit-term term-transition">TRANSITION</span>' +
      '<span class="edit-term term-grade">COLOR GRADE</span>' +
      /* HUD Metadata & Software Badges */
      '<div class="ambient-tech-strip ambient-tech-top"><span>REC.709</span><i>/</i><span>24.00 FPS</span><i>/</i><span>SHUTTER 180&deg;</span></div>' +
      '<div class="ambient-apps"><span class="app-badge app-pr">Pr</span><span class="app-badge app-ae">Ae</span><span class="ambient-app-label">NLE &bull; VFX ENGINE</span></div>' +
      '<div class="ambient-coordinate">ISH EDITION&nbsp; / &nbsp;TIMECODE <span data-timecode>00:00:00:00</span></div>';
    document.body.insertBefore(layer, document.body.firstChild);
  }

  /* ---------- typewriter role animation (home page only) ---------- */
  function initTypewriter() {
    var el = document.getElementById('role-typewriter');
    if (!el || reduce) {
      // If reduced motion or element absent, just show first label statically
      if (el) el.textContent = 'VIDEO EDITOR / VFX ARTIST';
      return;
    }
    var roles = ['VIDEO EDITOR', 'VFX ARTIST', 'STORYTELLER', 'VISUAL EDITOR', 'FILMMAKER'];
    var idx = 0, charIdx = 0, erasing = false;
    var SPEED_TYPE   = 88;   // ms per character when typing
    var SPEED_ERASE  = 52;   // ms per character when erasing
    var PAUSE_AFTER  = 1600; // ms to hold full text
    var PAUSE_BEFORE = 400;  // ms between words

    function tick() {
      var word = roles[idx];
      if (!erasing) {
        // typing
        charIdx++;
        el.textContent = word.slice(0, charIdx);
        if (charIdx === word.length) {
          erasing = true;
          setTimeout(tick, PAUSE_AFTER);
          return;
        }
        setTimeout(tick, SPEED_TYPE);
      } else {
        // erasing
        charIdx--;
        el.textContent = word.slice(0, charIdx);
        if (charIdx === 0) {
          erasing = false;
          idx = (idx + 1) % roles.length;
          setTimeout(tick, PAUSE_BEFORE);
          return;
        }
        setTimeout(tick, SPEED_ERASE);
      }
    }
    setTimeout(tick, 600); // initial delay so page-load animations settle
  }

  /* ---------- tool palette ---------- */
  function initToolPalette() {
    var tools = document.querySelectorAll('.hero-toolbar .tool-button');
    if (!tools.length) return;
    tools.forEach(function (tool) {
      tool.addEventListener('click', function () {
        tools.forEach(function (candidate) {
          var selected = candidate === tool;
          candidate.classList.toggle('selected', selected);
          candidate.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
      });
    });
  }

  function initAmbientMotion() {
    // Keep ambient animations running continuously during scroll across all pages.
    // If the browser tab is hidden, pause animations to save system power.
    if (reduce) return;
    var layer = document.querySelector('.ambient-interface');
    if (!layer) return;
    document.addEventListener('visibilitychange', function () {
      layer.classList.toggle('is-idle', document.hidden);
    });
  }

  /* ---------- header ---------- */
  function buildHeader() {
    var host = document.getElementById('site-header');
    if (!host) return;
    var links = PAGES.map(function (p, i) {
      var active = p.k === current;
      return '<a href="' + p.href + '"' + (active ? ' class="active" aria-current="page"' : '') + '><span>0' + (i + 1) + '</span>' + p.label + '</a>';
    }).join('');
    host.innerHTML =
      '<div class="progress" aria-hidden="true"></div>' +
      '<header class="site-header">' +
        '<a class="brand" href="index.html" aria-label="' + esc(S.brand) + ' - home"><i class="rec-dot"></i><span>' + esc(S.brand) + '</span></a>' +
        '<button class="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav"><i></i><i></i><i></i></button>' +
        '<nav id="nav" class="nav" aria-label="Main">' + links + '</nav>' +
      '</header>';

    var burger = host.querySelector('.burger');
    var root = document.documentElement;
    function setOpen(open) {
      root.classList.toggle('nav-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    burger.addEventListener('click', function () { setOpen(!root.classList.contains('nav-open')); });
    host.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () { setOpen(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('nav-open')) setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860 && root.classList.contains('nav-open')) setOpen(false);
    });
  }

  /* ---------- footer ---------- */
  function buildFooter() {
    var host = document.getElementById('site-footer');
    if (!host) return;
    var nav = PAGES.map(function (p) { return '<a href="' + p.href + '">' + p.label + '</a>'; }).join('');
    var soc = S.socials || {};
    var socHtml = Object.keys(soc).map(function (k) {
      var u = safeUrl(soc[k]);
      return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(k) + '</a>' : '';
    }).join('');
    host.innerHTML =
      '<footer class="site-footer"><div class="wrap">' +
        '<div class="foot">' +
          '<a class="brand" href="index.html"><i class="rec-dot"></i><span>' + esc(S.brand) + '</span></a>' +
          '<nav aria-label="Footer">' + nav + socHtml + '</nav>' +
        '</div>' +
        '<p class="copyright">&copy; ' + new Date().getFullYear() + ' ' + esc(S.brand) + '. All rights reserved.</p>' +
      '</div></footer>';
  }

  /* ---------- scroll progress + header state ---------- */
  function initScroll() {
    var bar = document.querySelector('.progress');
    var hdr = document.querySelector('.site-header');
    var ticking = false;
    function update() {
      var y = window.pageYOffset || 0;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var prog = max > 0 ? Math.min(1, y / max) : 0;
      if (bar) {
        bar.style.transform = 'scaleX(' + prog + ')';
        bar.style.opacity = prog > 0 ? '1' : '0';
      }
      if (hdr) hdr.classList.toggle('scrolled', y > 24);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) return; // content stays visible
    document.documentElement.classList.add('js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------- running timecode (24 fps) ---------- */
  function initTimecode() {
    var nodes = document.querySelectorAll('[data-timecode]');
    if (!nodes.length || reduce) return;
    var start = performance.now(), last = '';
    (function loop() {
      var f = Math.floor((performance.now() - start) / 1000 * 24);
      var ff = f % 24, s = Math.floor(f / 24);
      var txt = pad2(Math.floor(s / 3600)) + ':' + pad2(Math.floor(s / 60) % 60) + ':' + pad2(s % 60) + ':' + pad2(ff);
      if (txt !== last) {
        last = txt;
        nodes.forEach(function (n) { n.textContent = txt; });
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- marquee: duplicate content for a seamless loop ---------- */
  function initMarquee() {
    document.querySelectorAll('.marquee-track').forEach(function (track) {
      Array.prototype.slice.call(track.children).forEach(function (k) {
        var c = k.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        track.appendChild(c);
      });
    });
  }

  /* ---------- custom cursor (mouse devices only) ---------- */
  function initCursor() {
    if (reduce || !window.matchMedia || !window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    var dot = document.createElement('div'); dot.className = 'cursor-dot';
    var ring = document.createElement('div'); ring.className = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true'); ring.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot); document.body.appendChild(ring);
    var tx = -100, ty = -100, rx = -100, ry = -100;

    function isRedColor(value) {
      var match = String(value || '').match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/i);
      if (!match || (match[4] != null && parseFloat(match[4]) < .12)) return false;
      var r = Number(match[1]), g = Number(match[2]), b = Number(match[3]);
      return r >= 110 && r > g * 1.55 && r > b * 1.45 && g < 150 && b < 150;
    }
    function elementUsesRed(el) {
      if (!el || el === document.documentElement) return false;
      var style = window.getComputedStyle(el);
      if (isRedColor(style.color) || isRedColor(style.backgroundColor) ||
          isRedColor(style.borderTopColor) || isRedColor(style.borderRightColor) ||
          isRedColor(style.borderBottomColor) || isRedColor(style.borderLeftColor) ||
          isRedColor(style.outlineColor) || isRedColor(style.boxShadow)) return true;
      var imageColors = String(style.backgroundImage || '').match(/rgba?\([^)]*\)/ig) || [];
      return imageColors.some(isRedColor);
    }
    function updateCursorColor(target) {
      var el = target && target.nodeType === 1 ? target : target && target.parentElement;
      var redSurface = false;
      while (el && el !== document.body) {
        if (elementUsesRed(el)) { redSurface = true; break; }
        el = el.parentElement;
      }
      document.documentElement.classList.toggle('cursor-on-red', redSurface);
    }

    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      dot.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0)';
      document.documentElement.classList.add('has-cursor');
      updateCursorColor(e.target);
    }, { passive: true });
    document.addEventListener('mouseleave', function () {
      document.documentElement.classList.remove('has-cursor', 'cursor-on-red');
    });
    document.addEventListener('mouseover', function (e) {
      updateCursorColor(e.target);
      var hit = e.target.closest && e.target.closest('a,button,.card,.panel,.tool');
      ring.classList.toggle('big', !!hit);
    });
    (function loop() {
      rx += (tx - rx) * 0.18; ry += (ty - ry) * 0.18;
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }

  function init() {
    buildAmbientInterface();
    buildHeader();
    buildFooter();
    initScroll();
    initMarquee();
    initReveal();
    initTypewriter();
    initToolPalette();
    initAmbientMotion();
    initTimecode();
    initCursor();
  }
  init();
})();
