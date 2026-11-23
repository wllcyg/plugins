/**
 * Chrome 原生 i18n 极简封装，自动根据系统与浏览器语言返回对应文本
 */
export function t(key: string, substitutions?: string | string[]): string {
  if (typeof chrome !== 'undefined' && chrome.i18n?.getMessage) {
    const msg = chrome.i18n.getMessage(key, substitutions);
    if (msg) return msg;
  }

  // 兜底本地后备方案（如果在非扩展环境测试或读取失败时）
  return key;
}

