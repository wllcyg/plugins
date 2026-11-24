import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: '二维码极速生成与右键离线识码器',
    description: '一键将当前网址、剪贴板、WiFi或名片生成高颜值艺术二维码，支持右键网页任意图片离线瞬间识别，0网络依赖，安全无广告。',
    default_locale: 'zh_CN',
    version: '1.0.0',
    permissions: ['activeTab', 'storage', 'contextMenus', 'clipboardRead'],
    icons: {
      16: '/icons/icon-16.png',
      32: '/icons/icon-32.png',
      48: '/icons/icon-48.png',
      128: '/icons/icon-128.png'
    },
    action: {
      default_title: '二维码极速生成与离线识别',
      default_icon: {
        16: '/icons/icon-16.png',
        32: '/icons/icon-32.png',
        48: '/icons/icon-48.png',
        128: '/icons/icon-128.png'
      }
    }
  }
});
