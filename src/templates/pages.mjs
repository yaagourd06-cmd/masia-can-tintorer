import { html, fill } from '../lib/html.mjs';
import { layout } from './layout.mjs';

export function legalPage(ctx, page) {
  const { t, lang, site } = ctx;
  const data = { ...site.legal, shortName: site.shortName };
  const body = html`
  <article class="section legal" aria-labelledby="legal-title">
    <div class="container container--narrow">
      <h1 class="legal__title" id="legal-title">${page.title[lang]}</h1>
      ${site.preview ? html`<p class="legal__draft">${t.legalDraft}</p>` : ''}
      ${page.sections.map((s) => html`
      <section class="legal__section">
        <h2 class="legal__heading">${s.h[lang]}</h2>
        ${s.p.map((p) => html`<p>${fill(p[lang], data)}</p>`)}
      </section>`)}
    </div>
  </article>`;
  return layout(ctx, {
    title: `${page.title[lang]} · ${site.shortName}`,
    description: `${page.title[lang]} · ${site.name}`,
    slug: page.slug[lang],
    body,
  });
}

export function notFoundPage(ctx) {
  const { t, site } = ctx;
  const body = html`
  <section class="section legal" aria-labelledby="nf-title">
    <div class="container container--narrow">
      <h1 class="legal__title" id="nf-title">${t.notFound.title}</h1>
      <p>${t.notFound.text}</p>
      <p><a class="button button--primary" href="${ctx.url(ctx.lang)}">${t.notFound.back}</a></p>
    </div>
  </section>`;
  return layout(ctx, { title: `${t.notFound.title} · ${site.shortName}`, description: t.notFound.text, body });
}
