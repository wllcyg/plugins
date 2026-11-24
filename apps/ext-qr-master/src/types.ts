export type QRMode = 'url' | 'text' | 'wifi' | 'vcard';

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export type DotType = 'rounded' | 'dots' | 'classy' | 'classy-rounded' | 'square' | 'extra-rounded';
export type CornerSquareType = 'dot' | 'square' | 'extra-rounded';
export type CornerDotType = 'dot' | 'square';

export interface ColorGradient {
  type: 'linear' | 'radial';
  rotation?: number;
  colorStops: { offset: number; color: string }[];
}

export interface QRStylingConfig {
  size: number;
  margin: number;
  ecc: ErrorCorrectionLevel;
  dotType: DotType;
  cornerSquareType: CornerSquareType;
  cornerDotType: CornerDotType;
  colorType: 'single' | 'gradient';
  singleColor: string;
  gradientStart: string;
  gradientEnd: string;
  gradientRotation: number;
  cornerColor: string;
  backgroundColor: string;
  logoUrl?: string;
  logoSize: number;
  logoMargin: number;
}

export interface WifiData {
  ssid: string;
  password?: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}

export interface VCardData {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  title?: string;
  website?: string;
  address?: string;
}

export interface DecodedResult {
  text: string;
  format?: string;
  timestamp: number;
  isUrl: boolean;
  wifiInfo?: WifiData;
}
