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

export interface LocalizedContent {
  name: string;
  category: string;
  previewAlt: string;
  headline: string;
  summary: string;
  highlights: string[];
  steps: string[];
}

export interface PluginRawItem {
  id: string;
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
  icon: string;
  preview: string;
  previewWidth: number;
  previewHeight: number;
  edgeStoreUrl?: string;
  downloadUrl: string;
}

export const GITHUB_REPO_URL = 'https://github.com/wllcyg/plugins';
export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`;

const rawPlugins: PluginRawItem[] = [
  {
    id: 'table-export',
    icon: tableIcon,
    preview: tablePreview,
    previewWidth: 984,
    previewHeight: 308,
    zh: {
      name: '网页表格导出',
      category: '数据整理',
      previewAlt: '示例网页的销售表格上方显示 Excel、CSV 和复制按钮',
      headline: '网页里的数据，直接带进 Excel',
      summary: '把网页上的表格导出为 Excel 或 CSV，也可以复制后粘贴到现有工作表，智能防 19 位长数字科学计数法截断。',
      highlights: ['19位大数防截断', '多级表头合并', 'DIV ARIA 网格'],
      steps: ['打开含有表格的网页。', '把鼠标移到表格上，等待导出工具条出现。', '选择 Excel、CSV，或点复制。']
    },
    en: {
      name: 'Table Export',
      category: 'Data & Sheets',
      previewAlt: 'Floating Excel, CSV, and Copy buttons shown above a web sales table',
      headline: 'Bring any web table straight into Excel',
      summary: 'Export HTML or ARIA tables to Excel or CSV in one click, with precision protection against 19-digit number truncation.',
      highlights: ['19-Digit Precision', 'Merged Headers', 'DIV ARIA Grid'],
      steps: [
        'Open any webpage containing a data table or ARIA grid.',
        'Hover over the table until the floating export toolbar appears.',
        'Choose Excel, CSV, or Copy to clipboard.'
      ]
    }
  },
  {
    id: 'screenshot',
    icon: screenshotIcon,
    preview: editorPreview,
    previewWidth: 1000,
    previewHeight: 800,
    edgeStoreUrl: 'https://microsoftedge.microsoft.com/addons/detail/dgneaebaifmjihldjlonfeflcdolgfmb',
    zh: {
      name: '网页长截图',
      category: '截图与标注',
      previewAlt: '网页长截图编辑器显示标注工具、画布和保存按钮',
      headline: '从一段对话，到整页长图',
      summary: '截取整页、2x 高清矢量、滚动面板或自选区域，自动去除重复吸顶导航栏。在结果页加上标注、裁剪或遮挡，再导出 PNG。',
      highlights: ['2x 超清矢量', '吸顶元素去重', '内嵌标注编辑器'],
      steps: ['在普通网页上点击浏览器工具栏里的长截图图标。', '选择整页、高清整页、滚动区域、当前位置、可见部分或框选。', '在结果页编辑图片，再复制、下载或打印。']
    },
    en: {
      name: 'Full-Page Screenshot',
      category: 'Capture & Annotate',
      previewAlt: 'Screenshot editor displaying annotation tools, canvas, and export controls',
      headline: 'From a quick snippet to a seamless full-page capture',
      summary: 'Capture full pages in 2x retina quality, inner scroll containers, or custom regions with smart sticky-header deduplication and built-in annotation.',
      highlights: ['2x Retina Mode', 'Sticky Header Removal', 'Built-in Editor'],
      steps: [
        'Click the Screenshot icon on the browser toolbar.',
        'Pick Full Page, 2x HD, Scroll Area, From Current, Visible, or Selected Region.',
        'Annotate, crop, or redact in the result editor, then copy, save PNG, or print.'
      ]
    }
  },
  {
    id: 'allow-copy',
    icon: copyIcon,
    preview: copyPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: '网页超级自由复制',
      category: '文本与效率',
      previewAlt: '受限网页中自由划选文本并浮现一键复制胶囊',
      headline: '破解防复制与右键限制，让内容真正自由',
      summary: '一键解除禁止划选、禁止右键、防清空选区。内置 Canvas 隐藏文字穿透与屏幕框选极速提取，全网 99% 通杀。',
      highlights: ['禁止划选通杀', '透明遮罩穿透', '屏幕框选提字'],
      steps: [
        '在受限制或禁止右键的网页上打开扩展或直接划选。',
        '鼠标抬起时光标旁自动浮现复制胶囊，亦可正常右键或按 Ctrl+C。',
        '遇到 Canvas 遮罩或复杂防选网页，点击「框选截取文字」，直接拖拽框选即可瞬间提取底层文本。'
      ]
    },
    en: {
      name: 'Super Allow Copy',
      category: 'Text & Productivity',
      previewAlt: 'Selecting restricted text on a locked page with a floating copy pill',
      headline: 'Unlock copy, text selection, and right-click everywhere',
      summary: 'Instantly bypass selection locks, disabled context menus, and transparent overlays, plus a region-snipping text extractor.',
      highlights: ['Bypass Copy Locks', 'Overlay Penetration', 'Region Text Snip'],
      steps: [
        'Open the extension on any copy-protected webpage or simply highlight text.',
        'Use the floating copy pill on mouse release, right-click menu, or Ctrl+C.',
        'For complex overlays, click "Region Text Snip" and drag to extract underlying text.'
      ]
    }
  },
  {
    id: 'clean-redirect',
    icon: redirectIcon,
    preview: redirectPreview,
    previewWidth: 984,
    previewHeight: 420,
    edgeStoreUrl: 'https://microsoftedge.microsoft.com/addons/detail/ngnafjopodjeamdkopmadmbggbibdlgb',
    zh: {
      name: '外链免拦截直达与净化',
      category: '文本与效率',
      previewAlt: '外链免拦截直达与链接追踪参数剥离工作台展示',
      headline: '跳过中转拦截警告，还原干净纯净直链',
      summary: '自动跳过知乎、简书、掘金、CSDN、微博等平台外链拦截页直达目标；智能剥离 UTM/SPM/vd_source 等追踪参数，去除复制版权尾巴。',
      highlights: ['中转页秒级直达', 'DOM 链接预还原', 'UTM/SPM 剥离'],
      steps: [
        '安装即开启防护，在知乎、掘金、简书等站点悬停外链直接显示真实目标，点击无拦截直达。',
        '在任意页面右键选择「复制净化后的干净链接」，自动剥离所有广告与分享追踪尾巴。',
        '打开扩展面板内的「链接现场净化实验室」，可随时粘贴测试并一键复制纯净网址。'
      ]
    },
    en: {
      name: 'Clean Redirect',
      category: 'Text & Productivity',
      previewAlt: 'Clean Redirect panel showing instant interstitial bypass and URL tracker stripping',
      headline: 'Bypass redirect interstitials & strip tracking junk',
      summary: 'Skip intermediate warning pages (Zhihu, Juejin, Jianshu, CSDN, etc.) instantly, strip UTM/SPM/vd_source trackers, and remove forced copy footers.',
      highlights: ['Instant Bypass', 'Link Pre-Cleaning', 'Tracker Stripping'],
      steps: [
        'Hover over wrapped external links to see the true destination and click straight through without interstitials.',
        'Right-click any page or link and choose "Copy Clean Link" to strip all tracking parameters.',
        'Open the popup sandbox to test, inspect, and copy purified URLs anytime.'
      ]
    }
  },
  {
    id: 'css-inspector',
    icon: cssIcon,
    preview: cssPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: 'CSS 样式与 Tailwind 提取器',
      category: '前端与开发',
      previewAlt: '鼠标悬停元素即刻显示样式高亮与浮动检查卡片',
      headline: '鼠标悬停即可嗅探样式，一键提取任意网页组件',
      summary: '鼠标悬停即刻嗅探任意元素的字体、色彩、内外边距与阴影。支持一键复制纯 CSS 或直接转为 Tailwind CSS 类名。',
      highlights: ['秒转 Tailwind CSS', '空格锁定检查', '尺寸间距标尺'],
      steps: [
        '在任意网页点击扩展图标开启检查器模式。',
        '鼠标悬停在需要提取的按钮、卡片或文字上方，即时查看尺寸与视觉属性。',
        '按空格键 (Space) 锁定悬浮卡片，一键点击「复制 Tailwind 类」或「复制纯 CSS」。'
      ]
    },
    en: {
      name: 'CSS & Tailwind Inspector',
      category: 'DevTools',
      previewAlt: 'Hovering over UI elements reveals spacing guides and floating CSS/Tailwind card',
      headline: 'Inspect and extract styles from any web component on hover',
      summary: 'Inspect typography, colors, spacing, and shadows on hover. Copy clean CSS or convert styles directly into Tailwind utility classes.',
      highlights: ['CSS to Tailwind', 'Spacebar Freeze', 'Box-Model Ruler'],
      steps: [
        'Click the extension icon to activate Inspector Mode on any webpage.',
        'Hover over buttons, cards, or typography to inspect computed styles.',
        'Press Spacebar to pin the card, then copy Tailwind classes or clean CSS in one click.'
      ]
    }
  },
  {
    id: 'image-sniffer',
    icon: snifferIcon,
    preview: snifferPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: '网页大图批量嗅探与下载',
      category: '图像与素材',
      previewAlt: '网页大图批量嗅探画廊展示图片预览与一键ZIP打包下载',
      headline: '纯净无广告，自带全屏工作台的大图嗅探神器',
      summary: '自动剥离主流 CDN 压缩参数挖掘真·超清原图；自带独立新标签页全屏画廊工作台与大图灯箱预览；支持 WebP 客户端 0 秒转 JPG 并一键 ZIP 打包。',
      highlights: ['CDN 原图挖掘', 'WebP 转 JPG', 'ZIP 一键打包'],
      steps: [
        '在包含所需图片的网页上点击扩展图标，支持一键在「新标签页大屏浏览」。',
        '在全屏工作台中自选列数、按格式与尺寸筛选，点击放大镜唤起沉浸式灯箱看原图。',
        '支持勾选「自动转为 JPG」，一键打包下载包含全部高清素材的 ZIP 压缩包。'
      ]
    },
    en: {
      name: 'Image Sniffer & ZIP',
      category: 'Media & Assets',
      previewAlt: 'Full-screen image sniffer gallery with format filters and ZIP bulk download',
      headline: 'Ad-free bulk image extractor with full-screen gallery',
      summary: 'Automatically strips CDN resize parameters to uncover original high-res images, converts WebP to JPG locally, and exports everything as a ZIP.',
      highlights: ['Original CDN URLs', 'WebP to JPG', 'One-Click ZIP'],
      steps: [
        'Click the extension icon on any image-rich page and open the Full-Screen Gallery.',
        'Filter assets by format or dimensions and inspect originals in the lightbox.',
        'Optionally enable "Convert to JPG" and download all selected images in a single ZIP.'
      ]
    }
  },
  {
    id: 'video-master',
    icon: videoIcon,
    preview: videoPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: '网页全能视频伴侣',
      category: '视频与网课',
      previewAlt: '全网视频底层调速面板展示倍速滑动条、后台防暂停与画中画置顶',
      headline: '0.1x~16x 无级倍速、切后台防暂停与画中画神仙助手',
      summary: '突破各大高校/企业网课锁死倍速与切后台暂停限制；支持 100%~600% 音量超限增强，一键独立小窗画中画与高清原画逐帧截图。',
      highlights: ['16x 无级倍速', '后台防暂停', '600% 音量增益'],
      steps: [
        '在任意视频或网课页面直接播放，画面左上角自动浮现极简 ⚡ 快捷控制胶囊。',
        '点击扩展图标或使用快捷键（D加速 / S减速 / R复位 / C画中画 / P截图）极速控制。',
        '内置「切后台防暂停 / 伪装前台」机制，自由切换标签页或做笔记，视频在后台绝不中断。'
      ]
    },
    en: {
      name: 'Video Master',
      category: 'Video & Courses',
      previewAlt: 'Video control overlay showing 16x speed slider, anti-pause toggle, and PiP mode',
      headline: '0.1x–16x speed control, background anti-pause & 600% boost',
      summary: 'Override locked video playback rates, keep courses playing when switching tabs, boost quiet audio up to 600%, and pop out Picture-in-Picture.',
      highlights: ['Up to 16x Speed', 'Anti-Tab-Pause', '600% Volume Boost'],
      steps: [
        'Play any HTML5 video to reveal the minimal ⚡ control pill on the player.',
        'Adjust speed via popup or hotkeys (D faster / S slower / R reset / C PiP / P frame capture).',
        'Enable "Anti-Pause" so videos keep running smoothly while you take notes in other tabs.'
      ]
    }
  },
  {
    id: 'qr-master',
    icon: qrIcon,
    preview: qrPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: '二维码极速生成与离线识码器',
      category: '效率与工具',
      previewAlt: '全能艺术二维码工作台展示WiFi免密连接、名片生成与离线右键识码',
      headline: '告别广告与收费充值，纯净 0 网络依赖的二维码神器',
      summary: '一键将当前网址、剪贴板、WiFi或电子名片生成高颜值艺术二维码；支持网页任意图片右键离线识别、拖拽与粘贴识码，0 网络请求，纯净无广告。',
      highlights: ['右键离线识码', '艺术渐变 Logo', 'WiFi/名片生成'],
      steps: [
        '在网页上点击扩展图标，自动读取当前网址或一键粘贴剪贴板文字生成二维码。',
        '自由定制圆角/圆点艺术点阵、潮流渐变配色、纠错等级，并可一键嵌入网站 Favicon 或自定义 Logo。',
        '支持一键复制二维码图片到剪贴板，或导出高清印刷级 PNG 与无限放大 SVG 矢量图。',
        '遇到网页中的二维码图片，直接鼠标右键点击「识别图中二维码」，或在控制台按 Ctrl+V 离线瞬间识别。'
      ]
    },
    en: {
      name: 'QR Master',
      category: 'Utilities',
      previewAlt: 'Artistic QR workbench featuring WiFi sharing, vCard generator, and offline decoding',
      headline: 'Ad-free artistic QR generator & offline right-click decoder',
      summary: 'Generate stylized QR codes for URLs, WiFi, or vCards with custom gradients & logos, and decode any image offline via right-click or Ctrl+V.',
      highlights: ['Offline Decoder', 'Gradient & Logos', 'WiFi & vCard'],
      steps: [
        'Click the icon to turn the current tab URL or clipboard text into a QR code instantly.',
        'Customize dot shapes, gradients, error correction, and embed site favicons or custom logos.',
        'Copy the QR image directly or export print-ready PNG and crisp SVG files.',
        'Right-click any QR image on a page and select "Decode QR" or press Ctrl+V inside the popup.'
      ]
    }
  },
  {
    id: 'highlighter',
    icon: highlighterIcon,
    preview: highlighterPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: '网页荧光笔与本地笔记本',
      category: '阅读与笔记',
      previewAlt: '网页划词悬浮 6 色荧光笔工具条与本地笔记本工作台',
      headline: '纯本地无限多色高亮，网页划词重点与批注神器',
      summary: '0 账号纯本地存储，开放 6 色荧光填充与下划线；支持随手批注、重开网页自动精准还原，自带全屏笔记本工作台并免费导出纯净 Markdown。',
      highlights: ['无限多色高亮', '重开自动还原', '免费导出 MD'],
      steps: [
        '在任意文章或文档网页上用鼠标划选文字，光标上方自动浮现 6 色荧光笔工具条。',
        '点击任意颜色即可秒级高亮，点击「📝 批注」可随时写下思考与标签（也可点击已高亮文字修改）。',
        '刷新或下次重开网页时，之前画的所有重点与批注会自动精准恢复。',
        '点击扩展图标打开「全局笔记本工作台」，支持全文检索、点击定位原文，并一键导出为 Markdown 笔记。'
      ]
    },
    en: {
      name: 'Web Highlighter & Notebook',
      category: 'Reading & Notes',
      previewAlt: 'Floating 6-color web highlighter toolbar and local notebook workbench',
      headline: 'Zero login, unlimited multi-color highlights & local notebook',
      summary: 'Highlight any web page with 6 colors or underlines, add inline notes, auto-restore across page reloads, and export clean Markdown locally without any paywall.',
      highlights: ['6 Colors + Notes', 'Auto-Restore', 'Free MD Export'],
      steps: [
        'Select text on any article or documentation page to reveal the 6-color highlighter pill.',
        'Pick a color to highlight instantly, or click "Note" to attach thoughts and tags.',
        'Reopen the page anytime—your highlights and notes are automatically restored in place.',
        'Open the Full-Screen Notebook to search, jump back to original paragraphs, or export Markdown.'
      ]
    }
  },
  {
    id: 'screen-studio',
    icon: screenStudioIcon,
    preview: screenStudioPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: '屏幕录制',
      category: '视频与演示',
      previewAlt: '跟焦录屏工作台展示自动放大焦点、摄像头画中画与紫色缩放时间轴',
      headline: '自动跟焦平滑缩放录屏，支持局部打码与高清 GIF/MP4 导出',
      summary: '纯本地无限时长无水印录屏！自动捕获鼠标点击与轨迹生成平滑缩放镜头，支持首尾裁剪、1x~2x 演示倍速、16:9/9:16 电影级渐变背景、点击波纹与 60FPS 高清导出。',
      highlights: ['自动跟焦缩放', '首尾裁剪与倍速', '60FPS 无水印导出'],
      steps: [
        '点击扩展图标，按需开启麦克风与摄像头画中画，点击「开始录制屏幕 / 标签页」。',
        '正常点击和演示目标网页，扩展会在后台自动采集鼠标轨迹与每次点击焦点。',
        '停止录制后自动进入 Studio 剪辑台，时间轴已自动生成跟焦缩放片段，支持微调倍率与背景壁纸。',
        '点击「导出高清视频」，纯本地渲染合成带跟焦动画的 MP4/WebM 视频直接下载。'
      ]
    },
    en: {
      name: 'Screen Recorder',
      category: 'Video & Demos',
      previewAlt: 'Screen recorder editor showing auto-zoom focus framing, camera PiP, and zoom timeline',
      headline: 'Auto-zoom smooth screen recording with blur redaction & local export',
      summary: 'Unlimited watermark-free local screen recording. Automatically turns mouse clicks into smooth zoom keyframes with studio gradients, click ripples, camera PiP, and timeline editing.',
      highlights: ['Auto-Zoom Focus', 'Studio Backdrops', 'Unlimited & Local'],
      steps: [
        'Click the extension icon, toggle microphone or camera PiP, and start recording a tab, window, or screen.',
        'Interact naturally with your webpage while cursor movement and click focus events are captured.',
        'Stop recording to launch the Studio Editor with auto-generated zoom segments, custom gradients, and aspect ratios.',
        'Export crisp MP4/WebM video locally with zero watermarks or duration limits.'
      ]
    }
  },
  {
    id: 'pdf-toolkit',
    icon: pdfToolkitIcon,
    preview: pdfToolkitPreview,
    previewWidth: 984,
    previewHeight: 420,
    zh: {
      name: '本地隐私 PDF 工具箱',
      category: '文档与办公',
      previewAlt: '本地隐私 PDF 工具箱展示多页缩略图整理、合并拆分、图片互转与盖章水印面板',
      headline: '100% 离线本地处理 PDF，绝不上传文件、无次数限制',
      summary: '纯浏览器本地内存完成 PDF 合并、单页拆分提取、旋转重排、PDF 与高清 PNG/JPG 互转，以及文字水印与透明电子签名盖章。断网也能用，合同与敏感文档不泄密。',
      highlights: ['零上传纯离线', '合并拆分与重排', 'PDF/图片互转与盖章'],
      steps: [
        '点击扩展图标打开本地 PDF 工作台，或在浏览网页 PDF 时直接点击「导入当前 PDF」及右键链接打开。',
        '拖入一个或多个 PDF 文件，预览每页缩略图，按需勾选页面、旋转或调整顺序。',
        '一键导出合并后的 PDF、拆分为单页 ZIP、转为 2x 高清图片，或叠加本地水印/电子印章后下载。'
      ]
    },
    en: {
      name: 'Local Privacy PDF Toolkit',
      category: 'Docs & Office',
      previewAlt: 'Local Privacy PDF Toolkit showing page thumbnail organizer, merge/split, image conversion, and watermark controls',
      headline: '100% offline PDF merge, split, image conversion & stamping—zero uploads',
      summary: 'Process sensitive PDFs strictly inside your browser without uploading a single byte. Merge, split, reorder, rotate pages, convert between PDF and HD PNG/JPG, and stamp watermarks or signatures with no limits.',
      highlights: ['Zero-Upload Privacy', 'Merge, Split & Reorder', 'PDF ↔ Image & Stamp'],
      steps: [
        'Open the PDF Studio from the toolbar, or import the active PDF tab / right-click any PDF link.',
        'Drop one or more PDFs to preview page thumbnails, select pages, rotate, or reorder.',
        'Export merged PDF, split single-page ZIP, 2x HD images, or apply local watermarks and stamps.'
      ]
    }
  }
];

export function getLocalizedPlugins(lang: Locale): PluginItem[] {
  return rawPlugins.map((item) => ({
    id: item.id,
    icon: item.icon,
    preview: item.preview,
    previewWidth: item.previewWidth,
    previewHeight: item.previewHeight,
    edgeStoreUrl: item.edgeStoreUrl,
    downloadUrl: `${GITHUB_RELEASES_URL}/latest/download/100free-ext-${item.id}-chrome.zip`,
    ...item[lang]
  }));
}
