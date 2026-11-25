import tableIcon from '../../../ext-table-export/public/icons/icon-128.png?url';
import screenshotIcon from '../../../ext-screenshot/public/icons/icon-128.png?url';
import copyIcon from '../../../ext-allow-copy/public/icons/icon-128.png?url';
import cssIcon from '../../../ext-css-inspector/public/icons/icon-128.png?url';
import snifferIcon from '../../../ext-image-sniffer/public/icons/icon-128.png?url';
import videoIcon from '../../../ext-video-master/public/icons/icon-128.png?url';
import qrIcon from '../../../ext-qr-master/public/icons/icon-128.png?url';
import redirectIcon from '../../../ext-clean-redirect/public/icons/icon-128.png?url';

import tablePreview from '../assets/table-export.webp';
import editorPreview from '../assets/screenshot-editor.webp';
import copyPreview from '../assets/allow-copy.png';
import cssPreview from '../assets/css-inspector.png';
import snifferPreview from '../assets/image-sniffer.png';
import videoPreview from '../assets/video-master.png';
import qrPreview from '../assets/qr-master.png';
import redirectPreview from '../assets/clean-redirect.png';

export interface PluginItem {
  id: string;
  name: string;
  category: string;
  icon: string;
  preview: string;
  previewWidth: number;
  previewHeight: number;
  previewAlt: string;
  headline: string;
  summary: string;
  highlights: string[];
  steps: string[];
}

export const plugins: PluginItem[] = [
  {
    id: 'table-export',
    name: '网页表格导出',
    category: '数据整理',
    icon: tableIcon,
    preview: tablePreview,
    previewWidth: 984,
    previewHeight: 308,
    previewAlt: '示例网页的销售表格上方显示 Excel、CSV 和复制按钮',
    headline: '网页里的数据，直接带进 Excel',
    summary: '把网页上的表格导出为 Excel 或 CSV，也可以复制后粘贴到现有工作表，智能防 19 位长数字科学计数法截断。',
    highlights: ['19位大数防截断', '多级表头合并', 'DIV ARIA 网格'],
    steps: ['打开含有表格的网页。', '把鼠标移到表格上，等待导出工具条出现。', '选择 Excel、CSV，或点复制。']
  },
  {
    id: 'screenshot',
    name: '网页长截图',
    category: '截图与标注',
    icon: screenshotIcon,
    preview: editorPreview,
    previewWidth: 1000,
    previewHeight: 800,
    previewAlt: '网页长截图编辑器显示标注工具、画布和保存按钮',
    headline: '从一段对话，到整页长图',
    summary: '截取整页、2x 高清矢量、滚动面板或自选区域，自动去除重复吸顶导航栏。在结果页加上标注、裁剪或遮挡，再导出 PNG。',
    highlights: ['2x 超清矢量', '吸顶元素去重', '内嵌标注编辑器'],
    steps: ['在普通网页上点击浏览器工具栏里的长截图图标。', '选择整页、高清整页、滚动区域、当前位置、可见部分或框选。', '在结果页编辑图片，再复制、下载或打印。']
  },
  {
    id: 'allow-copy',
    name: '网页超级自由复制',
    category: '文本与效率',
    icon: copyIcon,
    preview: copyPreview,
    previewWidth: 984,
    previewHeight: 420,
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
  {
    id: 'clean-redirect',
    name: '外链免拦截直达与净化',
    category: '文本与效率',
    icon: redirectIcon,
    preview: redirectPreview,
    previewWidth: 984,
    previewHeight: 420,
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
  {
    id: 'css-inspector',
    name: 'CSS 样式与 Tailwind 提取器',
    category: '前端与开发',
    icon: cssIcon,
    preview: cssPreview,
    previewWidth: 984,
    previewHeight: 420,
    previewAlt: '鼠标悬停元素即刻显示样式高亮与浮动检查卡片',
    headline: '对标 $69 CSS Scan，一键偷师任意网页组件',
    summary: '鼠标悬停即刻嗅探任意元素的字体、色彩、内外边距与阴影。支持一键复制纯 CSS 或直接转为 Tailwind CSS 类名。',
    highlights: ['秒转 Tailwind CSS', '空格锁定检查', '尺寸间距标尺'],
    steps: [
      '在任意网页点击扩展图标开启检查器模式。',
      '鼠标悬停在需要提取的按钮、卡片或文字上方，即时查看尺寸与视觉属性。',
      '按空格键 (Space) 锁定悬浮卡片，一键点击「复制 Tailwind 类」或「复制纯 CSS」。'
    ]
  },
  {
    id: 'image-sniffer',
    name: '网页大图批量嗅探与下载',
    category: '图像与素材',
    icon: snifferIcon,
    preview: snifferPreview,
    previewWidth: 984,
    previewHeight: 420,
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
  {
    id: 'video-master',
    name: '网页全能视频伴侣',
    category: '视频与网课',
    icon: videoIcon,
    preview: videoPreview,
    previewWidth: 984,
    previewHeight: 420,
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
  {
    id: 'qr-master',
    name: '二维码极速生成与离线识码器',
    category: '效率与工具',
    icon: qrIcon,
    preview: qrPreview,
    previewWidth: 984,
    previewHeight: 420,
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
  }
];
