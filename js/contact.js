/* Contact page: show email, copy button, and free form sending (FormSubmit.co) */
(function () {
  'use strict';

  var S = window.SITE || {};
  var email = String(S.contactEmail || '').trim();
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var configured = EMAIL_RE.test(email) && !/^YOUR_/i.test(email);

  /* show the email everywhere it is needed */
  document.querySelectorAll('[data-email]').forEach(function (n) {
    n.textContent = configured ? email : 'Email not configured yet';
    if (n.tagName === 'A' && configured) n.href = 'mailto:' + email;
    else if (n.tagName === 'A') n.removeAttribute('href');
  });

  /* copy button */
  var copyBtn = document.getElementById('copy-email');
  if (copyBtn) {
    copyBtn.hidden = !configured;
    copyBtn.addEventListener('click', function () {
      if (!configured) return;
      function done(ok) {
        var old = copyBtn.textContent;
        copyBtn.textContent = ok ? 'Copied!' : 'Press Ctrl+C';
        setTimeout(function () { copyBtn.textContent = old; }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(function () { done(true); }, function () { done(false); });
      } else {
        var ta = document.createElement('textarea');
        ta.value = email; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        done(ok);
      }
    });
  }

  /* form */
  var form = document.getElementById('contact-form');
  if (!form) return;
  var status = document.getElementById('form-status');
  var btn = form.querySelector('button[type="submit"]');
  var lastSent = 0;

  function setStatus(msg, type) {
    status.textContent = msg;
    status.className = 'status' + (type ? ' ' + type : '');
  }
  function val(name) {
    var el = form.elements.namedItem(name);
    return el ? String(el.value || '').trim() : '';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    if (val('website')) return;                       // honeypot: bots fill this, humans never see it

    var name = val('name'), from = val('email'), message = val('message');
    if (!name || !from || !message) { setStatus('Please fill in all three fields.', 'err'); return; }
    if (!EMAIL_RE.test(from)) { setStatus('That email address does not look right.', 'err'); return; }
    if (message.length > 5000) { setStatus('Message is too long (max 5000 characters).', 'err'); return; }
    if (!configured) { setStatus('Form is not set up yet: the site owner must add their email in js/config.js.', 'err'); return; }
    if (Date.now() - lastSent < 8000) { setStatus('Please wait a few seconds before sending again.', 'err'); return; }

    btn.disabled = true;
    setStatus('Sending...', '');

    var endpoint = 'https://formsubmit.co/ajax/' + encodeURIComponent(email).replace('%40', '@');
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        name: name,
        email: from,
        message: message,
        _subject: 'Video editing and VFX inquiry from ' + name,
        _template: 'table',
        _captcha: 'false'
      })
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
      })
      .then(function (res) {
        var ok = res.ok && (res.j.success === true || res.j.success === 'true');
        if (!ok) throw new Error('send failed');
        lastSent = Date.now();
        form.reset();
        setStatus('Message sent successfully.', 'ok');
      })
      .catch(function () {
        setStatus('Could not send right now. Please email me directly at ' + email + '.', 'err');
      })
      .then(function () { btn.disabled = false; });
  });
})();
