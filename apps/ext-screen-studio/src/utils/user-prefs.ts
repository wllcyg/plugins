import { DEFAULT_STYLE_CONFIG, type StudioStyleConfig } from '../types/recording';

export interface UserPreferences {
  enableAudio: boolean;
  enableCamera: boolean;
  enableCountdown: boolean;
  exportFps: 30 | 60;
  playbackSpeed: number;
  style: StudioStyleConfig;
}

const PREFS_KEY = '100free_screen_studio_prefs_v1';

export const DEFAULT_PREFS: UserPreferences = {
  enableAudio: true,
  enableCamera: false,
  enableCountdown: true,
  exportFps: 60,
  playbackSpeed: 1,
  style: { ...DEFAULT_STYLE_CONFIG }
};

export async function loadUserPreferences(): Promise<UserPreferences> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await chrome.storage.local.get(PREFS_KEY);
      const saved = res?.[PREFS_KEY] as Partial<UserPreferences> | undefined;
      if (saved) {
        return {
          ...DEFAULT_PREFS,
          ...saved,
          style: { ...DEFAULT_STYLE_CONFIG, ...(saved.style ?? {}) }
        };
      }
    } else {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<UserPreferences>;
        return {
          ...DEFAULT_PREFS,
          ...saved,
          style: { ...DEFAULT_STYLE_CONFIG, ...(saved.style ?? {}) }
        };
      }
    }
  } catch {
    // 读取失败时回退默认配置
  }
  return { ...DEFAULT_PREFS, style: { ...DEFAULT_STYLE_CONFIG } };
}

export async function saveUserPreferences(patch: Partial<UserPreferences>): Promise<void> {
  try {
    const current = await loadUserPreferences();
    const next: UserPreferences = {
      ...current,
      ...patch,
      style: patch.style ? { ...current.style, ...patch.style } : current.style
    };
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [PREFS_KEY]: next });
    } else {
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    }
  } catch {
    // 忽略存储异常
  }
}
