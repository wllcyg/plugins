<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Check, Copy, X } from 'lucide-vue-next';
import { GITHUB_RELEASES_URL, GITHUB_REPO_URL, type PluginItem } from '../data/plugins';
import { locale, t } from '../data/i18n';

const props = defineProps<{
  plugin: PluginItem;
  pluginsCount: number;
  relatedPlugins: PluginItem[];
  localizedPath: (path: string) => string;
  detailUrl: (id: string) => string;
}>();

// ─── 灯箱预览 ────────────────────────────────────────────────────────────────
const isLightboxOpen = ref(false);

function openLightbox() {
  isLightboxOpen.value = true;
}
function closeLightbox() {
  isLightboxOpen.value = false;
}
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isLightboxOpen.value) {
    closeLightbox();
  }
}

// ─── 安装方式分段控制器 & 一键复制 ───────────────────────────────────────────
type InstallTab = 'store' | 'local' | 'quickstart';
const activeInstallTab = ref<InstallTab>(props.plugin.edgeStoreUrl ? 'store' : 'local');

watch(
  () => props.plugin.id,
  () => {
    activeInstallTab.value = props.plugin.edgeStoreUrl ? 'store' : 'local';
    openFaqIdx.value = 0;
  }
);

const copiedExtUrl = ref(false);
async function copyExtUrl() {
  try {
    await navigator.clipboard.writeText('chrome://extensions');
    copiedExtUrl.value = true;
    window.setTimeout(() => {
      copiedExtUrl.value = false;
    }, 2000);
  } catch {
    // ignore
  }
}

// ─── FAQ 手风琴 ──────────────────────────────────────────────────────────────
const openFaqIdx = ref<number | null>(0);
function toggleFaq(idx: number) {
  openFaqIdx.value = openFaqIdx.value === idx ? null : idx;
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <div class="detail-page">
    <!-- 模块一：苹果标志性二级吸顶产品栏 -->
    <div class="local-nav-bar">
      <div class="detail-container local-nav-inner">
        <div class="local-nav-left">
          <RouterLink :to="{ path: localizedPath('/'), hash: '#directory' }" class="local-back-link">
            <span aria-hidden="true">‹</span> {{ t.detailNavAll }}
          </RouterLink>
          <span class="local-nav-sep" aria-hidden="true">/</span>
          <span class="local-product-name">{{ plugin.name }}</span>
        </div>

        <div class="local-nav-right">
          <nav class="local-anchors" aria-label="Product sections">
            <a href="#overview">{{ t.detailNavOverview }}</a>
            <a href="#features">{{ t.detailNavFeatures }}</a>
            <a href="#privacy">{{ t.detailNavPrivacy }}</a>
            <a href="#install">{{ t.detailNavInstall }}</a>
          </nav>
          <a
            :href="plugin.edgeStoreUrl || '#install'"
            :target="plugin.edgeStoreUrl ? '_blank' : undefined"
            :rel="plugin.edgeStoreUrl ? 'noopener noreferrer' : undefined"
            class="local-cta-pill"
          >
            {{ t.detailNavCtaFree }}
          </a>
        </div>
      </div>
    </div>

    <!-- 模块二：居中剧院式产品首屏 -->
    <section id="overview" class="detail-section detail-bg-band detail-hero">
      <div class="detail-container">
        <div class="detail-hero-copy">
          <img
            :src="plugin.icon"
            alt=""
            width="72"
            height="72"
            class="detail-hero-icon"
          />
          <p class="detail-hero-eyebrow">{{ plugin.category }} · Manifest V3</p>
          <h1 class="detail-hero-title">{{ plugin.name }}</h1>
          <p class="detail-hero-tagline">{{ plugin.tagline }}</p>
          <p class="detail-hero-summary">{{ plugin.summary }}</p>

          <div class="detail-hero-ctas">
            <a
              v-if="plugin.edgeStoreUrl"
              :href="plugin.edgeStoreUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="apple-btn-primary"
            >
              {{ t.installOnEdge }}
            </a>
            <a
              v-else
              :href="plugin.downloadUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="apple-btn-primary"
            >
              {{ t.downloadZip }}
            </a>

            <a
              v-if="plugin.edgeStoreUrl"
              :href="plugin.downloadUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="apple-link-arrow"
            >
              <span>{{ t.downloadZip }}</span>
              <span class="arrow-glyph" aria-hidden="true">›</span>
            </a>
            <RouterLink
              v-else
              :to="localizedPath('/install')"
              class="apple-link-arrow"
            >
              <span>{{ t.detailOfflineGuideLink }}</span>
              <span class="arrow-glyph" aria-hidden="true">›</span>
            </RouterLink>
          </div>

          <p class="detail-meta-strip">{{ t.detailMetaBar }}</p>
        </div>

        <!-- macOS 极简窗口包裹画廊（零裁切 + 灯箱） -->
        <div class="detail-gallery-wrap">
          <div
            role="button"
            tabindex="0"
            class="macos-window"
            :aria-label="t.detailZoomHint"
            @click="openLightbox"
            @keydown.enter.prevent="openLightbox"
            @keydown.space.prevent="openLightbox"
          >
            <div class="macos-titlebar" aria-hidden="true">
              <span class="mac-dot"></span>
              <span class="mac-dot"></span>
              <span class="mac-dot"></span>
              <span class="mac-title-hint">{{ t.detailZoomHint }}</span>
            </div>
            <div class="macos-viewport">
              <img
                :src="plugin.preview"
                :alt="plugin.previewAlt"
                :width="plugin.previewWidth"
                :height="plugin.previewHeight"
                fetchpriority="high"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 模块三：核心功能拆解（Feature Bento Grid） -->
    <section id="features" class="detail-section detail-surface-band">
      <div class="detail-container">
        <div class="detail-section-head">
          <h2 class="detail-h2">{{ t.detailFeaturesTitle }}</h2>
          <p class="detail-subhead">{{ t.detailFeaturesSub }}</p>
        </div>

        <div class="feature-bento">
          <article
            v-for="(item, idx) in plugin.highlights"
            :key="item.title"
            :class="['feature-card', idx === 0 ? 'feature-card-lead' : 'feature-card-sub']"
          >
            <span class="feature-index">0{{ idx + 1 }}</span>
            <h3 class="feature-title">{{ item.title }}</h3>
            <p class="feature-desc">{{ item.desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- 模块四：隐私与权限透明区（深色焦点对比块） -->
    <section id="privacy" class="detail-section detail-dark-stage">
      <div class="detail-container">
        <div class="privacy-stage-head">
          <div class="privacy-shield-icon" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none" width="56" height="56">
              <path
                d="M32 8L52 16V31C52 44.2 43.4 55.8 32 59.5C20.6 55.8 12 44.2 12 31V16L32 8Z"
                stroke="#2997FF"
                stroke-width="2.5"
                fill="rgba(41, 151, 255, 0.12)"
              />
              <path
                d="M24 32L29.5 37.5L40 27"
                stroke="#F5F5F7"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <h2 class="privacy-headline">{{ t.detailPrivacyHeadline }}</h2>
          <p class="privacy-desc">{{ t.detailPrivacyDesc }}</p>
        </div>

        <div class="privacy-cards-grid">
          <article
            v-for="card in t.detailPrivacyCards"
            :key="card.title"
            class="privacy-glass-card"
          >
            <div class="privacy-metric">{{ card.metric }}</div>
            <h3 class="privacy-card-title">{{ card.title }}</h3>
            <p class="privacy-card-desc">{{ card.desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- 模块五：极简上手与安装指南 -->
    <section id="install" class="detail-section detail-bg-band">
      <div class="detail-container">
        <div class="detail-section-head">
          <h2 class="detail-h2">{{ t.stepsTitle }}</h2>
          <div class="install-segmented" role="tablist">
            <button
              v-if="plugin.edgeStoreUrl"
              type="button"
              role="tab"
              :aria-selected="activeInstallTab === 'store'"
              :class="['segment-btn', { active: activeInstallTab === 'store' }]"
              @click="activeInstallTab = 'store'"
            >
              {{ t.detailInstallTabStore }}
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="activeInstallTab === 'local'"
              :class="['segment-btn', { active: activeInstallTab === 'local' }]"
              @click="activeInstallTab = 'local'"
            >
              {{ t.detailInstallTabLocal }}
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="activeInstallTab === 'quickstart'"
              :class="['segment-btn', { active: activeInstallTab === 'quickstart' }]"
              @click="activeInstallTab = 'quickstart'"
            >
              {{ t.detailInstallTabQuickStart }}
            </button>
          </div>
        </div>

        <!-- Tab 1: Edge 商店 -->
        <div v-if="activeInstallTab === 'store' && plugin.edgeStoreUrl" class="store-install-panel">
          <h3>{{ t.detailInstallStoreTitle }}</h3>
          <p>{{ t.detailInstallStoreDesc }}</p>
          <div class="store-install-actions">
            <a
              :href="plugin.edgeStoreUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="apple-btn-primary"
            >
              {{ t.installOnEdge }}
            </a>
            <a
              :href="plugin.downloadUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="apple-link-arrow"
            >
              <span>{{ t.downloadZip }}</span>
              <span class="arrow-glyph" aria-hidden="true">›</span>
            </a>
          </div>
        </div>

        <!-- Tab 2: 本地 ZIP 安装 -->
        <div v-else-if="activeInstallTab === 'local'" class="install-panel-wrap">
          <div class="steps-3col">
            <article
              v-for="(step, idx) in t.homeInstallSteps"
              :key="step.title"
              class="step-surface-card"
            >
              <div class="step-num-tag">0{{ idx + 1 }}</div>
              <h3 class="step-title">{{ step.title }}</h3>
              <p class="step-desc">{{ step.desc }}</p>
              <div v-if="idx === 1" class="copy-pill-row">
                <code>chrome://extensions</code>
                <button type="button" class="copy-mini-btn" @click="copyExtUrl">
                  <Check v-if="copiedExtUrl" :size="13" />
                  <Copy v-else :size="13" />
                  <span>{{ copiedExtUrl ? t.installCopied : t.installCopyUrl }}</span>
                </button>
              </div>
            </article>
          </div>

          <div class="install-footer-links">
            <a
              :href="plugin.downloadUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="apple-btn-primary"
            >
              {{ t.downloadZip }}
            </a>
            <a
              :href="GITHUB_RELEASES_URL"
              target="_blank"
              rel="noopener noreferrer"
              class="apple-link-arrow"
            >
              <span>{{ t.viewReleases }}</span>
              <span class="arrow-glyph" aria-hidden="true">›</span>
            </a>
            <RouterLink :to="localizedPath('/install')" class="apple-link-arrow">
              <span>{{ t.viewFullInstallGuide }}</span>
              <span class="arrow-glyph" aria-hidden="true">›</span>
            </RouterLink>
          </div>
        </div>

        <!-- Tab 3: 插件快速上手步骤 -->
        <div v-else class="steps-3col">
          <article
            v-for="(step, idx) in plugin.steps"
            :key="step"
            class="step-surface-card"
          >
            <div class="step-num-tag">0{{ idx + 1 }}</div>
            <p class="step-desc step-desc-lead">{{ step }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- 模块六：技术规格 & FAQ -->
    <section class="detail-section-compact detail-bg-band specs-section">
      <div class="detail-container-narrow">
        <h2 class="detail-h2 specs-heading">{{ t.detailSpecsTitle }}</h2>
        <dl class="specs-table">
          <div v-for="row in t.detailSpecs" :key="row.label" class="spec-row">
            <dt class="spec-label">{{ row.label }}</dt>
            <dd class="spec-value">{{ row.value }}</dd>
          </div>
          <div class="spec-row">
            <dt class="spec-label">{{ locale === 'zh' ? '源码仓库' : 'Source Code' }}</dt>
            <dd class="spec-value">
              <a
                :href="GITHUB_REPO_URL"
                target="_blank"
                rel="noopener noreferrer"
                class="apple-link-arrow"
              >
                <span>github.com/wllcyg/plugins</span>
                <span class="arrow-glyph" aria-hidden="true">›</span>
              </a>
            </dd>
          </div>
        </dl>

        <h2 class="detail-h2 faq-heading">{{ t.detailFaqTitle }}</h2>
        <div class="faq-list">
          <div v-for="(faq, idx) in t.detailFaqs" :key="faq.q" class="faq-item">
            <button
              type="button"
              class="faq-trigger"
              :aria-expanded="openFaqIdx === idx"
              @click="toggleFaq(idx)"
            >
              <span>{{ faq.q }}</span>
              <span :class="['faq-plus', { open: openFaqIdx === idx }]" aria-hidden="true">+</span>
            </button>
            <div v-show="openFaqIdx === idx" class="faq-answer">
              <p>{{ faq.a }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 继续探索其他工具（复用首页无边框大圆角卡片） -->
    <section class="detail-section-compact detail-surface-band">
      <div class="detail-container">
        <div class="related-head">
          <h2 class="detail-h2">{{ t.relatedTitle }}</h2>
          <RouterLink :to="{ path: localizedPath('/'), hash: '#directory' }" class="apple-link-arrow">
            <span>{{ t.detailRelatedViewAll(pluginsCount) }}</span>
            <span class="arrow-glyph" aria-hidden="true">›</span>
          </RouterLink>
        </div>

        <div class="related-cards-grid">
          <RouterLink
            v-for="item in relatedPlugins"
            :key="item.id"
            :to="detailUrl(item.id)"
            class="related-apple-card"
          >
            <div class="related-meta">
              <span>{{ item.category }}</span>
            </div>
            <div class="related-title-row">
              <img :src="item.icon" alt="" width="40" height="40" />
              <h3>{{ item.name }}</h3>
            </div>
            <p class="related-tagline">{{ item.tagline }}</p>
            <span class="apple-link-arrow related-more">
              <span>{{ t.learnMore }}</span>
              <span class="arrow-glyph" aria-hidden="true">›</span>
            </span>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- 全屏毛玻璃灯箱 -->
    <Teleport v-if="isLightboxOpen" to="body">
      <div
        class="lightbox-backdrop"
        role="dialog"
        aria-modal="true"
        :aria-label="plugin.previewAlt"
        @click.self="closeLightbox"
      >
        <button
          type="button"
          class="lightbox-close"
          :aria-label="t.detailCloseLightbox"
          @click="closeLightbox"
        >
          <X :size="22" />
        </button>
        <img
          :src="plugin.preview"
          :alt="plugin.previewAlt"
          class="lightbox-img"
        />
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.detail-container {
  width: min(100% - 48px, 1120px);
  margin-inline: auto;
}
.detail-container-narrow {
  width: min(100% - 48px, 880px);
  margin-inline: auto;
}
.detail-section {
  padding-block: 96px;
  scroll-margin-top: 112px;
}
.detail-section-compact {
  padding-block: 76px;
}
.detail-bg-band {
  background-color: var(--apple-bg);
}
.detail-surface-band {
  background-color: var(--apple-surface);
}
.detail-h2 {
  margin: 0;
  font-size: clamp(26px, 3.6vw, 42px);
  font-weight: 600;
  line-height: 1.12;
  letter-spacing: -0.015em;
  color: var(--apple-text);
}
.detail-subhead {
  margin: 12px auto 0;
  max-width: 580px;
  font-size: clamp(16px, 1.8vw, 19px);
  color: var(--apple-subtle);
  line-height: 1.45;
}
.detail-section-head {
  text-align: center;
  margin-bottom: 48px;
}

.apple-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 26px;
  border-radius: 980px;
  background-color: var(--apple-blue);
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.3s var(--apple-ease);
}
.apple-btn-primary:hover {
  background-color: var(--apple-blue-hover);
}
.apple-link-arrow {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--apple-blue);
  font-size: 16px;
  font-weight: 500;
}
.apple-link-arrow:hover span:first-child {
  text-decoration: underline;
  text-underline-offset: 4px;
}
.apple-link-arrow .arrow-glyph {
  display: inline-block;
  font-size: 1.15em;
  line-height: 1;
  transition: transform 0.25s var(--apple-ease);
}
.apple-link-arrow:hover .arrow-glyph {
  transform: translateX(2px);
}

/* 模块一：二级吸顶产品栏 */
.local-nav-bar {
  position: sticky;
  top: 50px;
  z-index: 40;
  height: 52px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--apple-divider);
}
:root[data-theme="dark"] .local-nav-bar {
  background: rgba(22, 22, 23, 0.78);
}
.local-nav-inner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.local-nav-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.local-back-link {
  font-size: 12px;
  color: var(--apple-subtle);
  white-space: nowrap;
  transition: color 0.2s ease;
}
.local-back-link:hover {
  color: var(--apple-text);
}
.local-nav-sep {
  color: var(--apple-divider);
  font-size: 13px;
}
.local-product-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--apple-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.local-nav-right {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-shrink: 0;
}
.local-anchors {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 12px;
  color: var(--apple-subtle);
}
.local-anchors a {
  transition: color 0.2s ease;
}
.local-anchors a:hover {
  color: var(--apple-text);
}
.local-cta-pill {
  padding: 5px 14px;
  border-radius: 980px;
  background-color: var(--apple-blue);
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 0.2s ease;
}
.local-cta-pill:hover {
  background-color: var(--apple-blue-hover);
}

/* 模块二：居中剧院式产品首屏 */
.detail-hero {
  padding-top: 64px;
}
.detail-hero-copy {
  max-width: 780px;
  margin-inline: auto;
  text-align: center;
}
.detail-hero-icon {
  margin-inline: auto;
  border-radius: 18px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
}
.detail-hero-eyebrow {
  margin: 18px 0 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--apple-subtle);
}
.detail-hero-title {
  margin: 0;
  font-size: clamp(34px, 5vw, 58px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: var(--apple-text);
}
.detail-hero-tagline {
  margin: 16px 0 0;
  font-size: clamp(20px, 2.3vw, 24px);
  font-weight: 500;
  color: var(--apple-muted);
}
.detail-hero-summary {
  margin: 14px auto 0;
  max-width: 620px;
  font-size: 16px;
  line-height: 1.55;
  color: var(--apple-subtle);
}
.detail-hero-ctas {
  margin-top: 30px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 20px;
}
.detail-meta-strip {
  margin: 20px 0 0;
  font-size: 12.5px;
  color: var(--apple-subtle);
}

/* macOS 极简窗口画廊 */
.detail-gallery-wrap {
  margin: 52px auto 0;
  max-width: 980px;
}
.macos-window {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  border-radius: 24px;
  background-color: var(--apple-surface);
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.12);
  overflow: hidden;
  cursor: zoom-in;
  transition: transform 0.35s var(--apple-ease);
}
:root[data-theme="dark"] .macos-window {
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.55);
}
.macos-window:hover {
  transform: scale(1.006);
}
.macos-titlebar {
  height: 36px;
  padding-inline: 16px;
  display: flex;
  align-items: center;
  gap: 7px;
  background: rgba(0, 0, 0, 0.03);
}
:root[data-theme="dark"] .macos-titlebar {
  background: rgba(255, 255, 255, 0.04);
}
.mac-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background-color: rgba(134, 134, 139, 0.32);
}
.mac-title-hint {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--apple-subtle);
}
.macos-viewport {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.macos-viewport img {
  max-width: 100%;
  height: auto;
  max-height: 560px;
  object-fit: contain;
  border-radius: 12px;
}

/* 模块三：Feature Bento Grid */
.feature-bento {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 20px;
}
.feature-card {
  background-color: var(--apple-card);
  border-radius: 28px;
  padding: 36px;
  transition: transform 0.35s var(--apple-ease), box-shadow 0.35s var(--apple-ease);
}
.feature-card:hover {
  transform: scale(1.012);
  box-shadow: var(--apple-shadow-hover);
}
.feature-card-lead {
  grid-column: span 7;
  grid-row: span 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.feature-card-sub {
  grid-column: span 5;
}
.feature-index {
  display: inline-block;
  font-size: 13px;
  font-weight: 600;
  color: var(--apple-blue);
  margin-bottom: 14px;
}
.feature-title {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.25;
  color: var(--apple-text);
}
.feature-card-lead .feature-title {
  font-size: clamp(26px, 2.8vw, 34px);
}
.feature-desc {
  margin: 0;
  font-size: 15.5px;
  line-height: 1.55;
  color: var(--apple-subtle);
}
.feature-card-lead .feature-desc {
  font-size: 18px;
}

/* 模块四：深色隐私焦点区 */
.detail-dark-stage {
  background-color: #000000;
  color: #f5f5f7;
}
.privacy-stage-head {
  text-align: center;
  max-width: 680px;
  margin: 0 auto 52px;
}
.privacy-shield-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}
.privacy-headline {
  margin: 0;
  font-size: clamp(30px, 4.2vw, 48px);
  font-weight: 600;
  line-height: 1.12;
  letter-spacing: -0.015em;
  color: #f5f5f7;
}
.privacy-desc {
  margin: 16px 0 0;
  font-size: 18px;
  line-height: 1.5;
  color: #86868b;
}
.privacy-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.privacy-glass-card {
  background: rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  padding: 32px 28px;
}
.privacy-metric {
  font-size: 28px;
  font-weight: 700;
  color: #2997ff;
  margin-bottom: 12px;
}
.privacy-card-title {
  margin: 0 0 8px;
  font-size: 19px;
  font-weight: 600;
  color: #f5f5f7;
}
.privacy-card-desc {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.55;
  color: #86868b;
}

/* 模块五：安装分段控制器 & 步骤 */
.install-segmented {
  margin-top: 24px;
  display: inline-flex;
  padding: 4px;
  border-radius: 980px;
  background-color: var(--apple-surface);
}
.segment-btn {
  padding: 8px 20px;
  border-radius: 980px;
  border: none;
  background: transparent;
  color: var(--apple-subtle);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s var(--apple-ease);
}
.segment-btn.active {
  background-color: var(--apple-card);
  color: var(--apple-text);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
:root[data-theme="dark"] .segment-btn.active {
  background-color: #2c2c2e;
}

.store-install-panel {
  max-width: 680px;
  margin-inline: auto;
  text-align: center;
  background-color: var(--apple-surface);
  border-radius: 28px;
  padding: 44px 36px;
}
.store-install-panel h3 {
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 600;
  color: var(--apple-text);
}
.store-install-panel p {
  margin: 0 0 28px;
  font-size: 15.5px;
  line-height: 1.55;
  color: var(--apple-subtle);
}
.store-install-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.steps-3col {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.step-surface-card {
  background-color: var(--apple-surface);
  border-radius: 24px;
  padding: 32px 28px;
}
.step-num-tag {
  font-size: 32px;
  font-weight: 600;
  color: color-mix(in srgb, var(--apple-subtle) 55%, transparent);
  margin-bottom: 14px;
}
.step-title {
  margin: 0 0 8px;
  font-size: 19px;
  font-weight: 600;
  color: var(--apple-text);
}
.step-desc {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--apple-subtle);
}
.step-desc-lead {
  font-size: 15.5px;
  color: var(--apple-text-secondary);
}
.copy-pill-row {
  margin-top: 16px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 6px 12px;
  border-radius: 980px;
  background-color: var(--apple-card);
}
.copy-pill-row code {
  font-size: 12.5px;
  color: var(--apple-text);
}
.copy-mini-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 980px;
  border: none;
  background-color: var(--apple-blue);
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.install-footer-links {
  margin-top: 32px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

/* 模块六：规格表与 FAQ */
.specs-section {
  border-top: 1px solid var(--apple-divider);
}
.specs-heading,
.faq-heading {
  margin-bottom: 28px;
}
.faq-heading {
  margin-top: 68px;
}
.specs-table {
  margin: 0;
  border-top: 1px solid var(--apple-divider);
}
.spec-row {
  display: grid;
  grid-template-columns: 28% 72%;
  gap: 16px;
  padding-block: 20px;
  border-bottom: 1px solid var(--apple-divider);
}
.spec-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--apple-text);
}
.spec-value {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--apple-subtle);
}

.faq-list {
  border-top: 1px solid var(--apple-divider);
}
.faq-item {
  border-bottom: 1px solid var(--apple-divider);
}
.faq-trigger {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding-block: 22px;
  background: none;
  border: none;
  text-align: left;
  font-size: 17px;
  font-weight: 600;
  color: var(--apple-text);
  cursor: pointer;
}
.faq-plus {
  font-size: 22px;
  font-weight: 400;
  color: var(--apple-subtle);
  transition: transform 0.3s var(--apple-ease);
}
.faq-plus.open {
  transform: rotate(45deg);
}
.faq-answer {
  padding-bottom: 22px;
}
.faq-answer p {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--apple-subtle);
}

/* 相关插件 */
.related-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 36px;
}
.related-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}
.related-apple-card {
  display: flex;
  flex-direction: column;
  padding: 28px;
  border-radius: 24px;
  background-color: var(--apple-card);
  transition: transform 0.35s var(--apple-ease), box-shadow 0.35s var(--apple-ease);
}
.related-apple-card:hover {
  transform: scale(1.015);
  box-shadow: var(--apple-shadow-hover);
}
.related-meta {
  font-size: 12px;
  font-weight: 600;
  color: var(--apple-subtle);
  margin-bottom: 14px;
}
.related-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.related-title-row img {
  border-radius: 10px;
}
.related-title-row h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--apple-text);
}
.related-tagline {
  margin: 0 0 16px;
  font-size: 14.5px;
  line-height: 1.5;
  color: var(--apple-subtle);
  flex: 1;
}
.related-more {
  font-size: 14px;
}

/* 全屏灯箱 */
.lightbox-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}
.lightbox-close {
  position: fixed;
  top: 20px;
  right: 24px;
  width: 40px;
  height: 40px;
  border-radius: 980px;
  border: none;
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.lightbox-img {
  max-width: min(94vw, 1280px);
  max-height: 88vh;
  border-radius: 16px;
  object-fit: contain;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
}

@media (max-width: 1024px) {
  .feature-card-lead,
  .feature-card-sub {
    grid-column: span 12;
    grid-row: auto;
  }
  .privacy-cards-grid,
  .steps-3col,
  .related-cards-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .detail-section {
    padding-block: 64px;
  }
  .local-anchors {
    display: none;
  }
  .spec-row {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .macos-viewport {
    padding: 12px;
  }
}
</style>
