import { defineConfig } from 'wxt';
import path from 'node:path';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  alias: {
    '@': path.resolve(__dirname, 'src')
  },
  manifest: {
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    default_locale: 'zh_CN',
    version: '1.0.0',
    permissions: ['activeTab', 'tabs', 'storage', 'scripting'],
    host_permissions: ['<all_urls>'],
    commands: {
      'toggle-recording': {
        suggested_key: {
          default: 'Alt+Shift+R'
        },
        description: '快速开启录制或停止当前录制'
      }
    },
    icons: {
      16: '/icons/icon-16.png',
      32: '/icons/icon-32.png',
      48: '/icons/icon-48.png',
      128: '/icons/icon-128.png'
    },
    action: {
      default_title: '__MSG_extensionName__',
      default_icon: {
        16: '/icons/icon-16.png',
        32: '/icons/icon-32.png',
        48: '/icons/icon-48.png',
        128: '/icons/icon-128.png'
      }
    }
  }
});
