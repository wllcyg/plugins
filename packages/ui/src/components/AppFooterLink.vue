<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  pluginId?: string;
  theme?: 'light' | 'dark';
}

const props = withDefaults(defineProps<Props>(), {
  pluginId: '',
  theme: 'light'
});

const SITE_ORIGIN = 'https://plugins.cheatppf.xyz';

const isZh = (() => {
  try {
    const lang =
      (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage?.()) ||
      (typeof navigator !== 'undefined' && navigator.language) ||
      'zh';
    return lang.toLowerCase().startsWith('zh');
  } catch {
    return true;
  }
})();

const homeUrl = isZh ? SITE_ORIGIN : `${SITE_ORIGIN}/en`;
const feedbackUrl = isZh ? `${SITE_ORIGIN}/feedback` : `${SITE_ORIGIN}/en/feedback`;

const guideUrl = computed(() => {
  const prefix = isZh ? '' : '/en';
  return props.pluginId ? `${SITE_ORIGIN}${prefix}/tools/${props.pluginId}` : `${SITE_ORIGIN}${prefix}/install`;
});

const labels = isZh
  ? { more: '更多免费插件', guide: '使用指南', feedback: '问题反馈' }
  : { more: 'More Free Tools', guide: 'Guide', feedback: 'Feedback' };
</script>

<template>
  <footer class="app-portal-footer" :class="`theme-${theme}`">
    <a :href="homeUrl" target="_blank" rel="noopener noreferrer">{{ labels.more }}</a>
    <span class="sep">·</span>
    <a :href="guideUrl" target="_blank" rel="noopener noreferrer">{{ labels.guide }}</a>
    <span class="sep">·</span>
    <a :href="feedbackUrl" target="_blank" rel="noopener noreferrer">{{ labels.feedback }}</a>
  </footer>
</template>

<style scoped>
.app-portal-footer {
  margin-top: 10px;
  padding-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  line-height: 1.4;
}

.app-portal-footer.theme-light {
  border-top: 1px solid #e2e8f0;
  color: #64748b;
}

.app-portal-footer.theme-light a {
  color: #64748b;
  text-decoration: none;
  transition: color 0.15s;
}

.app-portal-footer.theme-light a:hover {
  color: #2563eb;
}

.app-portal-footer.theme-dark {
  border-top: 1px solid #27272a;
  color: #71717a;
}

.app-portal-footer.theme-dark a {
  color: #71717a;
  text-decoration: none;
  transition: color 0.15s;
}

.app-portal-footer.theme-dark a:hover {
  color: #e4e4e7;
}

.sep {
  opacity: 0.55;
}
</style>
