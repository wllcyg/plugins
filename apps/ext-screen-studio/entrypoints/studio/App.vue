<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Video, Plus, Trash2, Clock, Film, Upload } from 'lucide-vue-next';
import RecorderPanel from './components/RecorderPanel.vue';
import EditorWorkspace from './components/EditorWorkspace.vue';
import { m } from '../../src/locales';
import { deleteProject, getProject, listProjects, saveProject } from '../../src/utils/project-store';
import { loadUserPreferences } from '../../src/utils/user-prefs';
import type { RecordingProject } from '../../src/types/recording';

type StudioMode = 'library' | 'record' | 'edit';

const mode = ref<StudioMode>('library');
const initialAudio = ref(true);
const initialCamera = ref(false);
const projects = ref<RecordingProject[]>([]);
const activeProject = ref<RecordingProject | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const importLocalVideo = async (file: File) => {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = url;
  video.preload = 'metadata';

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error(m.errParseVideo));
    });

    const prefs = await loadUserPreferences();
    const durationMs = Math.max(1000, Math.round((video.duration || 10) * 1000));
    const id = crypto.randomUUID();
    const project: RecordingProject = {
      id,
      title: file.name.replace(/\.[^.]+$/, '') || m.defaultImportedTitle,
      createdAt: Date.now(),
      durationMs,
      trimStartMs: 0,
      trimEndMs: durationMs,
      playbackSpeed: prefs.playbackSpeed,
      width: video.videoWidth || 1920,
      height: video.videoHeight || 1080,
      videoBlob: file,
      cursorSamples: [],
      clickEvents: [],
      zoomSegments: [],
      style: { ...prefs.style, showCamera: false, showCursor: false }
    };

    await saveProject(project);
    await refreshLibrary();
    await openEditor(id);
  } catch (err) {
    alert(err instanceof Error ? err.message : m.errImportVideo);
  } finally {
    URL.revokeObjectURL(url);
  }
};

const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) void importLocalVideo(file);
  (e.target as HTMLInputElement).value = '';
};

const refreshLibrary = async () => {
  projects.value = await listProjects();
};

onMounted(async () => {
  document.title = m.studioDocTitle;
  const params = new URLSearchParams(window.location.search);
  const urlMode = params.get('mode');
  const urlId = params.get('id');
  initialAudio.value = params.get('audio') !== '0';
  initialCamera.value = params.get('camera') === '1';

  await refreshLibrary();

  if (urlMode === 'record') {
    mode.value = 'record';
    return;
  }

  if (urlId) {
    const found = await getProject(urlId);
    if (found) {
      activeProject.value = found;
      mode.value = 'edit';
      return;
    }
  }

  mode.value = 'library';
});

const openEditor = async (id: string) => {
  const found = await getProject(id);
  if (!found) return;
  activeProject.value = found;
  mode.value = 'edit';
};

const handleRecorded = async (id: string) => {
  await refreshLibrary();
  await openEditor(id);
};

const handleDelete = async (id: string) => {
  await deleteProject(id);
  await refreshLibrary();
};

const backToLibrary = async () => {
  activeProject.value = null;
  mode.value = 'library';
  await refreshLibrary();
};

const formatDuration = (ms: number) => {
  const sec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};
</script>

<template>
  <RecorderPanel
    v-if="mode === 'record'"
    :initial-audio="initialAudio"
    :initial-camera="initialCamera"
    @back="backToLibrary"
    @recorded="handleRecorded"
  />

  <EditorWorkspace
    v-else-if="mode === 'edit' && activeProject"
    :project="activeProject"
    @back="backToLibrary"
    @updated="activeProject = $event"
  />

  <div v-else class="library-shell">
    <header class="lib-header">
      <div class="lib-brand">
        <div class="lib-logo">
          <Video :size="22" />
        </div>
        <div>
          <h1>{{ m.libraryTitle }}</h1>
          <p>{{ m.librarySub }}</p>
        </div>
      </div>
      <div class="header-actions">
        <input
          ref="fileInputRef"
          type="file"
          accept="video/*"
          style="display: none"
          @change="handleFileChange"
        />
        <button class="import-btn" @click="fileInputRef?.click()">
          <Upload :size="15" />
          <span>{{ m.importVideoBtn }}</span>
        </button>
        <button class="new-btn" @click="mode = 'record'">
          <Plus :size="16" />
          <span>{{ m.newRecordingBtn }}</span>
        </button>
      </div>
    </header>

    <main class="lib-grid-wrap">
      <div v-if="!projects.length" class="empty-state">
        <Film :size="40" />
        <h2>{{ m.emptyLibraryTitle }}</h2>
        <p>{{ m.emptyLibraryDesc }}</p>
        <button class="new-btn" @click="mode = 'record'">{{ m.startFirstRecordingBtn }}</button>
      </div>

      <div v-else class="lib-grid">
        <div v-for="item in projects" :key="item.id" class="project-card">
          <div class="card-top" @click="openEditor(item.id)">
            <div class="thumb-badge">
              <Video :size="24" />
              <span>{{ m.zoomSegmentsCount(item.zoomSegments.length) }}</span>
            </div>
          </div>
          <div class="card-body">
            <h3 @click="openEditor(item.id)">{{ item.title }}</h3>
            <div class="card-meta">
              <span><Clock :size="12" /> {{ formatDuration(item.durationMs) }}</span>
              <span>{{ new Date(item.createdAt).toLocaleDateString() }}</span>
              <button class="del-btn" :title="m.deleteProjectTooltip" @click="handleDelete(item.id)">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="lib-footer">
      <a href="https://plugins.cheatppf.xyz" target="_blank" rel="noreferrer">
        100Free Open Source · plugins.cheatppf.xyz
      </a>
      <span>·</span>
      <a href="https://github.com/wllcyg/plugins" target="_blank" rel="noreferrer">
        {{ m.githubRepoLabel }}
      </a>
    </footer>
  </div>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
  background: #09090b;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

* {
  box-sizing: border-box;
}
</style>

<style scoped>
.library-shell {
  min-height: 100vh;
  background: #09090b;
  color: #f4f4f5;
  padding: 32px 48px;
}

.lib-header {
  max-width: 1120px;
  margin: 0 auto 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lib-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.lib-logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #1c1c21;
  border: 1px solid #2e2e34;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
}

.lib-brand h1 {
  margin: 0;
  font-size: 20px;
}

.lib-brand p {
  margin: 3px 0 0;
  font-size: 13px;
  color: #a1a1aa;
}

.new-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: #dc2626;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.new-btn:hover {
  background: #ef4444;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.import-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: 1px solid #3f3f46;
  border-radius: 10px;
  background: #1c1c21;
  color: #e4e4e7;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.import-btn:hover {
  background: #27272c;
}

.lib-grid-wrap {
  max-width: 1120px;
  margin: 0 auto;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  border: 1px dashed #27272a;
  border-radius: 20px;
  color: #a1a1aa;
}

.empty-state h2 {
  color: #f4f4f5;
  margin: 14px 0 6px;
}

.empty-state p {
  margin: 0 0 20px;
  font-size: 13px;
}

.lib-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}

.project-card {
  background: #141418;
  border: 1px solid #27272a;
  border-radius: 14px;
  overflow: hidden;
  transition: border-color 0.2s, transform 0.2s;
}

.project-card:hover {
  border-color: #52525b;
  transform: translateY(-2px);
}

.card-top {
  height: 140px;
  background: #1a1a1e;
  border-bottom: 1px solid #242429;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.thumb-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #e4e4e7;
  font-size: 12px;
}

.card-body {
  padding: 14px;
}

.card-body h3 {
  margin: 0 0 10px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #a1a1aa;
}

.card-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.del-btn {
  margin-left: auto;
  border: none;
  background: transparent;
  color: #71717a;
  cursor: pointer;
  padding: 4px;
}

.del-btn:hover {
  color: #f87171;
}

.lib-footer {
  max-width: 1120px;
  margin: 40px auto 0;
  padding-top: 18px;
  border-top: 1px solid #1e1e24;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  color: #71717a;
}

.lib-footer a {
  color: #71717a;
  text-decoration: none;
}

.lib-footer a:hover {
  color: #d4d4d8;
}
</style>
