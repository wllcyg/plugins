import tableIcon from '../../../ext-table-export/public/icons/icon-128.png?url';
import screenshotIcon from '../../../ext-screenshot/public/icons/icon-128.png?url';
import copyIcon from '../../../ext-allow-copy/public/icons/icon-128.png?url';
import cssIcon from '../../../ext-css-inspector/public/icons/icon-128.png?url';
import snifferIcon from '../../../ext-image-sniffer/public/icons/icon-128.png?url';
import videoIcon from '../../../ext-video-master/public/icons/icon-128.png?url';
import qrIcon from '../../../ext-qr-master/public/icons/icon-128.png?url';
import redirectIcon from '../../../ext-clean-redirect/public/icons/icon-128.png?url';
import highlighterIcon from '../../../ext-highlighter/public/icons/icon-128.png?url';
import screenStudioIcon from '../../../ext-screen-studio/public/icons/icon-128.png?url';
import pdfToolkitIcon from '../../../ext-pdf-toolkit/public/icons/icon-128.png?url';

import tablePreview from '../assets/table-export.webp';
import editorPreview from '../assets/screenshot-editor.webp';
import copyPreview from '../assets/allow-copy.webp';
import cssPreview from '../assets/css-inspector.webp';
import snifferPreview from '../assets/image-sniffer.webp';
import videoPreview from '../assets/video-master.webp';
import qrPreview from '../assets/qr-master.webp';
import redirectPreview from '../assets/clean-redirect.webp';
import highlighterPreview from '../assets/highlighter.webp';
import screenStudioPreview from '../assets/screen-studio.webp';
import pdfToolkitPreview from '../assets/pdf-toolkit.png';
import type { Locale } from './i18n';

// ─── 分类大组 ────────────────────────────────────────────────────────────────

export type CategoryGroupKey = 'all' | 'reading' | 'media' | 'dev';

export interface CategoryGroupItem {
  zh: string;
  en: string;
}

export const CATEGORY_GROUPS: Record<CategoryGroupKey, CategoryGroupItem> = {
  all:     { zh: '全部',     en: 'All' },
  reading: { zh: '阅读与文本', en: 'Reading & Text' },
  media:   { zh: '图像与视频', en: 'Image & Video' },
  dev:     { zh: '数据与开发', en: 'Data & Dev' },
};

// ─── 类型定义 ────────────────────────────────────────────────────────────────

export interface HighlightItem {
  title: string;
  desc: string;
}

export interface LocalizedContent {
  name: string;
  tagline: string;
  category: string;
  previewAlt: string;
  summary: string;
  highlights: HighlightItem[];
  steps: string[];
}

export interface PluginRawItem {
  id: string;
  categoryGroup: Exclude<CategoryGroupKey, 'all'>;
  icon: string;
  preview: string;
  previewWidth: number;
  previewHeight: number;
  edgeStoreUrl?: string;
  zh: LocalizedContent;
  en: LocalizedContent;
}

export interface PluginItem extends LocalizedContent {
  id: string;
  categoryGroup: Exclude<CategoryGroupKey, 'all'>;
  icon: string;
  preview: string;
  previewWidth: number;
  previewHeight: number;
  edgeStoreUrl?: string;
  downloadUrl: string;
}

export const GITHUB_REPO_URL = 'https://github.com/wllcyg/plugins';
export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`;

// ─── 插件数据 ────────────────────────────────────────────────────────────────

const rawPlugins: PluginRawItem[] = [
  // ── 表格导出 ──────────────────────────────────────────────────────────────
  {
    id: 'table-export',
    categoryGroup: 'dev',
    icon: tableIcon,
    preview: tablePreview,
    previewWidth: 984,
    previewHeight: 308,
    zh: {
      name: '表格导出',
      tagline: '网页上的数据，一秒进表格。',
      category: '数据与开发',
      previewAlt: '示例网页的销售表格上方显示 Excel、CSV 和复制按钮',
      summary: '自动识别页面中的结构化表格，一键复制或导出为 Excel、CSV 与 Markdown，告别手动整理。',
      highlights: [
        { title: '智能表格识别', desc: '精准定位页面中的所有数据表，完整保留行列结构与表头。' },
        { title: '多格式随心导出', desc: '支持 XLSX、CSV、JSON 与 Markdown，无缝衔接 Excel 与文档工具。' },
        { title: '一键复制即用', desc: '无需下载文件也能直接复制到剪贴板，粘贴进表格软件即可分析。' },
      ],
      steps: [
        '打开含有表格的网页。',
        '把鼠标移到表格上，等待导出工具条出现。',
        '选择 Excel、CSV，或点复制。',
      ],
    },
    en: {
      name: 'Table Export',
      tagline: 'Web tables to spreadsheets, in a second.',
      category: 'Data & Dev',
      previewAlt: 'Floating Excel, CSV, and Copy buttons shown above a web sales table',
      summary: 'Detect structured tables on any webpage and copy or export directly to Excel, CSV, or Markdown.',
      highlights: [
        { title: 'Smart table detection', desc: 'Automatically locate data tables on the page with clean row and column alignment.' },
        { title: 'Multi-format export', desc: 'Download as XLSX, CSV, JSON, or Markdown to fit directly into your workflow.' },
        { title: 'Instant clipboard copy', desc: 'Copy structured table data in one click and paste straight into your spreadsheet.' },
      ],
      steps: [
        'Open any webpage containing a data table or ARIA grid.',
        'Hover over the table until the floating export toolbar appears.',
        'Choose Excel, CSV, or Copy to clipboard.',
      ],
    },
  },

  // ── 网页长截图 ────────────────────────────────────────────────────────────
  {
    id: 'screenshot',
    categoryGroup: 'media',
    icon: screenshotIcon,
    preview: editorPreview,
    previewWidth: 1000,
    previewHeight: 800,
    edgeStoreUrl: 'https://microsoftedge.microsoft.com/addons/detail/dgneaebaifmjihldjlonfeflcdolgfmb',
    zh: {
      name: '网页长截图',
      tagline: '从头到尾，一整页清晰定格。',
      category: '图像与视频',
      previewAlt: '网页长截图编辑器显示标注工具、画布和保存按钮',
      summary: '智能滚动拼接整页画面，支持区域框选与高清导出，再长的网页也能一次完整截取。',
      highlights: [
        { title: '无缝整页拼接', desc: '智能处理吸顶导航与长页面，输出连贯完整、无重影的高清长图。' },
        { title: '多模式按需截取', desc: '自由切换整页长图、可视区域与自定义框选，覆盖所有截图场景。' },
        { title: '本地无损导出', desc: '全程本地渲染生成高清图片，不经云端压缩，细节清晰锐利。' },
      ],
      steps: [
        '在普通网页上点击浏览器工具栏里的长截图图标。',
        '选择整页、高清整页、滚动区域、当前位置、可见部分或框选。',
        '在结果页编辑图片，再复制、下载或打印。',
      ],
    },
    en: {
      name: 'Full Capture',
      tagline: 'Top to bottom. Every pixel, cleanly stitched.',
      category: 'Image & Video',
      previewAlt: 'Screenshot editor displaying annotation tools, canvas, and export controls',
      summary: 'Smart scroll-and-stitch capture for full webpages or selected regions, exported in crisp resolution.',
      highlights: [
        { title: 'Seamless full-page', desc: 'Handles sticky headers and long feeds smoothly for clean, artifact-free captures.' },
        { title: 'Flexible capture modes', desc: 'Switch between full page, visible viewport, or custom area selection.' },
        { title: 'Crisp local export', desc: 'Rendered and saved directly on your device with zero server compression.' },
      ],
      steps: [
        'Click the Screenshot icon on the browser toolbar.',
        'Pick Full Page, 2x HD, Scroll Area, From Current, Visible, or Selected Region.',
        'Annotate, crop, or redact in the result editor, then copy, save PNG, or print.',
      ],
    },
  },

  // ── 自由复制 ──────────────────────────────────────────────────────────────
  {
    id: 'allow-copy',
    categoryGroup: 'reading',
    icon: copyIcon,
    preview: copyPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: '自由复制',
      tagline: '解除网页限制，文字想选就选。',
      category: '阅读与文本',
      previewAlt: '受限网页中自由划选文本并浮现一键复制胶囊',
      summary: '一键破解禁止选中、禁用右键与复制拦截，还原纯粹流畅的网页阅读与摘录体验。',
      highlights: [
        { title: '一键破除限制', desc: '绕过禁止选中与右键屏蔽，还原浏览器原本的交互自由。' },
        { title: '纯净剪贴板', desc: '自动清除复制时夹带的版权后缀与多余格式，粘贴即纯文本。' },
        { title: '按站记忆状态', desc: '仅在你开启的网站自动生效，绝不干扰其他正常页面。' },
      ],
      steps: [
        '在受限制或禁止右键的网页上打开扩展或直接划选。',
        '鼠标抬起时光标旁自动浮现复制胶囊，亦可正常右键或按 Ctrl+C。',
        '遇到 Canvas 遮罩或复杂防选网页，点击「框选截取文字」，直接拖拽框选即可瞬间提取底层文本。',
      ],
    },
    en: {
      name: 'Free Copy',
      tagline: 'Break every lock. Copy freely on any page.',
      category: 'Reading & Text',
      previewAlt: 'Selecting restricted text on a locked page with a floating copy pill',
      summary: 'Bypass text selection blocks, disabled right-clicks, and copy popups in one click for frictionless reading.',
      highlights: [
        { title: 'One-click unlock', desc: 'Lift copy and context-menu restrictions to restore native browser behavior.' },
        { title: 'Clean clipboard', desc: 'Automatically strip injected copyright footers and messy formatting on copy.' },
        { title: 'Per-site memory', desc: 'Remembers your preference per domain without affecting normal sites.' },
      ],
      steps: [
        'Open the extension on any copy-protected webpage or simply highlight text.',
        'Use the floating copy pill on mouse release, right-click menu, or Ctrl+C.',
        'For complex overlays, click "Region Text Snip" and drag to extract underlying text.',
      ],
    },
  },

  // ── 外链直达 ──────────────────────────────────────────────────────────────
  {
    id: 'clean-redirect',
    categoryGroup: 'reading',
    icon: redirectIcon,
    preview: redirectPreview,
    previewWidth: 984,
    previewHeight: 420,
    edgeStoreUrl: 'https://microsoftedge.microsoft.com/addons/detail/ngnafjopodjeamdkopmadmbggbibdlgb',
    zh: {
      name: '外链直达',
      tagline: '跳过中转拦截，点一下就直达。',
      category: '阅读与文本',
      previewAlt: '外链免拦截直达与链接追踪参数剥离工作台展示',
      summary: '自动绕过各大平台的外链提示页，同步剥离追踪参数，让每一次跳转更快、更干净。',
      highlights: [
        { title: '告别中转等待', desc: '自动识别真实目标链接，彻底跳过"即将离开本站"确认页。' },
        { title: '剥离追踪尾巴', desc: '自动清理 UTM 等冗余追踪参数，让地址栏与分享链接保持清爽。' },
        { title: '纯本地解析', desc: '所有规则在本地浏览器毫秒级执行，不记录、不上传访问历史。' },
      ],
      steps: [
        '安装即开启防护，在知乎、掘金、简书等站点悬停外链直接显示真实目标，点击无拦截直达。',
        '在任意页面右键选择「复制净化后的干净链接」，自动剥离所有广告与分享追踪尾巴。',
        '打开扩展面板内的「链接现场净化实验室」，可随时粘贴测试并一键复制纯净网址。',
      ],
    },
    en: {
      name: 'Direct Link',
      tagline: 'Skip the detours. Jump straight to the source.',
      category: 'Reading & Text',
      previewAlt: 'Clean Redirect panel showing instant interstitial bypass and URL tracker stripping',
      summary: 'Automatically bypass external link warning pages and strip tracking parameters for faster, cleaner browsing.',
      highlights: [
        { title: 'Zero warning screens', desc: 'Decode real destination URLs automatically and skip interstitial delays.' },
        { title: 'Strip URL trackers', desc: 'Remove UTM and referral parameters automatically for cleaner links.' },
        { title: '100% local engine', desc: 'All link parsing happens locally in your browser with zero history logging.' },
      ],
      steps: [
        'Hover over wrapped external links to see the true destination and click straight through without interstitials.',
        'Right-click any page or link and choose "Copy Clean Link" to strip all tracking parameters.',
        'Open the popup sandbox to test, inspect, and copy purified URLs anytime.',
      ],
    },
  },

  // ── 样式提取器 ────────────────────────────────────────────────────────────
  {
    id: 'css-inspector',
    categoryGroup: 'dev',
    icon: cssIcon,
    preview: cssPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: '样式提取器',
      tagline: '悬停即看，样式直接拿走。',
      category: '数据与开发',
      previewAlt: '鼠标悬停元素即刻显示样式高亮与浮动检查卡片',
      summary: '鼠标划过任意元素即可透视间距、字号与色值，并一键提取干净的 CSS 或 Tailwind 类名。',
      highlights: [
        { title: '悬停实时透视', desc: '不必层层展开开发者工具，指针所到之处直观呈现盒模型与排版参数。' },
        { title: '一键转 Tailwind', desc: '自动将元素样式转换为精简的 Tailwind CSS 工具类，开发借鉴一步到位。' },
        { title: '干净代码输出', desc: '过滤冗余默认属性，提取出的样式代码简洁直观、可直接复用。' },
      ],
      steps: [
        '在任意网页点击扩展图标开启检查器模式。',
        '鼠标悬停在需要提取的按钮、卡片或文字上方，即时查看尺寸与视觉属性。',
        '按空格键 (Space) 锁定悬浮卡片，一键点击「复制 Tailwind 类」或「复制纯 CSS」。',
      ],
    },
    en: {
      name: 'Style Inspector',
      tagline: 'Hover to inspect. Copy clean CSS or Tailwind.',
      category: 'Data & Dev',
      previewAlt: 'Hovering over UI elements reveals spacing guides and floating CSS/Tailwind card',
      summary: 'Hover over any element to inspect spacing, typography, and colors—then copy clean CSS or Tailwind classes instantly.',
      highlights: [
        { title: 'Instant hover inspect', desc: 'See box models, typography, and color tokens on hover without digging into DevTools.' },
        { title: 'CSS to Tailwind', desc: 'Convert computed element styles into concise Tailwind utility classes in one click.' },
        { title: 'Clean, usable output', desc: 'Strips away browser defaults so copied styles drop straight into your codebase.' },
      ],
      steps: [
        'Click the extension icon to activate Inspector Mode on any webpage.',
        'Hover over buttons, cards, or typography to inspect computed styles.',
        'Press Spacebar to pin the card, then copy Tailwind classes or clean CSS in one click.',
      ],
    },
  },

  // ── 大图嗅探器 ────────────────────────────────────────────────────────────
  {
    id: 'image-sniffer',
    categoryGroup: 'media',
    icon: snifferIcon,
    preview: snifferPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: '大图嗅探器',
      tagline: '发现原图，批量带走。',
      category: '图像与视频',
      previewAlt: '网页大图批量嗅探画廊展示图片预览与一键ZIP打包下载',
      summary: '自动嗅探页面中的高清原图与隐藏素材，按尺寸和格式精准筛选，一键打包下载。',
      highlights: [
        { title: '深度原图嗅探', desc: '全面扫描网页图片、背景图与懒加载资源，直取高清原图。' },
        { title: '精准尺寸筛选', desc: '按宽高像素与文件格式一键过滤装饰小图标，只留真正需要的素材。' },
        { title: '一键批量下载', desc: '多选素材批量保存或打包导出，彻底告别逐张右键另存为。' },
      ],
      steps: [
        '在包含所需图片的网页上点击扩展图标，支持一键在「新标签页大屏浏览」。',
        '在全屏工作台中自选列数、按格式与尺寸筛选，点击放大镜唤起沉浸式灯箱看原图。',
        '支持勾选「自动转为 JPG」，一键打包下载包含全部高清素材的 ZIP 压缩包。',
      ],
    },
    en: {
      name: 'Image Sniffer',
      tagline: 'Find the originals. Download in bulk.',
      category: 'Image & Video',
      previewAlt: 'Full-screen image sniffer gallery with format filters and ZIP bulk download',
      summary: 'Automatically detect high-res images and hidden assets on any page. Filter by size or format and download in one click.',
      highlights: [
        { title: 'Deep asset discovery', desc: 'Uncover embedded images, CSS backgrounds, and lazy-loaded originals automatically.' },
        { title: 'Smart filtering', desc: 'Filter out tiny icons by pixel dimensions or file format in seconds.' },
        { title: 'One-click bulk save', desc: 'Select and download multiple assets at once without repetitive right-clicking.' },
      ],
      steps: [
        'Click the extension icon on any image-rich page and open the Full-Screen Gallery.',
        'Filter assets by format or dimensions and inspect originals in the lightbox.',
        'Optionally enable "Convert to JPG" and download all selected images in a single ZIP.',
      ],
    },
  },

  // ── 视频伴侣 ──────────────────────────────────────────────────────────────
  {
    id: 'video-master',
    categoryGroup: 'media',
    icon: videoIcon,
    preview: videoPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: '视频伴侣',
      tagline: '网页看视频，一切由你掌控。',
      category: '图像与视频',
      previewAlt: '全网视频底层调速面板展示倍速滑动条、后台防暂停与画中画置顶',
      summary: '为网页播放器带来精细倍速、一键画中画与无损截帧，无论观影还是网课学习都更顺手。',
      highlights: [
        { title: '精细倍速调节', desc: '突破网页原生倍速限制，支持快捷键微调，学习复盘更高效。' },
        { title: '一键画中画', desc: '将任意网页视频转为悬浮小窗置顶播放，边看边记笔记互不干扰。' },
        { title: '纯净画面截帧', desc: '直接截取当前帧高清原图，自动避开进度条、按钮与界面遮罩。' },
      ],
      steps: [
        '在任意视频或网课页面直接播放，画面左上角自动浮现极简 ⚡ 快捷控制胶囊。',
        '点击扩展图标或使用快捷键（D加速 / S减速 / R复位 / C画中画 / P截图）极速控制。',
        '内置「切后台防暂停 / 伪装前台」机制，自由切换标签页或做笔记，视频在后台绝不中断。',
      ],
    },
    en: {
      name: 'Video Companion',
      tagline: 'Every web video, under your control.',
      category: 'Image & Video',
      previewAlt: 'Video control overlay showing 16x speed slider, anti-pause toggle, and PiP mode',
      summary: 'Upgrade any web player with precision playback speeds, instant Picture-in-Picture, and clean frame capture.',
      highlights: [
        { title: 'Precision speed control', desc: 'Go beyond default speed presets with smooth keyboard fine-tuning.' },
        { title: 'Instant Picture-in-Picture', desc: 'Pop out any web video into a floating window while you multitask.' },
        { title: 'Clean frame snapshots', desc: 'Capture crisp, UI-free video frames without player controls getting in the way.' },
      ],
      steps: [
        'Play any HTML5 video to reveal the minimal ⚡ control pill on the player.',
        'Adjust speed via popup or hotkeys (D faster / S slower / R reset / C PiP / P frame capture).',
        'Enable "Anti-Pause" so videos keep running smoothly while you take notes in other tabs.',
      ],
    },
  },

  // ── 离线二维码 ────────────────────────────────────────────────────────────
  {
    id: 'qr-master',
    categoryGroup: 'dev',
    icon: qrIcon,
    preview: qrPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: '离线二维码',
      tagline: '生成与识别，离线瞬间完成。',
      category: '数据与开发',
      previewAlt: '全能艺术二维码工作台展示WiFi免密连接、名片生成与离线右键识码',
      summary: '一键将当前网址或选中文本转为高清二维码，也能离线识别网页图片与本地截图中的二维码。',
      highlights: [
        { title: '当前页秒变二维码', desc: '点开扩展图标即生成当前链接二维码，手机一扫无缝继续阅读。' },
        { title: '离线极速识码', desc: '直接解析网页图片或拖入本地截图中的二维码，断网也能正常识别。' },
        { title: '高清矢量导出', desc: '支持高清 PNG 与矢量 SVG 下载，兼顾屏幕展示与物料印刷需求。' },
      ],
      steps: [
        '在网页上点击扩展图标，自动读取当前网址或一键粘贴剪贴板文字生成二维码。',
        '自由定制圆角/圆点艺术点阵、潮流渐变配色、纠错等级，并可一键嵌入网站 Favicon 或自定义 Logo。',
        '支持一键复制二维码图片到剪贴板，或导出高清印刷级 PNG 与无限放大 SVG 矢量图。',
        '遇到网页中的二维码图片，直接鼠标右键点击「识别图中二维码」，或在控制台按 Ctrl+V 离线瞬间识别。',
      ],
    },
    en: {
      name: 'Local QR',
      tagline: 'Generate and decode. Instantly offline.',
      category: 'Data & Dev',
      previewAlt: 'Artistic QR workbench featuring WiFi sharing, vCard generator, and offline decoding',
      summary: 'Turn the current page or selected text into crisp QR codes, and decode on-page or local images completely offline.',
      highlights: [
        { title: 'Instant page handoff', desc: 'Generate a QR code for the active tab in one click to continue on your phone.' },
        { title: 'Offline image decoding', desc: 'Decode QR codes from any web image or local screenshot without sending data online.' },
        { title: 'Crisp PNG & SVG export', desc: 'Download sharp, scalable QR codes ready for decks, docs, or print.' },
      ],
      steps: [
        'Click the icon to turn the current tab URL or clipboard text into a QR code instantly.',
        'Customize dot shapes, gradients, error correction, and embed site favicons or custom logos.',
        'Copy the QR image directly or export print-ready PNG and crisp SVG files.',
        'Right-click any QR image on a page and select "Decode QR" or press Ctrl+V inside the popup.',
      ],
    },
  },

  // ── 网页荧光笔 ────────────────────────────────────────────────────────────
  {
    id: 'highlighter',
    categoryGroup: 'reading',
    icon: highlighterIcon,
    preview: highlighterPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: '网页荧光笔',
      tagline: '划下灵感，沉淀成你的本地知识库。',
      category: '阅读与文本',
      previewAlt: '网页划词悬浮 6 色荧光笔工具条与本地笔记本工作台',
      summary: '在任意网页随手高亮与批注，所有笔记安全保存在本地，支持随时回溯与 Markdown 导出。',
      highlights: [
        { title: '多色划词批注', desc: '选中即标色、写想法，再次打开网页时高亮位置精准还原。' },
        { title: '本地私密沉淀', desc: '无需账号登录，所有摘录与笔记始终只保存在你的设备本地。' },
        { title: '一键 Markdown 导出', desc: '随时导出结构化笔记，无缝衔接到 Obsidian、Notion 等工具。' },
      ],
      steps: [
        '在任意文章或文档网页上用鼠标划选文字，光标上方自动浮现 6 色荧光笔工具条。',
        '点击任意颜色即可秒级高亮，点击「📝 批注」可随时写下思考与标签。',
        '刷新或下次重开网页时，之前画的所有重点与批注会自动精准恢复。',
        '点击扩展图标打开「全局笔记本工作台」，支持全文检索、点击定位原文，并一键导出为 Markdown 笔记。',
      ],
    },
    en: {
      name: 'Web Highlighter',
      tagline: 'Highlight ideas. Keep them locally, forever.',
      category: 'Reading & Text',
      previewAlt: 'Floating 6-color web highlighter toolbar and local notebook workbench',
      summary: 'Highlight and annotate any webpage with local-first storage, revisit history, and instant Markdown export.',
      highlights: [
        { title: 'Effortless highlighting', desc: 'Mark passages in multiple colors and add notes that persist every time you return.' },
        { title: 'Local-first privacy', desc: 'No sign-up required. Every clip and note stays strictly on your device.' },
        { title: 'Markdown ready', desc: 'Export structured notes in one click for Obsidian, Notion, or plain text.' },
      ],
      steps: [
        'Select text on any article or documentation page to reveal the 6-color highlighter pill.',
        'Pick a color to highlight instantly, or click "Note" to attach thoughts and tags.',
        'Reopen the page anytime—your highlights and notes are automatically restored in place.',
        'Open the Full-Screen Notebook to search, jump back to original paragraphs, or export Markdown.',
      ],
    },
  },

  // ── 屏幕录制 ──────────────────────────────────────────────────────────────
  {
    id: 'screen-studio',
    categoryGroup: 'media',
    icon: screenStudioIcon,
    preview: screenStudioPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: '屏幕录制',
      tagline: '点开即录，零门槛出片。',
      category: '图像与视频',
      previewAlt: '跟焦录屏工作台展示自动放大焦点、摄像头画中画与紫色缩放时间轴',
      summary: '无需安装桌面客户端，在浏览器中即可流畅录制标签页、窗口或全屏画面，支持音频与本地导出。',
      highlights: [
        { title: '多源自由录制', desc: '按需录制当前标签页、应用窗口或整个屏幕，同步收入系统声与麦克风。' },
        { title: '零水印不限时', desc: '没有角落水印，也没有时长付费墙，随时开始、随时保存。' },
        { title: '本地即时生成', desc: '视频全程在本地浏览器编码导出，隐私画面绝不经过云端服务器。' },
      ],
      steps: [
        '点击扩展图标，按需开启麦克风与摄像头画中画，点击「开始录制屏幕 / 标签页」。',
        '正常点击和演示目标网页，扩展会在后台自动采集鼠标轨迹与每次点击焦点。',
        '停止录制后自动进入 Studio 剪辑台，时间轴已自动生成跟焦缩放片段，支持微调倍率与背景壁纸。',
        '点击「导出高清视频」，纯本地渲染合成带跟焦动画的 MP4/WebM 视频直接下载。',
      ],
    },
    en: {
      name: 'Screen Studio',
      tagline: 'Click, record, done. Right in your browser.',
      category: 'Image & Video',
      previewAlt: 'Screen recorder editor showing auto-zoom focus framing, camera PiP, and zoom timeline',
      summary: 'Record tabs, windows, or your entire screen with audio right from the browser—no desktop app required.',
      highlights: [
        { title: 'Flexible capture sources', desc: 'Record a browser tab, app window, or full display with system and mic audio.' },
        { title: 'No watermarks, no caps', desc: 'Enjoy clean recordings with zero branding overlays and no arbitrary time limits.' },
        { title: 'Local-only encoding', desc: 'Everything encodes and saves straight to your device—never uploaded to the cloud.' },
      ],
      steps: [
        'Click the extension icon, toggle microphone or camera PiP, and start recording a tab, window, or screen.',
        'Interact naturally with your webpage while cursor movement and click focus events are captured.',
        'Stop recording to launch the Studio Editor with auto-generated zoom segments, custom gradients, and aspect ratios.',
        'Export crisp MP4/WebM video locally with zero watermarks or duration limits.',
      ],
    },
  },

  // ── PDF 工具箱 ────────────────────────────────────────────────────────────
  {
    id: 'pdf-toolkit',
    categoryGroup: 'dev',
    icon: pdfToolkitIcon,
    preview: pdfToolkitPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: 'PDF 工具箱',
      tagline: '隐私至上，离线处理每一份 PDF。',
      category: '数据与开发',
      previewAlt: '本地隐私 PDF 工具箱展示多页缩略图整理、合并拆分、图片互转与盖章水印面板',
      summary: '纯浏览器本地内存完成 PDF 合并、单页拆分提取、旋转重排与图片互转，断网也能用，合同与敏感文档不泄密。',
      highlights: [
        { title: '零上传纯离线', desc: '所有 PDF 操作在本地浏览器内存完成，文件内容从不经过任何服务器。' },
        { title: '合并拆分与重排', desc: '拖拽调整页面顺序、旋转、勾选拆分，支持同时处理多个 PDF 文件。' },
        { title: 'PDF 与图片互转', desc: '高清 PNG/JPG 批量导出，或将图片合并为 PDF，支持文字水印与电子印章。' },
      ],
      steps: [
        '点击扩展图标打开本地 PDF 工作台，或在浏览网页 PDF 时直接点击「导入当前 PDF」及右键链接打开。',
        '拖入一个或多个 PDF 文件，预览每页缩略图，按需勾选页面、旋转或调整顺序。',
        '一键导出合并后的 PDF、拆分为单页 ZIP、转为 2x 高清图片，或叠加本地水印/电子印章后下载。',
      ],
    },
    en: {
      name: 'PDF Toolkit',
      tagline: 'Your PDFs, processed locally. Always private.',
      category: 'Data & Dev',
      previewAlt: 'Local Privacy PDF Toolkit showing page thumbnail organizer, merge/split, image conversion, and watermark controls',
      summary: 'Process sensitive PDFs strictly inside your browser without uploading a single byte. Merge, split, reorder, rotate, and convert with no limits.',
      highlights: [
        { title: 'Zero-upload privacy', desc: 'Every PDF operation runs in local browser memory—your files never touch a server.' },
        { title: 'Merge, split & reorder', desc: 'Drag to rearrange pages, rotate, or select pages to split across multiple PDFs.' },
        { title: 'PDF ↔ Image & stamp', desc: 'Export HD PNG/JPG or combine images into PDF, with watermark and signature support.' },
      ],
      steps: [
        'Open the PDF Studio from the toolbar, or import the active PDF tab / right-click any PDF link.',
        'Drop one or more PDFs to preview page thumbnails, select pages, rotate, or reorder.',
        'Export merged PDF, split single-page ZIP, 2x HD images, or apply local watermarks and stamps.',
      ],
    },
  },
];

// ─── 工具函数 ────────────────────────────────────────────────────────────────

export function getLocalizedPlugins(lang: Locale): PluginItem[] {
  return rawPlugins.map((item) => ({
    id: item.id,
    categoryGroup: item.categoryGroup,
    icon: item.icon,
    preview: item.preview,
    previewWidth: item.previewWidth,
    previewHeight: item.previewHeight,
    edgeStoreUrl: item.edgeStoreUrl,
    downloadUrl: `${GITHUB_RELEASES_URL}/latest/download/100free-ext-${item.id}-chrome.zip`,
    ...item[lang],
  }));
}

export function getPluginById(id: string, lang: Locale): PluginItem | undefined {
  const raw = rawPlugins.find((p) => p.id === id);
  if (!raw) return undefined;
  return {
    id: raw.id,
    categoryGroup: raw.categoryGroup,
    icon: raw.icon,
    preview: raw.preview,
    previewWidth: raw.previewWidth,
    previewHeight: raw.previewHeight,
    edgeStoreUrl: raw.edgeStoreUrl,
    downloadUrl: `${GITHUB_RELEASES_URL}/latest/download/100free-ext-${raw.id}-chrome.zip`,
    ...raw[lang],
  };
}
