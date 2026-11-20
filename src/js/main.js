// Can Tintorer · millores progressives. El contingut funciona sense JS.
// Sense handlers inline ni eval: compatible amb una CSP sense 'unsafe-inline'.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const pageData = (() => {
  const el = document.getElementById('page-data');
  try { return el ? JSON.parse(el.textContent) : null; } catch { return null; }
})();

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Alçada real de la capçalera (per a scroll-padding i el hero) ---------- */
function trackHeaderHeight() {
  const header = $('[data-header]');
  if (!header || !('ResizeObserver' in window)) return;
  const set = () => document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
  new ResizeObserver(set).observe(header);
  set();
}

/* ---------- Menú mòbil ---------- */
function initNav() {
  const toggle = $('[data-nav-toggle]');
  const nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;
  const label = $('[data-nav-label]', toggle);
  nav.setAttribute('data-collapsible', '');
  toggle.hidden = false;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.toggleAttribute('data-open', open);
    if (label) label.textContent = open ? label.dataset.close : label.dataset.open;
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setOpen(false); toggle.focus(); }
  });
}

/* ---------- Pestanyes accessibles (patró WAI-ARIA Tabs, activació automàtica) ---------- */
function initTabs() {
  $$('[data-tabs]').forEach((root) => {
    const list = $('[data-tabs-list]', root);
    const tabs = $$('[data-tab]', list);
    const panels = tabs.map((t) => document.getElementById(t.dataset.tab));
    if (!tabs.length || panels.some((p) => !p)) return;

    list.setAttribute('role', 'tablist');
    tabs.forEach((tab, i) => {
      const panel = panels[i];
      tab.id = `${panel.id}-tab`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
    });

    const select = (index, focus = false) => {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
      });
      if (focus) tabs[index].focus();
    };

    list.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (tab) select(tabs.indexOf(tab));
    });
    list.addEventListener('keydown', (e) => {
      const current = tabs.indexOf(document.activeElement);
      if (current < 0) return;
      const keys = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      select((keys[e.key] + tabs.length) % tabs.length, true);
    });

    list.hidden = false;
    root.setAttribute('data-tabs-ready', '');
    select(0);
  });
}

/* ---------- Aparició en fer scroll (només elements fora de la pantalla inicial) ---------- */
function initReveal() {
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.replace('reveal--pending', 'reveal--in');
      io.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px' });
  $$('.reveal').forEach((el) => {
    if (el.getBoundingClientRect().top < window.innerHeight) return; // ja visible: no l'amaguem
    el.classList.add('reveal--pending');
    io.observe(el);
  });
}

/* ---------- Data i hora a Europe/Madrid ---------- */
function madridNow() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: pageData?.timezone || 'Europe/Madrid',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23',
    }).formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}
const toMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const dayKey = (isoDate) => DAY_KEYS[new Date(`${isoDate}T12:00:00Z`).getUTCDay()];
const fmt = (hhmm) => (hhmm === '24:00' ? '00:00' : hhmm);

/* ---------- Horari d'avui (generat a partir de les mateixes dades que la taula) ---------- */
function initToday() {
  const el = $('[data-today]');
  if (!el || !pageData) return;
  const { date } = madridNow();
  const key = dayKey(date);
  const ranges = pageData.week[key] || [];
  const t = pageData.i18n;
  el.textContent = ranges.length
    ? `${t.todayOpen}: ${ranges.map(([a, b]) => `${a}–${fmt(b)}`).join(` ${t.and} `)}`
    : t.todayClosed;
  el.hidden = false;
  const row = $(`.hours__row[data-day="${key}"]`);
  if (row) row.setAttribute('aria-current', 'date');
}

/* ---------- Formulari de reserva ---------- */
function initBooking() {
  const form = $('[data-booking]');
  if (!form || !pageData) return;
  const t = pageData.i18n;
  const date = form.elements.date;
  const time = form.elements.time;
  const status = $('[data-status]', form);
  const hint = $('[data-date-hint]', form);

  const { date: today } = madridNow();
  const max = new Date(`${today}T12:00:00Z`);
  max.setUTCDate(max.getUTCDate() + (pageData.booking.maxDaysAhead || 120));
  date.min = today;
  date.max = max.toISOString().slice(0, 10);

  const setStatus = (msg, tone = 'info') => { status.textContent = msg; status.dataset.tone = tone; };

  // Mostra només les hores dins de l'horari d'obertura del dia triat
  const updateSlots = () => {
    const value = date.value;
    date.setCustomValidity('');
    hint.textContent = t.hoursHint;
    let available = 0;
    const ranges = value ? pageData.week[dayKey(value)] || [] : [];
    const now = madridNow();
    $$('option', time).forEach((opt) => {
      if (!opt.value) return; // opció «tria primer la data»
      const m = toMinutes(opt.value);
      const open = ranges.some(([a, b]) => m >= toMinutes(a) && m + 90 <= toMinutes(b));
      const past = value === now.date && m <= now.minutes + 60;
      const ok = open && !past;
      opt.disabled = !ok;
      opt.hidden = !ok;
      if (ok) available += 1;
    });
    $$('optgroup', time).forEach((g) => { g.hidden = !$$('option', g).some((o) => !o.disabled); });
    if (time.selectedOptions[0]?.disabled) time.value = '';

    if (value && value < today) {
      date.setCustomValidity(t.pastDate);
      hint.textContent = t.pastDate;
    } else if (value && !available) {
      date.setCustomValidity(t.closedDay);
      hint.textContent = t.closedDay;
    }
  };
  date.addEventListener('change', updateSlots);
  updateSlots();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    updateSlots();
    let firstInvalid = null;
    $$('.field__input, .field__check', form).forEach((input) => {
      const valid = input.checkValidity();
      input.setAttribute('aria-invalid', String(!valid));
      if (!valid && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      setStatus(firstInvalid === date && date.validationMessage ? date.validationMessage : t.required, 'error');
      firstInvalid.focus();
      return;
    }
    if (form.elements._gotcha?.value) return; // bot

    if (pageData.booking.demo || !pageData.booking.endpoint) {
      setStatus(t.demo);
      return;
    }
    try {
      const res = await fetch(pageData.booking.endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      updateSlots();
      setStatus(t.sent);
    } catch {
      setStatus(t.error, 'error');
    }
  });

  form.addEventListener('input', (e) => {
    if (e.target.getAttribute('aria-invalid') === 'true' && e.target.checkValidity()) e.target.setAttribute('aria-invalid', 'false');
  });
}

/* ---------- Mapa: només es carrega amb consentiment explícit ---------- */
function initMap() {
  const map = $('[data-map]');
  const button = map && $('[data-map-load]', map);
  if (!map || !button || !map.dataset.embedSrc) return;
  button.hidden = false;
  button.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.className = 'map__frame';
    iframe.src = map.dataset.embedSrc;
    iframe.title = map.dataset.title || '';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    map.replaceChildren(iframe);
  }, { once: true });
}

/* ---------- Imatges: si una no carrega, es deixa el fons de color en lloc d'una icona trencada ---------- */
function initImageFallback() {
  const mark = (img) => img.classList.add('is-broken');
  $$('img').forEach((img) => { if (img.complete && img.naturalWidth === 0) mark(img); });
  document.addEventListener('error', (e) => { if (e.target instanceof HTMLImageElement) mark(e.target); }, true);
}

initImageFallback();
trackHeaderHeight();
initNav();
initTabs();
initToday();
initBooking();
initMap();
initReveal();
