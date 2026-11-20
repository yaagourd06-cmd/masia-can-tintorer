import { html, raw, attrs } from '../lib/html.mjs';

/** Peça <img> responsive a partir del manifest d'imatges. */
export function picture(ctx, id, { sizes = '100vw', className, priority = false } = {}) {
  const img = ctx.images.images[id];
  if (!img) throw new Error(`Imatge desconeguda: ${id}`);
  const widths = ctx.images.widths;
  const max = widths[widths.length - 1];
  const [rw, rh] = img.ratio;
  const src = (w) => `${ctx.asset(`img/${id}-${w}.webp`)}`;
  return html`<img${attrs({
    class: className,
    src: src(widths[1] ?? max),
    srcset: widths.map((w) => `${src(w)} ${w}w`).join(', '),
    sizes,
    width: max,
    height: Math.round((max * rh) / rw),
    alt: img.alt[ctx.lang],
    loading: priority ? null : 'lazy',
    decoding: priority ? null : 'async',
    fetchpriority: priority ? 'high' : null,
  })}>`;
}

export function header(ctx) {
  const t = ctx.t;
  const other = ctx.otherLang;
  const items = [
    ['historia', t.nav.history],
    ['carta', t.nav.carta],
    ['menus', t.nav.menus],
    ['espais', t.nav.spaces],
    ['visita', t.nav.visit],
  ];
  return html`
  <header class="site-header" data-header>
    <div class="site-header__inner container">
      <a class="brand" href="${ctx.url(ctx.lang)}">
        <span class="brand__kicker">${t.hero.since}</span>
        <span class="brand__name">Can Tintorer</span>
      </a>
      <button class="site-header__toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-nav-toggle hidden>
        <span class="site-header__toggle-bar" aria-hidden="true"></span>
        <span class="visually-hidden" data-nav-label data-open="${t.nav.open}" data-close="${t.nav.close}">${t.nav.open}</span>
      </button>
      <nav class="site-nav" id="site-nav" aria-label="${t.nav.label}">
        <ul class="site-nav__list" role="list">
          ${items.map(([id, label]) => html`<li class="site-nav__item"><a class="site-nav__link" href="${ctx.home}#${id}">${label}</a></li>`)}
          <li class="site-nav__item">
            <a class="site-nav__link site-nav__link--lang" href="${ctx.url(other)}" hreflang="${other}" lang="${other}">${t.nav.langSwitch}</a>
          </li>
          <li class="site-nav__item site-nav__item--cta">
            <a class="button button--primary" href="${ctx.home}#reserva">${t.nav.book}</a>
          </li>
        </ul>
      </nav>
    </div>
  </header>`;
}

export function footer(ctx) {
  const { t, site } = ctx;
  const legal = ctx.legalPages;
  return html`
  <footer class="site-footer">
    <div class="container site-footer__inner">
      <p class="site-footer__brand"><span class="brand__kicker">${t.hero.since}</span><span class="brand__name">Can Tintorer</span></p>
      <address class="site-footer__address">
        ${site.address.street}, ${site.address.postalCode} ${site.address.locality}<br>
        <a href="tel:${site.contact.phone}">${site.contact.phoneDisplay}</a> ·
        <a href="mailto:${site.contact.email}">${site.contact.email}</a>
      </address>
      <ul class="site-footer__links" role="list">
        ${legal.map((p) => html`<li><a href="${ctx.url(ctx.lang, p.slug[ctx.lang])}">${p.title[ctx.lang]}</a></li>`)}
        <li><a href="${site.social.instagram}" rel="noopener">Instagram</a></li>
      </ul>
      <p class="site-footer__meta">© ${ctx.year} ${site.legal.company}. ${t.footer.rights}${site.preview ? html` ${t.footer.photos}` : ''}</p>
    </div>
  </footer>`;
}

export function layout(ctx, { title, description, slug = '', body, jsonLd, preloadHero = false, pageData }) {
  const { t, site } = ctx;
  const canonical = ctx.absoluteUrl(ctx.lang, slug);
  const alternates = site.langs.map((l) => [l, ctx.absoluteUrl(l, ctx.slugFor(l))]);
  const hero = ctx.images.images.hero;
  const csp = [
    "default-src 'self'",
    "img-src 'self' data:",
    "style-src 'self'",
    "font-src 'self'",
    "script-src 'self'",
    `connect-src 'self'${ctx.formOrigin ? ` ${ctx.formOrigin}` : ''}`,
    `form-action 'self' mailto:${ctx.formOrigin ? ` ${ctx.formOrigin}` : ''}`,
    'frame-src https://www.google.com',
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; ');

  return html`<!DOCTYPE html>
<html lang="${ctx.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${title}</title>
<meta name="description" content="${description}">
${site.preview ? html`<meta name="robots" content="noindex, nofollow">` : ''}
<link rel="canonical" href="${canonical}">
${alternates.map(([l, href]) => html`<link rel="alternate" hreflang="${l}" href="${href}">`)}
<link rel="alternate" hreflang="x-default" href="${ctx.absoluteUrl(site.defaultLang, ctx.slugFor(site.defaultLang))}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${t.locale}">
${site.langs.filter((l) => l !== ctx.lang).map((l) => html`<meta property="og:locale:alternate" content="${ctx.i18n[l].locale}">`)}
<meta property="og:image" content="${ctx.absoluteAsset('img/og.jpg')}">
<meta property="og:image:width" content="${ctx.images.og.width}">
<meta property="og:image:height" content="${ctx.images.og.height}">
<meta property="og:image:alt" content="${hero.alt[ctx.lang]}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1f1b17">
<link rel="icon" href="${ctx.asset('favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${ctx.asset('apple-touch-icon.png')}">
<link rel="preload" href="${ctx.asset('fonts/cormorant-garamond-latin.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${ctx.asset('fonts/dm-sans-latin.woff2')}" as="font" type="font/woff2" crossorigin>
${preloadHero ? html`<link rel="preload" as="image" type="image/webp" href="${ctx.asset('img/hero-1024.webp')}" imagesrcset="${ctx.images.widths.map((w) => `${ctx.asset(`img/hero-${w}.webp`)} ${w}w`).join(', ')}" imagesizes="100vw" fetchpriority="high">` : ''}
<link rel="stylesheet" href="${ctx.cssHref}">
<script type="module" src="${ctx.jsHref}"></script>
${jsonLd ? html`<script type="application/ld+json">${raw(JSON.stringify(jsonLd).replace(/</g, '\\u003c'))}</script>` : ''}
</head>
<body>
<a class="skip-link" href="#main">${t.skip}</a>
${site.preview ? html`<p class="preview-banner">${t.preview}</p>` : ''}
${header(ctx)}
<main id="main" tabindex="-1">
${body}
</main>
${footer(ctx)}
${pageData ? html`<script type="application/json" id="page-data">${raw(JSON.stringify(pageData).replace(/</g, '\\u003c'))}</script>` : ''}
</body>
</html>
`;
}
