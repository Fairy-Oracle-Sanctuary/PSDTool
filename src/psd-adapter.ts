import type { Psd, Layer as AgLayer } from 'ag-psd';
import type { Root, Layer } from './types';

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

let seqCounter = 0;

function adaptLayer(layer: AgLayer, bounds: Bounds): Layer {
  const seqID = seqCounter++;
  const children = (layer.children ?? []).map((c) => adaptLayer(c, bounds));

  // 图层自身的像素边界 (R1)：叶子层用 PSD 提供的 left/top/right/bottom；
  // 文件夹层 PSD 通常返回 0x0，需与所有后代叶子层的并集做 union 作为其 buffer 范围，
  // 否则子图层无法绘制到父 buffer 上 (与原 PSDTool parse.go 一致)。
  let minX = layer.left ?? 0;
  let minY = layer.top ?? 0;
  let maxX = layer.right ?? 0;
  let maxY = layer.bottom ?? 0;
  let hasOwnBounds = (maxX - minX) > 0 && (maxY - minY) > 0;

  if (children.length) {
    for (const c of children) {
      if (c.Width <= 0 || c.Height <= 0) continue;
      minX = Math.min(minX, c.X);
      minY = Math.min(minY, c.Y);
      maxX = Math.max(maxX, c.X + c.Width);
      maxY = Math.max(maxY, c.Y + c.Height);
      hasOwnBounds = true;
    }
  }

  const x = minX;
  const y = minY;
  const width = hasOwnBounds ? maxX - minX : 0;
  const height = hasOwnBounds ? maxY - minY : 0;

  if (width > 0 && height > 0) {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x + width);
    bounds.maxY = Math.max(bounds.maxY, y + height);
  }

  const folder = children.length > 0;

  // 图层 canvas：ag-psd 的 HTMLCanvasElement → CanvasRenderingContext2D
  let canvas: CanvasRenderingContext2D | undefined;
  if (layer.canvas) {
    const ctx = layer.canvas.getContext('2d');
    if (ctx) canvas = ctx;
  }

  // 蒙版 (R4)：缺画布时按 defaultColor 合成全白/全黑
  let mask: CanvasRenderingContext2D | undefined;
  let maskX = 0;
  let maskY = 0;
  let maskWidth = 0;
  let maskHeight = 0;
  let maskDefaultColor = 0;
  const m = layer.mask;
  if (m && !m.disabled) {
    maskX = m.left ?? 0;
    maskY = m.top ?? 0;
    maskWidth = (m.right ?? 0) - maskX;
    maskHeight = (m.bottom ?? 0) - maskY;
    maskDefaultColor = m.defaultColor ?? 0;
    if (m.canvas) {
      const mctx = m.canvas.getContext('2d');
      if (mctx) mask = mctx;
    } else if (maskWidth > 0 && maskHeight > 0) {
      const c = document.createElement('canvas');
      c.width = maskWidth;
      c.height = maskHeight;
      const mctx = c.getContext('2d');
      if (mctx) {
        mctx.fillStyle = maskDefaultColor === 255 ? '#ffffff' : '#000000';
        mctx.fillRect(0, 0, maskWidth, maskHeight);
        mask = mctx;
      }
    }
  }

  return {
    SeqID: seqID,
    Name: layer.name ?? '',
    Folder: folder,
    FolderOpen: true,
    Visible: !layer.hidden,
    BlendMode: (layer.blendMode ?? 'normal').replace(' ', '-'),
    Opacity: Math.round((layer.opacity ?? 1) * 255),
    Clipping: !!layer.clipping,
    BlendClippedElements: true,
    X: x,
    Y: y,
    Width: width,
    Height: height,
    Canvas: canvas,
    MaskX: maskX,
    MaskY: maskY,
    MaskWidth: maskWidth,
    MaskHeight: maskHeight,
    MaskDefaultColor: maskDefaultColor,
    Mask: mask,
    Children: children,
  };
}

export function adaptPsd(psd: Psd): Root {
  seqCounter = 0;
  const bounds: Bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
  const children = (psd.children ?? []).map((c) => adaptLayer(c, bounds));

  // 内容范围 (R1)：未找到内容时回退到画布尺寸
  let cx = 0;
  let cy = 0;
  let cw = psd.width;
  let ch = psd.height;
  if (bounds.minX !== Infinity) {
    cx = bounds.minX;
    cy = bounds.minY;
    cw = bounds.maxX - bounds.minX;
    ch = bounds.maxY - bounds.minY;
  }

  return {
    CanvasWidth: psd.width,
    CanvasHeight: psd.height,
    X: cx,
    Y: cy,
    Width: cw,
    Height: ch,
    Children: children,
    Hash: '',
    PFV: '',
    PFVModDate: 0,
    Readme: '',
  };
}
