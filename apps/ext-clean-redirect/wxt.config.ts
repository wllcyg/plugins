import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: '全网外链免拦截直达与链接追踪净化',
    description: '自动跳过知乎、简书、掘金、CSDN等各大平台外链中转拦截页直达目标网站，智能剥离UTM/SPM等营销追踪参数，去除网页复制烦人版权尾巴。',
    default_locale: 'zh_CN',
    version: '1.0.0',
    permissions: ['storage', 'contextMenus', 'clipboardWrite', 'scripting', 'activeTab'],
    icons: {
      16: '/icons/icon-16.png',
      32: '/icons/icon-32.png',
      48: '/icons/icon-48.png',
      128: '/icons/icon-128.png'
    },
    action: {
      default_title: '全网外链免拦截直达与链接追踪净化',
      default_icon: {
        16: '/icons/icon-16.png',
        32: '/icons/icon-32.png',
        48: '/icons/icon-48.png',
        128: '/icons/icon-128.png'
      }
    }
  }
});
