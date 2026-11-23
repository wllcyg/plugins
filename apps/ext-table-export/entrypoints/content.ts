import { createApp, type App } from 'vue';
import { parseHtmlTable, exportToExcel, exportToCsv, copyTableToClipboard, type ParsedTableData } from '../src/utils/table-parser';
import TableActionBar from '../src/components/TableActionBar.vue';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    let currentTable: HTMLTableElement | null = null;
    let overlayHost: HTMLElement | null = null;
    let shadowRoot: ShadowRoot | null = null;
    let vueApp: App | null = null;
    let hideTimer: number | null = null;
    let cachedData: ParsedTableData | null = null;

    // 创建高亮覆盖框与操作栏挂载点
    const initOverlay = () => {
      if (overlayHost) return;

      overlayHost = document.createElement('div');
      overlayHost.id = '__100free_table_overlay__';
      overlayHost.style.position = 'absolute';
      overlayHost.style.zIndex = '2147483646';
      overlayHost.style.pointerEvents = 'none';
      overlayHost.style.transition = 'all 0.12s ease';
      overlayHost.style.display = 'none';

      shadowRoot = overlayHost.attachShadow({ mode: 'open' });
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
      if (!overlayHost || !shadowRoot) return;

      // 解析当前表格尺寸
      cachedData = parseHtmlTable(table);
      if (cachedData.rowCount === 0 || cachedData.colCount === 0) {
        hideOverlay();
        return;
      }

      // 高亮目标表格
      currentTable.style.outline = '2px dashed #10b981';
      currentTable.style.outlineOffset = '2px';

      // 定位操作栏到表格右上角上方
      const rect = table.getBoundingClientRect();
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      overlayHost.style.display = 'block';
      overlayHost.style.top = `${rect.top + scrollY - 38}px`;
      overlayHost.style.left = `${rect.left + scrollX + Math.max(0, rect.width - 260)}px`;
      overlayHost.style.pointerEvents = 'auto';

      removeCurrentApp();

      // 挂载 Vue 悬停条
      const container = document.createElement('div');
      shadowRoot.innerHTML = '';
      shadowRoot.appendChild(container);

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

      vueApp.mount(container);
    };

    // 鼠标在页面移动时探测表格
    document.addEventListener('mouseover', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // 如果鼠标在操作栏内部，取消隐藏倒计时
      if (overlayHost && overlayHost.contains(target)) {
        if (hideTimer) clearTimeout(hideTimer);
        return;
      }

      const table = target.closest('table');
      if (table && table instanceof HTMLTableElement) {
        if (hideTimer) clearTimeout(hideTimer);
        showOverlayForTable(table);
      } else if (currentTable) {
        // 延时隐藏，方便鼠标平滑移动到操作栏上
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = window.setTimeout(() => {
          hideOverlay();
        }, 300);
      }
    });

    // 接收来自 Popup 的指令（如扫描页面所有表格并批量导出）
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

