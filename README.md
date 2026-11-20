# Masia Restaurant Can Tintorer · proposta de web

Proposta de web estàtica, bilingüe (català / castellà), per a la Masia Restaurant Can Tintorer de Molins de Rei.
**És una vista prèvia**, no la web oficial: les fotos són d'estoc i el formulari no està connectat.

- Vista prèvia: <https://yaagourd06-cmd.github.io/masia-can-tintorer/>
- Contingut real (història, carta d'hivern 2026–2027, menús, horari, espais) extret de cantintorer.com.

## Requisits

Node.js 20 o superior. **Cap dependència** (`npm install` no cal).

```sh
npm run assets  # baixa imatges i tipografies a .cache/assets (un sol cop)
npm run build   # genera dist/
npm run check   # comprovacions sobre dist/
npm test        # build + check
npm run serve   # http://localhost:4173/masia-can-tintorer/
```

Per a producció, canvia `baseUrl` i `preview` a `content/site.json` (o exporta `SITE_URL=https://www.cantintorer.com`).

## Estructura

```
content/            Dades: l'única font de veritat
  site.json         Contacte, adreça, GPS, horari, reserves, dades legals
  carta.json        Carta per seccions i grups, preus numèrics, textos ca/es
  menus.json        Menú diari, calçotada, infantil, grups, espais
  images.json       Manifest d'imatges (proporció, alt ca/es, amplades)
  legal.json        Avís legal, privacitat i cookies
  i18n/ca.json      Textos d'interfície per idioma
  i18n/es.json
src/
  templates/        Plantilles (literals etiquetats amb escapament automàtic)
  lib/html.mjs      html``, raw(), attrs(), escape()
  css/              Capes @layer: tokens, fonts, base, layout, components, sections, utilities
  js/main.js        Millores progressives (mòdul, sense handlers inline)
  assets/           Favicon i icones
scripts/
  fetch-assets.mjs  Baixa imatges (WebP retallades) i tipografies a .cache/
  build.mjs         Generador estàtic
  check.mjs         Validacions del resultat
  serve.mjs         Servidor local
.github/workflows/  Recursos (amb cache) + build + check + desplegament a Pages
```

### Canviar la carta, els preus o l'horari

Només cal editar el JSON corresponent i fer push: l'Action regenera i publica la web.
L'horari viu **una sola vegada** a `site.json` (`hours.week`) i d'aquí surten la taula d'horari, el missatge «Avui obert…», les dades estructurades `openingHoursSpecification` i les hores disponibles del formulari.
Els preus són números (`"price": 14.75`) i es formaten amb `Intl.NumberFormat` segons l'idioma.

El pas següent natural és connectar aquests JSON a un CMS headless (Decap CMS sobre el mateix repositori, sense servidor), perquè el restaurant pugui editar la carta sense tocar codi.

## Decisions tècniques

**HTML i accessibilitat**
- Un sol `<main>`, un `<h1>` per pàgina i jerarquia de capçaleres sense salts (ho valida `check.mjs`).
- Navegació amb `<ul>`, botó de menú amb `aria-expanded` / `aria-controls`, tancament amb Escape.
- Pestanyes de la carta amb el patró WAI-ARIA Tabs (fletxes, Inici, Fi). Sense JS es veuen totes les seccions.
- Les animacions d'aparició només s'apliquen amb JS, només a elements fora de la pantalla inicial i mai amb `prefers-reduced-motion: reduce`.
- Enllaç «Salta al contingut» i focus visible.

**Formulari de reserva**
- Tots els camps amb `id`, `name`, `<label for>` i `autocomplete`; `type="tel"`, `type="email"`.
- La data té `min` (avui, zona Europe/Madrid) i `max`; les hores disponibles es filtren segons l'horari del dia triat (sense sopars els dies que es tanca a les 17:00 o a les 19:00, i dilluns i dimarts tancat).
- Casella obligatòria d'acceptació de la política de privacitat, camp parany antibot i missatges a una regió `aria-live`.
- Sense backend: amb `booking.endpoint` buit el formulari fa servir `mailto:` (funciona sense JS). Per connectar-lo, posa l'URL d'un servei de formularis (p. ex. Formspree) a `site.json`; la CSP s'actualitza sola.

**Rendiment i SEO**
- Imatges WebP autoallotjades a 640/1024/1600 px (es baixen i es retallen al pipeline, no hi ha binaris al repositori) amb `srcset`, `sizes`, `width` i `height` (sense CLS). La imatge principal es precarrega amb `fetchpriority="high"`; la resta, `loading="lazy"`.
- Dues famílies tipogràfiques variables (3 fitxers WOFF2) en lloc de ~10 variants de Google Fonts.
- CSS i JS en fitxers separats amb hash al nom per invalidar la memòria cau a cada canvi.
- `hreflang` ca/es/x-default, `canonical`, Open Graph, `sitemap.xml` amb alternatives, `robots.txt`, favicon SVG i `apple-touch-icon`.
- JSON-LD `Restaurant` amb adreça, coordenades, horaris, premi i `hasMenu`.
- En mode vista prèvia la web porta `noindex` perquè no competeixi amb cantintorer.com.

**Seguretat i privacitat (RGPD / LSSI)**
- CSP sense `unsafe-inline`: cap `style=""`, cap `onclick`/`onerror`, cap script executable inline (només JSON de dades).
- Cap petició a tercers en navegar: fonts i imatges al mateix domini, sense analítica.
- El mapa de Google només es carrega després d'un clic explícit, amb avís previ, i fa servir la Maps **Embed API** (cal una clau a `maps.embedApiKey`; sense clau es mostra un enllaç a Google Maps).
- Avís legal, política de privacitat i de cookies enllaçats al peu, amb les dades de l'avís legal actual. **Són esborranys pendents de revisió jurídica.**

**Límits coneguts**
- GitHub Pages no permet capçaleres HTTP pròpies: la CSP va per `<meta>` (sense `frame-ancestors`) i la memòria cau la controla GitHub. En un hosting com Netlify o Cloudflare Pages es passarien a capçaleres.
- Els al·lèrgens de cada plat no s'han transcrit (a la carta impresa són icones); el model admet afegir-los per plat.
- Les fotos són d'estoc (Unsplash) fins tenir fotos pròpies. Per fer servir fotos de la masia, es poden desar a `src/assets/img/<id>-<amplada>.webp` (tenen prioritat sobre la memòria cau) o canviar `source` a `images.json`.
