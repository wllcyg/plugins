import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'CSS 样式与 Tailwind 提取器',
    description: '鼠标悬停任意元素即刻查看完整 CSS 样式，一键转为 Tailwind CSS 代码，精准高效。',
    default_locale: 'zh_CN',
    version: '1.0.0',
    permissions: ['activeTab', 'storage'],
    icons: {
      16: '/icons/icon-16.png',
      32: '/icons/icon-32.png',
      48: '/icons/icon-48.png',
      128: '/icons/icon-128.png'
    },
    action: {
      default_title: 'CSS 样式与 Tailwind 提取器',
      default_icon: {
        16: '/icons/icon-16.png',
        32: '/icons/icon-32.png',
        48: '/icons/icon-48.png',
        128: '/icons/icon-128.png'
      }
    }
  }
});
