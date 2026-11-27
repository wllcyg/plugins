import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const ssrDir = path.join(rootDir, 'dist-ssr');

function escapeAttr(val) {
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function replaceMeta(template, seo) {
  let out = template;
  out = out.replace(/<html\s+lang="[^"]*"/i, `<html lang="${seo.lang}"`);
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(seo.title)}</title>`);
  out = out.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/i, `$1${escapeAttr(seo.description)}$2`);
  out = out.replace(/(<meta\s+name="keywords"\s+content=")[^"]*(")/i, `$1${escapeAttr(seo.keywords)}$2`);
  out = out.replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/i, `$1${escapeAttr(seo.title)}$2`);
  out = out.replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/i, `$1${escapeAttr(seo.description)}$2`);
  out = out.replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/i, `$1${escapeAttr(seo.canonical)}$2`);
  out = out.replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/i, `$1${escapeAttr(seo.ogImage)}$2`);
  out = out.replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/i, `$1${escapeAttr(seo.title)}$2`);
  out = out.replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/i, `$1${escapeAttr(seo.description)}$2`);
  out = out.replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/i, `$1${escapeAttr(seo.ogImage)}$2`);
  out = out.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/i, `$1${escapeAttr(seo.canonical)}$2`);
  out = out.replace(/(<link\s+rel="alternate"\s+hreflang="zh-CN"\s+href=")[^"]*(")/i, `$1${escapeAttr(seo.zhUrl)}$2`);
  out = out.replace(/(<link\s+rel="alternate"\s+hreflang="en"\s+href=")[^"]*(")/i, `$1${escapeAttr(seo.enUrl)}$2`);
  out = out.replace(/(<link\s+rel="alternate"\s+hreflang="x-default"\s+href=")[^"]*(")/i, `$1${escapeAttr(seo.zhUrl)}$2`);

  out = out.replace(/\s*<!-- Schema\.org JSON-LD[\s\S]*?<script type="application\/ld\+json">[\s\S]*?<\/script>/i, '');
  if (seo.jsonLd) {
    out = out.replace(
      '</head>',
      `  <script type="application/ld+json">${seo.jsonLd}</script>\n  </head>`
    );
  }
  return out;
}

function inlineStylesheet(template) {
  return template.replace(
    /<link\s+rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/gi,
    (match, href) => {
      const cssPath = path.join(distDir, href.replace(/^\//, ''));
      if (fs.existsSync(cssPath)) {
        const css = fs.readFileSync(cssPath, 'utf-8');
        return `<style>${css}</style>`;
      }
      return match;
    }
  );
}

async function main() {
  const rawTemplate = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
  const template = inlineStylesheet(rawTemplate);
  const serverEntry = pathToFileURL(path.join(ssrDir, 'entry-server.js')).href;
  const { render, getStaticRoutes, generateLlmsFiles } = await import(serverEntry);
  const routes = getStaticRoutes();

  for (const url of routes) {
    const { html, seo } = await render(url);
    const pageHtml = replaceMeta(template, seo).replace(
      '<div id="app"></div>',
      `<div id="app">${html}</div>`
    );

    const outPath =
      url === '/'
        ? path.join(distDir, 'index.html')
        : path.join(distDir, url.replace(/^\//, ''), 'index.html');

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, pageHtml, 'utf-8');
    console.log(`[SSG] pre-rendered ${url} -> ${path.relative(rootDir, outPath)}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const sitemapEntries = routes
    .map((url) => {
      const loc = url === '/' ? 'https://plugins.cheatppf.xyz/' : `https://plugins.cheatppf.xyz${url}`;
      const priority = url === '/' ? '1.0' : url === '/en' ? '0.9' : url.includes('/tools/') ? '0.8' : '0.7';
      const changefreq = url === '/' || url === '/en' ? 'weekly' : 'monthly';
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    })
    .join('\n');
  fs.writeFileSync(
    path.join(distDir, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
    'utf-8'
  );

  const { llmsTxt, llmsFullTxt } = generateLlmsFiles();
  fs.writeFileSync(path.join(distDir, 'llms.txt'), llmsTxt, 'utf-8');
  fs.writeFileSync(path.join(distDir, 'llms-full.txt'), llmsFullTxt, 'utf-8');

  fs.rmSync(ssrDir, { recursive: true, force: true });
  console.log(`[SSG] Done! Generated ${routes.length} static HTML pages, sitemap.xml, llms.txt and llms-full.txt.`);
}

main().catch((err) => {
  console.error('[SSG] Failed:', err);
  process.exit(1);
});
