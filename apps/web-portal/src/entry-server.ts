import { renderToString } from 'vue/server-renderer';
import { createPortalApp } from './main';
import { getLocalizedPlugins } from './data/plugins';
import { locale, t } from './data/i18n';

const SITE_ORIGIN = 'https://plugins.cheatppf.xyz';

export interface PageSeoMeta {
  lang: 'zh-CN' | 'en';
  title: string;
  description: string;
  keywords: string;
  canonical: string;
  zhUrl: string;
  enUrl: string;
  ogImage: string;
  jsonLd?: string;
}

export function getStaticRoutes(): string[] {
  const plugins = getLocalizedPlugins('zh');
  const baseRoutes = ['/', '/install', '/feedback', '/privacy', ...plugins.map((p) => `/tools/${p.id}`)];
  const enRoutes = baseRoutes.map((r) => (r === '/' ? '/en' : `/en${r}`));
  return [...baseRoutes, ...enRoutes];
}

function getSeoMetaForUrl(url: string): PageSeoMeta {
  const isEn = url === '/en' || url.startsWith('/en/');
  const cleanUrl = isEn ? url.replace(/^\/en(?=\/|$)/, '') || '/' : url;
  const plugins = getLocalizedPlugins(isEn ? 'en' : 'zh');
  const isInstall = cleanUrl === '/install';
  const isFeedback = cleanUrl === '/feedback';
  const isPrivacy = cleanUrl === '/privacy';
  const toolId = cleanUrl.startsWith('/tools/') ? cleanUrl.replace('/tools/', '') : undefined;
  const plugin = toolId ? plugins.find((p) => p.id === toolId) : undefined;

  const title = isInstall
    ? t.value.siteTitleInstall
    : isFeedback
      ? t.value.siteTitleFeedback
      : isPrivacy
        ? t.value.siteTitlePrivacy
        : plugin
          ? t.value.siteTitleDetail(plugin.name)
          : t.value.siteTitleHome;

  const description = isInstall
    ? t.value.installPageSubtitle
    : isFeedback
      ? t.value.feedbackPageSubtitle
      : isPrivacy
        ? t.value.privacyPageSubtitle
        : plugin
          ? `${plugin.headline}${isEn ? ': ' : '：'}${plugin.summary}`
          : t.value.heroDesc(plugins.length);

  const pathSuffix = isInstall
    ? '/install'
    : isFeedback
      ? '/feedback'
      : isPrivacy
        ? '/privacy'
        : plugin
          ? `/tools/${plugin.id}`
          : '/';

  const zhUrl = `${SITE_ORIGIN}${pathSuffix}`;
  const enUrl = `${SITE_ORIGIN}${pathSuffix === '/' ? '/en' : `/en${pathSuffix}`}`;
  const canonical = isEn ? enUrl : zhUrl;
  const ogImage = plugin?.preview
    ? plugin.preview.startsWith('http')
      ? plugin.preview
      : `${SITE_ORIGIN}${plugin.preview.startsWith('/') ? '' : '/'}${plugin.preview}`
    : `${SITE_ORIGIN}/og-cover.png`;

  let jsonLd: string | undefined;
  if (isInstall) {
    jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: t.value.installFaq1Q,
          acceptedAnswer: { '@type': 'Answer', text: t.value.installFaq1A }
        },
        {
          '@type': 'Question',
          name: t.value.installFaq2Q,
          acceptedAnswer: { '@type': 'Answer', text: t.value.installFaq2A }
        },
        {
          '@type': 'Question',
          name: t.value.installFaq3Q,
          acceptedAnswer: { '@type': 'Answer', text: t.value.installFaq3A }
        }
      ]
    });
  } else if (plugin) {
    jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: plugin.name,
      description: `${plugin.headline}${isEn ? ': ' : '：'}${plugin.summary}`,
      url: canonical,
      image: ogImage,
      applicationCategory: 'BrowserApplication',
      operatingSystem: 'Chrome, Edge',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
    });
  } else if (!isFeedback && !isPrivacy) {
    jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: isEn ? '100-Free Browser Productivity Extensions' : '100-Free 免费浏览器生产力插件矩阵',
      url: canonical,
      description,
      numberOfItems: plugins.length,
      itemListElement: plugins.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'SoftwareApplication',
          name: item.name,
          url: isEn ? `${SITE_ORIGIN}/en/tools/${item.id}` : `${SITE_ORIGIN}/tools/${item.id}`,
          applicationCategory: 'BrowserApplication',
          operatingSystem: 'Chrome, Edge',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
        }
      }))
    });
  }

  const keywords = plugin
    ? [
        plugin.name,
        plugin.category,
        ...plugin.highlights,
        isEn ? 'free Chrome extension,Edge add-on,100-Free' : '免费Chrome扩展,Edge插件,100-Free'
      ].join(',')
    : isEn
      ? '100-Free,free browser extensions,Chrome extension,Edge add-on,full-page screenshot,table to Excel,allow copy,clean redirect,CSS to Tailwind,image sniffer,video speed booster,offline QR code,web highlighter,screen recorder'
      : '100-Free,免费浏览器插件,Chrome扩展,Edge扩展,网页长截图,表格导出Excel,自由复制,外链直达,CSS提取,Tailwind,大图嗅探,视频倍速,离线二维码,网页荧光笔,屏幕录制';

  return { lang: isEn ? 'en' : 'zh-CN', title, description, keywords, canonical, zhUrl, enUrl, ogImage, jsonLd };
}

export async function render(url: string) {
  locale.value = url === '/en' || url.startsWith('/en/') ? 'en' : 'zh';
  const { app, router } = createPortalApp(true);
  await router.push(url);
  await router.isReady();
  const html = await renderToString(app);
  const seo = getSeoMetaForUrl(url);
  return { html, seo };
}

export function generateLlmsFiles() {
  const enPlugins = getLocalizedPlugins('en');
  const zhPlugins = getLocalizedPlugins('zh');

  const llmsTxt = [
    '# 100-Free Browser Productivity Extensions',
    '',
    '> 100-Free is an open-source collection of free, privacy-first, 100% local/offline Chrome and Microsoft Edge Manifest V3 extensions with zero ads, zero paywalls, and zero telemetry.',
    '',
    '## Key Pages',
    `- [Home (EN)](${SITE_ORIGIN}/en): Overview of all ${enPlugins.length} free browser extensions.`,
    `- [Home (ZH)](${SITE_ORIGIN}/): 中文官网首页，展示全部 ${zhPlugins.length} 款免费浏览器扩展。`,
    `- [Install Guide](${SITE_ORIGIN}/en/install): Step-by-step guide to install unpacked ZIP builds on Chrome, Edge, Brave, and Arc.`,
    `- [Privacy Policy](${SITE_ORIGIN}/en/privacy): Zero telemetry, 100% local processing commitment.`,
    `- [Feedback & Community](${SITE_ORIGIN}/en/feedback): GitHub Issues, QQ Group (1076726913), and email contact.`,
    `- [Full LLM Context](${SITE_ORIGIN}/llms-full.txt): Detailed bilingual specifications, features, and usage steps for all extensions.`,
    '',
    '## Extensions',
    ...enPlugins.map((p) => {
      const storeNote = p.edgeStoreUrl ? ` ([Edge Store](${p.edgeStoreUrl}))` : '';
      return `- [${p.name}](${SITE_ORIGIN}/en/tools/${p.id})${storeNote}: ${p.headline} — ${p.summary}`;
    }),
    '',
    '## Source & License',
    '- GitHub: https://github.com/wllcyg/plugins',
    '- License: GPL-3.0-only',
    ''
  ].join('\n');

  const llmsFullTxt = [
    '# 100-Free Browser Productivity Extensions (Full Reference)',
    '',
    `Total live extensions: ${enPlugins.length} / 100`,
    'Platform: Chrome & Microsoft Edge (Chromium Manifest V3)',
    'Pricing: 100% Free forever, zero paywalls, zero watermarks, zero telemetry.',
    'Architecture: All processing (canvas stitching, Excel export, CSS/Tailwind extraction, image sniffing, QR decoding, screen recording) runs locally in the browser.',
    '',
    '---',
    '',
    ...enPlugins.flatMap((enItem, idx) => {
      const zhItem = zhPlugins[idx];
      return [
        `## ${idx + 1}. ${enItem.name} (${zhItem.name})`,
        `- Category: ${enItem.category} / ${zhItem.category}`,
        `- English Page: ${SITE_ORIGIN}/en/tools/${enItem.id}`,
        `- Chinese Page: ${SITE_ORIGIN}/tools/${enItem.id}`,
        ...(enItem.edgeStoreUrl ? [`- Microsoft Edge Store: ${enItem.edgeStoreUrl}`] : []),
        `- Direct ZIP Download: ${enItem.downloadUrl}`,
        `- Highlights (EN): ${enItem.highlights.join(' · ')}`,
        `- Highlights (ZH): ${zhItem.highlights.join(' · ')}`,
        `- Summary (EN): ${enItem.headline}. ${enItem.summary}`,
        `- Summary (ZH): ${zhItem.headline}。${zhItem.summary}`,
        '- Quick Start (EN):',
        ...enItem.steps.map((s, i) => `  ${i + 1}. ${s}`),
        '- Quick Start (ZH):',
        ...zhItem.steps.map((s, i) => `  ${i + 1}. ${s}`),
        ''
      ];
    })
  ].join('\n');

  return { llmsTxt, llmsFullTxt };
}
