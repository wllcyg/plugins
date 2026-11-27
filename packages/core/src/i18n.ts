export type ExtLocale = 'zh' | 'en';

export function detectLocale(): ExtLocale {
  try {
    const uiLang =
      (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage?.()) ||
      (typeof navigator !== 'undefined' && navigator.language) ||
      'zh';
    return uiLang.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  } catch {
    return 'zh';
  }
}

export function isZhLocale(): boolean {
  return detectLocale() === 'zh';
}

export function createMessages<T extends Record<string, unknown>>(bundles: { zh: T; en: T }): T {
  return bundles[detectLocale()];
}
