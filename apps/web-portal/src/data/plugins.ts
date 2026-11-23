import tableIcon from '../../../ext-table-export/public/icons/icon-128.png?url';
import screenshotIcon from '../../../ext-screenshot/public/icons/icon-128.png?url';
import tablePreview from '../assets/table-export.webp';
import editorPreview from '../assets/screenshot-editor.webp';

export const plugins = [
  {
    id: 'table-export',
    name: '网页表格导出',
    category: '数据整理',
    icon: tableIcon,
    preview: tablePreview,
    previewWidth: 984,
    previewHeight: 308,
    previewAlt: '示例网页的销售表格上方显示 Excel、CSV 和复制按钮',
    headline: '网页里的数据，直接带进 Excel',
    summary: '把网页上的表格导出为 Excel 或 CSV，也可以复制后粘贴到现有工作表。',
    steps: ['打开含有表格的网页。', '把鼠标移到表格上，等待导出工具条出现。', '选择 Excel、CSV，或点复制。']
  },
  {
    id: 'screenshot',
    name: '网页长截图',
    category: '截图与标注',
    icon: screenshotIcon,
    preview: editorPreview,
    previewWidth: 1000,
    previewHeight: 800,
    previewAlt: '网页长截图编辑器显示标注工具、画布和保存按钮',
    headline: '从一段对话，到整页长图',
    summary: '截取整页、滚动面板或自选区域。在结果页加上标注、裁剪或遮挡，再导出 PNG。',
    steps: ['在普通网页上点击浏览器工具栏里的长截图图标。', '选择整页、滚动区域、当前位置、可见部分或框选。', '在结果页编辑图片，再复制、下载或打印。']
  }
];
