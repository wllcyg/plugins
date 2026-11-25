<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import gsap from 'gsap';
import {
  ArrowDown,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Cpu,
  Grid2X2,
  LayoutGrid,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-vue-next';
import { plugins } from './data/plugins';

const logoUrl = import.meta.env.BASE_URL + 'logo.svg';
const route = useRoute();
const router = useRouter();
const selected = computed(() => plugins.find((plugin) => plugin.id === route.query.tool));
const pageRoot = ref<HTMLElement>();
const detailUrl = (id: string) => ({ query: { tool: id } });
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 首页 Hero 轮播展示的代表插件（长截图、自由复制、外链直达、CSS 提取）
const heroShowcaseIds = ['screenshot', 'allow-copy', 'clean-redirect', 'css-inspector'];
const heroShowcaseList = computed(() =>
  heroShowcaseIds.map((id) => plugins.find((p) => p.id === id)!).filter(Boolean)
);
const activeShowcaseIndex = ref(0);
const activeShowcase = computed(() => heroShowcaseList.value[activeShowcaseIndex.value] || plugins[0]);

// 目录检索与分类筛选
const searchQuery = ref('');
const selectedCategory = ref('全部');
const categories = computed(() => ['全部', ...Array.from(new Set(plugins.map((p) => p.category)))]);

const filteredPlugins = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return plugins.filter((p) => {
    const matchCategory = selectedCategory.value === '全部' || p.category === selectedCategory.value;
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

// 详情页推荐其他插件
const relatedPlugins = computed(() =>
  plugins.filter((p) => p.id !== selected.value?.id).slice(0, 3)
);

watch(selected, (plugin) => {
  document.title = plugin ? `${plugin.name} · 100-Free 免费生产力插件` : '100-Free · 免费、纯净、离线优先的浏览器生产力矩阵';
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
  if (reduceMotion() || route.hash || selected.value || !pageRoot.value) return;
  const intro = pageRoot.value.querySelectorAll('.hero-copy > *, .hero-preview');
  gsap.from(intro, { opacity: 0, y: 12, duration: 0.36, stagger: 0.055, ease: 'power2.out', clearProps: 'opacity,transform' });
});
</script>

<template>
  <a class="skip-link" href="#main" @click="skipToMain">跳到主要内容</a>

  <header class="site-header">
    <div class="shell topbar">
      <RouterLink class="brand" :to="{ query: {}, hash: '' }" translate="no">
        <img :src="logoUrl" alt="" width="34" height="34" />
        <span>100<span class="brand-hyphen">-</span>Free</span>
        <span class="brand-badge">已上线 {{ plugins.length }} 款</span>
      </RouterLink>
      <nav aria-label="主导航">
        <RouterLink :to="{ query: {}, hash: '#directory' }"><LayoutGrid :size="15" aria-hidden="true" />全部插件</RouterLink>
        <RouterLink :to="{ query: {}, hash: '#principles' }"><ShieldCheck :size="15" aria-hidden="true" />核心原则</RouterLink>
        <a href="#about"><CircleHelp :size="15" aria-hidden="true" />关于计划</a>
      </nav>
    </div>
  </header>

  <Transition mode="out-in" :css="false" @enter="enterPage" @leave="leavePage"
    @enter-cancelled="clearTransition" @leave-cancelled="clearTransition">
    <main v-if="!selected" id="main" key="home" ref="pageRoot" tabindex="-1">
      <!-- Hero 首屏 -->
      <section class="shell hero" aria-labelledby="hero-title">
        <div class="hero-copy">
          <div class="hero-eyebrow">
            <Sparkles :size="14" aria-hidden="true" />
            <span>打破昂贵订阅 · 纯本地离线运转</span>
          </div>
          <h1 id="hero-title">网页生产力，<br>随手带走<span>。</span></h1>
          <p>
            已上线 <strong>{{ plugins.length }} 款</strong> 高频免费浏览器扩展：覆盖长截图标注、表格转 Excel、自由复制、外链免拦截直达、CSS 提取、大图嗅探、网课倍速与离线二维码。
          </p>
          <div class="hero-actions">
            <a href="#directory" class="primary-link">探索全部 {{ plugins.length }} 款插件 <ArrowDown :size="17" aria-hidden="true" /></a>
            <a href="#principles" class="secondary-link">了解开源承诺</a>
          </div>
        </div>

        <figure class="hero-preview">
          <div class="preview-tabs" role="tablist" aria-label="精选插件预览切换">
            <button
              v-for="(item, idx) in heroShowcaseList"
              :key="item.id"
              type="button"
              role="tab"
              :aria-selected="activeShowcaseIndex === idx"
              :class="['preview-tab', { active: activeShowcaseIndex === idx }]"
              @click="activeShowcaseIndex = idx"
            >
              <img :src="item.icon" alt="" width="16" height="16" />
              <span>{{ item.name }}</span>
            </button>
          </div>
          <div class="preview-frame">
            <img
              :src="activeShowcase.preview"
              :alt="activeShowcase.previewAlt"
              :width="activeShowcase.previewWidth"
              :height="activeShowcase.previewHeight"
              fetchpriority="high"
            />
          </div>
          <figcaption>
            <span>{{ activeShowcase.name }}</span>
            <RouterLink :to="detailUrl(activeShowcase.id)" class="text-link">查看详情 <ChevronRight :size="14" aria-hidden="true" /></RouterLink>
          </figcaption>
        </figure>
      </section>

      <!-- 核心承诺：为什么选择 100-Free -->
      <section id="principles" class="principles" aria-labelledby="principles-title">
        <div class="shell">
          <div class="section-head">
            <h2 id="principles-title">为什么选择 100-Free</h2>
            <p class="section-sub">拒绝臃肿广告与高价 Pro 订阅，让每一款实用小工具回归纯粹。</p>
          </div>
          <div class="principles-grid">
            <article class="principle-card">
              <div class="principle-icon"><Lock :size="20" aria-hidden="true" /></div>
              <h3>100% 本地离线处理</h3>
              <p>所有截图拼接、表格解析、二维码识码与链接清洗均在浏览器本地完成，绝不向第三方服务器上传您的页面数据。</p>
            </article>
            <article class="principle-card">
              <div class="principle-icon"><Sparkles :size="20" aria-hidden="true" /></div>
              <h3>永久免费 · 零付费墙</h3>
              <p>对标市面上动辄 $19~$69 的商业付费扩展，所有高阶特性（2x 高清长图、Tailwind 提取、ZIP 打包）完全免费开放。</p>
            </article>
            <article class="principle-card">
              <div class="principle-icon"><Cpu :size="20" aria-hidden="true" /></div>
              <h3>MV3 原生轻量架构</h3>
              <p>基于 Chrome Manifest V3 标准与 Vue 3 构建，按需激活不常驻耗电，拒绝后台偷跑脚本与弹窗打扰。</p>
            </article>
          </div>
        </div>
      </section>

      <!-- 插件矩阵目录 -->
      <section id="directory" class="shell directory" aria-labelledby="directory-title">
        <div class="directory-header">
          <div>
            <h2 id="directory-title" class="section-title"><Grid2X2 :size="23" aria-hidden="true" />全部插件矩阵</h2>
            <p class="section-sub">点击任意卡片查看功能介绍、运行效果与上手指南。</p>
          </div>
          <div class="search-box">
            <Search :size="16" class="search-icon" aria-hidden="true" />
            <input
              v-model="searchQuery"
              type="search"
              placeholder="搜索插件名称、功能或场景..."
              aria-label="搜索插件"
            />
            <button v-if="searchQuery" type="button" class="clear-search" aria-label="清除搜索" @click="searchQuery = ''">
              <X :size="14" />
            </button>
          </div>
        </div>

        <div class="category-pills" role="tablist" aria-label="按分类筛选">
          <button
            v-for="cat in categories"
            :key="cat"
            type="button"
            role="tab"
            :aria-selected="selectedCategory === cat"
            :class="['pill', { active: selectedCategory === cat }]"
            @click="selectedCategory = cat"
          >
            {{ cat }}
            <span class="pill-count">
              {{ cat === '全部' ? plugins.length : plugins.filter((p) => p.category === cat).length }}
            </span>
          </button>
        </div>

        <div v-if="filteredPlugins.length === 0" class="empty-state">
          <p>没有找到匹配「{{ searchQuery }}」的插件，试试清除关键词或切换分类。</p>
          <button type="button" class="secondary-link" @click="searchQuery = ''; selectedCategory = '全部'">重置筛选</button>
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

    <!-- 插件详情页 -->
    <main v-else id="main" :key="selected.id" ref="pageRoot" class="shell detail" tabindex="-1">
      <RouterLink :to="{ query: {}, hash: '#directory' }" class="text-link">
        <ArrowLeft :size="16" aria-hidden="true" />返回全部插件 ({{ plugins.length }})
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
        <ShieldCheck :size="16" aria-hidden="true" />已完成 Chrome / Edge MV3 本地构建测试，纯本地计算零隐私上报。
      </p>

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
        <h2 id="instructions-title" class="section-title"><BookOpen :size="22" aria-hidden="true" />快速上手步骤</h2>
        <ol>
          <li v-for="step in selected.steps" :key="step">{{ step }}</li>
        </ol>
      </section>

      <section class="related-section" aria-labelledby="related-title">
        <h2 id="related-title">继续探索其他免费插件</h2>
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
        <h2>关于 100-Free Productivity Initiative</h2>
        <p>我们计划打造 100 款高品质、完全免费、零隐私上报的浏览器生产力工具，让效率工具重归自由。</p>
      </div>
      <div class="footer-meta">
        <span>当前进度：{{ plugins.length }} / 100</span>
        <span>·</span>
        <span>Chrome / Edge MV3 原生支持</span>
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
nav { display: flex; gap: clamp(12px, 3vw, 28px); font-size: 14px; color: var(--color-muted); font-weight: 550; }
nav a, .section-title, .detail-availability { display: flex; align-items: center; gap: 6px; }
.section-title { gap: 10px; }
.section-title svg, .detail-availability svg { flex-shrink: 0; color: var(--color-action); }
nav a:hover, .text-link:hover { color: var(--color-ink); text-decoration: underline; text-underline-offset: 4px; }

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

/* Hero Preview Tabs */
.hero-preview { margin: 0; }
.preview-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.preview-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid var(--color-line);
  background: var(--color-paper);
  color: var(--color-muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all .16s ease;
}
.preview-tab:hover { border-color: var(--color-taupe); color: var(--color-ink); }
.preview-tab.active {
  background: var(--color-ink);
  color: var(--color-paper);
  border-color: var(--color-ink);
}
.preview-tab img { border-radius: 4px; }
.preview-frame { padding: 8px; border: 1px solid var(--color-line); border-radius: 14px; background: var(--color-paper); box-shadow: 0 20px 50px #24272d14; }
.preview-frame img { display: block; width: 100%; height: auto; max-height: 360px; object-fit: cover; object-position: top; border-radius: 8px; }
figcaption { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 6px 14px; margin-top: 12px; font-size: 13px; color: var(--color-muted); }
figcaption span:first-child { font-weight: 700; color: var(--color-ink); }
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
