import { ref, watch } from 'vue';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = '100free_portal_theme';

function detectInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {
    // ignore
  }
  return 'light';
}

export const theme = ref<Theme>(detectInitialTheme());

watch(
  theme,
  (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, val);
    } catch {
      // ignore
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', val);
      document.documentElement.classList.toggle('dark', val === 'dark');
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (meta) {
        meta.content = val === 'dark' ? '#0b1120' : '#f4f0e8';
      }
    }
  },
  { immediate: true }
);

export function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
}
