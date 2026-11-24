/**
 * 网页切后台防暂停（防摸鱼/挂机检测）注入机制
 * 通过拦截重写 Page Context 中的 document.hidden、visibilityState 与失焦事件
 */
export function injectAntiPause() {
  const scriptContent = `
    (function() {
      if (window.__100free_anti_pause_injected) return;
      window.__100free_anti_pause_injected = true;

      // 1. 深度劫持 document.hidden 恒为 false
      try {
        Object.defineProperty(document, 'hidden', {
          get: () => false,
          configurable: true
        });
        Object.defineProperty(document, 'webkitHidden', {
          get: () => false,
          configurable: true
        });
      } catch (e) {}

      // 2. 深度劫持 document.visibilityState 恒为 'visible'
      try {
        Object.defineProperty(document, 'visibilityState', {
          get: () => 'visible',
          configurable: true
        });
        Object.defineProperty(document, 'webkitVisibilityState', {
          get: () => 'visible',
          configurable: true
        });
      } catch (e) {}

      // 3. 拦截并消灭 visibilitychange 和 webkitvisibilitychange 事件
      const stopEvent = (e) => {
        if (e && e.stopImmediatePropagation) {
          e.stopImmediatePropagation();
        }
      };

      window.addEventListener('visibilitychange', stopEvent, true);
      document.addEventListener('visibilitychange', stopEvent, true);
      window.addEventListener('webkitvisibilitychange', stopEvent, true);
      document.addEventListener('webkitvisibilitychange', stopEvent, true);

      // 4. 拦截失焦事件 window.onblur，防止网页在切走时触发暂停
      window.addEventListener('blur', (e) => {
        // 如果是输入框聚焦离开则不拦截，仅防止全局 window 失去焦点触发视频暂停
        if (e.target === window || e.target === document) {
          stopEvent(e);
        }
      }, true);
    })();
  `;

  try {
    const script = document.createElement('script');
    script.textContent = scriptContent;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch (err) {
    console.warn('[VideoMaster] Inject anti-pause script failed:', err);
  }
}
