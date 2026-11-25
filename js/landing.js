/* Dialine Luxury Spa — /spa-in-vizag behaviour: FAQ accordion + mobile therapy carousel */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* FAQ accordion */
  $$('.faq__item').forEach((item) => {
    const btn = $('button', item);
    const answer = $('.faq__answer', item);
    btn.addEventListener('click', () => {
      const open = item.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
      answer.style.maxHeight = open ? answer.scrollHeight + 'px' : '0px';
    });
  });

  /* Carousel: slider below 768px, plain grid above (CSS hides the controls) */
  const track = $('#carouselTrack');
  if (!track) return;
  const slides = $$('.carousel__slide', track);
  const dotsWrap = $('#carouselDots');
  let idx = 0;

  const dots = slides.map((_, n) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'carousel__dot';
    d.setAttribute('aria-label', `Show spa therapy ${n + 1}`);
    d.addEventListener('click', () => show(n));
    dotsWrap.appendChild(d);
    return d;
  });

  function show(i) {
    idx = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${idx * 100}%)`;
    dots.forEach((d, n) => d.classList.toggle('is-active', n === idx));
  }

  $('#prevBtn').addEventListener('click', () => show(idx - 1));
  $('#nextBtn').addEventListener('click', () => show(idx + 1));

  let startX = null;
  track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
    startX = null;
  });

  show(0);
})();
