import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: '网页大图批量嗅探与下载',
    description: '一键扫描网页全部高清大图、背景图与矢量图，智能多维筛选，本地一键打包 ZIP 下载。',
    default_locale: 'zh_CN',
    version: '1.0.0',
    permissions: ['activeTab', 'storage', 'downloads', 'tabs'],
    web_accessible_resources: [
      {
        resources: ['gallery.html'],
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
      default_title: '网页大图批量嗅探与下载',
      default_icon: {
        16: '/icons/icon-16.png',
        32: '/icons/icon-32.png',
        48: '/icons/icon-48.png',
        128: '/icons/icon-128.png'
      }
    }
  }
});
