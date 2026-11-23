export function t(key: string, substitutions?: string | string[]): string {
  if (typeof chrome !== 'undefined' && chrome.i18n?.getMessage) {
    const msg = chrome.i18n.getMessage(key, substitutions);
    if (msg) return msg;
  }
  return key;
}

