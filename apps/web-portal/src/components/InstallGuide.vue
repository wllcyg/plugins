<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import gsap from 'gsap';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  FolderOpen,
  HelpCircle,
  Pin,
  Settings,
  Terminal
} from 'lucide-vue-next';
import { t } from '../data/i18n';
import { GITHUB_RELEASES_URL } from '../data/plugins';

const guideRef = ref<HTMLElement | null>(null);
const copiedTarget = ref<'chrome' | 'edge' | null>(null);
let ctx: gsap.Context | null = null;

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !guideRef.value) return;
  ctx = gsap.context(() => {
    const tl = gsap.timeline({ defaults: { duration: 0.45, ease: 'power2.out', clearProps: 'opacity,transform' } });
    tl.from('.guide-header', { y: 16, opacity: 0 })
      .from('.step-card', { y: 24, opacity: 0, stagger: 0.08 }, '-=0.22')
      .from('.faq-item', { y: 18, opacity: 0, stagger: 0.06 }, '-=0.2');
  }, guideRef.value);
});

onUnmounted(() => {
  ctx?.revert();
});

async function copyInternalUrl(target: 'chrome' | 'edge') {
  const url = target === 'chrome' ? 'chrome://extensions' : 'edge://extensions';
  try {
    await navigator.clipboard.writeText(url);
    copiedTarget.value = target;
    setTimeout(() => {
      if (copiedTarget.value === target) copiedTarget.value = null;
    }, 2000);
  } catch {
    // ignore
  }
}
</script>

<template>
  <section ref="guideRef" class="install-guide" aria-labelledby="install-guide-title">
    <RouterLink :to="{ path: '/', hash: '#directory' }" class="text-link">
      <ArrowLeft :size="16" aria-hidden="true" />{{ t.installBrowseAll }}
    </RouterLink>

    <header class="guide-header">
      <h1 id="install-guide-title">{{ t.installPageTitle }}</h1>
      <p class="guide-subtitle">{{ t.installPageSubtitle }}</p>
      <div class="guide-quick-links">
        <a :href="GITHUB_RELEASES_URL" target="_blank" rel="noopener noreferrer" class="primary-link">
          <Download :size="17" aria-hidden="true" />{{ t.viewReleases }}
        </a>
        <RouterLink :to="{ path: '/', hash: '#directory' }" class="secondary-link">
          {{ t.navAllPlugins }}
        </RouterLink>
      </div>
    </header>

    <ol class="steps-list">
      <!-- Step 1 -->
      <li class="step-card">
        <div class="step-badge">1</div>
        <div class="step-body">
          <h2><FolderOpen :size="20" aria-hidden="true" />{{ t.installStep1Title }}</h2>
          <p>{{ t.installStep1Desc }}</p>
          <div class="warn-callout">
            <AlertTriangle :size="16" aria-hidden="true" />
            <span>{{ t.installStep1Warn }}</span>
          </div>
          <div class="folder-diagram" aria-hidden="true">
            <div class="diagram-row">📁 <span>D:\ChromeExtensions\100free-ext-screenshot\</span></div>
            <div class="diagram-row indent">├── 📄 <strong>manifest.json</strong>  ✅</div>
            <div class="diagram-row indent">├── 📁 chunks\</div>
            <div class="diagram-row indent">└── 📁 icons\</div>
          </div>
        </div>
      </li>

      <!-- Step 2 -->
      <li class="step-card">
        <div class="step-badge">2</div>
        <div class="step-body">
          <h2><Settings :size="20" aria-hidden="true" />{{ t.installStep2Title }}</h2>
          <p>{{ t.installStep2Desc }}</p>
          <div class="url-copy-grid">
            <div class="url-copy-item">
              <div class="url-label">Google Chrome</div>
              <div class="url-bar">
                <code>chrome://extensions</code>
                <button type="button" class="copy-btn" @click="copyInternalUrl('chrome')">
                  <Check v-if="copiedTarget === 'chrome'" :size="14" />
                  <Copy v-else :size="14" />
                  <span>{{ copiedTarget === 'chrome' ? t.installCopied : t.installCopyUrl }}</span>
                </button>
              </div>
            </div>
            <div class="url-copy-item">
              <div class="url-label">Microsoft Edge</div>
              <div class="url-bar">
                <code>edge://extensions</code>
                <button type="button" class="copy-btn" @click="copyInternalUrl('edge')">
                  <Check v-if="copiedTarget === 'edge'" :size="14" />
                  <Copy v-else :size="14" />
                  <span>{{ copiedTarget === 'edge' ? t.installCopied : t.installCopyUrl }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </li>

      <!-- Step 3 -->
      <li class="step-card">
        <div class="step-badge">3</div>
        <div class="step-body">
          <h2><Pin :size="20" aria-hidden="true" />{{ t.installStep3Title }}</h2>
          <p>{{ t.installStep3Desc }}</p>
          <div class="tip-callout">
            <Terminal :size="16" aria-hidden="true" />
            <div>
              <strong>{{ t.installFolderTipTitle }}</strong>
              <span>{{ t.installFolderTipDesc }}</span>
            </div>
          </div>
        </div>
      </li>
    </ol>

    <!-- FAQ -->
    <section class="faq-section" aria-labelledby="faq-title">
      <h2 id="faq-title" class="section-title">
        <HelpCircle :size="22" aria-hidden="true" />{{ t.installFaqTitle }}
      </h2>
      <div class="faq-grid">
        <article class="faq-item">
          <h3>{{ t.installFaq1Q }}</h3>
          <p>{{ t.installFaq1A }}</p>
        </article>
        <article class="faq-item">
          <h3>{{ t.installFaq2Q }}</h3>
          <p>{{ t.installFaq2A }}</p>
        </article>
        <article class="faq-item">
          <h3>{{ t.installFaq3Q }}</h3>
          <p>{{ t.installFaq3A }}</p>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.install-guide { padding-block: 48px 96px; }
.text-link { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 500; color: var(--apple-blue); }
.text-link:hover { text-decoration: underline; text-underline-offset: 4px; }

.guide-header { margin-top: 28px; max-width: 68ch; }
.guide-header h1 { margin: 0; font-size: clamp(32px, 4.5vw, 52px); font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; color: var(--apple-text); }
.guide-subtitle { margin: 16px 0 26px; color: var(--apple-subtle); font-size: 18px; line-height: 1.55; }
.guide-quick-links { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.primary-link, .secondary-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  font-size: 15px;
  padding: 12px 24px;
  border-radius: 980px;
  transition: background-color 0.25s var(--apple-ease), transform 0.25s var(--apple-ease);
}
.primary-link { background: var(--apple-blue); color: #ffffff; }
.primary-link:hover { background: var(--apple-blue-hover); }
.secondary-link { background: var(--apple-surface); color: var(--apple-text); }
.secondary-link:hover { background: color-mix(in srgb, var(--apple-text) 8%, var(--apple-surface)); }

.steps-list { list-style: none; padding: 0; margin: 44px 0 0; display: flex; flex-direction: column; gap: 20px; }
.step-card {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 20px;
  padding: 32px;
  border-radius: 24px;
  background: var(--apple-surface);
}
.step-badge {
  width: 36px;
  height: 36px;
  border-radius: 980px;
  background: var(--apple-blue);
  color: #ffffff;
  font-weight: 700;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step-body h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 2px 0 10px;
  font-size: 21px;
  font-weight: 600;
  color: var(--apple-text);
}
.step-body h2 svg { color: var(--apple-blue); flex-shrink: 0; }
.step-body p { margin: 0 0 16px; color: var(--apple-muted); line-height: 1.65; font-size: 15px; }

.warn-callout, .tip-callout {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  font-size: 13.5px;
  line-height: 1.6;
}
.warn-callout {
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
}
.warn-callout svg { color: #d97706; flex-shrink: 0; margin-top: 2px; }

:global(:root[data-theme="dark"]) .warn-callout {
  background: rgba(245, 158, 11, 0.14);
  color: #fde68a;
}
:global(:root[data-theme="dark"]) .warn-callout svg {
  color: #fbbf24;
}

.tip-callout {
  background: var(--apple-card);
  color: var(--apple-muted);
}
.tip-callout svg { color: var(--apple-blue); flex-shrink: 0; margin-top: 2px; }
.tip-callout strong { color: var(--apple-text); margin-right: 6px; }

.folder-diagram {
  margin-top: 14px;
  padding: 16px 18px;
  border-radius: 14px;
  background: #1d1d1f;
  color: #e5e5ea;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  line-height: 1.75;
  overflow-x: auto;
}
.diagram-row.indent { padding-left: 18px; color: #a1a1a6; }
.diagram-row strong { color: #30d158; }

.url-copy-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.url-copy-item {
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--apple-card);
}
.url-label { font-size: 12px; font-weight: 600; color: var(--apple-subtle); margin-bottom: 6px; }
.url-bar { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.url-bar code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13.5px; font-weight: 600; color: var(--apple-text); }
.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 980px;
  border: none;
  background: var(--apple-surface);
  color: var(--apple-text);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.copy-btn:hover { background: color-mix(in srgb, var(--apple-text) 10%, var(--apple-surface)); }

.faq-section { margin-top: 56px; padding-top: 40px; border-top: 1px solid var(--apple-divider); }
.section-title { display: flex; align-items: center; gap: 10px; margin: 0 0 24px; font-size: 24px; font-weight: 600; color: var(--apple-text); }
.section-title svg { color: var(--apple-blue); }
.faq-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.faq-item {
  padding: 24px;
  border-radius: 22px;
  background: var(--apple-surface);
}
.faq-item h3 { margin: 0 0 8px; font-size: 16px; font-weight: 600; line-height: 1.45; color: var(--apple-text); }
.faq-item p { margin: 0; font-size: 14px; color: var(--apple-muted); line-height: 1.65; }

@media (max-width: 820px) {
  .url-copy-grid, .faq-grid { grid-template-columns: 1fr; }
}
@media (max-width: 520px) {
  .step-card { grid-template-columns: 1fr; gap: 12px; padding: 24px; }
}
</style>
