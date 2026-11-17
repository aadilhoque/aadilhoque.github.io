/* Site-wide behaviour: mobile menu, scroll animations, contact form. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- Mobile menu ---- */
  var nav = $('.nav');
  var toggle = $('.nav__toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    $$('.nav__links a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- Staggered delays for groups ---- */
  $$('[data-stagger]').forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      child.style.setProperty('--d', i * 90 + 'ms');
    });
  });

  /* ---- Reveal on scroll ---- */
  var items = $$('[data-reveal]');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---- Mark images that are missing from the assets folder ---- */
  /* Tool logos: your exported file replaces the drawn stand-in when it exists */
  $$('img.asset').forEach(function (img) {
    var ok = function () { img.parentNode.classList.add('has-img'); };
    if (img.complete) { if (img.naturalWidth) ok(); else img.remove(); }
    img.addEventListener('load', ok);
    img.addEventListener('error', function () { img.remove(); });
  });

  $$('img:not(.asset)').forEach(function (img) {
    var mark = function () { img.classList.add('img-missing'); };
    img.addEventListener('error', mark);
    if (img.complete && img.naturalWidth === 0 && !/\.svg(\?|$)/i.test(img.src)) mark();
  });

  /* ---- Contact form ---- */
  var form = $('#contactForm');
  if (form) {
    var status = $('#formStatus');
    var btn = $('.ct__submit', form);
    var TO = form.getAttribute('data-email') || '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.elements.email.value.trim();
      var message = form.elements.message.value.trim();
      if (!email || !message) {
        status.textContent = 'Please fill in both fields.';
        return;
      }
      var action = form.getAttribute('action') || '';

      // No form service connected yet: open the visitor's email app instead.
      if (!action || action.indexOf('YOUR_FORM_ID') !== -1) {
        var subject = encodeURIComponent('Message from your portfolio');
        var body = encodeURIComponent(message + '\n\nReply to: ' + email);
        window.location.href = 'mailto:' + TO + '?subject=' + subject + '&body=' + body;
        status.textContent = 'Opening your email app…';
        return;
      }

      btn.disabled = true;
      status.textContent = 'Sending…';
      fetch(action, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
        .then(function (res) {
          if (!res.ok) throw new Error('bad response');
          form.reset();
          status.textContent = 'Thanks! Your message has been sent.';
        })
        .catch(function () {
          status.textContent = 'Something went wrong. Please email me directly.';
        })
        .then(function () { btn.disabled = false; });
    });
  }
})();
