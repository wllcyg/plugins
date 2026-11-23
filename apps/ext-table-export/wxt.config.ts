import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: '100Free - 网页表格一键转 Excel',
    description: '鼠标悬停自动识别网页表格，一键导出干净整洁的 Excel (.xlsx) 与 CSV 文件，打破昂贵订阅。',
    version: '1.0.0',
    permissions: ['activeTab', 'storage'],
    action: {
      default_title: '网页表格导出'
    }
  }
});

