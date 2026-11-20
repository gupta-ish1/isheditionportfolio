/* =========================================================
   ISH EDITION — Video Grid & Modal Controller
   Dynamic rendering, hover/tap preview loops, single-playback management,
   lazy loading, 32-video balanced "All" selection, category filtering,
   complete title removal, native cursor enforcement, and modal player.
   ========================================================= */
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

  var RATIO = /^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/;

  var cards = [];
  var modal = null, stage = null, info = null, lastFocus = null;
  var modalOpen = false;
  var io = null;

  var activeCard = null;
  var activeVideo = null;

  /* ---------- helpers ---------- */
  function ratioStr(r) {
    return RATIO.test(String(r || '')) ? String(r).replace(/\s+/g, '') : '16/9';
  }

  function ratioNum(r) {
    var p = ratioStr(r).split('/');
    var n = parseFloat(p[0]) / parseFloat(p[1]);
    return n > 0 ? n : 16 / 9;
  }

  function span(cls, text) {
    var s = document.createElement('span');
    s.className = cls;
    if (text != null) s.textContent = text;
    return s;
  }

  /* Fisher-Yates array shuffle */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  /* ---------- category grouping & stable 32-video "All" selection ---------- */
  var byCategory = {};
  items.forEach(function (it) {
    var cat = it.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(it);
  });

  /*
    Stable "All" selection:
    Pick exactly 4 videos per category (32 videos across 8 categories).
    Interleave them non-consecutively across 4 rounds so categories are never grouped together.
    This selection stays stable while the user browses and toggles filters.
  */
  var allMixedItems = [];
  (function buildAllSelection() {
    var cats = (DATA.categories || Object.keys(byCategory)).filter(function (c) {
      return byCategory[c] && byCategory[c].length > 0;
    });

    var selectedByCat = {};
    cats.forEach(function (cat) {
      selectedByCat[cat] = shuffle(byCategory[cat]).slice(0, 4);
    });

    var lastCat = null;
    for (var round = 0; round < 4; round++) {
      var roundCats = shuffle(cats);
      // Ensure the first category of this round doesn't match the last category of the previous round
      if (lastCat && roundCats.length > 1 && roundCats[0] === lastCat) {
        var swapIdx = Math.floor(Math.random() * (roundCats.length - 1)) + 1;
        var t = roundCats[0];
        roundCats[0] = roundCats[swapIdx];
        roundCats[swapIdx] = t;
      }
      roundCats.forEach(function (cat) {
        if (selectedByCat[cat] && selectedByCat[cat][round]) {
          allMixedItems.push(selectedByCat[cat][round]);
          lastCat = cat;
        }
      });
    }
  })();

  /* ---------- preview playback control (strictly one at a time) ---------- */
  function playCardPreview(card) {
    if (!card || modalOpen) return;
    var v = card.querySelector('video');
    if (!v) return;

    if (activeCard && activeCard !== card) {
      stopCardPreview(activeCard);
    }

    if (!v.getAttribute('src') && v.getAttribute('data-src')) {
      v.src = v.getAttribute('data-src');
    }
    v.muted = true;
    card.classList.add('is-playing');
    activeCard = card;
    activeVideo = v;

    var p = v.play();
    if (p && p.catch) {
      p.catch(function () {});
    }
  }

  function stopCardPreview(card) {
    if (!card) return;
    var v = card.querySelector('video');
    if (v) {
      v.pause();
    }
    card.classList.remove('is-playing');
    if (activeCard === card) {
      activeCard = null;
      activeVideo = null;
    }
  }

  function stopAllPreviews() {
    if (activeCard) {
      stopCardPreview(activeCard);
    }
  }

  /* ---------- build card (clean edge-to-edge, NO titles or text) ---------- */
  function makeCard(item) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'card';
    btn.setAttribute('data-cat', item.category || '');
    btn.setAttribute('data-ratio', ratioStr(item.ratio));
    btn.setAttribute('aria-label', 'Play video');

    var media = span('media');
    media.style.setProperty('--ratio', ratioStr(item.ratio));

    if (item.preview) {
      var v = document.createElement('video');
      v.muted = true;
      v.loop = true;
      v.playsInline = true;
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
      v.setAttribute('disablepictureinpicture', '');
      v.preload = 'none';
      v.setAttribute('data-src', item.preview);
      v.addEventListener('error', function () {
        media.classList.add('empty');
        v.style.display = 'none';
      });
      media.appendChild(v);
    } else {
      media.classList.add('empty');
    }

    var playBtn = span('play');
    playBtn.setAttribute('title', 'Play full video');
    playBtn.setAttribute('aria-label', 'Play full video');

    btn.appendChild(media);
    btn.appendChild(playBtn);

    // Track touch interactions vs mouse
    var lastTapTime = 0;
    var touchedThisCard = false;

    btn.addEventListener('touchstart', function () {
      touchedThisCard = true;
    }, { passive: true });

    // Desktop hover behavior: play on enter, pause on leave
    btn.addEventListener('mouseenter', function () {
      if (modalOpen) return;
      playCardPreview(btn);
    });

    btn.addEventListener('mouseleave', function () {
      stopCardPreview(btn);
    });

    // Click & Touch tap interaction
    btn.addEventListener('click', function (e) {
      // Keyboard enter/space triggers click with detail 0 -> open modal
      if (e.detail === 0) {
        stopCardPreview(btn);
        openModal(item, btn);
        return;
      }

      // If user clicked the play icon: open modal
      if (e.target.closest && e.target.closest('.play')) {
        stopCardPreview(btn);
        openModal(item, btn);
        return;
      }

      // Quick double-tap anywhere on card: open modal
      var now = Date.now();
      if (now - lastTapTime < 350) {
        lastTapTime = 0;
        stopCardPreview(btn);
        openModal(item, btn);
        return;
      }
      lastTapTime = now;

      // Desktop mouse click: open modal immediately
      var hasHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
      if (hasHover && !touchedThisCard) {
        stopCardPreview(btn);
        openModal(item, btn);
        return;
      }

      // Mobile touch on video area: toggle play/pause preview
      if (activeCard === btn) {
        stopCardPreview(btn);
      } else {
        playCardPreview(btn);
      }
    });

    item._card = btn;
    return btn;
  }

  /* ---------- lazy loader via IntersectionObserver ---------- */
  function setupObserver() {
    if (!('IntersectionObserver' in window)) {
      cards.forEach(function (c) {
        var v = c.querySelector('video');
        if (v && !v.getAttribute('src') && v.getAttribute('data-src')) {
          v.src = v.getAttribute('data-src');
          v.preload = 'metadata';
        }
      });
      return;
    }

    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var card = en.target;
        var v = card.querySelector('video');
        if (!v) return;

        if (en.isIntersecting) {
          if (!v.getAttribute('src') && v.getAttribute('data-src')) {
            v.src = v.getAttribute('data-src');
            v.preload = 'metadata';
          }
        } else {
          if (activeCard === card) {
            stopCardPreview(card);
          }
        }
      });
    }, { rootMargin: '250px 0px', threshold: 0.01 });

    cards.forEach(function (c) { io.observe(c); });
  }

  /* ---------- display list in grid ---------- */
  function displayItems(itemList) {
    grid.innerHTML = '';
    var frag = document.createDocumentFragment();
    itemList.forEach(function (it) {
      if (it._card) {
        it._card.hidden = false;
        frag.appendChild(it._card);
        if (io) io.observe(it._card);
      }
    });
    grid.appendChild(frag);

    var empty = document.getElementById('empty');
    if (empty) empty.hidden = itemList.length > 0;
  }

  /* ---------- category filters ---------- */
  function setupFilters() {
    var host = document.getElementById('filters');
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
        stopAllPreviews();
        host.querySelectorAll('.chip').forEach(function (c) {
          var on = c === b;
          c.classList.toggle('active', on);
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        if (name === 'All') {
          // Show stable 32-video balanced mixed selection
          displayItems(allMixedItems);
        } else {
          // Show all videos belonging to the selected category
          displayItems(byCategory[name] || []);
        }
      });
      host.appendChild(b);
    });
  }

  /* ---------- modal player (NO title, category only) ---------- */
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
      if (e.key === 'Tab') {
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
    stopAllPreviews();

    stage.innerHTML = '';
    var num = ratioNum(item.ratio);
    stage.style.setProperty('--r', num);
    info.style.setProperty('--r', num);

    var videoSrc = item.full || item.preview || '';
    var node = document.createElement('video');
    node.controls = true;
    node.playsInline = true;
    node.setAttribute('playsinline', '');
    node.preload = 'auto';
    node.src = videoSrc;

    node.addEventListener('error', function () {
      var err = document.createElement('div');
      err.style.cssText = 'padding:40px;color:var(--muted);text-align:center;font-family:var(--mono);font-size:.85rem;';
      err.textContent = 'Unable to play video';
      stage.appendChild(err);
    });

    var p = node.play();
    if (p && p.catch) p.catch(function () {});
    stage.appendChild(node);

    // Strictly NO video titles or descriptions in the modal
    info.innerHTML = '';
    if (item.category) {
      var t = document.createElement('span');
      t.className = 'tag';
      t.textContent = item.category;
      info.appendChild(t);
    }

    modal.hidden = false;
    document.documentElement.classList.add('modal-open');
    modal.querySelector('.modal-close').focus();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    stage.innerHTML = '';
    modal.hidden = true;
    modalOpen = false;
    document.documentElement.classList.remove('modal-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- initialize ---------- */
  items.forEach(function (it) {
    var c = makeCard(it);
    cards.push(c);
  });

  // Render stable 32-video balanced mixed selection in "All"
  displayItems(allMixedItems.length > 0 ? allMixedItems : items);

  if (!items.length) {
    var msg = document.createElement('p');
    msg.className = 'empty-msg';
    msg.textContent = isRef ? 'No verified references added yet.' : 'No videos are currently listed.';
    grid.parentNode.insertBefore(msg, grid.nextSibling);
  }

  setupFilters();
  setupObserver();
})();
