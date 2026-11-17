(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  // Preloader / entrance
  const ready = () => root.classList.add('is-loaded');
  window.addEventListener('load', () => setTimeout(ready, 500));
  setTimeout(ready, 3000); // safety net

  // Year
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Header state
  const header = $('#header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 40);
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
  }

  // Mobile menu
  const burger = $('#burger');
  const menu = $('#menu');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  if (burger && menu) {
    burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
    $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
    addEventListener('keydown', e => e.key === 'Escape' && setMenu(false));
  }

  // Scroll reveal
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  // Clipped images can't be observed directly (zero visible area), so watch their parent grid
  const groups = new Map();
  $$('.reveal-img').forEach(el => {
    const parent = el.parentElement;
    if (!groups.has(parent)) groups.set(parent, []);
    el.style.transitionDelay = (groups.get(parent).length * 0.12) + 's';
    groups.get(parent).push(el);
  });
  const imgIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      groups.get(en.target).forEach(el => el.classList.add('is-in'));
      imgIO.unobserve(en.target);
    });
  }, { threshold: 0.18 });
  groups.forEach((_, parent) => imgIO.observe(parent));

  // Count-up stats
  const fmt = n => n.toLocaleString('en-US');
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, end = +el.dataset.count, suf = el.dataset.suffix || '';
      countIO.unobserve(el);
      if (reduce) { el.textContent = fmt(end) + suf; return; }
      const dur = 1800, t0 = performance.now();
      const tick = t => {
        const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
        el.textContent = fmt(Math.round(end * e)) + suf;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  // Parallax (hero + band)
  if (!reduce) {
    const layers = [['#heroMedia', 0.18], ['#bandMedia', 0.12]]
      .map(([s, f]) => ({ el: $(s), f })).filter(l => l.el);
    let ticking = false;
    const update = () => {
      layers.forEach(({ el, f }) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        el.style.transform = `translate3d(0, ${(-r.top * f).toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  // Testimonial slider
  const slides = $$('.slide'), dots = $$('.slider__dots button');
  let idx = 0, timer;
  const show = i => {
    idx = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('is-active', n === idx));
    dots.forEach((d, n) => d.classList.toggle('is-active', n === idx));
  };
  const auto = () => { clearInterval(timer); if (!reduce) timer = setInterval(() => show(idx + 1), 6500); };
  if (slides.length && dots.length) {
    dots.forEach((d, n) => d.addEventListener('click', () => { show(n); auto(); }));
    auto();
  }

  // Date inputs: default to today minimum
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  ['#quickDate', '#bookDate'].forEach(s => { const el = $(s); if (el) el.min = today; });

  // Quick bar -> prefill booking form and scroll
  const quickForm = $('#quickForm');
  if (quickForm) quickForm.addEventListener('submit', e => {
    e.preventDefault();
    const q = new FormData(e.target), f = $('#bookForm');
    if (!f) return;
    const opt = [...f.treatment.options].find(o => o.text.toLowerCase().includes(q.get('treatment').split(' ')[0].toLowerCase()));
    if (opt) f.treatment.value = opt.value;
    if (q.get('date')) f.date.value = q.get('date');
    $('#book').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(() => f.name.focus({ preventScroll: true }), 700);
  });

  // CRM Configuration for Dialine Spa
  const CRM_CONFIG = {
    tenantId: 'dialine_spa',
    tenantName: 'Dialine Spa',
    email: 'dialinespa@vivtej.com',
    endpoint: 'https://api.crm.vivtejsoftwaresolutions.com/api/internal-leads',
    leadsEndpoint: 'https://api.crm.vivtejsoftwaresolutions.com/api/leads',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhZmMwOTY2ODBjMmQyN2EwYjYzZmJjYSIsInNpZCI6ImJlN2QyZmRmNzU1NmU3ZGVhZWU2MGJkZTEzMzEzNWE4ZjlkODJmYzNkZGIzNTdiYzI2MzQwZWQxZjJlMDJlMGYiLCJ0ZW5hbnRJZCI6ImRpYWxpbmVfc3BhIiwiaWF0IjoxNzk0OTA3MjcwLCJleHAiOjQ5NTA2NjcyNzB9.SYclJvd6MRVGNez9wFmb8ltiWVcMnYYk_M0nS6CoV0I'
  };

  // Reservation form -> posts lead and booking data to Vivtej CRM API
  const form = $('#bookForm'), note = $('#formNote');
  if (form && note) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const submitBtn = $('#bookSubmitBtn', form) || $('button[type="submit"]', form);
      const d = new FormData(form);

      const name = (d.get('name') || '').trim();
      const phone = (d.get('phone') || '').trim();
      const email = (d.get('email') || '').trim();
      const treatmentRaw = (d.get('treatment') || '').trim();
      const ritual = treatmentRaw ? treatmentRaw.split('·')[0].split('&middot;')[0].trim() : 'General Inquiry';
      const date = d.get('date') || new Date().toISOString().slice(0, 10);
      const time = d.get('time') || '14:00';
      const message = (d.get('notes') || d.get('message') || '').trim();

      const nameEl = form['name'];
      const phoneEl = form['phone'];
      const emailEl = form['email'];

      let hasError = false;
      if (!name) {
        if (nameEl) nameEl.classList.add('is-invalid');
        hasError = true;
      }
      if (!phone || phone.replace(/\D/g, '').length < 7) {
        if (phoneEl) phoneEl.classList.add('is-invalid');
        hasError = true;
      }
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        if (emailEl) emailEl.classList.add('is-invalid');
        hasError = true;
      }

      if (hasError) {
        note.textContent = 'Please provide your full name and a valid phone number.';
        note.style.color = '#e07a68';
        return;
      }

      // Payload for Vivtej CRM
      const payload = {
        name,
        phone,
        email: email || '',
        ritual,
        therapy: ritual,
        date,
        time,
        message,
        tenant_id: CRM_CONFIG.tenantId,
        tenant: CRM_CONFIG.tenantId,
        tenantId: CRM_CONFIG.tenantId,
        attributes: {
          therapy: ritual,
          date,
          time,
          message,
          tenant_id: CRM_CONFIG.tenantId,
          tenant: CRM_CONFIG.tenantId
        },
        source: 'Dialine Luxury Spa Website - Booking Form',
        source_url: window.location.href,
        timestamp: new Date().toISOString()
      };

      const directLeadPayload = {
        name,
        phone,
        email: email || '',
        service: ritual,
        lead_source: 'Website Booking Form',
        status: 'New',
        attributes: {
          therapy: ritual,
          date,
          time,
          message,
          tenant_id: CRM_CONFIG.tenantId
        }
      };

      const originalBtnText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting reservation...';
      }
      note.textContent = 'Sending your reservation to concierge...';
      note.style.color = 'var(--gold-2)';

      try {
        // Send to internal-leads endpoint
        const internalPromise = fetch(CRM_CONFIG.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-Id': CRM_CONFIG.tenantId
          },
          body: JSON.stringify(payload)
        }).catch(err => console.warn('internal-leads warning:', err));

        // Send to tenant leads endpoint with dialine_spa authorization
        const directPromise = fetch(CRM_CONFIG.leadsEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CRM_CONFIG.token}`
          },
          body: JSON.stringify(directLeadPayload)
        }).catch(err => console.warn('direct lead warning:', err));

        await Promise.all([internalPromise, directPromise]);

        const safeName = name.replace(/[&<>'"]/g, t => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t]||t));
        note.style.color = 'var(--gold-2)';
        note.innerHTML = `Thank you, <strong>${safeName}</strong>! Your reservation request has been received. Our concierge will contact you shortly.`;
        form.reset();

        const waText = encodeURIComponent(`Hello Dialine Luxury Spa, I just submitted a booking request for ${ritual} on ${date} at ${time}.\nName: ${name}\nPhone: ${phone}`);
        const waWrap = document.createElement('div');
        waWrap.style.marginTop = '0.9rem';
        waWrap.innerHTML = `<a href="https://wa.me/916303246142?text=${waText}" target="_blank" rel="noopener" class="btn btn--wa btn--sm" style="margin-inline:auto;">Chat on WhatsApp &rarr;</a>`;
        note.appendChild(waWrap);

      } catch (err) {
        console.error('Lead submission failed:', err);
        note.style.color = 'var(--gold-2)';
        const waText = encodeURIComponent(`Hello Dialine Luxury Spa, I would like to book ${ritual} on ${date}.\nName: ${name}\nPhone: ${phone}`);
        note.innerHTML = `Your reservation details are ready. <a href="https://wa.me/916303246142?text=${waText}" target="_blank" rel="noopener" style="color:var(--gold);text-decoration:underline;">Click here to confirm directly on WhatsApp &rarr;</a>`;
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      }
    });

    $$('input, select, textarea', form).forEach(i => i.addEventListener('input', () => i.classList.remove('is-invalid')));
  }

  // Deep link from a service page: index.html?ritual=Thai%20Yoga%20Massage#book
  const ritual = new URLSearchParams(location.search).get('ritual');
  const bookingForm = form;
  if (ritual && bookingForm) {
    const wanted = ritual.trim().toLowerCase();
    const match = [...bookingForm.treatment.options].find(o => o.text.toLowerCase().startsWith(wanted));
    if (match) bookingForm.treatment.value = match.value;
    const target = $('#book');
    if (target) target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
})();
