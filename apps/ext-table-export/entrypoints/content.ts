import { createApp, type App } from 'vue';
import { ExtensionStorage } from '@100free/core';
import {
  findLogicalTableRoot,
  parseTableOrContainer,
  exportToExcel,
  exportToCsv,
  copyTableToClipboard,
  type ParsedTableData
} from '../src/utils/table-parser';
import TableActionBar from '../src/components/TableActionBar.vue';
import overlayStyles from '../src/styles/overlay.css?inline';

const STORAGE_KEY_HOVER = 'table_hover_detector_enabled';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    let isHoverEnabled = true;
    let currentTableRoot: HTMLElement | null = null;
    let overlayHost: HTMLElement | null = null;
    let shadowRoot: ShadowRoot | null = null;
    let mountContainer: HTMLElement | null = null;
    let vueApp: App | null = null;
    let hideTimer: number | null = null;
    let cachedData: ParsedTableData | null = null;

    // 初始化与监听悬停功能启用状态
    ExtensionStorage.get<boolean>(STORAGE_KEY_HOVER, true).then((enabled) => {
      isHoverEnabled = enabled !== false;
    });

    ExtensionStorage.watch<boolean>(STORAGE_KEY_HOVER, (enabled) => {
      isHoverEnabled = enabled !== false;
      if (!isHoverEnabled) {
        hideOverlay();
      }
    });

    // 创建高亮覆盖框与操作栏挂载点
    const initOverlay = () => {
      if (overlayHost) return;

      overlayHost = document.createElement('div');
      overlayHost.id = '__100free_table_overlay__';
      overlayHost.style.position = 'absolute';
      overlayHost.style.zIndex = '2147483647';
      overlayHost.style.pointerEvents = 'auto';
      overlayHost.style.display = 'none';

      shadowRoot = overlayHost.attachShadow({ mode: 'open' });

      const styleEl = document.createElement('style');
      styleEl.textContent = overlayStyles;
      shadowRoot.appendChild(styleEl);

      mountContainer = document.createElement('div');
      shadowRoot.appendChild(mountContainer);

      document.body.appendChild(overlayHost);
    };

    const removeCurrentApp = () => {
      if (vueApp) {
        vueApp.unmount();
        vueApp = null;
      }
    };

    const hideOverlay = () => {
      if (overlayHost) {
        overlayHost.style.display = 'none';
      }
      if (currentTableRoot) {
        currentTableRoot.style.outline = '';
      }
      currentTableRoot = null;
      cachedData = null;
      removeCurrentApp();
    };

    // 强状态封印算法：彻底杜绝隐藏后重新激活
    const isTableMuted = (el: HTMLElement): boolean => {
      const until = Number(el.dataset?.tableExportMutedUntil || 0);
      if (Date.now() < until) return true;
      const ancestor = el.closest<HTMLElement>('[data-table-export-muted-until]');
      if (ancestor) {
        return Date.now() < Number(ancestor.dataset?.tableExportMutedUntil || 0);
      }
      return false;
    };

    const muteTable = (el: HTMLElement, durationMs = 20000) => {
      const until = String(Date.now() + durationMs);
      el.dataset.tableExportMutedUntil = until;
      const wrapper = el.closest<HTMLElement>('.ant-table-wrapper, .ant-table, .el-table');
      if (wrapper) {
        wrapper.dataset.tableExportMutedUntil = until;
      }
    };

    // 重新计算并更新悬浮栏位置
    const updateOverlayPosition = (tableRoot: HTMLElement) => {
      if (!overlayHost) return;
      const rect = tableRoot.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      const barHeight = 44;
      const minTop = rect.top + scrollY - barHeight;
      const stickyTop = scrollY + 12;
      const maxTop = rect.bottom + scrollY - barHeight - 10;

      const topPos = Math.min(Math.max(minTop, stickyTop), maxTop);
      const barWidthEstimate = 310;
      const leftPos = Math.max(8, rect.right + scrollX - barWidthEstimate);

      overlayHost.style.top = `${topPos}px`;
      overlayHost.style.left = `${leftPos}px`;
    };

    const showOverlayForTable = (tableRoot: HTMLElement) => {
      if (currentTableRoot === tableRoot) return;

      if (currentTableRoot) {
        currentTableRoot.style.outline = '';
      }

      currentTableRoot = tableRoot;
      initOverlay();
      if (!overlayHost || !shadowRoot || !mountContainer) return;

      // 解析表格尺寸与内容 (智能合并复合结构)
      cachedData = parseTableOrContainer(tableRoot);
      if (cachedData.rowCount === 0 || cachedData.colCount === 0) {
        hideOverlay();
        return;
      }

      // 高亮目标表格或大容器
      currentTableRoot.style.outline = '2px dashed #10b981';
      currentTableRoot.style.outlineOffset = '2px';

      overlayHost.style.display = 'block';
      updateOverlayPosition(tableRoot);

      removeCurrentApp();

      // 挂载 Vue 悬停条
      mountContainer.innerHTML = '';
      vueApp = createApp(TableActionBar, {
        rowCount: cachedData.rowCount,
        colCount: cachedData.colCount,
        onExportExcel: () => {
          if (cachedData) exportToExcel(cachedData);
        },
        onExportCsv: () => {
          if (cachedData) exportToCsv(cachedData);
        },
        onCopy: () => {
          if (cachedData) copyTableToClipboard(cachedData);
        },
        onClose: () => {
          if (currentTableRoot) {
            muteTable(currentTableRoot, 20000); // 强锁定 20 秒
          }
          hideOverlay();
        },
        onDisableFeature: async () => {
          await ExtensionStorage.set(STORAGE_KEY_HOVER, false);
          hideOverlay();
        }
      });

      vueApp.mount(mountContainer);
    };

    // 监听鼠标移动，支持 SPA 动态元素智能嗅探
    document.addEventListener('mouseover', (e: MouseEvent) => {
      if (!isHoverEnabled) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      // 鼠标在操作栏内部时保持显示
      if (overlayHost && overlayHost.contains(target)) {
        if (hideTimer) clearTimeout(hideTimer);
        return;
      }

      // 智能寻找逻辑实体 (单体 table 或 AntD/Element 等大容器)
      const tableRoot = findLogicalTableRoot(target);

      // 若表格处于静默冷却期，绝对阻断，绝不唤起
      if (!tableRoot || !tableRoot.isConnected || isTableMuted(tableRoot)) {
        if (currentTableRoot && !tableRoot) {
          if (hideTimer) clearTimeout(hideTimer);
          hideTimer = window.setTimeout(() => hideOverlay(), 400);
        }
        return;
      }

      if (hideTimer) clearTimeout(hideTimer);
      showOverlayForTable(tableRoot);
    });

    // 页面滚动时实时更新吸顶位置
    window.addEventListener('scroll', () => {
      if (currentTableRoot && overlayHost && overlayHost.style.display !== 'none') {
        if (!currentTableRoot.isConnected) {
          hideOverlay();
          return;
        }
        updateOverlayPosition(currentTableRoot);
      }
    }, { passive: true });

    // 接收来自 Popup 的全页导出消息
    chrome.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
      if (message.type === 'SCAN_TABLES') {
        // 扫描页面所有逻辑表格，避免 AntD 一个大表格被重复列出为多个碎片
        const rawTables = Array.from(document.querySelectorAll('table'));
        const roots = new Set<HTMLElement>();
        rawTables.forEach((t) => {
          const root = findLogicalTableRoot(t);
          if (root) roots.add(root);
        });

        const list = Array.from(roots).map((r, index) => {
          const parsed = parseTableOrContainer(r);
          return {
            index,
            title: parsed.title || `表格 #${index + 1}`,
            rowCount: parsed.rowCount,
            colCount: parsed.colCount
          };
        });
        sendResponse({ success: true, tables: list });
      } else if (message.type === 'EXPORT_TABLE_BY_INDEX') {
        const rawTables = Array.from(document.querySelectorAll('table'));
        const roots = Array.from(new Set(rawTables.map((t) => findLogicalTableRoot(t)).filter((t): t is HTMLElement => !!t)));
        const targetRoot = roots[message.index];
        if (targetRoot) {
          const parsed = parseTableOrContainer(targetRoot);
          if (message.format === 'csv') {
            exportToCsv(parsed);
          } else {
            exportToExcel(parsed);
          }
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: '未找到指定表格' });
        }
      }
      return true;
    });

    console.log('[100Free Table Exporter] 页面表格嗅探器就绪 (已支持 AntD/Element 复合表格兼容)');
  }
});
