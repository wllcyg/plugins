<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import gsap from 'gsap';
import { ArrowDown, ArrowLeft, BookOpen, ChevronRight, CircleHelp, Grid2X2, LayoutGrid, ShieldCheck } from 'lucide-vue-next';
import { plugins } from './data/plugins';

const logoUrl = import.meta.env.BASE_URL + 'logo.svg';
const route = useRoute();
const router = useRouter();
const selected = computed(() => plugins.find((plugin) => plugin.id === route.query.tool));
const editor = plugins[1];
const table = plugins[0];
const pageRoot = ref<HTMLElement>();
const detailUrl = (id: string) => ({ query: { tool: id } });
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

watch(selected, (plugin) => {
  document.title = plugin ? plugin.name + ' · 100-Free' : '网页表格导出与长截图 · 100-Free';
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
        <img :src="logoUrl" alt="" width="36" height="36" />
        <span>100<span class="brand-hyphen">-</span>Free</span>
      </RouterLink>
      <nav aria-label="主导航">
        <RouterLink :to="{ query: {}, hash: '#directory' }"><LayoutGrid :size="16" aria-hidden="true" />插件目录</RouterLink>
        <a href="#about"><CircleHelp :size="16" aria-hidden="true" />关于计划</a>
      </nav>
    </div>
  </header>

  <Transition mode="out-in" :css="false" @enter="enterPage" @leave="leavePage"
    @enter-cancelled="clearTransition" @leave-cancelled="clearTransition">
  <main v-if="!selected" id="main" key="home" ref="pageRoot" tabindex="-1">
    <section class="shell hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <h1 id="hero-title">网页信息，<br>随手带走<span>。</span></h1>
        <p>把表格转成 Excel，把滚动页面截成长图。两款免费浏览器扩展，数据在本地处理。</p>
        <a href="#directory" class="primary-link">浏览插件 <ArrowDown :size="17" aria-hidden="true" /></a>
      </div>
      <figure class="hero-preview">
        <div class="preview-frame">
          <img :src="editor.preview" :alt="editor.previewAlt" width="1000" height="800" fetchpriority="high">
        </div>
        <figcaption><span>网页长截图</span><span>截图后的标注工作区</span></figcaption>
      </figure>
    </section>

    <section class="featured" aria-labelledby="featured-title">
      <div class="shell">
        <h2 id="featured-title">精选工具</h2>
        <div class="featured-grid">
          <article v-for="tool in [table, editor]" :key="tool.id" class="feature-card">
            <div class="feature-copy">
              <img :src="tool.icon" alt="" width="42" height="42">
              <h3>{{ tool.headline }}</h3>
              <p>{{ tool.summary }}</p>
              <RouterLink :to="detailUrl(tool.id)" class="text-link">查看{{ tool.name }} <ChevronRight :size="15" aria-hidden="true" /></RouterLink>
            </div>
            <div v-if="tool.id === table.id" class="feature-media">
              <img :src="tool.preview" :alt="tool.previewAlt" :width="tool.previewWidth" :height="tool.previewHeight" loading="lazy">
            </div>
          </article>
        </div>
      </div>
    </section>

    <section id="directory" class="shell directory" aria-labelledby="directory-title">
      <h2 id="directory-title" class="section-title"><Grid2X2 :size="23" aria-hidden="true" />全部插件</h2>
      <ul>
        <li v-for="tool in plugins" :key="tool.id">
          <RouterLink class="directory-row" :to="detailUrl(tool.id)">
            <img :src="tool.icon" alt="" width="42" height="42">
            <span class="directory-name">{{ tool.name }}<small>{{ tool.category }}</small></span>
            <span class="availability">已完成 Edge 本地测试</span>
            <ChevronRight :size="18" aria-hidden="true" />
          </RouterLink>
        </li>
      </ul>
    </section>
  </main>

  <main v-else id="main" :key="selected.id" ref="pageRoot" class="shell detail" tabindex="-1">
    <RouterLink :to="{ query: {}, hash: '#directory' }" class="text-link"><ArrowLeft :size="16" aria-hidden="true" />返回插件目录</RouterLink>
    <div class="detail-heading">
      <img :src="selected.icon" alt="" width="58" height="58">
      <h1>{{ selected.name }}</h1>
    </div>
    <p class="detail-summary">{{ selected.summary }}</p>
    <p class="availability detail-availability"><ShieldCheck :size="16" aria-hidden="true" />已完成 Edge 本地测试，商店安装链接将在上架后提供。</p>
    <img class="detail-preview" :src="selected.preview" :alt="selected.previewAlt" :width="selected.previewWidth" :height="selected.previewHeight">
    <section class="instructions" aria-labelledby="instructions-title">
      <h2 id="instructions-title" class="section-title"><BookOpen :size="23" aria-hidden="true" />怎么用</h2>
      <ol><li v-for="step in selected.steps" :key="step">{{ step }}</li></ol>
    </section>
  </main>
  </Transition>

  <footer id="about">
    <div class="shell footer-content">
      <div>
        <h2>关于 100-Free</h2>
        <p>我们计划开发 100 款免费浏览器工具，每款解决一件具体的事。</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.shell { width: min(100% - 48px, 1120px); margin-inline: auto; }
.skip-link { position: fixed; z-index: 2; top: 8px; left: 8px; transform: translateY(-180%); background: var(--color-paper); padding: 8px 12px; }
.skip-link:focus { transform: none; }
.site-header { border-bottom: 1px solid var(--color-line); }
.topbar, .footer-content { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.topbar { min-height: 67px; }
.brand { display: inline-flex; align-items: center; gap: 9px; font-size: 22px; letter-spacing: -.05em; font-weight: 800; white-space: nowrap; }
.brand img { flex-shrink: 0; }
.brand-hyphen, .hero h1 span { color: var(--color-action); }
nav { display: flex; gap: clamp(12px, 3vw, 30px); font-size: 14px; color: var(--color-muted); }
nav a, .section-title, .detail-availability { display: flex; align-items: center; gap: 7px; }
.section-title { gap: 11px; }
.section-title svg, .detail-availability svg { flex-shrink: 0; color: var(--color-muted); }
nav a:hover, .text-link:hover { text-decoration: underline; text-underline-offset: 4px; }
.hero { display: grid; align-items: center; grid-template-columns: .9fr 1.1fr; gap: clamp(24px, 5vw, 80px); padding-block: clamp(54px, 8vw, 116px); }
.hero h1 { margin: 0; font-size: clamp(36px, 5.6vw, 77px); line-height: 1.1; letter-spacing: -.055em; font-weight: 800; }
.hero p, .detail-summary { max-width: 31ch; margin: 22px 0; color: var(--color-muted); font-size: clamp(16px, 1.5vw, 19px); line-height: 1.7; }
.primary-link, .text-link { display: inline-flex; align-items: center; gap: 8px; font-weight: 650; }
.primary-link { min-height: 44px; padding: 10px 15px; border-radius: 6px; background: var(--color-action); color: white; }
.primary-link:hover { background: var(--color-action-hover); }
.preview-frame { padding: 9px; border: 1px solid var(--color-line); border-radius: 12px; background: var(--color-paper); box-shadow: 0 20px 50px #24272d13; }
.preview-frame img { display: block; width: 100%; height: auto; border-radius: 5px; }
figcaption { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 14px; margin-top: 12px; font-size: 13px; color: var(--color-muted); }
figcaption span:first-child { font-weight: 650; }
.featured { background: var(--color-paper); border-block: 1px solid var(--color-line); padding-block: 46px 54px; }
h2 { margin: 0; font-size: clamp(24px, 3vw, 34px); font-weight: 760; letter-spacing: -.035em; }
.featured-grid { display: grid; grid-template-columns: 1.2fr .8fr; gap: 20px; margin-top: 22px; }
.feature-card { display: flex; position: relative; align-items: flex-start; isolation: isolate; overflow: hidden; min-height: 245px; border: 1px solid var(--color-line); border-radius: 12px; background: var(--color-sand); }
.feature-copy { padding: clamp(20px, 3vw, 32px); }
.feature-card:has(.feature-media) .feature-copy { width: 57%; }
.feature-card h3 { margin: 12px 0 7px; font-size: 22px; line-height: 1.3; font-weight: 750; text-wrap: balance; }
.feature-card p, footer p { margin: 0 0 14px; color: var(--color-muted); line-height: 1.65; }
.feature-media { display: flex; justify-content: flex-end; align-self: stretch; width: 43%; min-width: 0; margin: 18px 0 0; border: 1px solid var(--color-line); border-right: 0; border-radius: 9px 0 0; overflow: hidden; background: white; }
.feature-media img { width: auto; max-width: none; height: 100%; max-height: 260px; object-fit: contain; }
.text-link { font-size: 14px; min-height: 32px; }
.directory { padding-block: 52px 70px; }
.directory ul { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 0; margin: 20px 0 0; list-style: none; }
.directory-row { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 12px; padding: 14px; min-height: 72px; border: 1px solid var(--color-line); border-radius: 8px; background: var(--color-paper); }
.directory-row { transition: border-color .16s ease; }
.directory-row:hover { border-color: var(--color-taupe); }
.directory-name { font-weight: 700; }
.directory-name small { display: block; color: var(--color-muted); font-size: 13px; font-weight: 400; }
.availability { color: var(--color-muted); font-size: 13px; }
footer { border-top: 1px solid var(--color-line); padding-block: 30px; }
footer h2 { font-size: 16px; }
footer p { font-size: 14px; margin: 6px 0 0; }
.detail { padding-block: 34px 72px; }
.detail-heading { display: flex; align-items: center; gap: 14px; margin-top: 28px; }
.detail-heading h1 { font-size: clamp(32px, 5vw, 54px); font-weight: 800; letter-spacing: -.04em; }
.detail-summary { max-width: 45ch; }
.detail-preview { display: block; width: min(100%, 890px); height: auto; margin-top: 26px; border: 1px solid var(--color-line); border-radius: 9px; background: var(--color-paper); }
.instructions { margin-top: 32px; }
.instructions ol { list-style: decimal; padding-left: 22px; margin-top: 12px; line-height: 1.85; }
@media (prefers-reduced-motion: no-preference) {
  .directory-row > svg { transition: transform .18s ease; }
  .directory-row:is(:hover, :focus-visible) > svg { transform: translateX(3px); }
}
@media (max-width: 800px) {
  .hero, .featured-grid, .directory ul { grid-template-columns: 1fr; }
  .hero { gap: 34px; }
  .feature-card { min-height: 0; }
}
@media (max-width: 480px) {
  .shell { width: calc(100% - 32px); }
  .feature-card:has(.feature-media) { display: block; }
  .feature-card:has(.feature-media) .feature-copy { width: auto; }
  .feature-media { width: auto; margin: 0 14px 14px; border-right: 1px solid var(--color-line); border-radius: 7px; }
  .feature-media img { width: 100%; height: auto; }
  .directory-row { grid-template-columns: auto 1fr auto; gap: 8px; }
  .directory-row .availability { grid-column: 2; grid-row: 2; }
  .directory-row > svg { grid-column: 3; grid-row: 1; }
  .footer-content { align-items: flex-start; flex-direction: column; gap: 9px; }
}
</style>
