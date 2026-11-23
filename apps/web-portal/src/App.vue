<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Rocket,
  ShieldCheck,
  Zap,
  Gift,
  ArrowDown,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Table,
  Camera,
  Sparkles,
  Layers,
  HeartHandshake,
  Github
} from 'lucide-vue-next';
import { PLUGINS_DATA, type PluginItem } from './data/plugins';
import { AppButton } from '@100free/ui';

// 注册 GSAP 滚动触发插件
gsap.registerPlugin(ScrollTrigger);

const portalRoot = ref<HTMLElement | null>(null);
let ctx: gsap.Context;

const activeCategory = ref<'all' | 'data' | 'tool' | 'office'>('all');

const filterPlugins = () => {
  if (activeCategory.value === 'all') return PLUGINS_DATA;
  return PLUGINS_DATA.filter(p => p.category === activeCategory.value);
};

const getIconComponent = (name: PluginItem['iconName']) => {
  switch (name) {
    case 'Table': return Table;
    case 'Camera': return Camera;
    case 'Sparkles': return Sparkles;
    default: return Layers;
  }
};

const handleCategoryChange = async (cat: 'all' | 'data' | 'tool' | 'office') => {
  activeCategory.value = cat;
  await nextTick();
  gsap.fromTo(
    '.plugin-card-anim',
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out', clearProps: 'all' }
  );
};

onMounted(() => {
  ctx = gsap.context(() => {
    // 1. Hero 进场时间轴
    const tl = gsap.timeline({
      defaults: { duration: 0.6, ease: 'power3.out' }
    });

    tl.from('.hero-badge', { y: -20, opacity: 0, ease: 'back.out(1.7)' })
      .from('.hero-title', { y: 30, opacity: 0 }, '-=0.3')
      .from('.hero-desc', { y: 20, opacity: 0 }, '-=0.3')
      .from('.hero-stats', { scale: 0.95, opacity: 0 }, '-=0.2')
      .from('.hero-cta', { y: 20, opacity: 0, ease: 'back.out(1.5)' }, '-=0.2');

    // 2. 插件卡片：绑定 ScrollTrigger 滚动进入视口时触发
    gsap.from('.plugin-card-anim', {
      scrollTrigger: {
        trigger: '#plugins',
        start: 'top 85%',
        once: true
      },
      y: 35,
      opacity: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power2.out',
      clearProps: 'all'
    });
  }, portalRoot.value!);
});

onUnmounted(() => {
  ctx?.revert();
});
</script>

<template>
  <div ref="portalRoot" class="min-h-screen bg-slate-50 flex flex-col font-sans">
    <!-- 顶部导航条 -->
    <header class="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/80 px-6 py-3.5">
      <div class="max-w-6xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30">
            <Rocket class="w-5 h-5" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-sm font-bold text-slate-900 tracking-tight">100-Free</h1>
              <span class="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-200/60">
                INITIATIVE
              </span>
            </div>
            <p class="text-xs text-slate-500">100款免费生产力插件计划</p>
          </div>
        </div>

        <nav class="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
          <a href="#plugins" class="hover:text-emerald-600 transition-colors">插件矩阵</a>
          <a href="#manifesto" class="hover:text-emerald-600 transition-colors">开源宣言</a>
          <a href="https://github.com" target="_blank" class="hover:text-slate-900 transition-colors inline-flex items-center gap-1.5">
            <Github class="w-4 h-4" />
            <span>GitHub</span>
          </a>
        </nav>

        <div>
          <a
            href="#plugins"
            class="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all shadow-emerald-600/20 inline-flex items-center gap-1.5"
          >
            <span>获取插件</span>
            <ArrowRight class="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </header>

    <!-- 主展示区 (Hero) -->
    <section class="py-20 px-6 text-center max-w-4xl mx-auto flex flex-col items-center">
      <div class="hero-badge inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold mb-6 shadow-sm">
        <span class="flex h-2 w-2 relative">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        打破昂贵买断与订阅 · 让生产力重归自由
      </div>

      <h2 class="hero-title text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
        聚焦核心痛点，<br class="hidden sm:inline" />
        打造 <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">100 款永久纯净</span> 的浏览器利器
      </h2>

      <p class="hero-desc mt-6 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
        告别冗余权限与后台暗扣。我们坚持纯本地离线优先计算、界面克制无打扰、完全开源，为开发者、运营与职场人奉上真正省时省心的效率矩阵。
      </p>

      <!-- 实时数据看板 -->
      <div class="hero-stats grid grid-cols-3 gap-6 sm:gap-8 mt-10 p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm w-full max-w-xl">
        <div class="text-center">
          <div class="inline-flex items-center gap-1.5 text-2xl sm:text-3xl font-extrabold text-emerald-600">
            <Rocket class="w-6 h-6 text-emerald-500 inline-block" />
            <span>1 / 100</span>
          </div>
          <div class="text-xs text-slate-500 mt-1">计划推进中</div>
        </div>
        <div class="text-center border-x border-slate-100">
          <div class="inline-flex items-center gap-1.5 text-2xl sm:text-3xl font-extrabold text-slate-800">
            <ShieldCheck class="w-6 h-6 text-teal-600 inline-block" />
            <span>100%</span>
          </div>
          <div class="text-xs text-slate-500 mt-1">本地安全运行</div>
        </div>
        <div class="text-center">
          <div class="inline-flex items-center gap-1.5 text-2xl sm:text-3xl font-extrabold text-slate-800">
            <Gift class="w-6 h-6 text-amber-500 inline-block" />
            <span>0 元</span>
          </div>
          <div class="text-xs text-slate-500 mt-1">无套路全免费</div>
        </div>
      </div>

      <div class="hero-cta mt-8 flex flex-wrap gap-4 justify-center">
        <a
          href="#plugins"
          class="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-all shadow-md shadow-slate-900/10 inline-flex items-center gap-2"
        >
          <span>立即获取第 1 款插件</span>
          <ArrowDown class="w-4 h-4 animate-bounce" />
        </a>
      </div>
    </section>

    <!-- 插件矩阵 (Plugins Grid) -->
    <section id="plugins" class="py-16 px-6 bg-white border-y border-slate-200/60 flex-1">
      <div class="max-w-6xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div class="flex items-center gap-2">
              <Layers class="w-5 h-5 text-emerald-600" />
              <h3 class="text-2xl font-bold text-slate-900">精选生产力插件库</h3>
            </div>
            <p class="text-sm text-slate-500 mt-1">点击插件直接获取或查看使用指南</p>
          </div>

          <!-- 分类筛选器 -->
          <div class="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            <button
              :class="['px-3 py-1.5 rounded-lg transition-all', activeCategory === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900']"
              @click="handleCategoryChange('all')"
            >
              全部
            </button>
            <button
              :class="['px-3 py-1.5 rounded-lg transition-all', activeCategory === 'data' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900']"
              @click="handleCategoryChange('data')"
            >
              数据提取
            </button>
            <button
              :class="['px-3 py-1.5 rounded-lg transition-all', activeCategory === 'tool' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900']"
              @click="handleCategoryChange('tool')"
            >
              效率工具
            </button>
            <button
              :class="['px-3 py-1.5 rounded-lg transition-all', activeCategory === 'office' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900']"
              @click="handleCategoryChange('office')"
            >
              智能办公
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="item in filterPlugins()"
            :key="item.id"
            class="plugin-card-anim rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-xl hover:shadow-slate-200/50 hover:border-emerald-300 transition-all duration-300 bg-white group"
          >
            <div>
              <div class="flex items-start justify-between gap-4 mb-4">
                <div :class="['w-12 h-12 rounded-xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-105', item.iconBg]">
                  <component :is="getIconComponent(item.iconName)" :class="['w-6 h-6', item.iconColor]" />
                </div>
                <span
                  :class="[
                    'text-[11px] font-bold px-2.5 py-1 rounded-full',
                    item.status === 'released'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-slate-100 text-slate-600'
                  ]"
                >
                  {{ item.badge }}
                </span>
              </div>

              <h4 class="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                {{ item.name }}
              </h4>
              <p class="text-xs font-semibold text-emerald-600 mt-1">{{ item.tagline }}</p>
              <p class="text-sm text-slate-600 mt-3 leading-relaxed">
                {{ item.description }}
              </p>

              <!-- 特性列表 -->
              <div class="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
                <div
                  v-for="(feat, fIdx) in item.features"
                  :key="fIdx"
                  class="flex items-center gap-2 text-xs text-slate-600"
                >
                  <CheckCircle2 class="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{{ feat }}</span>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="mt-6 pt-4 flex items-center justify-between border-t border-slate-100">
              <span class="text-xs text-slate-400 font-mono">{{ item.version }}</span>
              <div v-if="item.status === 'released'" class="flex items-center gap-2">
                <AppButton size="sm" variant="secondary">
                  快速指引
                </AppButton>
                <AppButton size="sm" variant="primary">
                  免费安装
                </AppButton>
              </div>
              <div v-else>
                <span class="text-xs font-medium text-slate-400 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  内测打磨中
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 纯粹与安全宣言 (Manifesto) -->
    <section id="manifesto" class="py-16 px-6 max-w-4xl mx-auto text-center">
      <div class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 mb-4">
        <HeartHandshake class="w-5 h-5" />
      </div>
      <h3 class="text-2xl font-bold text-slate-900">我们为什么发起「100款免费计划」？</h3>
      <p class="mt-4 text-slate-600 leading-relaxed text-sm sm:text-base">
        市面上的很多扩展要么收取高昂的月订阅费，要么要求过度的账号与网页读取权限，甚至偷塞推广代码。<br />
        我们相信：最棒的工具应该是<b>纯粹、即用即走、不打扰用户</b>的。每一个小插件都将精简到极致，代码开源，本地运算，绝不滥用任何个人隐私。
      </p>
    </section>

    <!-- 页脚 -->
    <footer class="mt-auto py-8 px-6 bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
      <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <Rocket class="w-4 h-4 text-emerald-400" />
          <span>© 2026 100-Free Productivity Initiative. 保留所有权利。</span>
        </div>
        <div class="flex items-center gap-6">
          <a href="#" class="hover:text-white transition-colors">隐私协议</a>
          <a href="#" class="hover:text-white transition-colors">免责声明</a>
          <a href="#" class="hover:text-white transition-colors">关于作者</a>
        </div>
      </div>
    </footer>
  </div>
</template>
