export interface SniffedImage {
  id: string;
  src: string;
  type: 'img' | 'background' | 'svg' | 'srcset';
  format: string; // 'png' | 'jpg' | 'webp' | 'svg' | 'gif' 等
  width: number;
  height: number;
  alt?: string;
  selected?: boolean;
}

export interface FilterOptions {
  minWidth: number;
  minHeight: number;
  formats: string[];
}

export const DEFAULT_FILTER: FilterOptions = {
  minWidth: 50,
  minHeight: 50,
  formats: ['jpg', 'png', 'webp', 'svg', 'gif']
};
