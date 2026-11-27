<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Moon, Sun } from 'lucide-vue-next';
import { getLocalizedPlugins, GITHUB_REPO_URL } from './data/plugins';
import { locale, t, toggleLocale } from './data/i18n';
import { theme, toggleTheme } from './data/theme';
import HomePage from './components/HomePage.vue';
import PluginDetailPage from './components/PluginDetailPage.vue';

const InstallGuide = defineAsyncComponent(() => import('./components/InstallGuide.vue'));
const FeedbackPage = defineAsyncComponent(() => import('./components/FeedbackPage.vue'));
const PrivacyPage = defineAsyncComponent(() => import('./components/PrivacyPage.vue'));

const logoUrl = import.meta.env.BASE_URL + 'logo.svg';
const route = useRoute();
const router = useRouter();
const plugins = computed(() => getLocalizedPlugins(locale.value));
const cleanPath = computed(() => route.path.replace(/^\/en(?=\/|$)/, '') || '/');
const isInstallGuide = computed(() => cleanPath.value === '/install' || route.query.page === 'install');
const isFeedbackPage = computed(() => cleanPath.value === '/feedback');
const isPrivacyPage = computed(() => cleanPath.value === '/privacy');
const activeToolId = computed(() => (route.params.toolId as string | undefined) || (route.query.tool as string | undefined));
const selected = computed(() =>
  isInstallGuide.value || isFeedbackPage.value || isPrivacyPage.value
    ? undefined
    : plugins.value.find((plugin) => plugin.id === activeToolId.value)
);
const pageRoot = ref<HTMLElement>();

const localizedPath = (path: string) =>
  locale.value === 'en' ? (path === '/' ? '/en' : `/en${path}`) : path;
const detailUrl = (id: string) => localizedPath(`/tools/${id}`);

const relatedPlugins = computed(() => {
  if (!selected.value) return [];
  const sameGroup = plugins.value.filter(
    (p) => p.id !== selected.value?.id && p.categoryGroup === selected.value?.categoryGroup
  );
  const others = plugins.value.filter(
    (p) => p.id !== selected.value?.id && p.categoryGroup !== selected.value?.categoryGroup
  );
  return [...sameGroup, ...others].slice(0, 3);
});

watch(
  () => [route.path, route.query.lang] as const,
  ([path, queryLang]) => {
    if (path === '/en' || path.startsWith('/en/') || queryLang === 'en') {
      locale.value = 'en';
    } else {
      locale.value = 'zh';
    }
  },
  { immediate: true }
);

function handleToggleLocale() {
  const nextLocale = locale.value === 'zh' ? 'en' : 'zh';
  toggleLocale();
  const targetPath = nextLocale === 'en' ? (cleanPath.value === '/' ? '/en' : `/en${cleanPath.value}`) : cleanPath.value;
  if (route.path !== targetPath) {
    void router.push({ path: targetPath, hash: route.hash });
  }
}

function setMetaContent(selector: string, content: string) {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) el.content = content;
}

const SITE_ORIGIN = 'https://plugins.cheatppf.xyz';

function setLinkHref(selector: string, href: string) {
  const el = document.querySelector<HTMLLinkElement>(selector);
  if (el) el.href = href;
}

watch([selected, isInstallGuide, isFeedbackPage, isPrivacyPage, locale], ([plugin, installPage, feedbackPage, privacyPage]) => {
  if (typeof document === 'undefined') return;
  const title = installPage
    ? t.value.siteTitleInstall
    : feedbackPage
      ? t.value.siteTitleFeedback
      : privacyPage
        ? t.value.siteTitlePrivacy
        : plugin
          ? t.value.siteTitleDetail(plugin.name)
          : t.value.siteTitleHome;
  const description = installPage
    ? t.value.installPageSubtitle
    : feedbackPage
      ? t.value.feedbackPageSubtitle
      : privacyPage
        ? t.value.privacyPageSubtitle
        : plugin
          ? `${plugin.tagline}${locale.value === 'en' ? ': ' : '：'}${plugin.summary}`
          : t.value.heroDesc(plugins.value.length);
  const pathSuffix = installPage
    ? '/install'
    : feedbackPage
      ? '/feedback'
      : privacyPage
        ? '/privacy'
        : plugin
          ? `/tools/${plugin.id}`
          : '/';
  const zhUrl = `${SITE_ORIGIN}${pathSuffix}`;
  const enUrl = `${SITE_ORIGIN}${pathSuffix === '/' ? '/en' : `/en${pathSuffix}`}`;
  const canonicalUrl = locale.value === 'en' ? enUrl : zhUrl;
  const ogImage = plugin?.preview?.startsWith('http')
    ? plugin.preview
    : plugin?.preview
      ? `${SITE_ORIGIN}${plugin.preview.startsWith('/') ? '' : '/'}${plugin.preview}`
      : `${SITE_ORIGIN}/og-cover.png`;

  const keywords = plugin
    ? [
        plugin.name,
        plugin.category,
        ...plugin.highlights.map((h) => h.title),
        locale.value === 'en' ? 'free Chrome extension,Edge add-on,100-Free' : '免费Chrome扩展,Edge插件,100-Free'
      ].join(',')
    : locale.value === 'en'
      ? '100-Free,free browser extensions,Chrome extension,Edge add-on,full-page screenshot,table to Excel,allow copy,clean redirect,CSS to Tailwind,image sniffer,video speed booster,offline QR code,web highlighter,screen recorder'
      : '100-Free,免费浏览器插件,Chrome扩展,Edge扩展,网页长截图,表格导出Excel,自由复制,外链直达,CSS提取,Tailwind,大图嗅探,视频倍速,离线二维码,网页荧光笔,屏幕录制';

  document.title = title;
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[name="keywords"]', keywords);
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', description);
  setMetaContent('meta[property="og:url"]', canonicalUrl);
  setMetaContent('meta[property="og:image"]', ogImage);
  setMetaContent('meta[name="twitter:title"]', title);
  setMetaContent('meta[name="twitter:description"]', description);
  setMetaContent('meta[name="twitter:image"]', ogImage);
  setLinkHref('link[rel="canonical"]', canonicalUrl);
  setLinkHref('link[rel="alternate"][hreflang="zh-CN"]', zhUrl);
  setLinkHref('link[rel="alternate"][hreflang="en"]', enUrl);
  setLinkHref('link[rel="alternate"][hreflang="x-default"]', zhUrl);
}, { immediate: true });

function moveToLocation(focusTarget?: HTMLElement) {
  const id = route.hash.slice(1);
  const target = id ? document.getElementById(id) : undefined;
  if (target) target.scrollIntoView({ behavior: 'instant' });
  else window.scrollTo({ top: 0, behavior: 'instant' });
  if (!target) focusTarget?.focus({ preventScroll: true });
}

watch(
  () => route.fullPath,
  async () => {
    await nextTick();
    moveToLocation(pageRoot.value);
  }
);

function skipToMain(event: MouseEvent) {
  event.preventDefault();
  pageRoot.value?.focus();
  pageRoot.value?.scrollIntoView();
}

onMounted(async () => {
  await router.isReady();
  if (route.query.page === 'install') {
    await router.replace({ path: '/install', hash: route.hash });
  } else if (typeof route.query.tool === 'string' && route.query.tool) {
    await router.replace({ path: `/tools/${route.query.tool}`, hash: route.hash });
  }
  await nextTick();
  moveToLocation();
});
</script>

<template>
  <a class="skip-link" href="#main" @click="skipToMain">{{ t.skipToMain }}</a>

  <!-- 模块一：顶部毛玻璃导航栏 -->
  <header class="apple-header">
    <div class="header-inner">
      <RouterLink class="brand" :to="{ path: localizedPath('/'), hash: '' }" translate="no">
        <img :src="logoUrl" alt="" width="24" height="24" />
        <span>100<span class="brand-hyphen">-</span>Free</span>
      </RouterLink>

      <nav class="header-nav" :aria-label="t.navAriaLabel">
        <RouterLink :to="{ path: localizedPath('/'), hash: '#directory' }">{{ t.navAllPlugins }}</RouterLink>
        <RouterLink :to="localizedPath('/install')">{{ t.navInstallGuide }}</RouterLink>
        <RouterLink :to="localizedPath('/feedback')">{{ t.navFeedback }}</RouterLink>
        <RouterLink :to="{ path: localizedPath('/'), hash: '#principles' }">{{ t.navPrinciples }}</RouterLink>
        <RouterLink :to="{ path: localizedPath('/'), hash: '#about' }">{{ t.navAbout }}</RouterLink>
      </nav>

      <div class="header-actions">
        <button
          type="button"
          class="icon-circle-btn lang-toggle"
          :title="locale === 'zh' ? 'Switch to English' : '切换为中文'"
          @click="handleToggleLocale"
        >
          {{ t.switchLangLabel }}
        </button>
        <button
          type="button"
          class="icon-circle-btn"
          :aria-label="theme === 'light' ? t.switchToDark : t.switchToLight"
          :title="theme === 'light' ? t.switchToDark : t.switchToLight"
          @click="toggleTheme"
        >
          <Moon v-if="theme === 'light'" :size="15" aria-hidden="true" />
          <Sun v-else :size="15" aria-hidden="true" />
        </button>
      </div>
    </div>
  </header>

  <main v-if="isInstallGuide" id="main" key="install-guide" ref="pageRoot" class="subpage-shell" tabindex="-1">
    <InstallGuide />
  </main>

  <main v-else-if="isFeedbackPage" id="main" key="feedback-page" ref="pageRoot" class="subpage-shell" tabindex="-1">
    <FeedbackPage />
  </main>

  <main v-else-if="isPrivacyPage" id="main" key="privacy-page" ref="pageRoot" class="subpage-shell" tabindex="-1">
    <PrivacyPage />
  </main>

  <main v-else-if="!selected" id="main" key="home" ref="pageRoot" tabindex="-1">
    <HomePage :plugins="plugins" :localized-path="localizedPath" :detail-url="detailUrl" />
  </main>

  <main v-else id="main" :key="selected.id" ref="pageRoot" tabindex="-1">
    <PluginDetailPage
      :plugin="selected"
      :plugins-count="plugins.length"
      :related-plugins="relatedPlugins"
      :localized-path="localizedPath"
      :detail-url="detailUrl"
    />
  </main>

  <!-- 模块八：极简页脚 -->
  <footer class="apple-footer">
    <div class="footer-inner">
      <span class="footer-copy">{{ t.footerCopyright }}</span>
      <div class="footer-links">
        <RouterLink :to="{ path: localizedPath('/'), hash: '#directory' }">{{ t.navAllPlugins }}</RouterLink>
        <RouterLink :to="localizedPath('/install')">{{ t.navInstallGuide }}</RouterLink>
        <RouterLink :to="localizedPath('/feedback')">{{ t.navFeedback }}</RouterLink>
        <RouterLink :to="localizedPath('/privacy')">{{ t.navPrivacy }}</RouterLink>
      </div>
      <a :href="GITHUB_REPO_URL" target="_blank" rel="noopener noreferrer" class="footer-github">
        GitHub ↗
      </a>
    </div>
  </footer>
</template>

<style scoped>
.skip-link {
  position: fixed;
  z-index: 60;
  top: 8px;
  left: 8px;
  transform: translateY(-180%);
  background: var(--apple-card);
  color: var(--apple-text);
  padding: 8px 14px;
  border-radius: 980px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
.skip-link:focus {
  transform: none;
}

.subpage-shell {
  width: min(100% - 48px, 1120px);
  margin-inline: auto;
}

/* 顶部毛玻璃导航栏 */
.apple-header {
  position: sticky;
  top: 0;
  z-index: 50;
  height: 50px;
  background: var(--apple-header-bg);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--apple-divider);
}
.header-inner {
  width: min(100% - 48px, 1120px);
  height: 100%;
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--apple-text);
  white-space: nowrap;
}
.brand img {
  border-radius: 6px;
}
.brand-hyphen {
  color: var(--apple-blue);
}

.header-nav {
  display: flex;
  align-items: center;
  gap: clamp(16px, 2.8vw, 32px);
}
.header-nav a {
  font-size: 12.5px;
  font-weight: 400;
  color: var(--apple-text);
  opacity: 0.78;
  transition: opacity 0.25s var(--apple-ease);
  white-space: nowrap;
}
.header-nav a:hover {
  opacity: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.icon-circle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding-inline: 8px;
  border-radius: 980px;
  border: none;
  background: transparent;
  color: var(--apple-text);
  font-size: 12px;
  font-weight: 500;
  opacity: 0.82;
  cursor: pointer;
  transition: background-color 0.2s ease, opacity 0.2s ease;
}
.icon-circle-btn:hover {
  opacity: 1;
  background-color: color-mix(in srgb, var(--apple-text) 8%, transparent);
}

/* 极简页脚 */
.apple-footer {
  background-color: #1d1d1f;
  color: #86868b;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 72px;
  display: flex;
  align-items: center;
}
:root[data-theme="dark"] .apple-footer {
  background-color: #000000;
}
.footer-inner {
  width: min(100% - 48px, 1120px);
  margin-inline: auto;
  padding-block: 20px;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  font-size: 12.5px;
}
.footer-copy {
  color: #86868b;
}
.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}
.footer-links a,
.footer-github {
  color: #a1a1a6;
  transition: color 0.2s ease;
}
.footer-links a:hover,
.footer-github:hover {
  color: #f5f5f7;
}

@media (max-width: 768px) {
  .header-nav {
    display: none;
  }
  .footer-inner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
