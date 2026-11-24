import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: '网页全能视频伴侣',
    description: '全网视频 0.1x~16x 无级倍速、切后台防暂停、一键画中画、音量突破 600%、原画逐帧截图。',
    default_locale: 'zh_CN',
    version: '1.0.0',
    permissions: ['storage', 'activeTab'],
    icons: {
      16: '/icons/icon-16.png',
      32: '/icons/icon-32.png',
      48: '/icons/icon-48.png',
      128: '/icons/icon-128.png'
    },
    action: {
      default_title: '网页全能视频伴侣',
      default_icon: {
        16: '/icons/icon-16.png',
        32: '/icons/icon-32.png',
        48: '/icons/icon-48.png',
        128: '/icons/icon-128.png'
      }
    }
  }
});
