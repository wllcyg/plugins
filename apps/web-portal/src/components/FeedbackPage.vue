<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import gsap from 'gsap';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Github,
  Mail,
  MessageSquare,
  Users
} from 'lucide-vue-next';
import { t } from '../data/i18n';
import { GITHUB_REPO_URL } from '../data/plugins';
import qqGroupQr from '../assets/qq-group-qr.webp';

const QQ_GROUP_ID = '1076726913';
const FEEDBACK_EMAIL = 'wllcyg163@gmail.com';
const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;

const pageRef = ref<HTMLElement | null>(null);
const copiedType = ref<'qq' | 'email' | null>(null);
let ctx: gsap.Context | null = null;

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !pageRef.value) return;
  ctx = gsap.context(() => {
    const tl = gsap.timeline({
      defaults: { duration: 0.45, ease: 'power2.out', clearProps: 'opacity,transform' }
    });
    tl.from('.feedback-header', { y: 16, opacity: 0 })
      .from('.channel-card', { y: 22, opacity: 0, stagger: 0.08 }, '-=0.22')
      .from('.tips-card', { y: 16, opacity: 0 }, '-=0.18');
  }, pageRef.value);
});

onUnmounted(() => {
  ctx?.revert();
});

async function copyText(type: 'qq' | 'email', text: string) {
  try {
    await navigator.clipboard.writeText(text);
    copiedType.value = type;
    setTimeout(() => {
      if (copiedType.value === type) copiedType.value = null;
    }, 2000);
  } catch {
    // ignore
  }
}
</script>

<template>
  <section ref="pageRef" class="feedback-page" aria-labelledby="feedback-title">
    <RouterLink :to="{ path: '/', hash: '#directory' }" class="text-link">
      <ArrowLeft :size="16" aria-hidden="true" />{{ t.installBrowseAll }}
    </RouterLink>

    <header class="feedback-header">
      <h1 id="feedback-title">{{ t.feedbackPageTitle }}</h1>
      <p class="feedback-subtitle">{{ t.feedbackPageSubtitle }}</p>
    </header>

    <div class="channels-grid">
      <!-- 国内交流：QQ 群 -->
      <article class="channel-card qq-card">
        <div class="channel-head">
          <div class="channel-icon qq">
            <Users :size="20" aria-hidden="true" />
          </div>
          <h2>{{ t.feedbackQqTitle }}</h2>
        </div>
        <p class="channel-desc">{{ t.feedbackQqDesc }}</p>

        <div class="qq-qr-wrap">
          <img
            :src="qqGroupQr"
            alt="100-free QQ群二维码 1076726913"
            class="qq-qr-img"
            width="220"
            height="280"
          />
        </div>

        <div class="qq-meta">
          <span>{{ t.feedbackQqGroupName }}</span>
          <strong>{{ t.feedbackQqGroupNum }}</strong>
        </div>

        <button
          type="button"
          class="action-btn primary"
          @click="copyText('qq', QQ_GROUP_ID)"
        >
          <Check v-if="copiedType === 'qq'" :size="15" aria-hidden="true" />
          <Copy v-else :size="15" aria-hidden="true" />
          <span>{{ copiedType === 'qq' ? t.feedbackCopied : t.feedbackCopyQq }}</span>
        </button>
      </article>

      <!-- 海外 / 开发者：GitHub Issues -->
      <article class="channel-card">
        <div class="channel-head">
          <div class="channel-icon github">
            <Github :size="20" aria-hidden="true" />
          </div>
          <h2>{{ t.feedbackGithubTitle }}</h2>
        </div>
        <p class="channel-desc">{{ t.feedbackGithubDesc }}</p>

        <div class="info-pill">
          <code>github.com/wllcyg/plugins/issues</code>
        </div>

        <div class="card-spacer" />

        <a
          :href="GITHUB_ISSUES_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="action-btn primary"
        >
          <ExternalLink :size="15" aria-hidden="true" />
          <span>{{ t.feedbackGithubBtn }}</span>
        </a>
      </article>

      <!-- 邮件反馈：Gmail -->
      <article class="channel-card">
        <div class="channel-head">
          <div class="channel-icon mail">
            <Mail :size="20" aria-hidden="true" />
          </div>
          <h2>{{ t.feedbackEmailTitle }}</h2>
        </div>
        <p class="channel-desc">{{ t.feedbackEmailDesc }}</p>

        <div class="info-pill">
          <code>{{ FEEDBACK_EMAIL }}</code>
        </div>

        <div class="card-spacer" />

        <div class="btn-row">
          <a :href="`mailto:${FEEDBACK_EMAIL}`" class="action-btn primary">
            <Mail :size="15" aria-hidden="true" />
            <span>{{ t.feedbackSendMail }}</span>
          </a>
          <button
            type="button"
            class="action-btn secondary"
            @click="copyText('email', FEEDBACK_EMAIL)"
          >
            <Check v-if="copiedType === 'email'" :size="15" aria-hidden="true" />
            <Copy v-else :size="15" aria-hidden="true" />
            <span>{{ copiedType === 'email' ? t.feedbackCopied : t.feedbackCopyMail }}</span>
          </button>
        </div>
      </article>
    </div>

    <aside class="tips-card">
      <div class="tips-title">
        <MessageSquare :size="18" aria-hidden="true" />
        <strong>{{ t.feedbackTipsTitle }}</strong>
      </div>
      <ul>
        <li>{{ t.feedbackTip1 }}</li>
        <li>{{ t.feedbackTip2 }}</li>
        <li>{{ t.feedbackTip3 }}</li>
      </ul>
    </aside>
  </section>
</template>

<style scoped>
.feedback-page {
  padding: 40px 0 80px;
  max-width: 1020px;
  margin: 0 auto;
}

.feedback-header {
  margin-top: 20px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-line);
}

.feedback-header h1 {
  margin: 0;
  font-size: clamp(28px, 4vw, 38px);
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--color-ink);
}

.feedback-subtitle {
  margin: 12px 0 0;
  font-size: 16px;
  color: var(--color-muted);
  max-width: 700px;
  line-height: 1.65;
}

.channels-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-top: 28px;
}

@media (max-width: 900px) {
  .channels-grid {
    grid-template-columns: 1fr;
  }
}

.channel-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  border-radius: 16px;
  background: var(--color-paper);
  border: 1px solid var(--color-line);
  box-shadow: 0 4px 16px var(--color-card-shadow);
}

.channel-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.channel-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.channel-icon.qq {
  background: rgba(14, 165, 233, 0.14);
  color: #0284c7;
}

.channel-icon.github {
  background: rgba(100, 116, 139, 0.14);
  color: var(--color-ink);
}

.channel-icon.mail {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
}

.channel-head h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-ink);
}

.channel-desc {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--color-muted);
}

.qq-qr-wrap {
  display: flex;
  justify-content: center;
  padding: 12px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid var(--color-line);
  margin-bottom: 12px;
}

.qq-qr-img {
  display: block;
  width: 190px;
  height: auto;
  border-radius: 8px;
}

.qq-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--color-muted);
  margin-bottom: 14px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--color-stone);
}

.qq-meta strong {
  color: var(--color-ink);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.info-pill {
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--color-stone);
  border: 1px solid var(--color-line);
  margin-bottom: 16px;
  overflow-x: auto;
}

.info-pill code {
  font-size: 13px;
  color: var(--color-ink);
  word-break: break-all;
}

.card-spacer {
  flex: 1;
}

.btn-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s, transform 0.15s;
}

.action-btn:hover {
  transform: translateY(-1px);
}

.action-btn.primary {
  background: var(--color-action);
  color: #ffffff;
  border: 1px solid var(--color-action);
}

.action-btn.primary:hover {
  background: var(--color-action-hover);
  border-color: var(--color-action-hover);
}

.action-btn.secondary {
  background: var(--color-stone);
  color: var(--color-ink);
  border: 1px solid var(--color-line);
}

.tips-card {
  margin-top: 28px;
  padding: 20px 24px;
  border-radius: 16px;
  background: var(--color-stone);
  border: 1px solid var(--color-line);
}

.tips-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 15px;
  color: var(--color-ink);
}

.tips-card ul {
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
  line-height: 1.75;
  color: var(--color-muted);
}
</style>
