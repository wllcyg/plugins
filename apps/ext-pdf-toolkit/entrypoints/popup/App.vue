<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { FileText, ShieldCheck, Layers, Image, Stamp, ExternalLink } from 'lucide-vue-next';
import { AppFooterLink } from '@100free/ui';
import { m } from '../../src/locales';

const currentPdfUrl = ref('');

onMounted(async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url && /\.pdf(\?|#|$)/i.test(tab.url)) {
      currentPdfUrl.value = tab.url;
    }
  } catch {
    // ignore
  }
});

function openStudio(sourceUrl?: string) {
  void chrome.runtime.sendMessage({
    type: 'OPEN_STUDIO',
    sourceUrl
  });
  window.close();
}
</script>

<template>
  <div class="popup-root">
    <header class="header">
      <div class="brand">
        <div class="logo-box">
          <FileText :size="18" />
        </div>
        <div>
          <h1>{{ m.extTitle }}</h1>
          <p class="sub">{{ m.extSub }}</p>
        </div>
      </div>
    </header>

    <div v-if="currentPdfUrl" class="detected-box">
      <div class="detected-title">{{ m.detectedPdf }}</div>
      <button type="button" class="btn primary" @click="openStudio(currentPdfUrl)">
        <ExternalLink :size="15" />
        <span>{{ m.importCurrentPdf }}</span>
      </button>
    </div>

    <div class="actions">
      <button type="button" class="btn primary" @click="openStudio()">
        <Layers :size="16" />
        <span>{{ m.openStudio }}</span>
      </button>
    </div>

    <ul class="feature-list">
      <li><Layers :size="14" /> <span>{{ m.feat1 }}</span></li>
      <li><Image :size="14" /> <span>{{ m.feat2 }}</span></li>
      <li><Stamp :size="14" /> <span>{{ m.feat3 }}</span></li>
    </ul>

    <div class="privacy-bar">
      <ShieldCheck :size="14" />
      <span>{{ m.privacyBar }}</span>
    </div>

    <AppFooterLink plugin-id="pdf-toolkit" />
  </div>
</template>

<style scoped>
.popup-root {
  width: 330px;
  padding: 16px;
  background: #fffcf7;
  color: #1e293b;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo-box {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}
h1 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}
.sub {
  margin: 2px 0 0;
  font-size: 11.5px;
  color: #64748b;
}
.detected-box {
  margin-bottom: 10px;
  padding: 10px;
  border-radius: 10px;
  background: #fef2f2;
  border: 1px solid #fecaca;
}
.detected-title {
  font-size: 12px;
  font-weight: 600;
  color: #b91c1c;
  margin-bottom: 8px;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.btn {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  border: none;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s;
}
.btn.primary {
  background: #dc2626;
  color: #ffffff;
}
.btn.primary:hover {
  background: #b91c1c;
}
.feature-list {
  list-style: none;
  padding: 0;
  margin: 14px 0 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.feature-list li {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: #475569;
}
.feature-list svg {
  color: #dc2626;
  flex-shrink: 0;
}
.privacy-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #ecfdf5;
  color: #047857;
  font-size: 11.5px;
  font-weight: 500;
  margin-bottom: 10px;
}
</style>
