<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Video, Mic, Camera, FolderOpen, Disc, Clock } from 'lucide-vue-next';
import { AppFooterLink } from '@100free/ui';
import { m } from '../../src/locales';
import { listProjects } from '../../src/utils/project-store';
import { loadUserPreferences, saveUserPreferences } from '../../src/utils/user-prefs';
import type { RecordingProject } from '../../src/types/recording';

const enableAudio = ref(true);
const enableCamera = ref(false);
const prefsLoaded = ref(false);
const recentProjects = ref<RecordingProject[]>([]);

onMounted(async () => {
  try {
    const [prefs, all] = await Promise.all([loadUserPreferences(), listProjects()]);
    enableAudio.value = prefs.enableAudio;
    enableCamera.value = prefs.enableCamera;
    recentProjects.value = all.slice(0, 3);
  } catch {
    recentProjects.value = [];
  } finally {
    prefsLoaded.value = true;
  }
});

watch([enableAudio, enableCamera], ([audio, camera]) => {
  if (!prefsLoaded.value) return;
  void saveUserPreferences({ enableAudio: audio, enableCamera: camera });
});

const startRecording = () => {
  void chrome.runtime.sendMessage({
    type: 'OPEN_STUDIO',
    mode: 'record',
    audio: enableAudio.value,
    camera: enableCamera.value
  });
  window.close();
};

const openStudio = (projectId?: string) => {
  void chrome.runtime.sendMessage({
    type: 'OPEN_STUDIO',
    mode: projectId ? 'edit' : 'library',
    projectId
  });
  window.close();
};

const formatDuration = (ms: number) => {
  const sec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};
</script>

<template>
  <div class="popup-shell">
    <header class="header">
      <div class="brand">
        <div class="logo-badge">
          <Video :size="18" />
        </div>
        <div>
          <h1>{{ m.extTitle }}</h1>
          <p>{{ m.extSub }}</p>
        </div>
      </div>
      <span class="free-tag">{{ m.freeTag }}</span>
    </header>

    <section class="toggles">
      <label class="toggle-item" :class="{ active: enableAudio }">
        <input v-model="enableAudio" type="checkbox" />
        <Mic :size="16" />
        <span>{{ m.recordMic }}</span>
        <span class="pill">{{ enableAudio ? m.stateOn : m.stateOff }}</span>
      </label>

      <label class="toggle-item" :class="{ active: enableCamera }">
        <input v-model="enableCamera" type="checkbox" />
        <Camera :size="16" />
        <span>{{ m.recordCameraPip }}</span>
        <span class="pill">{{ enableCamera ? m.stateOn : m.stateOff }}</span>
      </label>
    </section>

    <button class="primary-btn" @click="startRecording">
      <Disc :size="16" />
      <span>{{ m.startRecordingBtn }}</span>
    </button>

    <section v-if="recentProjects.length" class="recent-box">
      <div class="recent-head">
        <span>{{ m.recentRecordings }}</span>
        <button class="link-btn" @click="openStudio()">{{ m.allProjects }}</button>
      </div>
      <div class="recent-list">
        <button
          v-for="item in recentProjects"
          :key="item.id"
          class="recent-item"
          @click="openStudio(item.id)"
        >
          <span class="title">{{ item.title }}</span>
          <span class="meta">
            <Clock :size="12" />
            {{ formatDuration(item.durationMs) }}
          </span>
        </button>
      </div>
    </section>

    <footer class="footer">
      <button class="ghost-btn" @click="openStudio()">
        <FolderOpen :size="15" />
        <span>{{ m.openStudioBtn }}</span>
      </button>
      <AppFooterLink plugin-id="screen-studio" theme="dark" />
    </footer>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.popup-shell {
  width: 340px;
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #141416;
  color: #f4f4f5;
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

.logo-badge {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #202024;
  border: 1px solid #2e2e34;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
}

.header h1 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.header p {
  margin: 2px 0 0;
  font-size: 11px;
  color: #8e8e93;
}

.free-tag {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 6px;
  background: #1c1c21;
  color: #a1a1aa;
  border: 1px solid #2e2e34;
}

.toggles {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #1c1c20;
  border: 1px solid #2a2a30;
  cursor: pointer;
  font-size: 13px;
  color: #d4d4d8;
  transition: border-color 0.15s, background 0.15s;
}

.toggle-item.active {
  border-color: #3f3f46;
  background: #232329;
  color: #ffffff;
}

.toggle-item input {
  display: none;
}

.toggle-item .pill {
  margin-left: auto;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  background: #2a2a30;
  color: #8e8e93;
}

.toggle-item.active .pill {
  background: #f4f4f5;
  color: #141416;
  font-weight: 600;
}

.primary-btn {
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 11px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  background: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.primary-btn:hover {
  background: #ef4444;
}

.recent-box {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #242429;
}

.recent-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #8e8e93;
  margin-bottom: 8px;
}

.link-btn {
  background: none;
  border: none;
  color: #d4d4d8;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.link-btn:hover {
  color: #ffffff;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.recent-item {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #26262c;
  background: #1a1a1e;
  color: #e4e4e7;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
}

.recent-item:hover {
  border-color: #3f3f46;
  background: #222227;
}

.recent-item .title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 210px;
}

.recent-item .meta {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #8e8e93;
  font-variant-numeric: tabular-nums;
}

.footer {
  margin-top: 12px;
}

.ghost-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid #2c2c32;
  background: #1a1a1e;
  color: #d4d4d8;
  font-size: 12px;
  cursor: pointer;
}

.ghost-btn:hover {
  background: #242429;
  color: #ffffff;
}

.origin-bar {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  color: #71717a;
}

.origin-bar a {
  color: #71717a;
  text-decoration: none;
}

.origin-bar a:hover {
  color: #d4d4d8;
}
</style>
