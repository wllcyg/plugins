import { computed, ref, watch } from 'vue';

export type Locale = 'zh' | 'en';

const STORAGE_KEY = '100free_portal_lang';

function detectInitialLocale(): Locale {
  try {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang === 'zh' || urlLang === 'en') return urlLang;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') return saved;
    return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  } catch {
    return 'zh';
  }
}

export const locale = ref<Locale>(detectInitialLocale());

watch(
  locale,
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, val);
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = val === 'zh' ? 'zh-CN' : 'en';
    }
  },
  { immediate: true }
);

export function toggleLocale() {
  locale.value = locale.value === 'zh' ? 'en' : 'zh';
}

const messages = {
  zh: {
    skipToMain: '跳到主要内容',
    brandBadge: (count: number) => `已上线 ${count} 款`,
    navAllPlugins: '全部插件',
    navPrinciples: '核心原则',
    navAbout: '关于计划',
    navAriaLabel: '主导航',
    carouselAriaLabel: '精选插件功能轮播展示',
    categoryAriaLabel: '按插件分类筛选',
    heroEyebrow: '打破昂贵订阅 · 纯本地离线运转',
    heroTitleLine1: '网页生产力，',
    heroTitleLine2: '随手带走',
    heroDesc: (count: number) =>
      `已上线 ${count} 款高频免费浏览器扩展：覆盖长截图标注、表格转 Excel、自由复制、外链免拦截直达、CSS 提取、大图嗅探、网课倍速与离线二维码。`,
    heroCtaPrimary: (count: number) => `探索全部 ${count} 款插件`,
    heroCtaSecondary: '了解开源承诺',
    viewDetails: '查看详情',
    principlesTitle: '为什么选择 100-Free',
    principlesSub: '拒绝臃肿广告与高价 Pro 订阅，让每一款实用小工具回归纯粹。',
    principle1Title: '100% 本地离线处理',
    principle1Desc: '所有截图拼接、表格解析、二维码识码与链接清洗均在浏览器本地完成，绝不向第三方服务器上传您的页面数据。',
    principle2Title: '永久免费 · 零付费墙',
    principle2Desc: '对标市面上动辄 $19~$69 的商业付费扩展，所有高阶特性（2x 高清长图、Tailwind 提取、ZIP 打包）完全免费开放。',
    principle3Title: 'MV3 原生轻量架构',
    principle3Desc: '基于 Chrome Manifest V3 标准与 Vue 3 构建，按需激活不常驻耗电，拒绝后台偷跑脚本与弹窗打扰。',
    directoryTitle: '全部插件矩阵',
    directorySub: '点击任意卡片查看功能介绍、运行效果与上手指南。',
    searchPlaceholder: '搜索插件名称、功能或场景...',
    searchAria: '搜索插件',
    clearSearchAria: '清除搜索',
    allCategory: '全部',
    emptyResult: (q: string) => `没有找到匹配「${q}」的插件，试试清除关键词或切换分类。`,
    resetFilter: '重置筛选',
    backToDirectory: (count: number) => `返回全部插件 (${count})`,
    detailAvailability: '已完成 Chrome / Edge MV3 本地构建测试，纯本地计算零隐私上报。',
    stepsTitle: '快速上手步骤',
    relatedTitle: '继续探索其他免费插件',
    footerTitle: '关于 100-Free Productivity Initiative',
    footerDesc: '我们计划打造 100 款高品质、完全免费、零隐私上报的浏览器生产力工具，让效率工具重归自由。',
    footerProgress: (count: number) => `当前进度：${count} / 100`,
    footerPlatform: 'Chrome / Edge MV3 原生支持',
    siteTitleHome: '100-Free · 免费、纯净、离线优先的浏览器生产力矩阵',
    siteTitleDetail: (name: string) => `${name} · 100-Free 免费生产力插件`,
    switchLangLabel: 'EN'
  },
  en: {
    skipToMain: 'Skip to main content',
    brandBadge: (count: number) => `${count} Live`,
    navAllPlugins: 'All Extensions',
    navPrinciples: 'Principles',
    navAbout: 'About',
    navAriaLabel: 'Main navigation',
    carouselAriaLabel: 'Featured extension previews carousel',
    categoryAriaLabel: 'Filter extensions by category',
    heroEyebrow: 'No Subscriptions · 100% Local & Offline',
    heroTitleLine1: 'Web productivity,',
    heroTitleLine2: 'effortlessly yours',
    heroDesc: (count: number) =>
      `${count} free, privacy-first browser extensions now available: full-page screenshots, table-to-Excel, super copy, clean redirects, CSS-to-Tailwind, bulk image sniffer, video speed booster, and offline QR tools.`,
    heroCtaPrimary: (count: number) => `Explore All ${count} Tools`,
    heroCtaSecondary: 'Our Open Pledge',
    viewDetails: 'View Details',
    principlesTitle: 'Why 100-Free',
    principlesSub: 'No bloated ads, no $69 Pro paywalls—just fast, focused tools that respect your privacy.',
    principle1Title: '100% Local Processing',
    principle1Desc: 'Every screenshot stitch, table export, QR decode, and URL cleanup runs entirely in your browser. Zero data ever leaves your device.',
    principle2Title: 'Free Forever · Zero Paywalls',
    principle2Desc: 'Built as free alternatives to pricey $19–$69 extensions. All pro features—2x HD capture, Tailwind export, ZIP bundling—are unlocked by default.',
    principle3Title: 'Lightweight MV3 Native',
    principle3Desc: 'Powered by Chrome Manifest V3 and Vue 3. Activated on demand with minimal memory footprint and zero background tracking.',
    directoryTitle: 'Extension Matrix',
    directorySub: 'Select any extension to inspect live previews, key features, and quick-start steps.',
    searchPlaceholder: 'Search tools, features, or use cases...',
    searchAria: 'Search extensions',
    clearSearchAria: 'Clear search',
    allCategory: 'All',
    emptyResult: (q: string) => `No extensions match "${q}". Try another keyword or reset filters.`,
    resetFilter: 'Reset Filters',
    backToDirectory: (count: number) => `Back to All (${count})`,
    detailAvailability: 'Verified on Chrome & Edge MV3 locally. 100% offline computation with zero telemetry.',
    stepsTitle: 'Quick Start',
    relatedTitle: 'Explore More Free Extensions',
    footerTitle: 'About 100-Free Productivity Initiative',
    footerDesc: 'On a mission to craft 100 polished, completely free, zero-telemetry browser utilities for developers and knowledge workers.',
    footerProgress: (count: number) => `Progress: ${count} / 100`,
    footerPlatform: 'Chrome & Edge MV3 Ready',
    siteTitleHome: '100-Free · Free, Private & Offline-First Browser Extensions',
    siteTitleDetail: (name: string) => `${name} · 100-Free Extensions`,
    switchLangLabel: '中文'
  }
} as const;

export const t = computed(() => messages[locale.value]);
