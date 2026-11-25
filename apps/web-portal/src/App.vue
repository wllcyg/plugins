<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import gsap from 'gsap';
import {
  ArrowDown,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Cpu,
  Download,
  ExternalLink,
  FileArchive,
  Grid2X2,
  Languages,
  LayoutGrid,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-vue-next';
import { getLocalizedPlugins, GITHUB_RELEASES_URL, GITHUB_REPO_URL } from './data/plugins';
import { locale, t, toggleLocale } from './data/i18n';
import InstallGuide from './components/InstallGuide.vue';

const logoUrl = import.meta.env.BASE_URL + 'logo.svg';
const route = useRoute();
const router = useRouter();
const plugins = computed(() => getLocalizedPlugins(locale.value));
const isInstallGuide = computed(() => route.query.page === 'install');
const selected = computed(() => (isInstallGuide.value ? undefined : plugins.value.find((plugin) => plugin.id === route.query.tool)));
const pageRoot = ref<HTMLElement>();
const detailUrl = (id: string) => ({ query: { tool: id } });
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 首屏轮播图：覆盖全部插件，支持自动播放、悬停暂停与左右切换
const activeSlideIndex = ref(0);
const activeSlide = computed(() => plugins.value[activeSlideIndex.value] || plugins.value[0]);
let autoplayTimer: number | null = null;

function nextSlide() {
  activeSlideIndex.value = (activeSlideIndex.value + 1) % plugins.value.length;
}

function prevSlide() {
  activeSlideIndex.value = (activeSlideIndex.value - 1 + plugins.value.length) % plugins.value.length;
}

function startAutoplay() {
  stopAutoplay();
  if (reduceMotion()) return;
  autoplayTimer = window.setInterval(nextSlide, 4200);
}

function stopAutoplay() {
  if (autoplayTimer !== null) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
}

const ALL_CATEGORY = '__ALL__';
const searchQuery = ref('');
const selectedCategory = ref(ALL_CATEGORY);
const categories = computed(() => [
  ALL_CATEGORY,
  ...Array.from(new Set(plugins.value.map((p) => p.category)))
]);

// 语言切换时重置分类筛选，避免旧语言分类名失效
watch(locale, () => {
  selectedCategory.value = ALL_CATEGORY;
});

const filteredPlugins = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return plugins.value.filter((p) => {
    const matchCategory = selectedCategory.value === ALL_CATEGORY || p.category === selectedCategory.value;
    if (!matchCategory) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.headline.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.highlights.some((h) => h.toLowerCase().includes(q))
    );
  });
});

const relatedPlugins = computed(() =>
  plugins.value.filter((p) => p.id !== selected.value?.id).slice(0, 3)
);

function setMetaContent(selector: string, content: string) {
  const el = document.querySelector<HTMLMetaElement>(selector);
  if (el) el.content = content;
}

const SITE_ORIGIN = 'https://plugins.cheatppf.xyz';

function setLinkHref(selector: string, href: string) {
  const el = document.querySelector<HTMLLinkElement>(selector);
  if (el) el.href = href;
}

watch([selected, isInstallGuide, locale], ([plugin, installPage]) => {
  const title = installPage
    ? t.value.siteTitleInstall
    : plugin
      ? t.value.siteTitleDetail(plugin.name)
      : t.value.siteTitleHome;
  const description = installPage
    ? t.value.installPageSubtitle
    : plugin
      ? `${plugin.headline}：${plugin.summary}`
      : t.value.heroDesc(plugins.value.length);
  const canonicalUrl = installPage
    ? `${SITE_ORIGIN}/?page=install`
    : plugin
      ? `${SITE_ORIGIN}/?tool=${plugin.id}`
      : `${SITE_ORIGIN}/`;
  const enUrl = installPage
    ? `${SITE_ORIGIN}/?page=install&lang=en`
    : plugin
      ? `${SITE_ORIGIN}/?tool=${plugin.id}&lang=en`
      : `${SITE_ORIGIN}/?lang=en`;

  document.title = title;
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', description);
  setMetaContent('meta[property="og:url"]', canonicalUrl);
  setMetaContent('meta[name="twitter:title"]', title);
  setMetaContent('meta[name="twitter:description"]', description);
  setLinkHref('link[rel="canonical"]', locale.value === 'en' ? enUrl : canonicalUrl);
  setLinkHref('link[rel="alternate"][hreflang="zh-CN"]', canonicalUrl);
  setLinkHref('link[rel="alternate"][hreflang="en"]', enUrl);
  setLinkHref('link[rel="alternate"][hreflang="x-default"]', canonicalUrl);
}, { immediate: true });

function moveToLocation(focusTarget?: HTMLElement) {
  const id = route.hash.slice(1);
  const target = id ? document.getElementById(id) : undefined;
  if (target) target.scrollIntoView({ behavior: 'instant' });
  else window.scrollTo({ top: 0, behavior: 'instant' });
  if (!target) focusTarget?.focus({ preventScroll: true });
}

function enterPage(element: Element, done: () => void) {
  if (element instanceof HTMLElement) moveToLocation(element);
  if (reduceMotion()) { done(); return; }
  gsap.fromTo(element, { opacity: 0, y: 11 }, {
    opacity: 1, y: 0, duration: 0.28, ease: 'power2.out', clearProps: 'opacity,transform', onComplete: done
  });
}

function leavePage(element: Element, done: () => void) {
  gsap.killTweensOf(element);
  if (reduceMotion()) { done(); return; }
  gsap.to(element, { opacity: 0, duration: 0.12, ease: 'power1.in', onComplete: done });
}

function clearTransition(element: Element) {
  gsap.killTweensOf(element);
  gsap.set(element, { clearProps: 'opacity,transform' });
}

function skipToMain(event: MouseEvent) {
  event.preventDefault();
  pageRoot.value?.focus();
  pageRoot.value?.scrollIntoView();
}

onMounted(async () => {
  await router.isReady();
  await nextTick();
  moveToLocation();
  startAutoplay();
  if (reduceMotion() || route.hash || selected.value || isInstallGuide.value || !pageRoot.value) return;
  const intro = pageRoot.value.querySelectorAll('.hero-copy > *, .hero-preview');
  gsap.from(intro, { opacity: 0, y: 12, duration: 0.36, stagger: 0.055, ease: 'power2.out', clearProps: 'opacity,transform' });
});

onUnmounted(() => {
  stopAutoplay();
});
</script>

<template>
  <a class="skip-link" href="#main" @click="skipToMain">{{ t.skipToMain }}</a>

  <header class="site-header">
    <div class="shell topbar">
      <RouterLink class="brand" :to="{ query: {}, hash: '' }" translate="no">
        <img :src="logoUrl" alt="" width="34" height="34" />
        <span>100<span class="brand-hyphen">-</span>Free</span>
        <span class="brand-badge">{{ t.brandBadge(plugins.length) }}</span>
      </RouterLink>
      <nav :aria-label="t.navAriaLabel">
        <RouterLink :to="{ query: {}, hash: '#directory' }"><LayoutGrid :size="15" aria-hidden="true" />{{ t.navAllPlugins }}</RouterLink>
        <RouterLink :to="{ query: { page: 'install' }, hash: '' }"><FileArchive :size="15" aria-hidden="true" />{{ t.navInstallGuide }}</RouterLink>
        <RouterLink :to="{ query: {}, hash: '#principles' }"><ShieldCheck :size="15" aria-hidden="true" />{{ t.navPrinciples }}</RouterLink>
        <a href="#about"><CircleHelp :size="15" aria-hidden="true" />{{ t.navAbout }}</a>
        <button type="button" class="lang-btn" :aria-label="locale === 'zh' ? 'Switch to English' : '切换为中文'" @click="toggleLocale">
          <Languages :size="14" aria-hidden="true" />
          <span>{{ t.switchLangLabel }}</span>
        </button>
      </nav>
    </div>
  </header>

  <Transition mode="out-in" :css="false" @enter="enterPage" @leave="leavePage"
    @enter-cancelled="clearTransition" @leave-cancelled="clearTransition">
    <main v-if="isInstallGuide" id="main" key="install-guide" ref="pageRoot" class="shell" tabindex="-1">
      <InstallGuide />
    </main>

    <main v-else-if="!selected" id="main" key="home" ref="pageRoot" tabindex="-1">
      <section class="shell hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <div class="hero-eyebrow">
            <Sparkles :size="14" aria-hidden="true" />
            <span>{{ t.heroEyebrow }}</span>
          </div>
          <h1 id="hero-title">{{ t.heroTitleLine1 }}<br>{{ t.heroTitleLine2 }}<span>.</span></h1>
          <p>{{ t.heroDesc(plugins.length) }}</p>
          <div class="hero-actions">
            <a href="#directory" class="primary-link">{{ t.heroCtaPrimary(plugins.length) }} <ArrowDown :size="17" aria-hidden="true" /></a>
            <a href="#principles" class="secondary-link">{{ t.heroCtaSecondary }}</a>
          </div>
        </div>

        <figure
          class="hero-preview"
          aria-roledescription="carousel"
          :aria-label="t.carouselAriaLabel"
          @mouseenter="stopAutoplay"
          @mouseleave="startAutoplay"
        >
          <div class="preview-frame carousel-box">
            <div class="carousel-viewport">
              <Transition name="slide-fade" mode="out-in">
                <RouterLink :key="activeSlide.id" :to="detailUrl(activeSlide.id)" class="carousel-link">
                  <img
                    :src="activeSlide.preview"
                    :alt="activeSlide.previewAlt"
                    :width="activeSlide.previewWidth"
                    :height="activeSlide.previewHeight"
                    fetchpriority="high"
                  />
                </RouterLink>
              </Transition>
            </div>

            <button
              type="button"
              class="carousel-nav carousel-prev"
              :aria-label="locale === 'zh' ? '上一张' : 'Previous slide'"
              @click="prevSlide"
            >
              <ChevronLeft :size="18" aria-hidden="true" />
            </button>
            <button
              type="button"
              class="carousel-nav carousel-next"
              :aria-label="locale === 'zh' ? '下一张' : 'Next slide'"
              @click="nextSlide"
            >
              <ChevronRight :size="18" aria-hidden="true" />
            </button>

            <div class="carousel-dots" role="tablist" :aria-label="locale === 'zh' ? '轮播图切换' : 'Carousel slides'">
              <button
                v-for="(item, idx) in plugins"
                :key="item.id"
                type="button"
                role="tab"
                :aria-selected="activeSlideIndex === idx"
                :aria-label="item.name"
                :class="['dot', { active: activeSlideIndex === idx }]"
                @click="activeSlideIndex = idx"
              ></button>
            </div>
          </div>

          <figcaption>
            <div class="caption-meta">
              <img :src="activeSlide.icon" alt="" width="20" height="20" />
              <span class="caption-name">{{ activeSlide.name }}</span>
              <span class="caption-cat">{{ activeSlide.category }}</span>
            </div>
            <RouterLink :to="detailUrl(activeSlide.id)" class="text-link">
              {{ t.viewDetails }} <ChevronRight :size="14" aria-hidden="true" />
            </RouterLink>
          </figcaption>
        </figure>
      </section>

      <section id="principles" class="principles" aria-labelledby="principles-title">
        <div class="shell">
          <div class="section-head">
            <h2 id="principles-title">{{ t.principlesTitle }}</h2>
            <p class="section-sub">{{ t.principlesSub }}</p>
          </div>
          <div class="principles-grid">
            <article class="principle-card">
              <div class="principle-icon"><Lock :size="20" aria-hidden="true" /></div>
              <h3>{{ t.principle1Title }}</h3>
              <p>{{ t.principle1Desc }}</p>
            </article>
            <article class="principle-card">
              <div class="principle-icon"><Sparkles :size="20" aria-hidden="true" /></div>
              <h3>{{ t.principle2Title }}</h3>
              <p>{{ t.principle2Desc }}</p>
            </article>
            <article class="principle-card">
              <div class="principle-icon"><Cpu :size="20" aria-hidden="true" /></div>
              <h3>{{ t.principle3Title }}</h3>
              <p>{{ t.principle3Desc }}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="directory" class="shell directory" aria-labelledby="directory-title">
        <div class="directory-header">
          <div>
            <h2 id="directory-title" class="section-title"><Grid2X2 :size="23" aria-hidden="true" />{{ t.directoryTitle }}</h2>
            <p class="section-sub">{{ t.directorySub }}</p>
          </div>
          <div class="search-box">
            <Search :size="16" class="search-icon" aria-hidden="true" />
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="t.searchPlaceholder"
              :aria-label="t.searchAria"
            />
            <button v-if="searchQuery" type="button" class="clear-search" :aria-label="t.clearSearchAria" @click="searchQuery = ''">
              <X :size="14" />
            </button>
          </div>
        </div>

        <div class="category-pills" role="group" :aria-label="t.categoryAriaLabel">
          <button
            v-for="cat in categories"
            :key="cat"
            type="button"
            :aria-pressed="selectedCategory === cat"
            :class="['pill', { active: selectedCategory === cat }]"
            @click="selectedCategory = cat"
          >
            {{ cat === ALL_CATEGORY ? t.allCategory : cat }}
            <span class="pill-count">
              {{ cat === ALL_CATEGORY ? plugins.length : plugins.filter((p) => p.category === cat).length }}
            </span>
          </button>
        </div>

        <div v-if="filteredPlugins.length === 0" class="empty-state">
          <p>{{ t.emptyResult(searchQuery) }}</p>
          <button type="button" class="secondary-link" @click="searchQuery = ''; selectedCategory = ALL_CATEGORY">{{ t.resetFilter }}</button>
        </div>

        <ul v-else class="plugin-grid">
          <li v-for="tool in filteredPlugins" :key="tool.id">
            <RouterLink class="plugin-card" :to="detailUrl(tool.id)">
              <div class="card-top">
                <img :src="tool.icon" alt="" width="46" height="46" />
                <div class="card-title-wrap">
                  <span class="card-category">{{ tool.category }}</span>
                  <h3>{{ tool.name }}</h3>
                </div>
                <ChevronRight :size="18" class="card-arrow" aria-hidden="true" />
              </div>
              <p class="card-headline">{{ tool.headline }}</p>
              <p class="card-summary">{{ tool.summary }}</p>
              <div class="card-tags">
                <span v-for="tag in tool.highlights" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </RouterLink>
          </li>
        </ul>
      </section>
    </main>

    <main v-else id="main" :key="selected.id" ref="pageRoot" class="shell detail" tabindex="-1">
      <RouterLink :to="{ query: {}, hash: '#directory' }" class="text-link">
        <ArrowLeft :size="16" aria-hidden="true" />{{ t.backToDirectory(plugins.length) }}
      </RouterLink>

      <div class="detail-heading">
        <img :src="selected.icon" alt="" width="64" height="64" />
        <div>
          <span class="card-category">{{ selected.category }}</span>
          <h1>{{ selected.name }}</h1>
        </div>
      </div>

      <p class="detail-headline">{{ selected.headline }}</p>
      <p class="detail-summary">{{ selected.summary }}</p>

      <div class="detail-highlights">
        <span v-for="tag in selected.highlights" :key="tag" class="highlight-pill">
          <CheckCircle2 :size="14" aria-hidden="true" /> {{ tag }}
        </span>
      </div>

      <p class="availability detail-availability">
        <ShieldCheck :size="16" aria-hidden="true" />{{ t.detailAvailability }}
      </p>

      <div class="detail-download-box">
        <div class="detail-download-actions">
          <a :href="selected.downloadUrl" class="primary-link" target="_blank" rel="noopener noreferrer">
            <Download :size="17" aria-hidden="true" />{{ t.downloadZip }}
          </a>
          <a :href="GITHUB_RELEASES_URL" class="secondary-link" target="_blank" rel="noopener noreferrer">
            <ExternalLink :size="16" aria-hidden="true" />{{ t.viewReleases }}
          </a>
        </div>
        <div class="install-tip">
          <strong>{{ t.installTipTitle }}</strong>
          <span>{{ t.installTipDesc }}</span>
          <RouterLink :to="{ query: { page: 'install' }, hash: '' }" class="text-link guide-inline-link">
            {{ t.viewFullInstallGuide }} <ChevronRight :size="14" aria-hidden="true" />
          </RouterLink>
        </div>
      </div>

      <div class="detail-preview-wrap">
        <img
          class="detail-preview"
          :src="selected.preview"
          :alt="selected.previewAlt"
          :width="selected.previewWidth"
          :height="selected.previewHeight"
        />
      </div>

      <section class="instructions" aria-labelledby="instructions-title">
        <h2 id="instructions-title" class="section-title"><BookOpen :size="22" aria-hidden="true" />{{ t.stepsTitle }}</h2>
        <ol>
          <li v-for="step in selected.steps" :key="step">{{ step }}</li>
        </ol>
      </section>

      <section class="related-section" aria-labelledby="related-title">
        <h2 id="related-title">{{ t.relatedTitle }}</h2>
        <div class="related-grid">
          <RouterLink v-for="item in relatedPlugins" :key="item.id" :to="detailUrl(item.id)" class="related-card">
            <img :src="item.icon" alt="" width="36" height="36" />
            <div>
              <strong>{{ item.name }}</strong>
              <span>{{ item.category }}</span>
            </div>
            <ChevronRight :size="16" aria-hidden="true" />
          </RouterLink>
        </div>
      </section>
    </main>
  </Transition>

  <footer id="about">
    <div class="shell footer-content">
      <div>
        <h2>{{ t.footerTitle }}</h2>
        <p>{{ t.footerDesc }}</p>
      </div>
      <div class="footer-meta">
        <a :href="GITHUB_REPO_URL" target="_blank" rel="noopener noreferrer" class="text-link">GitHub</a>
        <span>·</span>
        <span>{{ t.footerProgress(plugins.length) }}</span>
        <span>·</span>
        <span>{{ t.footerPlatform }}</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.shell { width: min(100% - 48px, 1140px); margin-inline: auto; }
.skip-link { position: fixed; z-index: 20; top: 8px; left: 8px; transform: translateY(-180%); background: var(--color-paper); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--color-line); }
.skip-link:focus { transform: none; }

/* Header */
.site-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: color-mix(in srgb, var(--color-sand) 88%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-line);
}
.topbar, .footer-content { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.topbar { min-height: 66px; }
.brand { display: inline-flex; align-items: center; gap: 10px; font-size: 21px; letter-spacing: -.04em; font-weight: 800; white-space: nowrap; }
.brand img { flex-shrink: 0; border-radius: 8px; }
.brand-hyphen, .hero h1 span { color: var(--color-action); }
.brand-badge {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-action) 12%, transparent);
  color: var(--color-action);
}
nav { display: flex; align-items: center; gap: clamp(10px, 2.5vw, 24px); font-size: 14px; color: var(--color-muted); font-weight: 550; }
nav a, .section-title, .detail-availability { display: flex; align-items: center; gap: 6px; }
.section-title { gap: 10px; }
.section-title svg, .detail-availability svg { flex-shrink: 0; color: var(--color-action); }
nav a:hover, .text-link:hover { color: var(--color-ink); text-decoration: underline; text-underline-offset: 4px; }
.lang-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid var(--color-line);
  background: var(--color-paper);
  color: var(--color-ink);
  font-size: 12.5px;
  font-weight: 650;
  cursor: pointer;
  transition: border-color .15s ease, background .15s ease;
}
.lang-btn:hover { border-color: var(--color-taupe); background: var(--color-stone); }

/* Hero */
.hero { display: grid; align-items: center; grid-template-columns: .92fr 1.08fr; gap: clamp(24px, 4.5vw, 64px); padding-block: clamp(44px, 7vw, 88px); }
.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--color-action);
  background: var(--color-paper);
  border: 1px solid var(--color-line);
  padding: 5px 12px;
  border-radius: 999px;
  margin-bottom: 18px;
}
.hero h1 { margin: 0; font-size: clamp(36px, 5vw, 66px); line-height: 1.08; letter-spacing: -.05em; font-weight: 850; }
.hero p { max-width: 40ch; margin: 20px 0 26px; color: var(--color-muted); font-size: clamp(15.5px, 1.4vw, 18px); line-height: 1.7; }
.hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.primary-link, .secondary-link, .text-link { display: inline-flex; align-items: center; gap: 8px; font-weight: 650; }
.primary-link { min-height: 44px; padding: 10px 18px; border-radius: 8px; background: var(--color-action); color: white; transition: background .16s ease, transform .16s ease; }
.primary-link:hover { background: var(--color-action-hover); transform: translateY(-1px); }
.secondary-link { min-height: 44px; padding: 10px 16px; border-radius: 8px; background: var(--color-paper); border: 1px solid var(--color-line); color: var(--color-ink); transition: border-color .16s ease; cursor: pointer; }
.secondary-link:hover { border-color: var(--color-taupe); }

/* Hero Carousel */
.hero-preview { margin: 0; }
.preview-frame {
  position: relative;
  padding: 8px;
  border: 1px solid var(--color-line);
  border-radius: 14px;
  background: var(--color-paper);
  box-shadow: 0 20px 50px #24272d14;
}
.carousel-viewport {
  overflow: hidden;
  border-radius: 8px;
  background: var(--color-sand);
}
.carousel-link { display: block; }
.preview-frame img {
  display: block;
  width: 100%;
  height: 340px;
  object-fit: cover;
  object-position: top;
  border-radius: 8px;
}
.carousel-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-line) 85%, transparent);
  background: color-mix(in srgb, var(--color-paper) 88%, transparent);
  backdrop-filter: blur(8px);
  color: var(--color-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity .18s ease, background .15s ease, transform .15s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
.carousel-box:hover .carousel-nav,
.carousel-nav:focus-visible { opacity: 1; }
.carousel-nav:hover { background: var(--color-paper); transform: translateY(-50%) scale(1.06); }
.carousel-prev { left: 16px; }
.carousel-next { right: 16px; }

.carousel-dots {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(8px);
}
.dot {
  width: 7px;
  height: 7px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: width .22s ease, background .22s ease;
}
.dot:hover { background: rgba(255, 255, 255, 0.8); }
.dot.active { width: 20px; background: #ffffff; }

.slide-fade-enter-active, .slide-fade-leave-active {
  transition: opacity .24s ease, transform .24s ease;
}
.slide-fade-enter-from { opacity: 0; transform: translateX(12px); }
.slide-fade-leave-to { opacity: 0; transform: translateX(-12px); }

figcaption { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 6px 14px; margin-top: 12px; font-size: 13px; color: var(--color-muted); }
.caption-meta { display: inline-flex; align-items: center; gap: 8px; }
.caption-meta img { border-radius: 5px; }
.caption-name { font-weight: 700; color: var(--color-ink); font-size: 14px; }
.caption-cat {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--color-paper);
  border: 1px solid var(--color-line);
  color: var(--color-muted);
}
.text-link { font-size: 14px; color: var(--color-action); }

/* Principles */
.principles { background: var(--color-paper); border-block: 1px solid var(--color-line); padding-block: 52px 58px; }
.section-head { margin-bottom: 24px; }
h2 { margin: 0; font-size: clamp(23px, 2.8vw, 32px); font-weight: 800; letter-spacing: -.03em; }
.section-sub { margin: 6px 0 0; color: var(--color-muted); font-size: 15px; }
.principles-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.principle-card {
  background: var(--color-sand);
  border: 1px solid var(--color-line);
  border-radius: 12px;
  padding: 22px;
}
.principle-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--color-paper);
  border: 1px solid var(--color-line);
  color: var(--color-action);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.principle-card h3 { margin: 0 0 8px; font-size: 17px; font-weight: 750; }
.principle-card p { margin: 0; font-size: 14px; color: var(--color-muted); line-height: 1.65; }

/* Directory */
.directory { padding-block: 56px 76px; }
.directory-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 16px; }
.search-box {
  position: relative;
  display: flex;
  align-items: center;
  width: min(100%, 300px);
}
.search-icon { position: absolute; left: 12px; color: var(--color-muted); pointer-events: none; }
.search-box input {
  width: 100%;
  height: 40px;
  padding: 0 34px 0 36px;
  border-radius: 8px;
  border: 1px solid var(--color-line);
  background: var(--color-paper);
  color: var(--color-ink);
  font-size: 13.5px;
}
.search-box input:focus { outline: 2px solid var(--color-action); border-color: transparent; }
.clear-search {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  padding: 4px;
  display: flex;
}
.category-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--color-line);
  background: var(--color-paper);
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all .15s ease;
}
.pill:hover { border-color: var(--color-taupe); color: var(--color-ink); }
.pill.active { background: var(--color-action); color: white; border-color: var(--color-action); }
.pill-count { font-size: 11px; opacity: 0.78; }

.plugin-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; padding: 0; margin: 24px 0 0; list-style: none; }
.plugin-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  border: 1px solid var(--color-line);
  border-radius: 14px;
  background: var(--color-paper);
  transition: border-color .16s ease, transform .16s ease, box-shadow .16s ease;
}
.plugin-card:hover {
  border-color: var(--color-taupe);
  transform: translateY(-2px);
  box-shadow: 0 12px 28px #24272d0d;
}
.card-top { display: flex; align-items: center; gap: 12px; }
.card-top img { border-radius: 10px; flex-shrink: 0; }
.card-title-wrap { flex: 1; min-width: 0; }
.card-category { display: inline-block; font-size: 11px; font-weight: 700; color: var(--color-action); margin-bottom: 2px; }
.card-title-wrap h3 { margin: 0; font-size: 17px; font-weight: 780; color: var(--color-ink); }
.card-arrow { color: var(--color-muted); transition: transform .16s ease; }
.plugin-card:hover .card-arrow { transform: translateX(3px); color: var(--color-action); }
.card-headline { margin: 12px 0 6px; font-size: 14.5px; font-weight: 700; color: var(--color-ink); }
.card-summary { margin: 0 0 14px; font-size: 13.5px; color: var(--color-muted); line-height: 1.6; flex: 1; }
.card-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag {
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 6px;
  background: var(--color-sand);
  border: 1px solid var(--color-line);
  color: var(--color-muted);
}

.empty-state {
  text-align: center;
  padding: 48px 20px;
  margin-top: 24px;
  border: 1px dashed var(--color-line);
  border-radius: 14px;
  background: var(--color-paper);
}
.empty-state p { margin: 0 0 16px; color: var(--color-muted); }

/* Detail Page */
.detail { padding-block: 36px 76px; }
.detail-heading { display: flex; align-items: center; gap: 16px; margin-top: 24px; }
.detail-heading img { border-radius: 14px; flex-shrink: 0; }
.detail-heading h1 { margin: 2px 0 0; font-size: clamp(28px, 4.5vw, 46px); font-weight: 850; letter-spacing: -.04em; line-height: 1.15; }
.detail-headline { font-size: 19px; font-weight: 700; color: var(--color-ink); margin: 18px 0 8px; }
.detail-summary { max-width: 62ch; margin: 0 0 18px; color: var(--color-muted); font-size: 16px; line-height: 1.7; }
.detail-highlights { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.highlight-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--color-paper);
  border: 1px solid var(--color-line);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-ink);
}
.highlight-pill svg { color: var(--color-action); }
.availability { color: var(--color-muted); font-size: 13.5px; margin: 0; }
.detail-download-box {
  margin-top: 20px;
  padding: 18px 20px;
  border-radius: 14px;
  border: 1px solid var(--color-line);
  background: var(--color-paper);
  max-width: 900px;
}
.detail-download-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.install-tip {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--color-line);
  font-size: 13px;
  line-height: 1.65;
  color: var(--color-muted);
}
.install-tip strong { display: block; color: var(--color-ink); margin-bottom: 2px; }
.guide-inline-link { margin-top: 6px; }
.detail-preview-wrap {
  margin-top: 24px;
  padding: 10px;
  border: 1px solid var(--color-line);
  border-radius: 14px;
  background: var(--color-paper);
  max-width: 900px;
}
.detail-preview { display: block; width: 100%; height: auto; border-radius: 8px; }
.instructions { margin-top: 36px; }
.instructions ol { list-style: decimal; padding-left: 22px; margin-top: 14px; line-height: 1.9; font-size: 15.5px; }

.related-section { margin-top: 52px; padding-top: 32px; border-top: 1px solid var(--color-line); }
.related-section h2 { font-size: 20px; margin-bottom: 16px; }
.related-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.related-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--color-line);
  background: var(--color-paper);
  transition: border-color .15s ease;
}
.related-card:hover { border-color: var(--color-taupe); }
.related-card img { border-radius: 8px; flex-shrink: 0; }
.related-card > div { flex: 1; min-width: 0; }
.related-card strong { display: block; font-size: 14px; color: var(--color-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.related-card span { font-size: 12px; color: var(--color-muted); }

/* Footer */
footer { border-top: 1px solid var(--color-line); padding-block: 32px; background: var(--color-paper); }
footer h2 { font-size: 16px; }
footer p { font-size: 14px; margin: 6px 0 0; color: var(--color-muted); }
.footer-meta { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-muted); font-weight: 600; white-space: nowrap; }

@media (max-width: 860px) {
  .hero, .principles-grid, .plugin-grid, .related-grid { grid-template-columns: 1fr; }
  .hero { gap: 32px; }
  .footer-content { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 480px) {
  .shell { width: calc(100% - 32px); }
  .brand-badge { display: none; }
}
</style>
