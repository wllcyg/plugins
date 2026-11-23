import { createApp, type App } from 'vue';
import { parseHtmlTable, exportToExcel, exportToCsv, copyTableToClipboard, type ParsedTableData } from '../src/utils/table-parser';
import TableActionBar from '../src/components/TableActionBar.vue';
import overlayStyles from '../src/styles/overlay.css?inline';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    let currentTable: HTMLTableElement | null = null;
    let overlayHost: HTMLElement | null = null;
    let shadowRoot: ShadowRoot | null = null;
    let mountContainer: HTMLElement | null = null;
    let vueApp: App | null = null;
    let hideTimer: number | null = null;
    let cachedData: ParsedTableData | null = null;

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

      // 将内联样式直接插入 Shadow DOM，确保绝不受宿主环境影响且 100% 渲染
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
      if (currentTable) {
        currentTable.style.outline = '';
      }
      currentTable = null;
      cachedData = null;
      removeCurrentApp();
    };

    const showOverlayForTable = (table: HTMLTableElement) => {
      if (currentTable === table) return;

      if (currentTable) {
        currentTable.style.outline = '';
      }

      currentTable = table;
      initOverlay();
      if (!overlayHost || !shadowRoot || !mountContainer) return;

      // 解析当前表格尺寸
      cachedData = parseHtmlTable(table);
      if (cachedData.rowCount === 0 || cachedData.colCount === 0) {
        hideOverlay();
        return;
      }

      // 高亮目标表格（精致的翡翠绿半透明边框与圆角）
      currentTable.style.outline = '2px dashed #10b981';
      currentTable.style.outlineOffset = '2px';

      // 计算悬浮工具条坐标：靠右并位于表格顶部外侧 40px
      const rect = table.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      const topPos = Math.max(8, rect.top + scrollY - 44);
      const barWidthEstimate = 310;
      const leftPos = Math.max(8, rect.right + scrollX - barWidthEstimate);

      overlayHost.style.display = 'block';
      overlayHost.style.top = `${topPos}px`;
      overlayHost.style.left = `${leftPos}px`;

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
          hideOverlay();
        }
      });

      vueApp.mount(mountContainer);
    };

    // 监听鼠标移动，平滑探测
    document.addEventListener('mouseover', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // 鼠标在操作栏内部时保持显示
      if (overlayHost && overlayHost.contains(target)) {
        if (hideTimer) clearTimeout(hideTimer);
        return;
      }

      const table = target.closest('table');
      if (table && table instanceof HTMLTableElement) {
        if (hideTimer) clearTimeout(hideTimer);
        showOverlayForTable(table);
      } else if (currentTable) {
        // 延时隐藏，方便鼠标平滑移动到操作栏上点击
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = window.setTimeout(() => {
          hideOverlay();
        }, 400);
      }
    });

    // 接收来自 Popup 的全页导出消息
    chrome.runtime?.onMessage?.addListener((message, _sender, sendResponse) => {
      if (message.type === 'SCAN_TABLES') {
        const tables = Array.from(document.querySelectorAll('table'));
        const list = tables.map((tbl, index) => {
          const parsed = parseHtmlTable(tbl);
          return {
            index,
            title: parsed.title || `表格 #${index + 1}`,
            rowCount: parsed.rowCount,
            colCount: parsed.colCount
          };
        });
        sendResponse({ success: true, tables: list });
      } else if (message.type === 'EXPORT_TABLE_BY_INDEX') {
        const tables = Array.from(document.querySelectorAll('table'));
        const tbl = tables[message.index];
        if (tbl) {
          const parsed = parseHtmlTable(tbl);
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

    console.log('[100Free Table Exporter] 页面表格嗅探器已启动');
  }
});
