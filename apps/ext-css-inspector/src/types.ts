export interface InspectorSettings {
  enabled: boolean;
  copyMode: 'css' | 'tailwind';
  autoHideDelay: number;
}

export const DEFAULT_SETTINGS: InspectorSettings = {
  enabled: true,
  copyMode: 'tailwind',
  autoHideDelay: 0
};

export const STORAGE_KEY = 'css_inspector_settings';

export interface StyleSummary {
  tagName: string;
  idName: string;
  classList: string[];
  dimensions: { width: number; height: number };
  
  // 核心视觉分类
  color: string;
  backgroundColor: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  fontFamily: string;
  padding: string;
  margin: string;
  borderRadius: string;
  border: string;
  boxShadow: string;
  display: string;
  flexDirection?: string;
  
  // 代码生成
  rawCss: string;
  tailwindClasses: string;
}
