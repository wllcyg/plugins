<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { AppFooterLink } from '@100free/ui';
import { m } from '../../src/locales';
import { SniffedImage } from '../../src/types';
import { downloadImagesAsZip, triggerFileDownload, fetchImageBlob } from '../../src/core/downloader';

const images = ref<SniffedImage[]>([]);
const loading = ref(true);
const pageTitle = ref('');
const errorMsg = ref('');

// 筛选状态
const selectedFormat = ref<string>('all');
const minWidth = ref<number>(60);
const convertToJpg = ref(false); // 自动转为 JPG
const isDownloading = ref(false);
const downloadProgress = ref<string>('');

const formatList = ['all', 'jpg', 'png', 'webp', 'svg', 'gif'];

// 过滤后的图片
const filteredImages = computed(() => {
  return images.value.filter((img) => {
    if (!img) return false;
    const fmt = (img.format || 'jpg').toLowerCase();
    if (selectedFormat.value !== 'all' && fmt !== selectedFormat.value) {
      return false;
    }
    if (img.width > 0 && img.width < minWidth.value) {
      return false;
    }
    return true;
  });
});

// 已选中的图片
const selectedImages = computed(() => {
  return filteredImages.value.filter((img) => img.selected);
});

// 全选 / 取消全选
const isAllSelected = computed(() => {
  return filteredImages.value.length > 0 && filteredImages.value.every((img) => img.selected);
});

const toggleSelectAll = () => {
  const targetState = !isAllSelected.value;
  filteredImages.value.forEach((img) => {
    img.selected = targetState;
  });
};

const toggleImage = (img: SniffedImage) => {
  img.selected = !img.selected;
};

// 扫描当前 Tab 图片
const scanImages = async () => {
  loading.value = true;
  errorMsg.value = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      errorMsg.value = m.errNoTab;
      loading.value = false;
      return;
    }

    if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('edge://')) {
      errorMsg.value = m.errSystemPage;
      loading.value = false;
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCAN_PAGE_IMAGES' });
    if (response?.images) {
      images.value = response.images;
      pageTitle.value = response.pageTitle || m.defaultPageTitle;
    } else {
      images.value = [];
    }
  } catch (err) {
    errorMsg.value = m.errScanFailed;
  } finally {
    loading.value = false;
  }
};

// 在新标签页打开全屏画廊工作台
const openFullscreenGallery = async () => {
  if (images.value.length === 0) return;

  try {
    // 将数据存入 local storage 供全屏页面消费，深度拷贝去除 Vue 3 响应式代理 Proxy
    const rawImages = JSON.parse(JSON.stringify(images.value));
    await chrome.storage.local.set({
      sniffer_gallery_images: rawImages,
      sniffer_gallery_title: pageTitle.value || m.defaultGalleryTitle
    });

    // 打开全屏画廊
    await chrome.tabs.create({ url: chrome.runtime.getURL('gallery.html') });
    setTimeout(() => {
      window.close();
    }, 150);
  } catch (err) {
    console.error('打开画廊失败', err);
  }
};

// 单张下载
const downloadSingle = async (e: Event, img: SniffedImage) => {
  e.stopPropagation();
  try {
    const { blob, ext } = await fetchImageBlob(img.src, convertToJpg.value);
    const filename = `image_${Date.now()}.${ext}`;
    triggerFileDownload(blob, filename);
  } catch {
    window.open(img.src, '_blank');
  }
};

// 批量打包为 ZIP
const handleBatchDownload = async () => {
  if (selectedImages.value.length === 0 || isDownloading.value) return;

  isDownloading.value = true;
  downloadProgress.value = m.progressPreparing(selectedImages.value.length);

  try {
    const zipBlob = await downloadImagesAsZip(
      selectedImages.value,
      (curr, total) => {
        downloadProgress.value = m.progressPacking(curr, total);
      },
      convertToJpg.value
    );

    const safeTitle = (pageTitle.value || 'images').replace(/[\\/:*?"<>|]/g, '_').slice(0, 30);
    const filename = `${safeTitle}-${Date.now()}.zip`;
    triggerFileDownload(zipBlob, filename);
  } catch (err) {
    console.error('打包失败', err);
  } finally {
    isDownloading.value = false;
    downloadProgress.value = '';
  }
};

onMounted(() => {
  scanImages();
});
</script>

<template>
  <div class="sniffer-panel">
    <!-- 头部 -->
    <header class="header">
      <div class="title-row">
        <div class="logo-wrap">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
        <div class="title-meta">
          <h3 class="title">{{ m.extTitle }}</h3>
          <p class="subtitle">{{ loading ? m.scanningSubtitle : m.foundImagesSubtitle(images.length) }}</p>
        </div>
      </div>

      <div class="header-actions">
        <!-- 全屏大标签页工作台按钮 -->
        <button
          v-if="images.length > 0"
          class="workbench-btn"
          :title="m.openGalleryTooltip"
          @click="openFullscreenGallery"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
          <span>{{ m.openGalleryBtn }}</span>
        </button>

        <button class="refresh-btn" :title="m.rescanTooltip" @click="scanImages">
          <svg class="refresh-icon" :class="{ 'spin': loading }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>
    </header>

    <!-- 过滤器与控制栏 -->
    <div v-if="!loading && !errorMsg" class="toolbar">
      <!-- 格式药丸标签 -->
      <div class="format-pills">
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

      <!-- 尺寸过滤与全选 -->
      <div class="sub-filter">
        <div class="size-filter">
          <span class="filter-label">{{ m.minWidthLabel(minWidth) }}</span>
          <input
            v-model.number="minWidth"
            type="range"
            min="0"
            max="600"
            step="50"
            class="range-slider"
          />
        </div>

        <button class="select-all-btn" @click="toggleSelectAll">
          {{ isAllSelected ? m.deselectAll : m.selectAllFiltered }}
        </button>
      </div>
    </div>

    <!-- 错误与空状态 -->
    <div v-if="errorMsg" class="state-box error-box">
      <p>{{ errorMsg }}</p>
      <button class="retry-btn" @click="scanImages">{{ m.retryBtn }}</button>
    </div>

    <div v-else-if="loading" class="state-box loading-box">
      <div class="loading-spinner" />
      <p>{{ m.scanningBody }}</p>
    </div>

    <div v-else-if="filteredImages.length === 0" class="state-box empty-box">
      <p>{{ m.emptyFiltered }}</p>
    </div>

    <!-- 瀑布网格画廊 -->
    <main v-else class="gallery-grid">
      <div
        v-for="img in filteredImages"
        :key="img.id"
        class="img-card"
        :class="{ 'card-selected': img.selected }"
        @click="toggleImage(img)"
      >
        <div class="img-preview">
          <img
            :src="img.src"
            loading="lazy"
            referrerpolicy="no-referrer"
            :alt="img.alt || 'image'"
          />
          
          <!-- 勾选状态图标 -->
          <div class="check-badge" :class="{ 'checked': img.selected }">
            <svg v-if="img.selected" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <!-- 单张下载图标 -->
          <button class="download-btn" :title="m.downloadSingleTooltip" @click="(e) => downloadSingle(e, img)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>
        </div>

        <div class="img-meta">
          <span class="meta-format">{{ (img.format || 'IMG').toUpperCase() }}</span>
          <span class="meta-dim">{{ img.width ? `${img.width}×${img.height}` : m.originalTag }}</span>
        </div>
      </div>
    </main>

    <!-- 底部主操作区 -->
    <footer v-if="!loading && !errorMsg" class="footer">
      <div class="footer-left">
        <label class="convert-box" :title="m.convertJpgTooltip">
          <input v-model="convertToJpg" type="checkbox" />
          <span>{{ m.convertJpgShort }}</span>
        </label>
        <span class="stats-label">{{ m.selectedPrefix }} <strong>{{ selectedImages.length }}</strong>/{{ filteredImages.length }}</span>
      </div>

      <button
        class="batch-download-btn"
        :disabled="selectedImages.length === 0 || isDownloading"
        @click="handleBatchDownload"
      >
        <svg v-if="!isDownloading" class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        <span>{{ isDownloading ? downloadProgress : m.downloadZipCountBtn(selectedImages.length) }}</span>
      </button>
    </footer>
    <AppFooterLink plugin-id="image-sniffer" />
  </div>
</template>

<style scoped>
.sniffer-panel {
  width: 440px;
  height: 570px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: #ffffff;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  user-select: none;
  overflow: hidden;
}

.header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-wrap {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(234, 88, 12, 0.25);
}

.logo-icon {
  width: 18px;
  height: 18px;
}

.title-meta {
  display: flex;
  flex-direction: column;
}

.title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.subtitle {
  margin: 2px 0 0;
  font-size: 11px;
  color: #64748b;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workbench-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 9px;
  background: #fff7ed;
  color: #ea580c;
  border: 1px solid #fed7aa;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.workbench-btn:hover {
  background: #ffedd5;
  border-color: #fdba74;
}

.workbench-btn svg {
  width: 13px;
  height: 13px;
}

.refresh-btn {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px;
  cursor: pointer;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.refresh-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.refresh-icon {
  width: 15px;
  height: 15px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 工具栏 */
.toolbar {
  flex-shrink: 0;
  padding: 10px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.format-pills {
  display: flex;
  gap: 6px;
  overflow-x: auto;
}

.pill-btn {
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-active {
  background: #ea580c;
  color: #ffffff;
  border-color: #ea580c;
}

.sub-filter {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.size-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 10px;
  color: #64748b;
  font-weight: 600;
}

.range-slider {
  width: 80px;
  height: 4px;
  accent-color: #ea580c;
  cursor: pointer;
}

.select-all-btn {
  background: transparent;
  border: none;
  font-size: 11px;
  font-weight: 600;
  color: #ea580c;
  cursor: pointer;
}

.select-all-btn:hover {
  text-decoration: underline;
}

/* 状态框 */
.state-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #64748b;
  font-size: 12px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #f1f5f9;
  border-top-color: #ea580c;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

.retry-btn {
  margin-top: 10px;
  padding: 5px 12px;
  background: #1e293b;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
}

/* 画廊网格 */
.gallery-grid {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 14px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: max-content;
  gap: 10px;
  background: #ffffff;
}

.img-card {
  min-height: 112px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: #f8fafc;
  transition: all 0.15s ease;
  position: relative;
}

.img-card:hover {
  border-color: #fdba74;
  transform: translateY(-1px);
}

.card-selected {
  border-color: #ea580c;
  box-shadow: 0 0 0 1px #ea580c;
}

.img-preview {
  position: relative;
  width: 100%;
  height: 86px;
  flex-shrink: 0;
  background-color: #f1f5f9;
  background-image: linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
                    linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
                    linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.img-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.check-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  z-index: 2;
}

.check-badge.checked {
  background: #ea580c;
  border-color: #ea580c;
}

.check-badge svg {
  width: 12px;
  height: 12px;
}

.download-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.7);
  color: #ffffff;
  border: none;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.img-card:hover .download-btn {
  display: flex;
}

.download-btn svg {
  width: 12px;
  height: 12px;
}

.img-meta {
  flex: 1;
  padding: 4px 6px;
  background: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 9px;
  color: #64748b;
  border-top: 1px solid #f1f5f9;
}

.meta-format {
  font-weight: 700;
  color: #ea580c;
}

/* 底部操作区 */
.footer {
  flex-shrink: 0;
  padding: 10px 16px;
  border-top: 1px solid #f1f5f9;
  background: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.convert-box {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #475569;
  cursor: pointer;
}

.convert-box input {
  accent-color: #ea580c;
  cursor: pointer;
}

.stats-label {
  font-size: 11px;
  color: #64748b;
}

.stats-label strong {
  color: #ea580c;
}

.batch-download-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #ea580c;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.batch-download-btn:hover:not(:disabled) {
  background: #c2410c;
}

.batch-download-btn:disabled {
  background: #fdba74;
  cursor: not-allowed;
}

.btn-icon {
  width: 14px;
  height: 14px;
}
</style>
