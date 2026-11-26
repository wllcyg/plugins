import { renderToString } from 'vue/server-renderer';
import { createPortalApp } from './main';
import { getLocalizedPlugins } from './data/plugins';
import { t } from './data/i18n';

const SITE_ORIGIN = 'https://plugins.cheatppf.xyz';

export interface PageSeoMeta {
  title: string;
  description: string;
  canonical: string;
  enUrl: string;
  ogImage: string;
  faqSchema?: string;
}

export function getStaticRoutes(): string[] {
  const plugins = getLocalizedPlugins('zh');
  return ['/', '/install', '/feedback', ...plugins.map((p) => `/tools/${p.id}`)];
}

function getSeoMetaForUrl(url: string): PageSeoMeta {
  const plugins = getLocalizedPlugins('zh');
  const isInstall = url === '/install';
  const isFeedback = url === '/feedback';
  const toolId = url.startsWith('/tools/') ? url.replace('/tools/', '') : undefined;
  const plugin = toolId ? plugins.find((p) => p.id === toolId) : undefined;

  const title = isInstall
    ? t.value.siteTitleInstall
    : isFeedback
      ? t.value.siteTitleFeedback
      : plugin
        ? t.value.siteTitleDetail(plugin.name)
        : t.value.siteTitleHome;

  const description = isInstall
    ? t.value.installPageSubtitle
    : isFeedback
      ? t.value.feedbackPageSubtitle
      : plugin
        ? `${plugin.headline}：${plugin.summary}`
        : t.value.heroDesc(plugins.length);

  const canonical = isInstall
    ? `${SITE_ORIGIN}/install`
    : isFeedback
      ? `${SITE_ORIGIN}/feedback`
      : plugin
        ? `${SITE_ORIGIN}/tools/${plugin.id}`
        : `${SITE_ORIGIN}/`;

  const enUrl = `${canonical}?lang=en`;
  const ogImage = plugin?.preview
    ? plugin.preview.startsWith('http')
      ? plugin.preview
      : `${SITE_ORIGIN}${plugin.preview.startsWith('/') ? '' : '/'}${plugin.preview}`
    : `${SITE_ORIGIN}/og-cover.png`;

  let faqSchema: string | undefined;
  if (isInstall) {
    faqSchema = JSON.stringify({
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
  }

  return { title, description, canonical, enUrl, ogImage, faqSchema };
}

export async function render(url: string) {
  const { app, router } = createPortalApp(true);
  await router.push(url);
  await router.isReady();
  const html = await renderToString(app);
  const seo = getSeoMetaForUrl(url);
  return { html, seo };
}
