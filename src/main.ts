import { readPsd } from 'ag-psd';
import { adaptPsd } from './psd-adapter';
import { Renderer, FlipType as RFlipType } from './renderer';
import { LayerTree, FlipType as LFlipType } from './layertree';
import { createFileOpenUI } from './ui/file-open';
import { createMainView, MainViewElements } from './ui/main-view';
import { loadPendingFile, clearPendingFile } from './ui/pending-file';
import { saveDirHandle, getDirHandle, clearDirHandle, supportsDirPicker } from './ui/save-dir';
import { t } from './i18n';

class App {
  private renderer!: Renderer;
  private layerRoot!: LayerTree;
  private view!: MainViewElements;
  private autoTrim = false;
  private redrawTimer: number | null = null;
  private currentFileName = '';
  private saveDir: FileSystemDirectoryHandle | null = null;

  async start(): Promise<void> {
    const pending = await loadPendingFile();
    if (pending) {
      await clearPendingFile();
      await this.loadFile(pending.file, pending.autoTrim);
      return;
    }
    const app = document.getElementById('app');
    if (!app) throw new Error('#app not found');
    app.innerHTML = '';
    app.appendChild(createFileOpenUI((r) => this.loadFile(r.file, r.autoTrim)));
  }

  private async loadFile(file: File, autoTrim: boolean): Promise<void> {
    this.autoTrim = autoTrim;
    this.currentFileName = file.name;
    const buf = await file.arrayBuffer();
    let psd;
    try {
      psd = readPsd(buf);
    } catch (e) {
      alert(t('loadFailed') + e);
      return;
    }
    const root = adaptPsd(psd);
    this.renderer = new Renderer(root);
    this.view = createMainView();
    // 保存文件名前缀：用 PSD 文件名（去扩展名）+ 下划线
    this.view.seqDlPrefix.value = file.name.replace(/\.[^.]+$/, '') + '_';
    // 恢复该文件的序号
    const savedNum = localStorage.getItem('psdtool-seqnum:' + file.name);
    this.view.seqDlNum.value = savedNum ?? '0';
    this.layerRoot = new LayerTree(false, this.view.layerTreeEl, root);

    // 关联 renderer Node 的 visible 状态到 layertree Node 的 checked
    const rNodes = this.renderer.nodes;
    const lNodes = this.layerRoot.nodes;
    for (const key in rNodes) {
      if (!rNodes.hasOwnProperty(key)) continue;
      const r = rNodes[key];
      const l = lNodes[key];
      if (l) r.getVisibleState = () => l.checked;
    }

    // 图层勾选 → 重绘
    this.view.layerTreeEl.addEventListener('change', (e) => {
      if (e.target instanceof HTMLInputElement) {
        this.scheduleRedraw();
      }
    });
    this.view.flipX.addEventListener('change', () => this.scheduleRedraw());
    this.view.flipY.addEventListener('change', () => this.scheduleRedraw());
    this.view.fixedSide.addEventListener('change', () => this.scheduleRedraw());
    this.view.maxPixels.addEventListener('input', () => this.scheduleRedraw());
    this.view.seqDl.addEventListener('click', () => this.save());

    // 描边控件
    this.view.outlineEnabled.addEventListener('change', () => this.scheduleRedraw());
    this.view.outlineColor.addEventListener('input', () => this.scheduleRedraw());
    this.view.outlineWidth.addEventListener('input', () => this.scheduleRedraw());
    this.view.outlineSmooth.addEventListener('change', () => this.scheduleRedraw());
    this.view.fillEnabled.addEventListener('change', () => this.scheduleRedraw());
    this.view.fillColor.addEventListener('input', () => this.scheduleRedraw());

    // 保存路径按钮
    if (supportsDirPicker()) {
      this.view.saveDirBtn.style.display = '';
      this.view.saveDirBtn.textContent = '\u{1F4C2} 下载';
      this.view.saveDirBtn.title = '默认保存到下载文件夹，点击选择其他路径，右键恢复默认';
      this.view.saveDirBtn.classList.remove('btn-success');
      this.view.saveDirBtn.addEventListener('click', () => this.chooseSaveDir());
      this.view.saveDirBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.saveDir = null;
        clearDirHandle(file.name);
        this.view.saveDirBtn.textContent = '\u{1F4C2} 下载';
        this.view.saveDirBtn.classList.remove('btn-success');
      });
      // 恢复已存的目录
      getDirHandle(file.name).then((h) => {
        if (h) {
          this.saveDir = h;
          this.updateSaveDirButton(h);
        }
      });
    } else {
      this.view.saveDirBtn.style.display = 'none';
    }

    const app = document.getElementById('app');
    if (!app) throw new Error('#app not found');
    app.innerHTML = '';
    app.appendChild(this.view.root);

    this.redraw();
  }

  private scheduleRedraw(): void {
    if (this.redrawTimer !== null) {
      window.clearTimeout(this.redrawTimer);
    }
    this.redrawTimer = window.setTimeout(() => {
      this.redrawTimer = null;
      this.redraw();
    }, 50);
  }

  private redraw(): void {
    this.view.seqDl.disabled = true;
    this.render((progress, canvas) => {
      const displayScale = 0.7;
      this.view.previewBackground.style.width = (canvas.width * displayScale) + 'px';
      this.view.previewBackground.style.height = (canvas.height * displayScale) + 'px';
      this.view.seqDl.disabled = progress !== 1;
      setTimeout(() => {
        this.view.previewCanvas.width = canvas.width;
        this.view.previewCanvas.height = canvas.height;
        this.view.previewCanvas.style.width = (canvas.width * displayScale) + 'px';
        this.view.previewCanvas.style.height = (canvas.height * displayScale) + 'px';
        const ctx = this.view.previewCanvas.getContext('2d');
        if (!ctx) return;
        let src: HTMLCanvasElement = canvas;
        if (this.view.fillEnabled.checked) {
          src = this.applyFill(canvas);
        }
        if (this.view.outlineEnabled.checked) {
          this.applyOutline(ctx, src);
        } else {
          ctx.drawImage(src, 0, 0);
        }
      }, 0);
    });
    this.layerRoot.updateClass();
  }

  private applyFill(src: HTMLCanvasElement): HTMLCanvasElement {
    const w = src.width;
    const h = src.height;
    const color = this.view.fillColor.value;
    const result = document.createElement('canvas');
    result.width = w;
    result.height = h;
    const ctx = result.getContext('2d');
    if (!ctx) return src;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    return result;
  }

  private applyOutline(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement): void {
    const w = src.width;
    const h = src.height;
    const color = this.view.outlineColor.value;
    const radius = parseInt(this.view.outlineWidth.value, 10) || 3;

    const srcCtx = src.getContext('2d');
    if (!srcCtx) return;
    const srcData = srcCtx.getImageData(0, 0, w, h);
    const srcAlpha = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      srcAlpha[i] = srcData.data[i * 4 + 3];
    }

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    const temp = new Uint8Array(w * h);
    const dilated = new Uint8Array(w * h);

    if (this.view.outlineSmooth.checked) {
      // 圆形核膨胀：逐像素在 radius 半径内取最大 alpha
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let max = 0;
          const s = Math.max(0, x - radius);
          const e = Math.min(w - 1, x + radius);
          for (let xx = s; xx <= e; xx++) {
            const dx = xx - x;
            const remain = radius * radius - dx * dx;
            if (remain < 0) continue;
            const ry = Math.floor(Math.sqrt(remain));
            for (let yy = Math.max(0, y - ry); yy <= Math.min(h - 1, y + ry); yy++) {
              if (srcAlpha[yy * w + xx] > max) max = srcAlpha[yy * w + xx];
            }
          }
          dilated[y * w + x] = max;
        }
      }
    } else {
      // 可分离形态学膨胀：先水平后垂直（方形核，速度快）
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let max = 0;
          const s = Math.max(0, x - radius);
          const e = Math.min(w - 1, x + radius);
          for (let xx = s; xx <= e; xx++) {
            if (srcAlpha[y * w + xx] > max) max = srcAlpha[y * w + xx];
          }
          temp[y * w + x] = max;
        }
      }
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
          let max = 0;
          const s = Math.max(0, y - radius);
          const e = Math.min(h - 1, y + radius);
          for (let yy = s; yy <= e; yy++) {
            if (temp[yy * w + x] > max) max = temp[yy * w + x];
          }
          dilated[y * w + x] = max;
        }
      }
    }

    // 描边 = 膨胀 - 原始 alpha
    const outData = new ImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const outlineAlpha = Math.max(0, dilated[i] - srcAlpha[i]);
      if (outlineAlpha > 0) {
        outData.data[i * 4] = r;
        outData.data[i * 4 + 1] = g;
        outData.data[i * 4 + 2] = b;
        outData.data[i * 4 + 3] = outlineAlpha;
      }
    }

    ctx.clearRect(0, 0, w, h);
    const outlineCanvas = document.createElement('canvas');
    outlineCanvas.width = w;
    outlineCanvas.height = h;
    const oCtx = outlineCanvas.getContext('2d');
    if (!oCtx) return;
    oCtx.putImageData(outData, 0, 0);
    ctx.drawImage(outlineCanvas, 0, 0);
    ctx.drawImage(src, 0, 0);
  }

  private render(callback: (progress: number, canvas: HTMLCanvasElement) => void): void {
    const autoTrim = this.autoTrim;
    const w = autoTrim ? this.renderer.Width : this.renderer.CanvasWidth;
    const h = autoTrim ? this.renderer.Height : this.renderer.CanvasHeight;
    const px = parseInt(this.view.maxPixels.value, 10) || 1200;
    let scale = 1;
    switch (this.view.fixedSide.value) {
      case 'w':
        if (w > px) scale = px / w;
        break;
      case 'h':
      default:
        if (h > px) scale = px / h;
        break;
    }
    if (w * scale < 1 || h * scale < 1) {
      scale = w > h ? 1 / h : 1 / w;
    }

    let ltf: LFlipType;
    let rf: RFlipType;
    if (this.view.flipX.checked) {
      if (this.view.flipY.checked) {
        ltf = LFlipType.FlipXY;
        rf = RFlipType.FlipXY;
      } else {
        ltf = LFlipType.FlipX;
        rf = RFlipType.FlipX;
      }
    } else {
      if (this.view.flipY.checked) {
        ltf = LFlipType.FlipY;
        rf = RFlipType.FlipY;
      } else {
        ltf = LFlipType.NoFlip;
        rf = RFlipType.NoFlip;
      }
    }

    if (this.layerRoot.flip !== ltf) {
      this.layerRoot.flip = ltf;
    }
    this.renderer.render(scale, autoTrim, rf, callback);
  }

  private async chooseSaveDir(): Promise<void> {
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'downloads',
      });
      this.saveDir = handle as FileSystemDirectoryHandle;
      await saveDirHandle(this.currentFileName, this.saveDir);
      this.updateSaveDirButton(handle);
    } catch { /* user cancelled */ }
  }

  private updateSaveDirButton(handle: FileSystemDirectoryHandle): void {
    this.view.saveDirBtn.textContent = '\u{1F4C2} ' + handle.name;
    this.view.saveDirBtn.title = '保存到: ' + handle.name + '（右键恢复默认下载）';
    this.view.saveDirBtn.classList.add('btn-success');
  }

  private save(): void {
    const prefix = this.view.seqDlPrefix.value;
    let filename: string;
    let advanceNum = false;
    if (this.view.seqDlNum.value === '') {
      filename = prefix + '.png';
    } else {
      let num = parseInt(this.view.seqDlNum.value, 10);
      if (isNaN(num) || num < 0) num = 0;
      filename = prefix + ('0000' + num).slice(-4) + '.png';
      this.view.seqDlNum.value = (num + 1).toString();
      localStorage.setItem('psdtool-seqnum:' + this.currentFileName, this.view.seqDlNum.value);
      advanceNum = true;
    }
    // 不推进序号的情况（序号被手动清空）
    void advanceNum;
    this.download(filename);
  }

  private download(filename: string): void {
    this.view.previewCanvas.toBlob(async (blob) => {
      if (!blob) return;
      if (this.saveDir) {
        try {
          const fh = await this.saveDir.getFileHandle(filename, { create: true });
          const w = await (fh as any).createWritable();
          await w.write(blob);
          await w.close();
          this.showToast('已保存: ' + filename);
          return;
        } catch (e) {
          // 写入失败，回退到下载
        }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  }

  private showToast(msg: string): void {
    const existing = document.querySelector('.psdtool-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'psdtool-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('psdtool-toast-show'));
    setTimeout(() => {
      toast.classList.remove('psdtool-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
}

const app = new App();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.start());
} else {
  app.start();
}
