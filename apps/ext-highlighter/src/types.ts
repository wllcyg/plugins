export type HighlightColorId = 'yellow' | 'green' | 'blue' | 'pink' | 'purple' | 'orange';

export type HighlightStyle = 'fill' | 'underline';

export interface HighlightColorPreset {
  id: HighlightColorId;
  name: string;
  bg: string;
  border: string;
  dot: string;
}

export const HIGHLIGHT_COLORS: HighlightColorPreset[] = [
  { id: 'yellow', name: '鹅黄', bg: 'rgba(254, 240, 138, 0.72)', border: '#eab308', dot: '#facc15' },
  { id: 'green', name: '薄荷绿', bg: 'rgba(187, 247, 208, 0.72)', border: '#22c55e', dot: '#4ade80' },
  { id: 'blue', name: '天青蓝', bg: 'rgba(186, 230, 253, 0.72)', border: '#0ea5e9', dot: '#38bdf8' },
  { id: 'pink', name: '樱花粉', bg: 'rgba(251, 207, 232, 0.72)', border: '#ec4899', dot: '#f472b6' },
  { id: 'purple', name: '薰衣紫', bg: 'rgba(221, 214, 254, 0.72)', border: '#8b5cf6', dot: '#a78bfa' },
  { id: 'orange', name: '暖橘', bg: 'rgba(254, 215, 170, 0.72)', border: '#f97316', dot: '#fb923c' }
];

export interface HighlightItem {
  id: string;
  url: string;
  pageTitle: string;
  domain: string;
  text: string;
  prefix: string;
  suffix: string;
  color: HighlightColorId;
  style: HighlightStyle;
  note: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface HighlighterSettings {
  toolbarEnabled: boolean;
  defaultColor: HighlightColorId;
  defaultStyle: HighlightStyle;
}

export const DEFAULT_SETTINGS: HighlighterSettings = {
  toolbarEnabled: true,
  defaultColor: 'yellow',
  defaultStyle: 'fill'
};
