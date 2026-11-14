/* Video grid: all visible videos play at once (muted loops), click = full player */
(function () {
  'use strict';

  var grid = document.getElementById('grid');
  if (!grid) return;

  var DATA = window.DATA || {};
  var source = grid.getAttribute('data-source') || 'works';
  var all = (DATA[source] || []).slice();
  var limit = parseInt(grid.getAttribute('data-limit'), 10);
  var items = limit > 0 ? all.slice(0, limit) : all;
  var isRef = source === 'references';

  var YT = /^[\w-]{6,15}$/;
  var RATIO = /^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/;

  var cards = [];
  var visible = [];          // videos currently near the viewport
  var modal = null, stage = null, info = null, lastFocus = null;
  var modalOpen = false;
  var io = null;

  function ratioStr(r) { return RATIO.test(String(r || '')) ? String(r).replace(/\s+/g, '') : '16/9'; }
  function ratioNum(r) {
    var p = ratioStr(r).split('/');
    var n = parseFloat(p[0]) / parseFloat(p[1]);
    return n > 0 ? n : 16 / 9;
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  function span(cls, text) {
    var s = document.createElement('span');
    s.className = cls;
    if (text != null) s.textContent = text;
    return s;
  }

  /* ---------- play / pause helpers ---------- */
  function startVideo(v) {
    if (!v.getAttribute('src') && v.getAttribute('data-src')) {
      v.src = v.getAttribute('data-src');
    }
    v.muted = true;
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* autoplay blocked: poster/first frame stays, tap opens player */ });
  }
  function indexOfVideo(v) { return visible.indexOf(v); }

  /* ---------- build one card ---------- */
  function makeCard(item) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card';
    btn.setAttribute('data-cat', item.category || '');
    btn.setAttribute('aria-label', 'Play video: ' + (item.title || 'untitled'));

    var media = span('media');
    media.style.setProperty('--ratio', ratioStr(item.ratio));

    if (item.preview) {
      var v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
      v.setAttribute('disablepictureinpicture', '');
      v.preload = 'none';
      v.setAttribute('data-src', item.preview);
      if (item.poster) v.poster = item.poster;
      v.addEventListener('error', function () { media.classList.add('empty'); v.style.display = 'none'; });
      media.appendChild(v);
    } else if (item.youtube && YT.test(item.youtube)) {
      var img = document.createElement('img');
      img.src = 'https://i.ytimg.com/vi/' + item.youtube + '/hqdefault.jpg';
      img.alt = '';
      img.loading = 'lazy';
      media.appendChild(img);
    } else {
      media.classList.add('empty');
    }

    btn.appendChild(media);
    btn.appendChild(span('shade'));
    btn.appendChild(span('play'));
    var meta = span('meta');
    meta.appendChild(span('tag', item.category || ''));
    meta.appendChild(span('title', item.title || ''));
    btn.appendChild(meta);

    btn.addEventListener('click', function () { openModal(item, btn); });
    return btn;
  }

  /* ---------- observer: play what you can see, pause the rest ---------- */
  function setupObserver() {
    if (!('IntersectionObserver' in window)) {
      cards.forEach(function (c) {
        var v = c.querySelector('video');
        if (v) { visible.push(v); startVideo(v); }
      });
      return;
    }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target.querySelector('video');
        if (!v) return;
        if (en.isIntersecting) {
          if (indexOfVideo(v) < 0) visible.push(v);
          if (!modalOpen) startVideo(v);
        } else {
          var i = indexOfVideo(v);
          if (i >= 0) visible.splice(i, 1);
          v.pause();
        }
      });
    }, { rootMargin: '150px 0px', threshold: 0.01 });
    cards.forEach(function (c) { io.observe(c); });
  }

  /* ---------- filters ---------- */
  function setupFilters() {
    var host = document.getElementById('filters');
    var empty = document.getElementById('empty');
    if (!host) return;
    var present = {};
    items.forEach(function (it) { if (it.category) present[it.category] = true; });
    var order = (DATA.categories || []).filter(function (c) { return present[c]; });
    Object.keys(present).forEach(function (c) { if (order.indexOf(c) < 0) order.push(c); });
    if (order.length < 2) { host.hidden = true; return; }

    var names = ['All'].concat(order);
    names.forEach(function (name, idx) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (idx === 0 ? ' active' : '');
      b.textContent = name;
      b.setAttribute('aria-pressed', idx === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        host.querySelectorAll('.chip').forEach(function (c) {
          var on = c === b;
          c.classList.toggle('active', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        var shown = 0;
        cards.forEach(function (card) {
          var show = name === 'All' || card.getAttribute('data-cat') === name;
          card.hidden = !show;
          if (show) shown++;
        });
        if (empty) empty.hidden = shown > 0;
      });
      host.appendChild(b);
    });
  }

  /* ---------- modal player ---------- */
  function buildModal() {
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Video player');
    modal.innerHTML =
      '<button type="button" class="modal-close" aria-label="Close video">&times;</button>' +
      '<div class="modal-box"><div class="modal-stage"></div><div class="modal-info"></div></div>';
    document.body.appendChild(modal);
    stage = modal.querySelector('.modal-stage');
    info = modal.querySelector('.modal-info');

    modal.addEventListener('click', function (e) {
      if (e.target === modal || (e.target.closest && e.target.closest('.modal-close'))) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key === 'Tab') {   // keep keyboard focus inside the popup
        var f = modal.querySelectorAll('button,a[href],video[controls]');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  function openModal(item, opener) {
    if (!modal) buildModal();
    lastFocus = opener;
    modalOpen = true;
    visible.forEach(function (v) { v.pause(); });

    stage.innerHTML = '';
    var num = ratioNum(item.ratio);
    stage.style.setProperty('--r', num);
    info.style.setProperty('--r', num);

    var node;
    if (item.youtube && YT.test(item.youtube)) {
      node = document.createElement('iframe');
      node.src = 'https://www.youtube-nocookie.com/embed/' + item.youtube + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
      node.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      node.setAttribute('allowfullscreen', '');
      node.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      node.title = item.title || 'Video';
    } else {
      node = document.createElement('video');
      node.controls = true;
      node.playsInline = true;
      node.setAttribute('playsinline', '');
      node.preload = 'auto';
      node.src = item.full || item.preview || '';
      var p = node.play();
      if (p && p.catch) p.catch(function () { /* user can press play */ });
    }
    stage.appendChild(node);

    info.innerHTML = '';
    var h = document.createElement('h3'); h.textContent = item.title || '';
    var t = document.createElement('span'); t.className = 'tag'; t.textContent = item.category || '';
    info.appendChild(h); info.appendChild(t);
    if (item.desc) { var d = document.createElement('p'); d.textContent = item.desc; info.appendChild(d); }
    if (isRef && item.credit) {
      var c = document.createElement('p');
      c.appendChild(document.createTextNode('Credit: '));
      var url = safeUrl(item.link);
      if (url) {
        var a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = item.credit;
        c.appendChild(a);
      } else {
        c.appendChild(document.createTextNode(item.credit));
      }
      info.appendChild(c);
    }

    modal.hidden = false;
    document.documentElement.classList.add('modal-open');
    modal.querySelector('.modal-close').focus();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    stage.innerHTML = '';          // removing the player stops video/audio
    modal.hidden = true;
    modalOpen = false;
    document.documentElement.classList.remove('modal-open');
    visible.forEach(function (v) { startVideo(v); });
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- go ---------- */
  var frag = document.createDocumentFragment();
  items.forEach(function (it) {
    var c = makeCard(it);
    cards.push(c);
    frag.appendChild(c);
  });
  grid.appendChild(frag);

  if (!items.length) {
    var msg = document.createElement('p');
    msg.className = 'empty-msg';
    msg.textContent = isRef ? 'No verified references added yet. Add creator credit and the original source in js/data.js.' : 'No videos are currently listed.';
    grid.parentNode.insertBefore(msg, grid.nextSibling);
  }

  setupFilters();
  setupObserver();
})();
