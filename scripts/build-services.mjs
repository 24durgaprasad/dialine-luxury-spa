#!/usr/bin/env node
/**
 * Dialine Luxury Spa — service page builder.
 *
 *   node scripts/build-services.mjs           # write 10 pages + sync index.html
 *   node scripts/build-services.mjs --check   # verify nothing has drifted
 *
 * Zero dependencies. Source of truth: data/services.json
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

const read = (p) => readFile(path.join(root, p), 'utf8');
const data = JSON.parse(await read('data/services.json'));
const template = await read('scripts/templates/service.html');
const header = await read('partials/header.html');
const footer = await read('partials/footer.html');
const indexHtml = await read('index.html');
/** Standalone landing pages that reuse the treatment cards + selects (not generated from a template). */
const landingFile = 'spa-in-vizag.html';
const landingHtml = await read(landingFile);

const { site, groups, services } = data;

/* ---------------------------------------------------------------- helpers */

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const attr = (s = '') => esc(s).replace(/"/g, '&quot;');

const unsplash = (base, w, q = 70) =>
  `${base}?auto=format&fit=crop&w=${w}&q=${q}`;

const bookHref = (name) => `index.html?ritual=${encodeURIComponent(name)}#book`;

const waText = (name) =>
  encodeURIComponent(`Hello Dialine Luxury Spa, I'd like to book ${name}.`);

/** Split "Restore Energy & Alignment" + "& Alignment" -> ["Restore Energy", "& Alignment"] */
const splitHeading = (full, em) => {
  if (!em || !full.endsWith(em)) return [full, ''];
  return [full.slice(0, full.length - em.length).trim(), em];
};

/* ------------------------------------------------------------------ icons */

const icons = {
  stretch: '<circle cx="12" cy="4" r="2"/><path d="M12 7v6"/><path d="M6 10l6 2 6-2"/><path d="M9 21l3-8 3 8"/>',
  flow: '<path d="M3 8c3-3 6 3 9 0s6 3 9 0"/><path d="M3 16c3-3 6 3 9 0s6 3 9 0"/>',
  spine: '<path d="M12 3v18"/><path d="M9 6h6"/><path d="M8.5 10h7"/><path d="M9 14h6"/><path d="M9.5 18h5"/>',
  leaf: '<path d="M20 4c-8 0-14 4-14 10a6 6 0 0 0 6 6c6 0 8-6 8-16Z"/><path d="M4 20c2-4 5-7 9-9"/>',
  steam: '<path d="M7 20v-8"/><path d="M12 20v-8"/><path d="M17 20v-8"/><path d="M6 7c1.6-1 0-2.2 1.6-3.2"/><path d="M11 7c1.6-1 0-2.2 1.6-3.2"/><path d="M16 7c1.6-1 0-2.2 1.6-3.2"/>',
  scrub: '<circle cx="7" cy="8" r="1.7"/><circle cx="13" cy="6" r="1.2"/><circle cx="17" cy="10" r="1.7"/><circle cx="9" cy="14" r="1.2"/><circle cx="14" cy="16" r="1.7"/><circle cx="19" cy="17" r="1"/>',
  drop: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z"/>',
  flame: '<path d="M12 21a6 6 0 0 0 6-6c0-4-6-12-6-12S6 11 6 15a6 6 0 0 0 6 6Z"/><path d="M12 18a2.5 2.5 0 0 0 0-5"/>',
  heart: '<path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z"/>',
  pressure: '<path d="M12 4v8"/><path d="M8.5 7.5 12 4l3.5 3.5"/><path d="M5 15h14"/><path d="M7 19h10"/>'
};

const icon = (key) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[key] || icons.heart}</svg>`;

/* ------------------------------------------------------------- fragments */

const byslug = new Map(services.map((s) => [s.slug, s]));

const benefitItem = (b, i) => `          <li class="svc-benefit reveal" style="--d:${(i * 0.08).toFixed(2)}s">
            <span class="svc-benefit__icon" aria-hidden="true">${icon(b.icon)}</span>
            <div class="svc-benefit__text">
              <h3>${esc(b.title)}</h3>
              <p>${esc(b.text)}</p>
            </div>
          </li>`;

const cardMarkup = (s, i = 0) => {
  const badge = s.badge ? `<span class="card__badge">${esc(s.badge)}</span>` : '';
  return `          <article class="card reveal" style="--d:${(i * 0.08).toFixed(2)}s">
            <div class="card__img"><img src="${unsplash(s.image, 900)}" alt="${attr(s.imageAlt)}" loading="lazy" width="900" height="700"></div>
            ${badge}
            <div class="card__body">
              <span class="card__meta">${esc(s.cardMeta)}</span>
              <h3><a class="card__link" href="${s.slug}.html">${esc(s.name)}</a></h3>
              <p>${esc(s.intro)}</p>
              <span class="link" aria-hidden="true">Discover <span>&rarr;</span></span>
            </div>
          </article>`;
};

/* ---------------------------------------------------------------- sitemap */

const buildPage = (s) => {
  const [headBase, headEm] = splitHeading(s.sectionHeading, s.sectionHeadingEm);
  const sectionHeadingHtml = headEm
    ? `${esc(headBase)} <em>${esc(headEm)}</em>`
    : esc(headBase);

  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Service',
        name: s.name,
        serviceType: s.name,
        description: s.seo.description,
        url: `${site.baseUrl}/${s.slug}`,
        provider: {
          '@type': 'DaySpa',
          name: site.name,
          telephone: site.phone,
          url: site.baseUrl,
          logo: `${site.baseUrl}/assets/logo.webp`
        },
        areaServed: { '@type': 'City', name: 'Visakhapatnam' }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${site.baseUrl}/` },
          { '@type': 'ListItem', position: 2, name: 'Treatments', item: `${site.baseUrl}/#treatments` },
          { '@type': 'ListItem', position: 3, name: s.name, item: `${site.baseUrl}/${s.slug}` }
        ]
      }
    ]
  };

  const tokens = {
    TITLE: esc(s.seo.title),
    DESCRIPTION: attr(s.seo.description),
    CANONICAL: `${site.baseUrl}/${s.slug}`,
    OG_IMAGE: unsplash(s.image, 1200),
    HERO_PRELOAD: unsplash(s.image, 1600),
    HERO_IMG: unsplash(s.image, 1600),
    HERO_ALT: attr(s.imageAlt),
    JSONLD: JSON.stringify(jsonld, null, 2).replace(/^/gm, '  ').trimStart(),
    HEADER: header.trimEnd(),
    FOOTER: footer.trimEnd(),
    NAME: esc(s.name),
    EYEBROW: esc(s.eyebrow),
    LEAD: esc(s.lead),
    DURATION: esc(s.duration),
    GROUP: esc(s.group),
    BADGE: s.badge ? `<li class="is-badge">${esc(s.badge)}</li>` : '',
    SECTION_HEADING_HTML: sectionHeadingHtml,
    BENEFITS: s.benefits.map(benefitItem).join('\n'),
    QUOTE: esc(s.methodology.quote),
    CHIPS: s.methodology.chips.map((c) => `          <li>${esc(c)}</li>`).join('\n'),
    RELATED: s.related
      .map((slug) => byslug.get(slug))
      .filter(Boolean)
      .map((r, i) => cardMarkup(r, i))
      .join('\n'),
    BOOK_HREF: attr(bookHref(s.name)),
    WA_TEXT: waText(s.name)
  };

  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : `{{${key}}}`
  );
};

/* ------------------------------------------------------ index.html blocks */

const groupBlock = (group) => {
  const items = services.filter((s) => s.group === group);
  const cols = items.length === 2 ? ' cards--2' : '';
  return `        <div class="group">
          <header class="group__head reveal">
            <p class="eyebrow"><span></span>${esc(group)}</p>
          </header>
          <div class="cards${cols}">
${items.map(cardMarkup).join('\n')}
          </div>
        </div>`;
};

const servicesBlock = groups.map(groupBlock).join('\n\n');

/** Flat card grid for the /spa-in-vizag landing page (links to each service page). */
const landingCard = (s) => `          <div class="carousel__slide">
            <a class="tcard" href="${s.slug}.html">
              <img src="${unsplash(s.image, 600)}" alt="${attr(s.imageAlt)}" loading="lazy" width="600" height="400">
              <div class="tcard__body">
                <h3>${esc(s.name)}</h3>
                <p>${esc(s.intro)}</p>
                <svg class="ico" aria-hidden="true"><use href="#i-leaf"/></svg>
              </div>
            </a>
          </div>`;
const landingServicesBlock = services.map(landingCard).join('\n');

const optionsBlock = services
  .map((s) => `            <option>${esc(s.name)} &middot; ${esc(s.duration)}</option>`)
  .join('\n');

/** Homepage structured data — generated so it can never drift from the catalogue. */
const ldjsonBlock = (() => {
  const doc = {
    '@context': 'https://schema.org',
    '@type': 'DaySpa',
    name: site.name,
    logo: `${site.baseUrl}/assets/logo.webp`,
    description:
      'A luxury day spa in Visakhapatnam offering traditional, deep tissue, bath and signature massage rituals.',
    image:
      'https://images.unsplash.com/photo-1583416750470-965b2707b355?auto=format&fit=crop&w=1200&q=75',
    priceRange: '$$$',
    telephone: '+91-63032-46142',
    url: site.baseUrl,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Horizon Enclave, Nowroji Rd, Daspalla Hills, Maharani Peta',
      addressLocality: 'Visakhapatnam',
      addressRegion: 'Andhra Pradesh',
      postalCode: '530002',
      addressCountry: 'IN'
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Spa Rituals',
      itemListElement: services.map((s) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: s.name,
          url: `${site.baseUrl}/${s.slug}`
        }
      }))
    }
  };

  const json = JSON.stringify(doc, null, 2).replace(/^/gm, '  ');
  return `  <script type="application/ld+json">\n${json}\n  </script>`;
})();

const replaceBetween = (html, begin, end, content, label) => {
  const re = new RegExp(`(${begin})[\\s\\S]*?(${end})`);
  if (!re.test(html)) {
    throw new Error(`Marker pair not found in index.html: ${label}`);
  }
  // Function replacer: a plain string would let `$$`, `$&` etc. in generated
  // content be interpreted as replacement patterns and silently corrupt it.
  return html.replace(re, (_m, begin, end) => `${begin}\n${content}\n${end}`);
};

const patchPage = (html, { ldjson, cards = servicesBlock, selects = true }) => {
  let out = replaceBetween(html, '<!-- SERVICES:BEGIN -->', '<!-- SERVICES:END -->', cards, 'SERVICES');
  if (selects) {
    const selectRe = /(<!-- SELECT:BEGIN -->)[\s\S]*?(<!-- SELECT:END -->)/g;
    const hits = out.match(selectRe)?.length || 0;
    if (hits !== 2) throw new Error(`Expected 2 SELECT marker pairs, found ${hits}`);
    out = out.replace(selectRe, (_m, begin, end) => `${begin}\n${optionsBlock}\n${end}`);
  }
  if (ldjson) out = replaceBetween(out, '<!-- LDJSON:BEGIN -->', '<!-- LDJSON:END -->', ldjsonBlock, 'LDJSON');
  return out;
};

const patchedIndex = patchPage(indexHtml, { ldjson: true });
const patchedLanding = patchPage(landingHtml, { ldjson: false, cards: landingServicesBlock, selects: false });

/* --------------------------------------------------------------- run mode */

if (checkOnly) {
  const problems = [];

  for (const s of services) {
    for (const needle of [`href="${s.slug}.html"`, s.name, s.cardMeta]) {
      if (!patchedIndex.includes(needle)) problems.push(`index.html missing: ${needle} (${s.slug})`);
    }
    if (!existsSync(path.join(root, `${s.slug}.html`))) problems.push(`page not built: ${s.slug}.html`);
  }

  if (patchedIndex !== indexHtml) {
    problems.push('index.html is out of date — run: node scripts/build-services.mjs');
  }

  if (patchedLanding !== landingHtml) {
    problems.push(`${landingFile} is out of date — run: node scripts/build-services.mjs`);
  }

  const onDisk = (await readdir(root)).filter((f) => f.endsWith('.html'));
  for (const f of onDisk) {
    if (f === 'index.html' || f === landingFile) continue;
    if (!byslug.has(f.replace(/\.html$/, ''))) problems.push(`orphan page: ${f} has no entry in services.json`);
  }

  if (problems.length) {
    console.error('✗ Service data check failed:\n' + problems.map((p) => `  · ${p}`).join('\n'));
    process.exit(1);
  }
  console.log(`✓ ${services.length} services consistent across data, index.html and pages.`);
  process.exit(0);
}

let written = 0;
for (const s of services) {
  await writeFile(path.join(root, `${s.slug}.html`), buildPage(s), 'utf8');
  written++;
}

if (patchedIndex !== indexHtml) {
  await writeFile(path.join(root, 'index.html'), patchedIndex, 'utf8');
  console.log('✓ index.html treatments + selects synced');
}

if (patchedLanding !== landingHtml) {
  await writeFile(path.join(root, landingFile), patchedLanding, 'utf8');
  console.log(`✓ ${landingFile} treatments + selects synced`);
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site.baseUrl}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${site.baseUrl}/spa-in-vizag</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
${services
  .map(
    (s) => `  <url>
    <loc>${site.baseUrl}/${s.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
await writeFile(path.join(root, 'sitemap.xml'), sitemap, 'utf8');

console.log(`✓ ${written} service pages built · sitemap.xml written`);
