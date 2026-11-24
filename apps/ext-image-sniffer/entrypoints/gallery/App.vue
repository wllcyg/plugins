<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { SniffedImage } from '../../src/types';
import { downloadImagesAsZip, triggerFileDownload, fetchImageBlob } from '../../src/core/downloader';

const images = ref<SniffedImage[]>([]);
const pageTitle = ref('网页大图');
const loading = ref(true);

// 过滤配置
const selectedFormat = ref<string>('all');
const minWidth = ref<number>(80);
const columns = ref<number>(5); // 3, 4, 5, 6
const convertToJpg = ref(false); // 格式转换选项

// 灯箱状态
const activeIndex = ref<number | null>(null);

// 下载状态
const isDownloading = ref(false);
const downloadProgress = ref<string>('');

const formatList = ['all', 'jpg', 'png', 'webp', 'svg', 'gif'];

// 过滤后的列表
const filteredImages = computed(() => {
  return images.value.filter((img) => {
    if (!img) return false;
    const fmt = (img.format || 'jpg').toLowerCase();
    if (selectedFormat.value !== 'all' && fmt !== selectedFormat.value) return false;
    if (img.width > 0 && img.width < minWidth.value) return false;
    return true;
  });
});

const selectedImages = computed(() => {
  return filteredImages.value.filter((img) => img.selected);
});

const isAllSelected = computed(() => {
  return filteredImages.value.length > 0 && filteredImages.value.every((img) => img.selected);
});

const toggleSelectAll = () => {
  const target = !isAllSelected.value;
  filteredImages.value.forEach((img) => {
    img.selected = target;
  });
};

const toggleSelect = (img: SniffedImage) => {
  img.selected = !img.selected;
};

// 打开灯箱
const openLightbox = (index: number) => {
  activeIndex.value = index;
};

const closeLightbox = () => {
  activeIndex.value = null;
};

const prevImage = () => {
  if (activeIndex.value === null) return;
  if (activeIndex.value > 0) {
    activeIndex.value--;
  } else {
    activeIndex.value = filteredImages.value.length - 1;
  }
};

const nextImage = () => {
  if (activeIndex.value === null) return;
  if (activeIndex.value < filteredImages.value.length - 1) {
    activeIndex.value++;
  } else {
    activeIndex.value = 0;
  }
};

// 键盘快捷键监听
const handleKeyDown = (e: KeyboardEvent) => {
  if (activeIndex.value === null) return;
  if (e.key === 'Escape') closeLightbox();
  else if (e.key === 'ArrowLeft') prevImage();
  else if (e.key === 'ArrowRight') nextImage();
};

// 单张下载
const downloadSingle = async (e: Event | null, img: SniffedImage) => {
  if (e) e.stopPropagation();
  try {
    const { blob, ext } = await fetchImageBlob(img.src, convertToJpg.value);
    const filename = `image_${Date.now()}.${ext}`;
    triggerFileDownload(blob, filename);
  } catch {
    window.open(img.src, '_blank');
  }
};

// 批量打包下载
const handleBatchDownload = async () => {
  if (selectedImages.value.length === 0 || isDownloading.value) return;

  isDownloading.value = true;
  downloadProgress.value = `准备中 (0/${selectedImages.value.length})...`;

  try {
    const zipBlob = await downloadImagesAsZip(
      selectedImages.value,
      (curr, total) => {
        downloadProgress.value = `正在打包 (${curr}/${total})...`;
      },
      convertToJpg.value
    );

    const safeTitle = (pageTitle.value || 'images').replace(/[\\/:*?"<>|]/g, '_').slice(0, 30);
    const filename = `${safeTitle}-${Date.now()}.zip`;
    triggerFileDownload(zipBlob, filename);
  } catch (err) {
    console.error('打包下载失败', err);
  } finally {
    isDownloading.value = false;
    downloadProgress.value = '';
  }
};

onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown);

  // 从本地存储中拉取当前网页嗅探到的图片
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const data = await chrome.storage.local.get(['sniffer_gallery_images', 'sniffer_gallery_title']);
      if (data?.sniffer_gallery_images && Array.isArray(data.sniffer_gallery_images)) {
        images.value = data.sniffer_gallery_images.map((img: SniffedImage) => ({
          ...img,
          format: img.format || 'jpg',
          selected: img.selected ?? true
        }));
        pageTitle.value = data.sniffer_gallery_title || '网页大图';
        document.title = `${pageTitle.value} · 大图画廊工作台`;
      }
    }
  } catch (err) {
    console.error('读取图片数据失败', err);
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <div class="workbench-layout">
    <!-- 顶部工作台导航条 -->
    <header class="topbar">
      <div class="topbar-left">
        <div class="brand-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
        <div class="page-meta">
          <h2 class="page-title" :title="pageTitle">{{ pageTitle }}</h2>
          <span class="page-badge">共嗅探到 {{ images.length }} 张原图</span>
        </div>
      </div>

      <!-- 中间过滤器 -->
      <div class="topbar-filters">
        <!-- 格式过滤 -->
        <div class="format-group">
          <button
            v-for="fmt in formatList"
            :key="fmt"
            class="pill-btn"
            :class="{ 'pill-active': selectedFormat === fmt }"
            @click="selectedFormat = fmt"
          >
            {{ fmt.toUpperCase() }}
          </button>
        </div>

        <!-- 尺寸滑块 -->
        <div class="slider-group">
          <span class="slider-label">宽 &ge; {{ minWidth }}px</span>
          <input
            v-model.number="minWidth"
            type="range"
            min="0"
            max="1200"
            step="50"
            class="range-slider"
          />
        </div>

        <!-- WebP 转 JPG 开关 -->
        <label class="convert-toggle" title="将 WebP/AVIF 等现代格式自动转为更通用的 JPG 格式，方便 PS 导入">
          <input v-model="convertToJpg" type="checkbox" />
          <span>自动转为 JPG</span>
        </label>
      </div>

      <!-- 右侧操作与列数调节 -->
      <div class="topbar-right">
        <!-- 切换列数 -->
        <div class="columns-selector">
          <button
            v-for="col in [3, 4, 5, 6]"
            :key="col"
            class="col-btn"
            :class="{ 'col-active': columns === col }"
            @click="columns = col"
          >
            {{ col }}列
          </button>
        </div>

        <button class="select-all-btn" @click="toggleSelectAll">
          {{ isAllSelected ? '取消全选' : '全选当前' }}
        </button>

        <button
          class="download-main-btn"
          :disabled="selectedImages.length === 0 || isDownloading"
          @click="handleBatchDownload"
        >
          <svg v-if="!isDownloading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          <span>{{ isDownloading ? downloadProgress : `打包下载 ZIP (${selectedImages.length})` }}</span>
        </button>
      </div>
    </header>

    <!-- 主展示区 -->
    <main class="workbench-body">
      <div v-if="loading" class="empty-state">
        <div class="spinner" />
        <p>正在载入大图画廊...</p>
      </div>

      <div v-else-if="images.length === 0" class="empty-state">
        <p class="empty-title">暂未读取到网页嗅探图片</p>
        <p class="empty-desc">请在目标网页先点击扩展图标进行嗅探，再点击「大屏浏览」</p>
      </div>

      <div v-else-if="filteredImages.length === 0" class="empty-state">
        <p>没有符合当前尺寸或格式过滤条件的图片</p>
      </div>

      <!-- 网格大图流 -->
      <div
        v-else
        class="gallery-grid"
        :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }"
      >
        <div
          v-for="(img, idx) in filteredImages"
          :key="img.id"
          class="card"
          :class="{ 'card-active': img.selected }"
        >
          <!-- 缩略图容器 -->
          <div class="preview-wrap" @click="openLightbox(idx)">
            <img
              :src="img.src"
              loading="lazy"
              referrerpolicy="no-referrer"
              :alt="img.alt || 'image'"
            />

            <!-- 悬浮遮罩与操作 -->
            <div class="hover-overlay">
              <button class="action-circle zoom-btn" title="查看高清大图" @click.stop="openLightbox(idx)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
                </svg>
              </button>
              <button class="action-circle dl-btn" title="单独下载此图" @click.stop="(e) => downloadSingle(e, img)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
              </button>
            </div>

            <!-- 勾选状态徽章 -->
            <div class="checkbox-badge" :class="{ 'is-checked': img.selected }" @click.stop="toggleSelect(img)">
              <svg v-if="img.selected" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>

          <!-- 卡片信息栏 -->
          <div class="card-footer" @click="toggleSelect(img)">
            <span class="fmt-tag">{{ (img.format || 'IMG').toUpperCase() }}</span>
            <span class="dim-tag">{{ img.width ? `${img.width} × ${img.height}` : '高清原图' }}</span>
          </div>
        </div>
      </div>
    </main>

    <!-- 全屏沉浸式灯箱 Lightbox -->
    <div v-if="activeIndex !== null && filteredImages[activeIndex]" class="lightbox" @click="closeLightbox">
      <div class="lightbox-header" @click.stop>
        <span class="lightbox-counter">
          {{ activeIndex + 1 }} / {{ filteredImages.length }} · 
          {{ filteredImages[activeIndex].width ? `${filteredImages[activeIndex].width} × ${filteredImages[activeIndex].height}` : '高清原图' }} · 
          {{ (filteredImages[activeIndex].format || 'IMG').toUpperCase() }}
        </span>
        <div class="lightbox-actions">
          <button class="lb-btn" @click="downloadSingle(null, filteredImages[activeIndex])">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            下载此图
          </button>
          <a :href="filteredImages[activeIndex].src" target="_blank" class="lb-btn" rel="noreferrer">
            打开原图
          </a>
          <button class="lb-close" @click="closeLightbox">&times;</button>
        </div>
      </div>

      <!-- 灯箱主图 -->
      <div class="lightbox-stage" @click.stop>
        <img
          :src="filteredImages[activeIndex].src"
          referrerpolicy="no-referrer"
          alt="fullscreen image"
          class="lightbox-img"
        />
      </div>

      <!-- 左右翻页控制器 -->
      <button class="nav-arrow nav-left" title="上一张 (←)" @click.stop="prevImage">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <button class="nav-arrow nav-right" title="下一张 (→)" @click.stop="nextImage">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.workbench-layout {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  background-color: #0b1120;
  color: #f8fafc;
  overflow: hidden;
  user-select: none;
}

/* 顶部导航 */
.topbar {
  flex-shrink: 0;
  height: 64px;
  background-color: #0f172a;
  border-bottom: 1px solid #1e293b;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
}

.brand-logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
}

.brand-logo svg {
  width: 20px;
  height: 20px;
}

.page-meta {
  display: flex;
  flex-direction: column;
  max-width: 260px;
}

.page-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #f8fafc;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-badge {
  font-size: 11px;
  color: #ea580c;
  font-weight: 600;
}

/* 中部过滤 */
.topbar-filters {
  display: flex;
  align-items: center;
  gap: 16px;
}

.format-group {
  display: flex;
  gap: 6px;
  background: #1e293b;
  padding: 3px;
  border-radius: 6px;
}

.pill-btn {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-active {
  background: #ea580c;
  color: #ffffff;
}

.slider-group {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1e293b;
  padding: 6px 12px;
  border-radius: 6px;
}

.slider-label {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}

.range-slider {
  width: 90px;
  height: 4px;
  accent-color: #ea580c;
  cursor: pointer;
}

.convert-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #cbd5e1;
  cursor: pointer;
  background: #1e293b;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.convert-toggle input {
  accent-color: #ea580c;
  cursor: pointer;
}

/* 右侧操作 */
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.columns-selector {
  display: flex;
  background: #1e293b;
  padding: 3px;
  border-radius: 6px;
}

.col-btn {
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  border: none;
  background: transparent;
  color: #94a3b8;
  border-radius: 4px;
  cursor: pointer;
}

.col-active {
  background: #334155;
  color: #f8fafc;
}

.select-all-btn {
  background: transparent;
  border: 1px solid #334155;
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.select-all-btn:hover {
  background: #1e293b;
  border-color: #64748b;
}

.download-main-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #ea580c;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 8px rgba(234, 88, 12, 0.3);
}

.download-main-btn:hover:not(:disabled) {
  background: #c2410c;
}

.download-main-btn:disabled {
  background: #7c2d12;
  color: #fed7aa;
  cursor: not-allowed;
}

.download-main-btn svg {
  width: 16px;
  height: 16px;
}

/* 主画廊容器 */
.workbench-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 360px;
  color: #64748b;
  font-size: 14px;
  text-align: center;
}

.empty-title {
  font-size: 16px;
  font-weight: 600;
  color: #94a3b8;
  margin: 0 0 8px;
}

.empty-desc {
  font-size: 13px;
  color: #64748b;
  margin: 0;
  max-width: 420px;
  line-height: 1.5;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #1e293b;
  border-top-color: #ea580c;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 14px;
}

@keyframes spin {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}

.gallery-grid {
  display: grid;
  gap: 16px;
}

.card {
  background: #1e293b;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid #334155;
  transition: all 0.18s ease;
  display: flex;
  flex-direction: column;
}

.card:hover {
  border-color: #fdba74;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.card-active {
  border-color: #ea580c;
  box-shadow: 0 0 0 1px #ea580c, 0 8px 20px rgba(234, 88, 12, 0.15);
}

.preview-wrap {
  position: relative;
  width: 100%;
  height: 180px;
  background-color: #0f172a;
  background-image: linear-gradient(45deg, #1e293b 25%, transparent 25%),
                    linear-gradient(-45deg, #1e293b 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #1e293b 75%),
                    linear-gradient(-45deg, transparent 75%, #1e293b 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
}

.preview-wrap img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 0.25s ease;
}

.preview-wrap:hover img {
  transform: scale(1.04);
}

.hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
  backdrop-filter: blur(2px);
}

.preview-wrap:hover .hover-overlay {
  opacity: 1;
}

.action-circle {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(30, 41, 59, 0.85);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-circle:hover {
  background: #ea580c;
  transform: scale(1.1);
}

.action-circle svg {
  width: 18px;
  height: 18px;
}

.checkbox-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.7);
  border: 2px solid #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  cursor: pointer;
  z-index: 2;
  transition: all 0.15s ease;
}

.checkbox-badge.is-checked {
  background: #ea580c;
  border-color: #ea580c;
}

.checkbox-badge svg {
  width: 14px;
  height: 14px;
}

.card-footer {
  padding: 8px 12px;
  background: #0f172a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  cursor: pointer;
}

.fmt-tag {
  font-weight: 700;
  color: #ea580c;
}

.dim-tag {
  color: #94a3b8;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

/* 全屏灯箱 Lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(2, 6, 23, 0.92);
  backdrop-filter: blur(8px);
  display: flex;
  flex-direction: column;
}

.lightbox-header {
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.lightbox-counter {
  font-size: 13px;
  color: #cbd5e1;
  font-weight: 600;
}

.lightbox-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lb-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #1e293b;
  color: #f8fafc;
  border: 1px solid #334155;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s ease;
}

.lb-btn:hover {
  background: #334155;
}

.lb-btn svg {
  width: 14px;
  height: 14px;
}

.lb-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 28px;
  cursor: pointer;
  padding: 0 8px;
  line-height: 1;
}

.lb-close:hover {
  color: #ffffff;
}

.lightbox-stage {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
}

.lightbox-img {
  max-width: 90vw;
  max-height: 82vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
}

.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(30, 41, 59, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.nav-arrow:hover {
  background: #ea580c;
  transform: translateY(-50%) scale(1.1);
}

.nav-arrow svg {
  width: 24px;
  height: 24px;
}

.nav-left { left: 24px; }
.nav-right { right: 24px; }
</style>
