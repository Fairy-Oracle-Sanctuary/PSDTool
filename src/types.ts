export interface LayerBase {
  X: number;
  Y: number;
  Width: number;
  Height: number;
  Children: Layer[];
}

export interface Layer extends LayerBase {
  SeqID: number;
  Name: string;

  Folder: boolean;
  FolderOpen: boolean;

  Visible: boolean;
  BlendMode: string;
  Opacity: number; // 0-255
  Clipping: boolean;

  BlendClippedElements: boolean;

  Canvas: CanvasRenderingContext2D | undefined;

  MaskX: number;
  MaskY: number;
  MaskWidth: number;
  MaskHeight: number;
  MaskDefaultColor: number;
  Mask: CanvasRenderingContext2D | undefined;
}

export interface Root extends LayerBase {
  CanvasWidth: number;
  CanvasHeight: number;

  Hash: string;
  PFV: string;
  PFVModDate: number;
  Readme: string;
}
