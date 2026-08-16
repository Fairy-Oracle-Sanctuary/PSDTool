export type Lang = 'en' | 'ja' | 'zh';

const translations: Record<Lang, Record<string, string>> = {
  en: {
    appTitle: 'PSDTool',
    openFile: 'Open a File',
    dropHint: 'You can also drag & drop a PSD file here.',
    options: 'Options',
    autoTrim: 'Auto Trim',
    layers: 'Layers',
    flipH: 'Flip Horizontal',
    flipV: 'Flip Vertical',
    sideV: 'V',
    sideH: 'H',
    maxPixelsSuffix: 'px max',
    savePng: '.png',
    maxPixelsTitle: 'Scale down the image to fit within this pixel count',
    prefixTitle: 'Filename prefix for downloads',
    numTitle: 'Sequential number for filenames',
    saveTitle: 'Save image as PNG',
    loadFailed: 'Failed to load PSD file: ',
  },
  ja: {
    appTitle: 'PSDTool',
    openFile: 'ファイルを選択して開く',
    dropHint: 'ここに PSD ファイルをドラッグ＆ドロップしても読み込めます。',
    options: 'オプション',
    autoTrim: '自動トリミング',
    layers: 'レイヤー',
    flipH: '左右反転',
    flipV: '上下反転',
    sideV: '縦',
    sideH: '横',
    maxPixelsSuffix: 'pxまで',
    savePng: '.png',
    maxPixelsTitle: 'このピクセル数に収まるように画像を縮小',
    prefixTitle: 'ダウンロードする時のファイル名の接頭辞',
    numTitle: 'ファイルの通し番号',
    saveTitle: 'PNG 形式で画像を保存',
    loadFailed: 'PSD ファイルの読み込みに失敗しました: ',
  },
  zh: {
    appTitle: 'PSDTool',
    openFile: '选择文件打开',
    dropHint: '也可以将 PSD 文件拖放到此处加载。',
    options: '选项',
    autoTrim: '自动裁剪',
    layers: '图层',
    flipH: '左右翻转',
    flipV: '上下翻转',
    sideV: '纵',
    sideH: '横',
    maxPixelsSuffix: 'px以内',
    savePng: '.png',
    maxPixelsTitle: '缩放图像以适应此像素数',
    prefixTitle: '下载文件名的前缀',
    numTitle: '文件序号',
    saveTitle: '保存为 PNG 图像',
    loadFailed: '加载 PSD 文件失败: ',
  },
};

function detectLang(): Lang {
  const saved = localStorage.getItem('psdtool-lang');
  if (saved === 'en' || saved === 'ja' || saved === 'zh') return saved;
  const nav = (navigator.language || 'en').toLowerCase();
  if (nav.startsWith('ja')) return 'ja';
  if (nav.startsWith('zh')) return 'zh';
  return 'en';
}

let currentLang: Lang = detectLang();

export function t(key: string): string {
  return translations[currentLang]?.[key] ?? translations.en[key] ?? key;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  localStorage.setItem('psdtool-lang', lang);
  document.title = t('appTitle');
}

export function getLang(): Lang {
  return currentLang;
}

export const allLangs: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
];

// 初始化页面标题
document.title = t('appTitle');
