import { readPsd } from 'ag-psd';
import { adaptPsd } from './psd-adapter';
import { Renderer, FlipType as RFlipType } from './renderer';
import { LayerTree, FlipType as LFlipType } from './layertree';
import { createFileOpenUI } from './ui/file-open';
import { createMainView, MainViewElements } from './ui/main-view';
import { t } from './i18n';

class App {
  private renderer!: Renderer;
  private layerRoot!: LayerTree;
  private view!: MainViewElements;
  private autoTrim = false;
  private redrawTimer: number | null = null;

  start(): void {
    const app = document.getElementById('app');
    if (!app) throw new Error('#app not found');
    app.innerHTML = '';
    app.appendChild(createFileOpenUI((r) => this.loadFile(r.file, r.autoTrim)));
  }

  private async loadFile(file: File, autoTrim: boolean): Promise<void> {
    this.autoTrim = autoTrim;
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
      // 显示缩 70%，内部分辨率不变（导出仍为原始大小）
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
        if (ctx) ctx.drawImage(canvas, 0, 0);
      }, 0);
    });
    this.layerRoot.updateClass();
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

  private save(): void {
    const prefix = this.view.seqDlPrefix.value;
    if (this.view.seqDlNum.value === '') {
      this.download(prefix + '.png');
      return;
    }
    let num = parseInt(this.view.seqDlNum.value, 10);
    if (isNaN(num) || num < 0) num = 0;
    this.download(prefix + ('0000' + num).slice(-4) + '.png');
    this.view.seqDlNum.value = (num + 1).toString();
  }

  private download(filename: string): void {
    this.view.previewCanvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
  }
}

const app = new App();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.start());
} else {
  app.start();
}
