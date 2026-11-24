import QRCodeStyling, { Options } from 'qr-code-styling';
import { QRStylingConfig, WifiData, VCardData } from '../types';

/**
 * 格式化 WiFi 连接协议字符串
 * 协议规范: WIFI:S:<SSID>;T:<WPA|WEP|nopass>;P:<PASSWORD>;H:<true|false>;;
 */
export function formatWifiString(wifi: WifiData): string {
  const escapeVal = (v: string) => v.replace(/([\\;,:"])/g, '\\$1');
  const ssid = escapeVal(wifi.ssid || '');
  const enc = wifi.encryption || 'WPA';
  const pass = wifi.password ? escapeVal(wifi.password) : '';
  const hidden = wifi.hidden ? 'H:true;' : '';
  return `WIFI:S:${ssid};T:${enc};P:${pass};${hidden};`;
}

/**
 * 格式化标准 vCard 电子名片协议
 */
export function formatVCardString(vcard: VCardData): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];
  if (vcard.name) lines.push(`FN:${vcard.name}`, `N:${vcard.name};;;;`);
  if (vcard.phone) lines.push(`TEL;TYPE=CELL:${vcard.phone}`);
  if (vcard.email) lines.push(`EMAIL:${vcard.email}`);
  if (vcard.company) lines.push(`ORG:${vcard.company}`);
  if (vcard.title) lines.push(`TITLE:${vcard.title}`);
  if (vcard.website) lines.push(`URL:${vcard.website}`);
  if (vcard.address) lines.push(`ADR;TYPE=WORK:;;${vcard.address};;;;`);
  lines.push('END:VCARD');
  return lines.join('\n');
}

/**
 * 根据美化配置构建 QRCodeStyling 实例
 */
export function createQRInstance(content: string, config: QRStylingConfig): QRCodeStyling {
  const dotsOptions: any = {
    type: config.dotType
  };

  if (config.colorType === 'gradient') {
    dotsOptions.gradient = {
      type: 'linear',
      rotation: (config.gradientRotation * Math.PI) / 180,
      colorStops: [
        { offset: 0, color: config.gradientStart },
        { offset: 1, color: config.gradientEnd }
      ]
    };
  } else {
    dotsOptions.color = config.singleColor;
  }

  const cornersSquareOptions: any = {
    type: config.cornerSquareType,
    color: config.cornerColor || config.singleColor
  };

  const cornersDotOptions: any = {
    type: config.cornerDotType,
    color: config.cornerColor || config.singleColor
  };

  const options: Options = {
    width: config.size,
    height: config.size,
    data: content || 'https://github.com',
    margin: config.margin,
    qrOptions: {
      typeNumber: 0,
      mode: 'Byte',
      errorCorrectionLevel: config.ecc
    },
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: config.logoSize,
      margin: config.logoMargin,
      crossOrigin: 'anonymous'
    },
    dotsOptions,
    cornersSquareOptions,
    cornersDotOptions,
    backgroundOptions: {
      color: config.backgroundColor
    }
  };

  if (config.logoUrl) {
    options.image = config.logoUrl;
  }

  return new QRCodeStyling(options);
}

/**
 * 将 QRCode 导出为指定格式的 Blob
 */
export async function exportQRCodeBlob(qr: QRCodeStyling, format: 'png' | 'svg' = 'png'): Promise<Blob> {
  const rawData = await qr.getRawData(format);
  if (rawData instanceof Blob) {
    return rawData;
  }
  // 兜底转换为 Blob
  return new Blob([rawData as any], { type: format === 'svg' ? 'image/svg+xml' : 'image/png' });
}

/**
 * 将二维码图片复制到系统剪贴板 (PNG)
 */
export async function copyQRToClipboard(qr: QRCodeStyling): Promise<void> {
  const blob = await exportQRCodeBlob(qr, 'png');
  const item = new ClipboardItem({ 'image/png': blob });
  await navigator.clipboard.write([item]);
}
