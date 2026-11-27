<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { Search, X } from 'lucide-vue-next';
import {
  CATEGORY_GROUPS,
  GITHUB_REPO_URL,
  type CategoryGroupKey,
  type PluginItem,
} from '../data/plugins';
import { locale, t } from '../data/i18n';

const props = defineProps<{
  plugins: PluginItem[];
  localizedPath: (path: string) => string;
  detailUrl: (id: string) => string;
}>();

const homeRoot = ref<HTMLElement>();
let homeGsapCtx: { revert: () => void } | null = null;

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── 4 大类 Segmented Control + 搜索 ─────────────────────────────────────────
const categoryKeys: CategoryGroupKey[] = ['all', 'reading', 'media', 'dev'];
const selectedGroup = ref<CategoryGroupKey>('all');
const searchQuery = ref('');

function getGroupCount(key: CategoryGroupKey): number {
  if (key === 'all') return props.plugins.length;
  return props.plugins.filter((p) => p.categoryGroup === key).length;
}

const filteredPlugins = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return props.plugins.filter((p) => {
    const matchGroup = selectedGroup.value === 'all' || p.categoryGroup === selectedGroup.value;
    if (!matchGroup) return false;
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.tagline.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q) ||
      p.highlights.some((h) => h.title.toLowerCase().includes(q) || h.desc.toLowerCase().includes(q))
    );
  });
});

// ─── GSAP 入场动效（限制最多 2 层触发器，防止抖动） ─────────────────────────
async function initAnimations() {
  homeGsapCtx?.revert();
  homeGsapCtx = null;
  if (typeof window === 'undefined' || reduceMotion() || !homeRoot.value) return;

  const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  if (!homeRoot.value) return;

  homeGsapCtx = gsap.context(() => {
    gsap.utils.toArray<HTMLElement>('.apple-reveal').forEach((el) => {
      gsap.from(el, {
        y: 32,
        opacity: 0,
        duration: 0.75,
        ease: 'power2.out',
        clearProps: 'opacity,transform',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
          once: true,
        },
      });
    });

    gsap.from('.apple-plugin-card', {
      y: 20,
      opacity: 0,
      duration: 0.42,
      stagger: 0.04,
      ease: 'power2.out',
      clearProps: 'opacity,transform',
      scrollTrigger: {
        trigger: '.apple-plugin-grid',
        start: 'top 92%',
        once: true,
      },
    });
  }, homeRoot.value);
}

onMounted(async () => {
  await nextTick();
  void initAnimations();
});

watch(locale, () => {
  selectedGroup.value = 'all';
});

onUnmounted(() => {
  homeGsapCtx?.revert();
  homeGsapCtx = null;
});
</script>

<template>
  <div ref="homeRoot" class="apple-home">
    <!-- 模块二：居中剧院式首屏 -->
    <section class="apple-section apple-hero" aria-labelledby="hero-title">
      <div class="apple-container">
        <div class="hero-copy-center">
          <p class="hero-eyebrow-text">{{ t.heroEyebrow }}</p>
          <h1 id="hero-title" class="hero-headline">
            {{ t.heroTitleLine1 }}<br />{{ t.heroTitleLine2 }}
          </h1>
          <p class="hero-subcopy">{{ t.heroDesc(plugins.length) }}</p>
          <div class="hero-cta-row">
            <a href="#directory" class="apple-btn-primary">
              {{ t.heroCtaPrimary(plugins.length) }}
            </a>
            <a href="#principles" class="apple-link-arrow">
              <span>{{ t.heroCtaSecondary }}</span>
              <span class="arrow-glyph" aria-hidden="true">›</span>
            </a>
          </div>
        </div>

        <!-- 主视觉 Bento 矩阵预览区（纯代码构建，100% 适配亮暗双主题） -->
        <div class="hero-bento-stage" role="region" :aria-label="t.carouselAriaLabel">
          <div class="hero-bento-bar">
            <div class="hero-bento-dots" aria-hidden="true">
              <span /><span /><span />
            </div>
            <span class="hero-bento-title">{{ t.showcaseTitle }} · {{ plugins.length }} / 100</span>
            <span class="hero-bento-badge">
              <span class="hero-bento-live-dot" />
              {{ t.showcaseBadge }}
            </span>
          </div>

          <div class="hero-bento-grid">
            <RouterLink
              v-for="tool in plugins"
              :key="tool.id"
              :to="detailUrl(tool.id)"
              class="hero-bento-item"
            >
              <img :src="tool.icon" alt="" width="36" height="36" class="hero-bento-icon" />
              <div class="hero-bento-meta">
                <strong class="hero-bento-name">{{ tool.name }}</strong>
                <span class="hero-bento-tag">{{ tool.highlights[0]?.title || tool.category }}</span>
              </div>
              <span class="hero-bento-arrow" aria-hidden="true">›</span>
            </RouterLink>
          </div>

          <div class="hero-bento-foot">
            <span>{{ t.showcaseFooter }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 模块三：Bento Grid「为什么选择 100-Free」 -->
    <section id="principles" class="apple-section apple-surface-band" aria-labelledby="principles-title">
      <div class="apple-container apple-reveal">
        <div class="section-header-center">
          <h2 id="principles-title" class="apple-h2">{{ t.principlesTitle }}</h2>
          <p class="apple-subhead">{{ t.principlesSub }}</p>
        </div>

        <div class="bento-grid">
          <!-- 左侧大卡（占 7 列，跨 2 行） -->
          <article class="bento-card bento-large">
            <div class="bento-body">
              <h3 class="bento-title">{{ t.principle1Title }}</h3>
              <p class="bento-two-tone">
                <span class="tone-muted">{{ t.bentoLocalLead }}</span>
                <span class="tone-strong"> {{ t.bentoLocalAccent }}</span>
              </p>
            </div>
            <div class="bento-visual-shield" aria-hidden="true">
              <svg viewBox="0 0 180 120" fill="none" class="shield-svg">
                <circle cx="90" cy="60" r="52" class="shield-ring-outer" />
                <circle cx="90" cy="60" r="36" class="shield-ring-inner" />
                <path
                  d="M90 32L112 41V59C112 73.5 102.6 86.2 90 90C77.4 86.2 68 73.5 68 59V41L90 32Z"
                  class="shield-core"
                />
                <path
                  d="M82 60L87.5 65.5L99 54"
                  stroke="white"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
          </article>

          <!-- 右上中卡（占 5 列） -->
          <article class="bento-card bento-top-right">
            <div class="bento-metric-gradient">{{ t.bentoFreeMetric }}</div>
            <h3 class="bento-title">{{ t.principle2Title }}</h3>
            <p class="bento-desc">{{ t.principle2Desc }}</p>
          </article>

          <!-- 右下中卡（占 5 列） -->
          <article class="bento-card bento-bottom-right">
            <span class="bento-mv3-pill">{{ t.bentoMv3Badge }}</span>
            <h3 class="bento-title">{{ t.principle3Title }}</h3>
            <p class="bento-desc">{{ t.principle3Desc }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- 模块四：「全部插件矩阵」减噪与卡片重塑 -->
    <section id="directory" class="apple-section apple-bg-band" aria-labelledby="directory-title">
      <div class="apple-container-wide">
        <div class="section-header-center apple-reveal">
          <h2 id="directory-title" class="apple-h2">{{ t.directoryTitle }}</h2>
          <p class="apple-subhead">{{ t.directorySub }}</p>
        </div>

        <div class="directory-controls apple-reveal">
          <!-- 极简搜索框 -->
          <div class="apple-search-wrap">
            <Search :size="16" class="apple-search-icon" aria-hidden="true" />
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="t.searchPlaceholder"
              :aria-label="t.searchAria"
              class="apple-search-input"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="apple-search-clear"
              :aria-label="t.clearSearchAria"
              @click="searchQuery = ''"
            >
              <X :size="14" />
            </button>
          </div>

          <!-- 4 大类 Segmented Control -->
          <div class="segmented-control" role="tablist" :aria-label="t.categoryAriaLabel">
            <button
              v-for="key in categoryKeys"
              :key="key"
              type="button"
              role="tab"
              :aria-selected="selectedGroup === key"
              :class="['segment-btn', { active: selectedGroup === key }]"
              @click="selectedGroup = key"
            >
              <span>{{ CATEGORY_GROUPS[key][locale] }}</span>
              <span class="segment-count">{{ getGroupCount(key) }}</span>
            </button>
          </div>
        </div>

        <div v-if="filteredPlugins.length === 0" class="apple-empty-state">
          <p>{{ t.emptyResult(searchQuery) }}</p>
          <button
            type="button"
            class="apple-btn-primary"
            @click="searchQuery = ''; selectedGroup = 'all'"
          >
            {{ t.resetFilter }}
          </button>
        </div>

        <ul v-else class="apple-plugin-grid">
          <li v-for="tool in filteredPlugins" :key="tool.id">
            <RouterLink class="apple-plugin-card" :to="detailUrl(tool.id)">
              <div class="pcard-top-meta">
                <span class="pcard-eyebrow">{{ tool.category }}</span>
                <span v-if="tool.edgeStoreUrl" class="pcard-store-note">{{ t.edgeStoreBadge }}</span>
              </div>

              <div class="pcard-header">
                <img :src="tool.icon" alt="" width="44" height="44" class="pcard-icon" />
                <h3 class="pcard-title">{{ tool.name }}</h3>
              </div>

              <p class="pcard-tagline">{{ tool.tagline }}</p>
              <p class="pcard-summary">{{ tool.summary }}</p>

              <div class="pcard-footer">
                <span class="apple-link-arrow pcard-more">
                  <span>{{ t.learnMore }}</span>
                  <span class="arrow-glyph" aria-hidden="true">›</span>
                </span>
              </div>
            </RouterLink>
          </li>
        </ul>
      </div>
    </section>

    <!-- 模块五：「安装指南」横向三步卡片 -->
    <section class="apple-section apple-surface-band" aria-labelledby="home-install-title">
      <div class="apple-container apple-reveal">
        <div class="section-header-center">
          <h2 id="home-install-title" class="apple-h2">{{ t.homeInstallTitle }}</h2>
          <p class="apple-subhead">{{ t.homeInstallSub }}</p>
        </div>

        <div class="install-steps-grid">
          <article
            v-for="(step, idx) in t.homeInstallSteps"
            :key="step.title"
            class="install-step-card"
          >
            <div class="step-big-num" aria-hidden="true">0{{ idx + 1 }}</div>
            <h3 class="step-card-title">{{ step.title }}</h3>
            <p class="step-card-desc">{{ step.desc }}</p>
          </article>
        </div>

        <div class="section-cta-center">
          <RouterLink :to="localizedPath('/install')" class="apple-link-arrow">
            <span>{{ t.viewFullInstallGuide }}</span>
            <span class="arrow-glyph" aria-hidden="true">›</span>
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- 模块六：「核心原则」文字区精简 -->
    <section class="apple-section apple-bg-band" aria-labelledby="core-pillars-title">
      <div class="apple-container-narrow apple-reveal">
        <h2 id="core-pillars-title" class="apple-h2 pillars-heading">{{ t.corePillarsTitle }}</h2>
        <div class="pillars-list">
          <div v-for="pillar in t.corePillars" :key="pillar.title" class="pillar-row">
            <h3 class="pillar-row-title">{{ pillar.title }}</h3>
            <p class="pillar-row-desc">{{ pillar.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 模块七：「关于本计划」与「问题反馈」合并简化 -->
    <section id="about" class="apple-section-compact apple-surface-band" aria-labelledby="about-combined-title">
      <div class="apple-container apple-reveal">
        <div class="about-split">
          <div class="about-copy">
            <h2 id="about-combined-title" class="about-title">{{ t.aboutCombinedTitle }}</h2>
            <p class="about-desc">{{ t.aboutCombinedDesc(plugins.length) }}</p>
          </div>
          <div class="about-actions">
            <RouterLink :to="localizedPath('/feedback')" class="apple-btn-primary">
              {{ t.navFeedback }}
            </RouterLink>
            <a
              :href="`${GITHUB_REPO_URL}/issues`"
              target="_blank"
              rel="noopener noreferrer"
              class="apple-link-arrow"
            >
              <span>GitHub Issues</span>
              <span class="arrow-glyph" aria-hidden="true">›</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.apple-container {
  width: min(100% - 48px, 1120px);
  margin-inline: auto;
}
.apple-container-wide {
  width: min(100% - 48px, 1200px);
  margin-inline: auto;
}
.apple-container-narrow {
  width: min(100% - 48px, 860px);
  margin-inline: auto;
}

.apple-section {
  padding-block: 112px;
}
.apple-section-compact {
  padding-block: 80px;
}
.apple-bg-band {
  background-color: var(--apple-bg);
}
.apple-surface-band {
  background-color: var(--apple-surface);
}

/* Typography & Shared Interactive */
.apple-h2 {
  margin: 0;
  font-size: clamp(28px, 4vw, 48px);
  font-weight: 600;
  line-height: 1.12;
  letter-spacing: -0.015em;
  color: var(--apple-text);
}
.apple-subhead {
  margin: 14px auto 0;
  max-width: 620px;
  font-size: clamp(17px, 2vw, 21px);
  font-weight: 400;
  line-height: 1.45;
  color: var(--apple-subtle);
}
.section-header-center {
  text-align: center;
  margin-bottom: 52px;
}

.apple-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: 980px;
  background-color: var(--apple-blue);
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s var(--apple-ease), transform 0.3s var(--apple-ease);
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
  transition: color 0.25s var(--apple-ease);
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

/* 模块二：居中剧院式首屏 */
.apple-hero {
  background-color: var(--apple-bg);
  padding-block: 80px 104px;
}
.hero-copy-center {
  max-width: 780px;
  margin-inline: auto;
  text-align: center;
}
.hero-eyebrow-text {
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 500;
  color: var(--apple-blue);
  letter-spacing: 0.01em;
}
.hero-headline {
  margin: 0;
  font-size: clamp(36px, 5.4vw, 66px);
  font-weight: 700;
  line-height: 1.08;
  letter-spacing: -0.02em;
  color: var(--apple-text);
}
.hero-subcopy {
  margin: 22px auto 0;
  max-width: 600px;
  font-size: clamp(17px, 2vw, 21px);
  font-weight: 400;
  line-height: 1.48;
  color: var(--apple-subtle);
}
.hero-cta-row {
  margin-top: 32px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

/* 主视觉 Bento 矩阵预览区（纯代码构建，自适应亮暗主题） */
.hero-bento-stage {
  margin: 48px auto 0;
  max-width: 980px;
  border-radius: 26px;
  background-color: var(--apple-surface);
  box-shadow: var(--apple-shadow-soft);
  overflow: hidden;
}
.hero-bento-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 22px;
  border-bottom: 1px solid var(--apple-divider);
}
.hero-bento-dots {
  display: flex;
  align-items: center;
  gap: 7px;
}
.hero-bento-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--apple-divider);
}
.hero-bento-dots span:nth-child(1) { background: #ff5f57; }
.hero-bento-dots span:nth-child(2) { background: #febc2e; }
.hero-bento-dots span:nth-child(3) { background: #28c840; }
.hero-bento-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--apple-subtle);
  letter-spacing: -0.01em;
}
.hero-bento-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--apple-blue);
  background: color-mix(in srgb, var(--apple-blue) 10%, transparent);
  padding: 3px 10px;
  border-radius: 980px;
}
.hero-bento-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--apple-blue);
}

.hero-bento-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 20px;
}
.hero-bento-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background-color: var(--apple-card);
  text-decoration: none;
  transition: transform 0.28s var(--apple-ease), box-shadow 0.28s var(--apple-ease);
}
.hero-bento-item:hover {
  transform: scale(1.015);
  box-shadow: var(--apple-shadow-hover);
}
.hero-bento-icon {
  border-radius: 9px;
  flex-shrink: 0;
}
.hero-bento-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}
.hero-bento-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--apple-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hero-bento-tag {
  font-size: 12px;
  color: var(--apple-subtle);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hero-bento-arrow {
  font-size: 18px;
  line-height: 1;
  color: var(--apple-subtle);
  opacity: 0.45;
  transition: transform 0.2s var(--apple-ease), opacity 0.2s var(--apple-ease), color 0.2s var(--apple-ease);
}
.hero-bento-item:hover .hero-bento-arrow {
  opacity: 1;
  color: var(--apple-blue);
  transform: translateX(3px);
}
.hero-bento-foot {
  padding: 10px 20px 14px;
  text-align: center;
  font-size: 12.5px;
  color: var(--apple-subtle);
}

@media (max-width: 860px) {
  .hero-bento-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 560px) {
  .hero-bento-grid {
    grid-template-columns: 1fr;
  }
}

/* 模块三：Bento Grid */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 20px;
}
.bento-card {
  background-color: var(--apple-card);
  border-radius: 28px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.bento-large {
  grid-column: span 7;
  grid-row: span 2;
}
.bento-top-right,
.bento-bottom-right {
  grid-column: span 5;
}
.bento-title {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--apple-text);
}
.bento-two-tone {
  margin: 0;
  font-size: clamp(20px, 2.2vw, 26px);
  font-weight: 600;
  line-height: 1.38;
}
.tone-muted {
  color: var(--apple-subtle);
}
.tone-strong {
  color: var(--apple-text);
}
.bento-visual-shield {
  margin-top: 32px;
  display: flex;
  justify-content: center;
}
.shield-svg {
  width: 180px;
  height: 120px;
}
.shield-ring-outer {
  stroke: var(--apple-divider);
  stroke-width: 1.5;
}
.shield-ring-inner {
  fill: color-mix(in srgb, var(--apple-blue) 8%, transparent);
}
.shield-core {
  fill: var(--apple-blue);
}
.bento-metric-gradient {
  font-size: 56px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
  margin-bottom: 16px;
  background: linear-gradient(135deg, var(--apple-blue), #34c759);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.bento-mv3-pill {
  display: inline-block;
  align-self: flex-start;
  margin-bottom: 16px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--apple-blue);
}
.bento-desc {
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--apple-subtle);
}

/* 模块四：全部插件矩阵 */
.directory-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  margin-bottom: 44px;
}
.apple-search-wrap {
  position: relative;
  width: min(100%, 420px);
}
.apple-search-icon {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--apple-subtle);
  pointer-events: none;
}
.apple-search-input {
  width: 100%;
  height: 44px;
  padding: 0 40px 0 44px;
  border-radius: 980px;
  border: none;
  background-color: var(--apple-surface);
  color: var(--apple-text);
  font-size: 15px;
  transition: box-shadow 0.25s var(--apple-ease);
}
.apple-search-input::placeholder {
  color: var(--apple-subtle);
}
.apple-search-input:focus {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--apple-blue) 28%, transparent);
}
.apple-search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--apple-subtle);
  cursor: pointer;
  padding: 6px;
  display: flex;
}

.segmented-control {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  padding: 4px;
  border-radius: 980px;
  background-color: var(--apple-surface);
}
.segment-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 980px;
  border: none;
  background: transparent;
  color: var(--apple-subtle);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.25s var(--apple-ease), color 0.25s var(--apple-ease), box-shadow 0.25s var(--apple-ease);
}
.segment-btn:hover {
  color: var(--apple-text);
}
.segment-btn.active {
  background-color: var(--apple-card);
  color: var(--apple-text);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
:root[data-theme="dark"] .segment-btn.active {
  background-color: #2c2c2e;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}
.segment-count {
  font-size: 12px;
  opacity: 0.65;
}

.apple-empty-state {
  text-align: center;
  padding: 64px 24px;
  border-radius: 24px;
  background-color: var(--apple-surface);
}
.apple-empty-state p {
  margin: 0 0 20px;
  font-size: 16px;
  color: var(--apple-subtle);
}

.apple-plugin-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.apple-plugin-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 30px;
  border-radius: 24px;
  background-color: var(--apple-surface);
  transition: transform 0.35s var(--apple-ease), box-shadow 0.35s var(--apple-ease);
}
.apple-plugin-card:hover {
  transform: scale(1.015);
  box-shadow: var(--apple-shadow-hover);
}
.pcard-top-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.pcard-eyebrow {
  font-size: 12px;
  font-weight: 600;
  color: var(--apple-subtle);
}
.pcard-store-note {
  font-size: 12px;
  font-weight: 500;
  color: var(--apple-blue);
}
.pcard-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}
.pcard-icon {
  border-radius: 12px;
  flex-shrink: 0;
}
.pcard-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--apple-text);
}
.pcard-tagline {
  margin: 0 0 8px;
  font-size: 15.5px;
  font-weight: 500;
  line-height: 1.45;
  color: var(--apple-text-secondary);
}
.pcard-summary {
  margin: 0 0 20px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--apple-subtle);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}
.pcard-footer {
  display: flex;
  justify-content: flex-end;
}
.pcard-more {
  font-size: 14px;
}

/* 模块五：安装指南三步卡片 */
.install-steps-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}
.install-step-card {
  background-color: var(--apple-card);
  border-radius: 24px;
  padding: 36px 32px;
}
.step-big-num {
  font-size: 64px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--apple-blue);
  opacity: 0.18;
  margin-bottom: 18px;
}
.step-card-title {
  margin: 0 0 10px;
  font-size: 20px;
  font-weight: 600;
  color: var(--apple-text);
}
.step-card-desc {
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--apple-subtle);
}
.section-cta-center {
  margin-top: 36px;
  text-align: center;
}

/* 模块六：核心原则精简列表 */
.pillars-heading {
  text-align: center;
  margin-bottom: 48px;
}
.pillars-list {
  border-top: 1px solid var(--apple-divider);
}
.pillar-row {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  align-items: baseline;
  padding-block: 28px;
  border-bottom: 1px solid var(--apple-divider);
}
.pillar-row-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--apple-text);
}
.pillar-row-desc {
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: var(--apple-subtle);
}

/* 模块七：关于与反馈合并 */
.about-split {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 32px;
}
.about-copy {
  max-width: 580px;
}
.about-title {
  margin: 0 0 10px;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 600;
  color: var(--apple-text);
}
.about-desc {
  margin: 0;
  font-size: 16px;
  line-height: 1.55;
  color: var(--apple-subtle);
}
.about-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

/* 响应式断点 */
@media (max-width: 1024px) {
  .apple-plugin-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .bento-large,
  .bento-top-right,
  .bento-bottom-right {
    grid-column: span 12;
    grid-row: auto;
  }
}

@media (max-width: 768px) {
  .apple-section {
    padding-block: 68px;
  }
  .apple-hero {
    padding-block: 52px 68px;
  }
  .apple-plugin-grid,
  .install-steps-grid {
    grid-template-columns: 1fr;
  }
  .pillar-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .about-split {
    flex-direction: column;
    align-items: flex-start;
  }
  .stage-viewport {
    padding: 12px;
  }
}
</style>
