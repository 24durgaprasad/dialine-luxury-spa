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

  // Reservation form -> opens WhatsApp with the request prefilled (no backend needed)
  const form = $('#bookForm'), note = $('#formNote');
  if (form && note) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const d = new FormData(form);
      const bad = ['name', 'email'].filter(k => {
        const el = form[k], ok = k === 'email' ? /^\S+@\S+\.\S+$/.test(d.get(k)) : d.get(k).trim();
        el.classList.toggle('is-invalid', !ok);
        return !ok;
      });
      if (bad.length) { note.textContent = 'Please share your name and a valid email.'; return; }
      const lines = [
        'Hello Dialine Luxury Spa, I would like to request a reservation.',
        `Name: ${d.get('name')}`, `Email: ${d.get('email')}`,
        `Treatment: ${d.get('treatment')}`, `Preferred date: ${d.get('date') || 'Flexible'}`
      ];
      if (d.get('notes').trim()) lines.push(`Notes: ${d.get('notes').trim()}`);
      window.open('https://wa.me/916303246142?text=' + encodeURIComponent(lines.join('\n')), '_blank', 'noopener');
      note.textContent = 'Opening WhatsApp with your request — just press send. We look forward to welcoming you.';
      form.reset();
    });
    $$('input', form).forEach(i => i.addEventListener('input', () => i.classList.remove('is-invalid')));
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
