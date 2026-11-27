import { createMessages } from '@100free/core';

export const m = createMessages({
  zh: {
    extTitle: 'CSS & Tailwind 提取器',
    extSub: '一键嗅探样式 · 极速转 Tailwind',
    inspectorStatusLabel: '检查器状态',
    statusActive: '嗅探已激活 · 移动鼠标悬浮',
    statusPaused: '已暂停嗅探',
    prefFormatTitle: '默认输出格式偏好',
    formatRawCss: '纯 CSS 属性',
    shortcutFreeze: '锁定当前悬浮卡片',
    shortcutExit: '退出检查模式',
    footerNote: '100-Free 开源生产力计划 · 无广告 · 零网络请求',
    propFont: '字体 / 大小',
    propColorBg: '字色 / 背景',
    propPaddingRadius: '内边距 / 圆角',
    propBorder: '边框 (Border)',
    copyTailwindBtn: '复制 Tailwind 类',
    copyCssBtn: '复制纯 CSS',
    copiedTailwind: '已复制 Tailwind！',
    copiedCss: '已复制 CSS！',
    hintFrozen: '🔒 已锁定卡片 (按空格解锁 / Esc 退出)',
    hintUnfrozen: '💡 按 Space 锁定此卡片以自由移入操作'
  },
  en: {
    extTitle: 'CSS & Tailwind Inspector',
    extSub: 'Inspect Styles on Hover · Convert to Tailwind',
    inspectorStatusLabel: 'Inspector Status',
    statusActive: 'Active · Hover any element',
    statusPaused: 'Paused',
    prefFormatTitle: 'Default Output Format',
    formatRawCss: 'Raw CSS',
    shortcutFreeze: 'Freeze / Lock Inspector Card',
    shortcutExit: 'Exit Inspector Mode',
    footerNote: '100-Free Open Source · Ad-Free · Zero Network Requests',
    propFont: 'Font / Size',
    propColorBg: 'Color / Background',
    propPaddingRadius: 'Padding / Radius',
    propBorder: 'Border',
    copyTailwindBtn: 'Copy Tailwind',
    copyCssBtn: 'Copy CSS',
    copiedTailwind: 'Copied Tailwind!',
    copiedCss: 'Copied CSS!',
    hintFrozen: '🔒 Card locked (Space to unlock / Esc to exit)',
    hintUnfrozen: '💡 Press Space to lock card and interact'
  }
});
