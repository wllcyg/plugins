import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: '100Free - 网页表格一键转 Excel',
    description: '鼠标悬停自动识别网页表格，一键导出干净整洁的 Excel (.xlsx) 与 CSV 文件，打破昂贵订阅。',
    version: '1.0.0',
    permissions: ['activeTab', 'storage'],
    icons: {
      16: '/icons/icon-16.png',
      32: '/icons/icon-32.png',
      48: '/icons/icon-48.png',
      128: '/icons/icon-128.png'
    },
    action: {
      default_title: '网页表格一键导出',
      default_icon: {
        16: '/icons/icon-16.png',
        32: '/icons/icon-32.png',
        48: '/icons/icon-48.png',
        128: '/icons/icon-128.png'
      }
    }
  }
});

