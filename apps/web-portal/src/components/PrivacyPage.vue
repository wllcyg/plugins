<script setup lang="ts">
import { computed } from 'vue';
import { ArrowLeft, Database, EyeOff, Lock, ShieldCheck } from 'lucide-vue-next';
import { locale, t } from '../data/i18n';
import { GITHUB_REPO_URL } from '../data/plugins';

const copy = computed(() =>
  locale.value === 'zh'
    ? {
        title: '隐私政策与数据安全承诺',
        updated: '最后更新：2026-11-27 · 适用于 100-Free 全系 Chrome / Edge 扩展及官网',
        sections: [
          {
            icon: EyeOff,
            heading: '1. 零数据收集与零遥测（Zero Telemetry）',
            body: '100-Free 全系浏览器扩展均不含任何第三方统计脚本（如 Google Analytics、友盟等）、广告 SDK 或埋点上报。我们不收集、不存储、不出售、也不向任何外部服务器传输您的浏览历史、网页内容、剪贴板数据或个人身份信息。'
          },
          {
            icon: Lock,
            heading: '2. 100% 本地离线处理',
            body: '所有核心能力——包括长截图拼接与标注、表格转 Excel/CSV、网页荧光笔笔记、CSS/Tailwind 提取、大图嗅探与 WebP 转换、二维码生成/解码以及本地屏幕录制——均完全在您本机的浏览器沙箱中运算完成，无需登录账号，也不会上传任何文件到云端。'
          },
          {
            icon: Database,
            heading: '3. 本地存储与权限最小化原则',
            body: '部分扩展会使用浏览器原生的 chrome.storage.local 或 IndexedDB 在您的设备本地保存偏好设置、高亮笔记或录制缓存。这些数据完全归您所有，卸载扩展即可彻底清除；扩展申请的权限仅用于实现对应交互功能（例如 activeTab 仅在您点击图标时读取当前标签页）。'
          },
          {
            icon: ShieldCheck,
            heading: '4. 开源透明与联系我们',
            body: '全部扩展源码已在 GitHub 公开托管，接受社区安全审计。如对隐私条款或权限使用有任何疑问，欢迎通过反馈页面或邮件 wllcyg163@gmail.com 联系我们。'
          }
        ],
        viewSource: '查看 GitHub 开源仓库',
        goFeedback: '前往问题反馈'
      }
    : {
        title: 'Privacy Policy & Data Commitment',
        updated: 'Last updated: Nov 27, 2026 · Applies to all 100-Free Chrome & Edge extensions',
        sections: [
          {
            icon: EyeOff,
            heading: '1. Zero Data Collection & Zero Telemetry',
            body: 'All 100-Free browser extensions contain zero analytics scripts, zero ad SDKs, and zero tracking beacons. We never collect, store, sell, or transmit your browsing history, page contents, clipboard data, or personal information to any server.'
          },
          {
            icon: Lock,
            heading: '2. 100% Local & Offline Processing',
            body: 'Every capability—full-page screenshots, table-to-Excel export, web highlights, CSS/Tailwind extraction, image sniffing & WebP conversion, QR encoding/decoding, and screen recording—runs strictly inside your local browser sandbox without accounts or cloud uploads.'
          },
          {
            icon: Database,
            heading: '3. Local Storage & Minimal Permissions',
            body: 'Extensions only use browser-local chrome.storage.local or IndexedDB to persist your preferences and notes on your device. All data is deleted automatically when you uninstall the extension, and permissions (such as activeTab) are requested strictly on a least-privilege basis.'
          },
          {
            icon: ShieldCheck,
            heading: '4. Open-Source Transparency & Contact',
            body: 'Our full source code is publicly hosted on GitHub for independent security review. If you have any privacy questions, please reach out via our Feedback page or email wllcyg163@gmail.com.'
          }
        ],
        viewSource: 'Inspect GitHub Repository',
        goFeedback: 'Go to Feedback'
      }
);
</script>

<template>
  <section class="privacy-page" aria-labelledby="privacy-title">
    <RouterLink :to="{ path: '/', hash: '#directory' }" class="text-link">
      <ArrowLeft :size="16" aria-hidden="true" />{{ t.installBrowseAll }}
    </RouterLink>

    <header class="privacy-header">
      <div class="privacy-badge">
        <ShieldCheck :size="14" aria-hidden="true" />
        <span>100% Local · Zero Telemetry</span>
      </div>
      <h1 id="privacy-title">{{ copy.title }}</h1>
      <p class="privacy-sub">{{ copy.updated }}</p>
    </header>

    <div class="privacy-grid">
      <article v-for="item in copy.sections" :key="item.heading" class="privacy-card">
        <div class="privacy-icon">
          <component :is="item.icon" :size="20" aria-hidden="true" />
        </div>
        <h2>{{ item.heading }}</h2>
        <p>{{ item.body }}</p>
      </article>
    </div>

    <div class="privacy-actions">
      <a :href="GITHUB_REPO_URL" target="_blank" rel="noopener noreferrer" class="secondary-link">
        {{ copy.viewSource }}
      </a>
      <RouterLink to="/feedback" class="secondary-link">
        {{ copy.goFeedback }}
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.privacy-page {
  padding-block: 48px 96px;
}
.privacy-header {
  margin-top: 24px;
  max-width: 72ch;
}
.privacy-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 980px;
  background: var(--apple-surface);
  color: var(--apple-blue);
  font-size: 12.5px;
  font-weight: 600;
  margin-bottom: 16px;
}
h1 {
  margin: 0;
  font-size: clamp(32px, 4.4vw, 48px);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.12;
  color: var(--apple-text);
}
.privacy-sub {
  margin: 12px 0 0;
  color: var(--apple-subtle);
  font-size: 15px;
}
.privacy-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 36px;
}
.privacy-card {
  padding: 28px;
  border-radius: 24px;
  background: var(--apple-surface);
}
.privacy-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--apple-card);
  color: var(--apple-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}
.privacy-card h2 {
  margin: 0 0 8px;
  font-size: 19px;
  font-weight: 600;
  color: var(--apple-text);
}
.privacy-card p {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.68;
  color: var(--apple-muted);
}
.privacy-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 32px;
}
.secondary-link {
  display: inline-flex;
  align-items: center;
  padding: 11px 22px;
  border-radius: 980px;
  background: var(--apple-surface);
  color: var(--apple-text);
  font-size: 14px;
  font-weight: 500;
}
.secondary-link:hover {
  background: color-mix(in srgb, var(--apple-text) 8%, var(--apple-surface));
}
@media (max-width: 860px) {
  .privacy-grid {
    grid-template-columns: 1fr;
  }
}
</style>
