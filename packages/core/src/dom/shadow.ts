export interface ShadowContainerOptions {
  id: string;
  mode?: 'open' | 'closed';
  styleText?: string;
}

/**
 * 创建并注入宿主页面的 Shadow DOM 容器，实现严格样式隔离
 */
export function createShadowContainer(options: ShadowContainerOptions): {
  hostElement: HTMLElement;
  shadowRoot: ShadowRoot;
  mountPoint: HTMLElement;
} {
  const { id, mode = 'open', styleText = '' } = options;

  let hostElement = document.getElementById(id);
  if (!hostElement) {
    hostElement = document.createElement('div');
    hostElement.id = id;
    document.body.appendChild(hostElement);
  }

  const shadowRoot = hostElement.shadowRoot || hostElement.attachShadow({ mode });

  let styleElement = shadowRoot.querySelector('style[data-shadow-style]');
  if (!styleElement) {
    styleElement = document.createElement('style');
    styleElement.setAttribute('data-shadow-style', 'true');
    shadowRoot.appendChild(styleElement);
  }
  if (styleText) {
    styleElement.textContent = styleText;
  }

  let mountPoint = shadowRoot.querySelector<HTMLElement>('#shadow-mount-point');
  if (!mountPoint) {
    mountPoint = document.createElement('div');
    mountPoint.id = 'shadow-mount-point';
    shadowRoot.appendChild(mountPoint);
  }

  return { hostElement, shadowRoot, mountPoint };
}

