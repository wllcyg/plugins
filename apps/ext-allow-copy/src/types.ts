export interface CopySettings {
  enabled: boolean;
  strictMode: boolean;
  showFloatButton: boolean;
  siteRules: Record<string, boolean>; // hostname -> enabled
}

export const DEFAULT_SETTINGS: CopySettings = {
  enabled: true,
  strictMode: false,
  showFloatButton: true,
  siteRules: {}
};

export const STORAGE_KEY = 'super_free_copy_settings';
