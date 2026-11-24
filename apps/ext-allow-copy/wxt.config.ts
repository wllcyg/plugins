import { defineConfig } from 'wxt';

// 详细配置文档请查阅: https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: '网页超级自由复制',
    description: '一键解除网页禁止复制、禁止划选、禁止右键限制，纯净免费、安全高效。',
    default_locale: 'zh_CN',
    version: '1.0.0',
    permissions: ['activeTab', 'storage', 'scripting'],
    icons: {
      16: '/icons/icon-16.png',
      32: '/icons/icon-32.png',
      48: '/icons/icon-48.png',
      128: '/icons/icon-128.png'
    },
    action: {
      default_title: '网页超级自由复制',
      default_icon: {
        16: '/icons/icon-16.png',
        32: '/icons/icon-32.png',
        48: '/icons/icon-48.png',
        128: '/icons/icon-128.png'
      }
    }
  }
});
