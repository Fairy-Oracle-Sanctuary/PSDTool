export class DownScaler {
  get destWidth(): number { return 0 | Math.max(1, this.src.width * this.scale); }
  get destHeight(): number { return 0 | Math.max(1, this.src.height * this.scale); }
  private dest: HTMLCanvasElement = document.createElement('canvas');
  constructor(private src: HTMLCanvasElement, private scale: number) { }

  public fast(): HTMLCanvasElement {
    this.adjustSize();
    const ctx = this.dest.getContext('2d');
    if (!ctx) {
      throw new Error('cannot get CanvasRenderingContext2D from dest');
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      this.src,
      0, 0, this.src.width, this.src.height,
      0, 0, this.destWidth, this.destHeight
    );
    return this.dest;
  }

  private adjustSize(): void {
    const dw = this.destWidth;
    if (this.dest.width !== dw) {
      this.dest.width = dw;
    }
    const dh = this.destHeight;
    if (this.dest.height !== dh) {
      this.dest.height = dh;
    }
  }

  // MVP: 高质量 Worker 缩放暂未移植，退化到 fast（imageSmoothingQuality:'high' 已尽量提升质量）
  public beautifulWorker(callback: (dest: HTMLCanvasElement) => void): void {
    callback(this.fast());
  }
}
