<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import gsap from 'gsap';
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Github,
  Mail,
  MessageSquare,
  Send,
  Users
} from 'lucide-vue-next';
import { locale, t } from '../data/i18n';
import { getLocalizedPlugins, GITHUB_REPO_URL } from '../data/plugins';
import qqGroupQr from '../assets/qq-group-qr.webp';

interface GuestbookMessage {
  id: number;
  nickname: string;
  plugin_id: string;
  content: string;
  created_at: string;
}

const QQ_GROUP_ID = '1076726913';
const FEEDBACK_EMAIL = 'wllcyg163@gmail.com';
const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

const pageRef = ref<HTMLElement | null>(null);
const copiedType = ref<'qq' | 'email' | null>(null);
let ctx: gsap.Context | null = null;

const pluginOptions = computed(() => getLocalizedPlugins(locale.value));
const guestbookCopy = computed(() =>
  locale.value === 'zh'
    ? {
        title: '公开留言板（免登录直留）',
        subtitle: '欢迎直接留下对现有插件的建议、遇到的问题，或你想许愿的新插件创意。',
        nicknameLabel: '昵称（选填）',
        nicknamePlaceholder: '例如：路过的前端同学',
        pluginLabel: '关联插件',
        generalOption: '全部 / 新插件许愿',
        contentLabel: '留言内容',
        contentPlaceholder: '写下你的使用反馈、Bug 场景或想要的功能（2~500 字）...',
        submitBtn: '发布留言',
        submitting: '提交中...',
        submitSuccess: '留言已发布，感谢反馈！',
        contentRequired: '请至少输入 2 个字的留言内容。',
        unconfiguredHint: '留言板后端已就绪，请在 Cloudflare Pages 绑定 D1 数据库 (DB) 后即可实时接收留言。',
        emptyList: '还没有留言，来抢个沙发吧！',
        loading: '正在加载留言...'
      }
    : {
        title: 'Public Guestbook (No Login Required)',
        subtitle: 'Leave feedback, bug reports, or feature wishes for new free extensions directly below.',
        nicknameLabel: 'Nickname (Optional)',
        nicknamePlaceholder: 'e.g., Alex',
        pluginLabel: 'Related Extension',
        generalOption: 'General / New Extension Idea',
        contentLabel: 'Message',
        contentPlaceholder: 'Share your feedback, bug details, or extension ideas (2–500 chars)...',
        submitBtn: 'Post Message',
        submitting: 'Posting...',
        submitSuccess: 'Message posted. Thank you!',
        contentRequired: 'Please enter at least 2 characters.',
        unconfiguredHint: 'Guestbook API is ready—bind a Cloudflare D1 database (DB) in Pages settings to enable persistence.',
        emptyList: 'No messages yet. Be the first to leave one!',
        loading: 'Loading messages...'
      }
);

const nickname = ref('');
const selectedPluginId = ref('general');
const content = ref('');
const messages = ref<GuestbookMessage[]>([]);
const isLoadingMessages = ref(false);
const isSubmitting = ref(false);
const isUnconfigured = ref(false);
const statusNotice = ref<{ type: 'ok' | 'err'; text: string } | null>(null);
const turnstileToken = ref('');
const turnstileEl = ref<HTMLElement | null>(null);

async function fetchMessages() {
  isLoadingMessages.value = true;
  try {
    const res = await fetch('/api/messages?limit=30');
    if (!res.ok) return;
    const data = (await res.json()) as { messages?: GuestbookMessage[]; unconfigured?: boolean };
    messages.value = data.messages || [];
    isUnconfigured.value = Boolean(data.unconfigured);
  } catch {
    // 静态预览或离线环境下忽略网络错误
  } finally {
    isLoadingMessages.value = false;
  }
}

function initTurnstile() {
  if (!TURNSTILE_SITE_KEY || !turnstileEl.value || typeof window === 'undefined') return;
  const renderWidget = () => {
    const ts = (window as unknown as { turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => void } }).turnstile;
    if (ts && turnstileEl.value) {
      ts.render(turnstileEl.value, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => {
          turnstileToken.value = token;
        }
      });
    }
  };
  if ((window as unknown as { turnstile?: unknown }).turnstile) {
    renderWidget();
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.onload = renderWidget;
  document.head.appendChild(script);
}

async function submitGuestbook() {
  statusNotice.value = null;
  const text = content.value.trim();
  if (text.length < 2) {
    statusNotice.value = { type: 'err', text: guestbookCopy.value.contentRequired };
    return;
  }
  isSubmitting.value = true;
  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: nickname.value.trim(),
        pluginId: selectedPluginId.value,
        content: text,
        turnstileToken: turnstileToken.value || undefined
      })
    });
    const data = (await res.json()) as { ok?: boolean; message?: GuestbookMessage; error?: string };
    if (!res.ok || !data.ok || !data.message) {
      statusNotice.value = { type: 'err', text: data.error || 'Submit failed' };
      return;
    }
    messages.value = [data.message, ...messages.value];
    content.value = '';
    statusNotice.value = { type: 'ok', text: guestbookCopy.value.submitSuccess };
  } catch {
    statusNotice.value = { type: 'err', text: 'Network error' };
  } finally {
    isSubmitting.value = false;
  }
}

function pluginLabel(id: string): string {
  if (id === 'general') return guestbookCopy.value.generalOption;
  return pluginOptions.value.find((p) => p.id === id)?.name || id;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale.value === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return iso.slice(0, 10);
  }
}

onMounted(() => {
  void fetchMessages();
  initTurnstile();
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

    <section class="guestbook-card" aria-labelledby="guestbook-title">
      <div class="guestbook-head">
        <h2 id="guestbook-title">{{ guestbookCopy.title }}</h2>
        <p>{{ guestbookCopy.subtitle }}</p>
      </div>

      <p v-if="isUnconfigured" class="guestbook-hint">{{ guestbookCopy.unconfiguredHint }}</p>

      <form class="guestbook-form" @submit.prevent="submitGuestbook">
        <div class="form-row">
          <label class="field">
            <span>{{ guestbookCopy.nicknameLabel }}</span>
            <input
              v-model="nickname"
              type="text"
              maxlength="32"
              :placeholder="guestbookCopy.nicknamePlaceholder"
            />
          </label>
          <label class="field">
            <span>{{ guestbookCopy.pluginLabel }}</span>
            <select v-model="selectedPluginId">
              <option value="general">{{ guestbookCopy.generalOption }}</option>
              <option v-for="p in pluginOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </label>
        </div>

        <label class="field">
          <span>{{ guestbookCopy.contentLabel }}</span>
          <textarea
            v-model="content"
            rows="3"
            maxlength="500"
            required
            :placeholder="guestbookCopy.contentPlaceholder"
          />
        </label>

        <div v-if="TURNSTILE_SITE_KEY" ref="turnstileEl" class="turnstile-wrap" />

        <div class="form-actions">
          <button type="submit" class="action-btn primary" :disabled="isSubmitting">
            <Send :size="15" aria-hidden="true" />
            <span>{{ isSubmitting ? guestbookCopy.submitting : guestbookCopy.submitBtn }}</span>
          </button>
          <span
            v-if="statusNotice"
            :class="['status-text', statusNotice.type === 'ok' ? 'ok' : 'err']"
          >
            {{ statusNotice.text }}
          </span>
        </div>
      </form>

      <div class="guestbook-list">
        <p v-if="isLoadingMessages" class="list-empty">{{ guestbookCopy.loading }}</p>
        <p v-else-if="messages.length === 0" class="list-empty">{{ guestbookCopy.emptyList }}</p>
        <article v-for="msg in messages" :key="msg.id" class="message-item">
          <div class="message-meta">
            <strong>{{ msg.nickname }}</strong>
            <span class="message-tag">{{ pluginLabel(msg.plugin_id) }}</span>
            <time :datetime="msg.created_at">{{ formatDate(msg.created_at) }}</time>
          </div>
          <p class="message-body">{{ msg.content }}</p>
        </article>
      </div>
    </section>
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

.guestbook-card {
  margin-top: 28px;
  padding: 24px;
  border-radius: 16px;
  background: var(--color-paper);
  border: 1px solid var(--color-line);
}

.guestbook-head h2 {
  margin: 0;
  font-size: 20px;
  color: var(--color-ink);
}

.guestbook-head p {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--color-muted);
}

.guestbook-hint {
  margin: 14px 0 0;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--color-stone);
  border: 1px dashed var(--color-line);
  font-size: 13px;
  color: var(--color-muted);
}

.guestbook-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 18px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-ink);
}

.field input,
.field select,
.field textarea {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--color-line);
  background: var(--color-sand);
  color: var(--color-ink);
  font-size: 14px;
  font-family: inherit;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: 2px solid var(--color-action);
  border-color: transparent;
}

.form-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.status-text {
  font-size: 13px;
  font-weight: 600;
}
.status-text.ok { color: #059669; }
.status-text.err { color: #dc2626; }

.guestbook-list {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--color-line);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-empty {
  margin: 0;
  font-size: 13.5px;
  color: var(--color-muted);
}

.message-item {
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--color-sand);
  border: 1px solid var(--color-line);
}

.message-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 13px;
}

.message-meta strong {
  color: var(--color-ink);
}

.message-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--color-paper);
  border: 1px solid var(--color-line);
  color: var(--color-action);
}

.message-meta time {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-muted);
}

.message-body {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.65;
  color: var(--color-ink);
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
