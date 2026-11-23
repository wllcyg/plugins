import { defineConfig } from 'wxt';

// 详细配置文档请查阅: https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: '100Free 插件模板',
    description: '100款免费生产力插件统一脚手架模板',
    version: '1.0.0',
    permissions: ['storage', 'activeTab']
  }
});

