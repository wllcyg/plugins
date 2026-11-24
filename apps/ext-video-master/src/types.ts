export interface VideoSettings {
  playbackRate: number; // 0.1 - 16.0
  antiPause: boolean; // 是否开启切后台防暂停
  volumeBoost: number; // 1.0 - 6.0 (100% - 600%)
  showOsdBadge: boolean; // 是否在画面显示悬浮胶囊
  shortcutsEnabled: boolean; // 是否开启全局快捷键
}

export const DEFAULT_SETTINGS: VideoSettings = {
  playbackRate: 1.0,
  antiPause: true,
  volumeBoost: 1.0,
  showOsdBadge: true,
  shortcutsEnabled: true
};

export interface PageVideoState {
  hasVideo: boolean;
  videoCount: number;
  currentRate: number;
  isPiP: boolean;
  volumeBoost: number;
  antiPause: boolean;
  showOsdBadge: boolean;
  shortcutsEnabled: boolean;
}
