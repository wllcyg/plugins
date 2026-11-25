import { computed, ref, watch } from 'vue';

export type Locale = 'zh' | 'en';

const STORAGE_KEY = '100free_portal_lang';

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'zh';
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
    navInstallGuide: '安装指南',
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
    downloadZip: '下载最新版 ZIP 安装包',
    viewReleases: '查看 GitHub Releases',
    installTipTitle: 'Chrome / Edge 本地安装方式（3 步生效）：',
    installTipDesc: '1. 点击上方按钮下载 .zip 压缩包并解压到固定文件夹；2. 在浏览器地址栏打开 chrome://extensions 并开启右上角「开发者模式」；3. 点击「加载已解压的扩展程序」（或直接将解压文件夹拖入页面）即可使用。',
    viewFullInstallGuide: '查看完整图文安装教程',
    installPageTitle: '压缩包安装使用指南',
    installPageSubtitle: '适用于 Chrome、Microsoft Edge、Brave、Arc 等所有 Chromium 内核浏览器，3 分钟完成本地永久安装。',
    installCopied: '已复制',
    installCopyUrl: '复制地址',
    installStep1Title: '第 1 步：下载并完整解压 .zip',
    installStep1Desc: '从各插件详情页或 GitHub Releases 下载对应的 .zip 压缩包。务必右键选择「全部解压缩」到一个不会随意删除的固定目录（例如 D:\\ChromeExtensions\\）。',
    installStep1Warn: '切勿直接拖入 .zip 压缩包本身，也不要放在临时下载目录后删除——浏览器每次启动都会从该解压文件夹读取插件。',
    installStep2Title: '第 2 步：打开扩展管理页并开启「开发者模式」',
    installStep2Desc: '出于浏览器安全限制，无法从网页直接跳转内部设置页。请点击下方按钮复制地址，粘贴到浏览器地址栏并回车，然后开启「开发者模式」开关。',
    installStep3Title: '第 3 步：加载已解压的扩展程序并固定图标',
    installStep3Desc: '点击页面左上角的「加载已解压的扩展程序」（或直接把解压出来的文件夹拖进扩展管理页）。安装完成后，点击浏览器右上角拼图图标，将常用插件固定（Pin）到工具栏。',
    installFolderTipTitle: '文件夹层级防踩坑提示：',
    installFolderTipDesc: '选择目录时，必须选中直接包含 manifest.json 文件的那一层文件夹。如果解压时多套了一层目录，请双击进入里面那层再选择。',
    installFaqTitle: '常见问题与排坑（FAQ）',
    installFaq1Q: 'Q1：Chrome 和 Edge 需要下载不同的压缩包吗？',
    installFaq1A: '不需要。新版 Edge 与 Chrome 同属 Chromium 内核，所有 -chrome.zip 安装包在 Chrome、Edge、Brave、Arc 上 100% 通用。',
    installFaq2Q: 'Q2：以后发布了新版本，怎么升级？',
    installFaq2A: '下载新版 .zip 解压并直接覆盖原文件夹，然后在扩展管理页点击对应插件卡片右下角的刷新按钮 (↻) 即可完成升级，原有的本地设置和数据都会完整保留。',
    installFaq3Q: 'Q3：浏览器弹出「请停用以开发者模式运行的扩展程序」提示怎么办？',
    installFaq3A: '这是 Chromium 对本地加载扩展的常规安全提醒，点击「保留」或关闭提示即可；所有插件均在 GitHub Actions 公开透明构建，无任何恶意行为。',
    installBrowseAll: '前往插件矩阵下载扩展',
    siteTitleInstall: '安装指南 · 100-Free 免费生产力插件',
    detailAvailability: '已完成 Chrome / Edge MV3 本地构建测试，纯本地计算零隐私上报。',
    stepsTitle: '快速上手步骤',
    relatedTitle: '继续探索其他免费插件',
    footerTitle: '关于 100-Free Productivity Initiative',
    footerDesc: '我们计划打造 100 款高品质、完全免费、零隐私上报的浏览器生产力工具，让效率工具重归自由。',
    footerProgress: (count: number) => `当前进度：${count} / 100`,
    footerPlatform: 'Chrome / Edge MV3 原生支持',
    siteTitleHome: '100-Free · 免费、纯净、离线优先的浏览器生产力矩阵',
    siteTitleDetail: (name: string) => `${name} · 100-Free 免费生产力插件`,
    switchLangLabel: 'EN',
    switchToDark: '切换至极客暗夜模式',
    switchToLight: '切换至暖沙日间模式'
  },
  en: {
    skipToMain: 'Skip to main content',
    brandBadge: (count: number) => `${count} Live`,
    navAllPlugins: 'All Extensions',
    navPrinciples: 'Principles',
    navInstallGuide: 'Install Guide',
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
    downloadZip: 'Download Latest ZIP',
    viewReleases: 'GitHub Releases',
    installTipTitle: 'How to install on Chrome / Edge (3 quick steps):',
    installTipDesc: '1. Download and unzip the .zip package to a local folder; 2. Open chrome://extensions and turn on "Developer mode" in the top-right corner; 3. Click "Load unpacked" (or drag the extracted folder onto the page).',
    viewFullInstallGuide: 'View Step-by-Step Install Guide',
    installPageTitle: 'ZIP Extension Install Guide',
    installPageSubtitle: 'Works identically on Google Chrome, Microsoft Edge, Brave, and Arc. Get set up locally in under 3 minutes.',
    installCopied: 'Copied',
    installCopyUrl: 'Copy URL',
    installStep1Title: 'Step 1: Download & Extract the .zip Archive',
    installStep1Desc: 'Download the desired .zip file from any extension page or GitHub Releases. Right-click and extract it completely into a permanent folder (e.g., D:\\ChromeExtensions\\ or ~/Extensions/).',
    installStep1Warn: 'Do NOT drag the .zip file directly into the browser, and do NOT delete the extracted folder afterward—the browser reads from it on every launch.',
    installStep2Title: 'Step 2: Open Extensions Page & Enable Developer Mode',
    installStep2Desc: 'Browser security blocks direct links to internal settings. Copy the address below, paste it into your address bar, press Enter, and toggle on "Developer mode".',
    installStep3Title: 'Step 3: Load Unpacked & Pin to Toolbar',
    installStep3Desc: 'Click "Load unpacked" in the top-left corner (or drag the extracted folder onto the page). Then click the puzzle icon in your toolbar and Pin the extension for quick access.',
    installFolderTipTitle: 'Folder Hierarchy Tip:',
    installFolderTipDesc: 'Always select the folder that directly contains the manifest.json file. If your extraction tool created an extra nested wrapper folder, open it one level deeper.',
    installFaqTitle: 'Frequently Asked Questions',
    installFaq1Q: 'Q1: Do I need separate ZIP files for Chrome and Edge?',
    installFaq1A: 'No. Modern Edge shares the exact same Chromium Manifest V3 engine as Chrome. Every -chrome.zip works identically on Chrome, Edge, Brave, and Arc.',
    installFaq2Q: 'Q2: How do I update an extension when a new version is released?',
    installFaq2A: 'Download the new .zip, extract and overwrite the existing folder, then click the Reload (↻) icon on the extension card. Your local settings and stats are preserved.',
    installFaq3Q: 'Q3: What if Chrome warns about extensions running in Developer Mode?',
    installFaq3A: 'That is a standard Chromium reminder for unpacked extensions—simply dismiss or keep it enabled. Every package is built transparently from source via GitHub Actions.',
    installBrowseAll: 'Browse All Extensions',
    siteTitleInstall: 'Install Guide · 100-Free Extensions',
    detailAvailability: 'Verified on Chrome & Edge MV3 locally. 100% offline computation with zero telemetry.',
    stepsTitle: 'Quick Start',
    relatedTitle: 'Explore More Free Extensions',
    footerTitle: 'About 100-Free Productivity Initiative',
    footerDesc: 'On a mission to craft 100 polished, completely free, zero-telemetry browser utilities for developers and knowledge workers.',
    footerProgress: (count: number) => `Progress: ${count} / 100`,
    footerPlatform: 'Chrome & Edge MV3 Ready',
    siteTitleHome: '100-Free · Free, Private & Offline-First Browser Extensions',
    siteTitleDetail: (name: string) => `${name} · 100-Free Extensions`,
    switchLangLabel: '中文',
    switchToDark: 'Switch to Dark Mode',
    switchToLight: 'Switch to Light Mode'
  }
} as const;

export const t = computed(() => messages[locale.value]);
