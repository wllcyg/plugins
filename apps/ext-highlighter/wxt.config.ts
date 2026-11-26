import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: '网页荧光笔与本地笔记本',
    description: '支持网页无限多色划词高亮、随手批注、重开网页自动还原，自带全屏笔记本工作台与纯净 Markdown 导出。',
    default_locale: 'zh_CN',
    version: '1.0.0',
    permissions: ['activeTab', 'storage', 'unlimitedStorage', 'tabs', 'contextMenus'],
    web_accessible_resources: [
      {
        resources: ['notebook.html'],
        matches: ['<all_urls>']
      }
    ],
    icons: {
      16: '/icons/icon-16.png',
      32: '/icons/icon-32.png',
      48: '/icons/icon-48.png',
      128: '/icons/icon-128.png'
    },
    action: {
      default_title: '网页荧光笔与本地笔记本',
      default_icon: {
        16: '/icons/icon-16.png',
        32: '/icons/icon-32.png',
        48: '/icons/icon-48.png',
        128: '/icons/icon-128.png'
      }
    }
  }
});
