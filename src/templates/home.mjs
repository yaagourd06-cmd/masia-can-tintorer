import { html, attrs } from '../lib/html.mjs';
import { layout, picture } from './layout.mjs';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const SCHEMA_DAYS = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

const toMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const toHHMM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Franges d'hora per a reserves dins del rang [from, last]. */
export function slots(from, last, step) {
  const out = [];
  for (let m = toMinutes(from); m <= toMinutes(last); m += step) out.push(toHHMM(m));
  return out;
}

function hoursTable(ctx) {
  const { t, site } = ctx;
  return html`
  <table class="hours">
    <caption class="visually-hidden">${t.visit.hoursTitle}</caption>
    <tbody>
      ${DAYS.map((d) => {
        const ranges = site.hours.week[d];
        return html`<tr class="hours__row${ranges.length ? '' : ' hours__row--closed'}" data-day="${d}">
          <th class="hours__day" scope="row">${t.visit.days[d]}</th>
          <td class="hours__time">${ranges.length
            ? ranges.map(([a, b], i) => html`${i ? html` ${t.hero.and} ` : ''}<time>${a}</time>–<time>${b === '24:00' ? '00:00' : b}</time>`)
            : t.visit.closed}</td>
        </tr>`;
      })}
    </tbody>
  </table>
  <p class="hours__note">${t.visit.closedExceptHolidays}</p>`;
}

function carta(ctx) {
  const { t, lang, carta: c } = ctx;
  const dish = (it) => html`
    <li class="dish">
      <span class="dish__name">${it.name[lang]}</span>
      <data class="dish__price" value="${it.price}">${ctx.price(it.price)}</data>
      ${it.desc ? html`<span class="dish__desc">${it.desc[lang]}</span>` : ''}
    </li>`;
  return html`
  <section class="section section--dark" id="carta" aria-labelledby="carta-title">
    <div class="container">
      <header class="section__header section__header--center">
        <p class="eyebrow">${t.carta.kicker} · ${c.season[lang]}</p>
        <h2 class="section__title" id="carta-title">${t.carta.title}</h2>
      </header>
      <div class="tabs" data-tabs>
        <div class="tabs__list" data-tabs-list aria-label="${t.carta.tablist}" hidden>
          ${c.sections.map((s) => html`<button class="tabs__tab" type="button" data-tab="carta-${s.id}">${s.title[lang]}</button>`)}
        </div>
        ${c.sections.map((s) => html`
        <section class="tabs__panel carta-panel" id="carta-${s.id}" aria-labelledby="carta-${s.id}-title">
          <h3 class="carta-panel__title" id="carta-${s.id}-title">${s.title[lang]}</h3>
          <div class="carta-panel__groups">
            ${s.groups.map((g) => html`
            <div class="carta-group">
              ${g.title ? html`<h4 class="carta-group__title">${g.title[lang]}</h4>` : ''}
              <ul class="dish-list" role="list">${g.items.map(dish)}</ul>
            </div>`)}
          </div>
        </section>`)}
      </div>
      <div class="carta-extras">
        <h3 class="carta-extras__title">${c.extras.title[lang]}</h3>
        <ul class="dish-list dish-list--inline" role="list">${c.extras.items.map(dish)}</ul>
      </div>
      <p class="carta-note">${c.allergenNote[lang]} <strong>${c.vatNote[lang]}</strong></p>
    </div>
  </section>`;
}

function menus(ctx) {
  const { t, lang, menus: m } = ctx;
  return html`
  <section class="section" id="menus" aria-labelledby="menus-title">
    <div class="container">
      <header class="section__header section__header--center">
        <p class="eyebrow">${t.menus.kicker}</p>
        <h2 class="section__title" id="menus-title">${t.menus.title}</h2>
      </header>
      <ul class="menu-grid" role="list">
        ${m.menus.map((mn) => html`
        <li class="menu-card${mn.featured ? ' menu-card--featured' : ''} reveal">
          <article class="menu-card__body" aria-labelledby="menu-${mn.id}">
            <p class="menu-card__when">${mn.when[lang]}</p>
            <h3 class="menu-card__title" id="menu-${mn.id}">${mn.title[lang]}</h3>
            <p class="menu-card__price"><data value="${mn.price}">${ctx.price(mn.price)}</data> <span class="menu-card__per">${t.menus.perPerson}</span></p>
            <p class="menu-card__price-note">${mn.priceNote[lang]}</p>
            <ul class="menu-card__courses" role="list">${mn.courses.map((c) => html`<li>${c[lang]}</li>`)}</ul>
            ${mn.note ? html`<p class="menu-card__note">${mn.note[lang]}</p>` : ''}
          </article>
        </li>`)}
      </ul>
      <div class="groups reveal">
        <div class="groups__text">
          <h3 class="groups__title">${m.groups.title[lang]}</h3>
          <p>${m.groups.intro[lang]}</p>
          <p class="groups__names">${m.groups.names.map((n) => html`<span class="tag">${n}</span>`)}</p>
        </div>
        <ul class="groups__conditions" role="list">${m.groups.conditions.map((c) => html`<li>${c[lang]}</li>`)}</ul>
        <a class="button button--dark groups__cta" href="#reserva">${t.menus.groupsCta}</a>
      </div>
    </div>
  </section>`;
}

function bookingForm(ctx) {
  const { t, site } = ctx;
  const b = site.booking;
  const lunch = slots(b.lunch.from, b.lunch.lastSeating, b.slotMinutes);
  const dinner = slots(b.dinner.from, b.dinner.lastSeating, b.slotMinutes);
  // Sense servei de formularis configurat no hi ha destinació: el formulari depèn del JS i
  // es mostra un avís <noscript> amb el telèfon (evitem mailto:, que el navegador marca com a insegur).
  const endpoint = b.endpoint || null;
  const field = (id, label, input, hint) => html`
    <div class="field">
      <label class="field__label" for="${id}">${label}</label>
      ${input}
      ${hint ? html`<p class="field__hint" id="${id}-hint">${hint}</p>` : ''}
    </div>`;
  return html`
  <form class="booking-form" id="booking-form"${attrs({ action: endpoint })} method="post" novalidate data-booking${attrs({ 'data-demo': site.preview && !b.endpoint })}>
    ${endpoint ? '' : html`<noscript><p class="booking-form__status">${t.booking.demo}</p></noscript>`}
    <div class="booking-form__row">
      ${field('bk-name', t.booking.name, html`<input class="field__input" id="bk-name" name="name" type="text" autocomplete="name" required>`)}
      ${field('bk-phone', t.booking.phone, html`<input class="field__input" id="bk-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required>`)}
    </div>
    ${field('bk-email', t.booking.email, html`<input class="field__input" id="bk-email" name="email" type="email" autocomplete="email" required>`)}
    <div class="booking-form__row booking-form__row--3">
      ${field('bk-date', t.booking.date, html`<input class="field__input" id="bk-date" name="date" type="date" required aria-describedby="bk-date-hint">`, html`<span data-date-hint>${t.visit.closedExceptHolidays}</span>`)}
      ${field('bk-time', t.booking.time, html`
        <select class="field__input" id="bk-time" name="time" required>
          <option value="">${t.booking.timePlaceholder}</option>
          <optgroup label="${t.booking.lunch}" data-service="lunch">${lunch.map((s) => html`<option>${s}</option>`)}</optgroup>
          <optgroup label="${t.booking.dinner}" data-service="dinner">${dinner.map((s) => html`<option>${s}</option>`)}</optgroup>
        </select>`)}
      ${field('bk-people', t.booking.people, html`<input class="field__input" id="bk-people" name="people" type="number" min="1" max="200" step="1" value="2" inputmode="numeric" required>`)}
    </div>
    ${field('bk-occasion', t.booking.occasion, html`
      <select class="field__input" id="bk-occasion" name="occasion">${t.booking.occasions.map((o) => html`<option>${o}</option>`)}</select>`)}
    ${field('bk-comments', t.booking.comments, html`<textarea class="field__input field__input--area" id="bk-comments" name="comments" rows="3" aria-describedby="bk-comments-hint"></textarea>`, t.booking.commentsHint)}
    <div class="field field--check">
      <input class="field__check" id="bk-privacy" name="privacy" type="checkbox" value="accepted" required>
      <label class="field__label field__label--inline" for="bk-privacy">${t.booking.privacy} <a href="${ctx.url(ctx.lang, ctx.legalSlug('privacy'))}">${t.booking.privacyLink}</a></label>
    </div>
    <div class="field field--trap" aria-hidden="true">
      <label for="bk-website">Website</label>
      <input id="bk-website" name="_gotcha" type="text" tabindex="-1" autocomplete="off">
    </div>
    <p class="booking-form__disclaimer">${t.booking.disclaimer}</p>
    <button class="button button--primary booking-form__submit" type="submit">${t.booking.submit}</button>
    <p class="booking-form__status" role="status" aria-live="polite" data-status></p>
  </form>`;
}

function jsonLd(ctx) {
  const { site } = ctx;
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': `${site.productionUrl}/#restaurant`,
    name: site.name,
    alternateName: site.shortName,
    url: ctx.absoluteUrl(ctx.lang, ''),
    image: ctx.absoluteAsset('img/og.jpg'),
    telephone: site.contact.phone,
    email: site.contact.email,
    servesCuisine: ['Catalan', 'Mediterranean'],
    priceRange: '€€',
    acceptsReservations: true,
    foundingDate: String(site.founded),
    hasMenu: ctx.absoluteUrl(ctx.lang, '') + '#carta',
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      postalCode: site.address.postalCode,
      addressLocality: site.address.locality,
      addressRegion: site.address.region,
      addressCountry: site.address.country,
    },
    geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
    openingHoursSpecification: Object.entries(site.hours.week).flatMap(([d, ranges]) =>
      ranges.map(([opens, closes]) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${SCHEMA_DAYS[d]}`,
        opens,
        closes: closes === '24:00' ? '23:59' : closes,
      }))
    ),
    award: `${site.award.name} (${site.award.broadcaster}, ${site.award.year})`,
    sameAs: Object.values(site.social),
  };
}

export function home(ctx) {
  const { t, site, lang } = ctx;
  const mapsKey = site.maps.embedApiKey;
  const embed = mapsKey
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(mapsKey)}&q=${site.geo.lat},${site.geo.lng}&zoom=15&language=${lang}`
    : null;

  const body = html`
  <section class="hero" aria-labelledby="hero-title">
    ${picture(ctx, 'hero', { className: 'hero__media', priority: true })}
    <div class="hero__content container">
      <p class="eyebrow eyebrow--light">${t.hero.kicker}</p>
      <h1 class="hero__title" id="hero-title">${t.hero.title}</h1>
      <p class="hero__subtitle">${t.hero.subtitle}</p>
      <p class="hero__today" data-today hidden></p>
      <p class="hero__actions">
        <a class="button button--primary" href="#reserva">${t.hero.ctaBook}</a>
        <a class="button button--ghost" href="#carta">${t.hero.ctaCarta}</a>
      </p>
    </div>
  </section>

  <section class="section" id="historia" aria-labelledby="historia-title">
    <div class="container split">
      <div class="split__media split__media--stack reveal">
        ${picture(ctx, 'masia', { className: 'split__img split__img--main', sizes: '(min-width: 64em) 30vw, 70vw' })}
        ${picture(ctx, 'interior', { className: 'split__img split__img--detail', sizes: '(min-width: 64em) 22vw, 50vw' })}
      </div>
      <div class="split__text">
        <p class="eyebrow">${t.history.kicker}</p>
        <h2 class="section__title" id="historia-title">${t.history.title}</h2>
        <p class="lead">${t.history.p1}</p>
        <p class="lead">${t.history.p2}</p>
        <dl class="facts">
          ${t.history.facts.map((f) => html`<div class="facts__item"><dt class="facts__label">${f.label}</dt><dd class="facts__value">${f.value}</dd></div>`)}
        </dl>
      </div>
    </div>
  </section>

  ${carta(ctx)}

  <section class="band" aria-labelledby="award-title">
    ${picture(ctx, 'brasa', { className: 'band__media' })}
    <div class="band__content container">
      <p class="eyebrow eyebrow--light">${t.award.kicker}</p>
      <h2 class="band__title" id="award-title">${t.award.title}</h2>
      <p class="band__text">${t.award.text}</p>
    </div>
  </section>

  ${menus(ctx)}

  <section class="section section--sand" id="espais" aria-labelledby="espais-title">
    <div class="container split split--reverse">
      <div class="split__text">
        <p class="eyebrow">${t.spaces.kicker}</p>
        <h2 class="section__title" id="espais-title">${t.spaces.title}</h2>
        <p class="lead">${t.spaces.text}</p>
        <h3 class="subhead">${t.spaces.celebrationsTitle}</h3>
        <ul class="tag-list" role="list">${ctx.menus.celebrations.map((c) => html`<li class="tag">${c[lang]}</li>`)}</ul>
        <h3 class="subhead">${t.spaces.spacesTitle}</h3>
        <ul class="space-list" role="list">${ctx.menus.spaces.map((s) => html`<li>${s[lang]}</li>`)}</ul>
      </div>
      <div class="mosaic reveal">
        ${picture(ctx, 'celebracio', { className: 'mosaic__img mosaic__img--tall', sizes: '(min-width: 64em) 25vw, 50vw' })}
        ${picture(ctx, 'jardi', { className: 'mosaic__img', sizes: '(min-width: 64em) 25vw, 50vw' })}
        ${picture(ctx, 'menjador', { className: 'mosaic__img', sizes: '(min-width: 64em) 25vw, 50vw' })}
      </div>
    </div>
  </section>

  <section class="section section--dark" id="visita" aria-labelledby="visita-title">
    <div class="container visit">
      <header class="section__header">
        <p class="eyebrow">${t.visit.kicker}</p>
        <h2 class="section__title" id="visita-title">${t.visit.title}</h2>
      </header>
      <div class="visit__hours">
        <h3 class="subhead">${t.visit.hoursTitle}</h3>
        ${hoursTable(ctx)}
      </div>
      <div class="visit__where">
        <h3 class="subhead">${t.visit.addressTitle}</h3>
        <address class="visit__address">
          ${site.address.street}<br>${site.address.postalCode} ${site.address.locality}, ${site.address.region}
        </address>
        <p class="visit__gps">${t.visit.gps}: ${site.address.gpsDisplay}</p>
        <p><a class="button button--primary" href="${site.maps.directionsUrl}" rel="noopener">${t.visit.directions}</a></p>
      </div>
      <figure class="map" data-map${attrs({ 'data-embed-src': embed, 'data-title': t.visit.mapTitle })}>
        <div class="map__placeholder">
          <p class="map__text">${embed ? t.visit.mapConsent : ''}</p>
          ${embed
            ? html`<button class="button button--ghost" type="button" data-map-load hidden>${t.visit.mapLoad}</button>`
            : html`<a class="button button--ghost" href="${site.maps.directionsUrl}" rel="noopener">${t.visit.mapNoKey}</a>`}
        </div>
      </figure>
    </div>
  </section>

  <section class="section" id="reserva" aria-labelledby="reserva-title">
    <div class="container split split--form">
      <div class="split__text">
        <p class="eyebrow">${t.booking.kicker}</p>
        <h2 class="section__title" id="reserva-title">${t.booking.title}</h2>
        <p class="lead">${t.booking.intro}</p>
        <ul class="contact-list" role="list">
          <li class="contact-list__item"><span class="contact-list__label">${t.booking.call}</span><a class="contact-list__value" href="tel:${site.contact.phone}">${site.contact.phoneDisplay}</a></li>
          <li class="contact-list__item"><span class="contact-list__label">${t.booking.whatsapp}</span><a class="contact-list__value" href="tel:${site.contact.mobile}">${site.contact.mobileDisplay}</a></li>
          <li class="contact-list__item"><span class="contact-list__label">${t.booking.write}</span><a class="contact-list__value" href="mailto:${site.contact.email}">${site.contact.email}</a></li>
        </ul>
      </div>
      ${bookingForm(ctx)}
    </div>
  </section>`;

  const b = site.booking;
  return layout(ctx, {
    title: t.meta.title,
    description: t.meta.description,
    body,
    jsonLd: jsonLd(ctx),
    preloadHero: true,
    pageData: {
      lang,
      timezone: site.hours.timezone,
      week: site.hours.week,
      booking: { maxDaysAhead: b.maxDaysAhead, demo: site.preview && !b.endpoint, endpoint: b.endpoint || null },
      i18n: {
        todayOpen: t.hero.todayOpen,
        todayClosed: t.hero.todayClosed,
        and: t.hero.and,
        closedDay: t.booking.closedDay,
        pastDate: t.booking.pastDate,
        required: t.booking.required,
        sent: t.booking.sent,
        demo: t.booking.demo,
        error: t.booking.error,
        hoursHint: t.visit.closedExceptHolidays,
      },
    },
  });
}
