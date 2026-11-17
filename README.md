# Dialine Luxury Spa

Static site (HTML/CSS/JS) for Dialine Luxury Spa, Visakhapatnam. Deployed on Vercel at https://dialinespa.com

## Structure

| Path | Purpose |
|---|---|
| `index.html` | Landing page |
| `<service>.html` | 10 treatment detail pages (generated) |
| `data/services.json` | Single source of truth for all treatment content |
| `scripts/build-services.mjs` | Generates pages, syncs index cards/selects, writes `sitemap.xml` |
| `scripts/templates/service.html` | Detail page template |
| `partials/` | Shared header + footer |
| `css/style.css`, `css/service.css` | Homepage / detail page styles |
| `js/main.js` | Shared behaviour, reveal animations, reservation form |

## Editing treatments

All treatment copy lives in `data/services.json` — never edit the generated pages by hand.

```bash
npm run build   # regenerate the 10 pages + sync index.html + sitemap.xml
npm run check   # fail if data, index.html and pages have drifted apart
```

Generated HTML is committed, so Vercel needs no build step. Deployment is a plain static upload.
