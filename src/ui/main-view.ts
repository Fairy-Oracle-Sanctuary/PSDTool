import { t } from '../i18n';

export interface MainViewElements {
  root: HTMLElement;
  layerTreeEl: HTMLUListElement;
  previewBackground: HTMLElement;
  previewCanvas: HTMLCanvasElement;
  flipX: HTMLInputElement;
  flipY: HTMLInputElement;
  fixedSide: HTMLSelectElement;
  maxPixels: HTMLInputElement;
  seqDlPrefix: HTMLInputElement;
  seqDlNum: HTMLInputElement;
  seqDl: HTMLButtonElement;
}

function el(tag: string, cls?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

export function createMainView(): MainViewElements {
  const root = el('div', 'split-pane fixed-left') as HTMLElement;
  root.id = 'main';
  root.style.setProperty('--split', '29vw');

  // ---- 侧边栏 ----
  const sideContainer = el('div', 'split-pane-component') as HTMLElement;
  sideContainer.id = 'side-container';

  const sideHead = el('div') as HTMLElement;
  sideHead.id = 'side-head';
  const sideTab = el('ul', 'nav nav-tabs') as HTMLUListElement;
  sideTab.id = 'side-tab';
  const tabLi = el('li', 'active') as HTMLLIElement;
  tabLi.setAttribute('role', 'presentation');
  const tabA = el('a') as HTMLAnchorElement;
  tabA.textContent = t('layers');
  tabLi.appendChild(tabA);
  sideTab.appendChild(tabLi);
  sideHead.appendChild(sideTab);
  sideContainer.appendChild(sideHead);

  const sideBody = el('div') as HTMLElement;
  sideBody.id = 'side-body';
  const tabContent = el('div', 'tab-content') as HTMLElement;
  const layerTreePane = el('div', 'tab-pane psdtool-tab-pane active') as HTMLElement;
  layerTreePane.id = 'layer-tree-pane';
  const layerTreeEl = document.createElement('ul') as HTMLUListElement;
  layerTreeEl.id = 'layer-tree';
  layerTreePane.appendChild(layerTreeEl);
  tabContent.appendChild(layerTreePane);
  sideBody.appendChild(tabContent);
  sideContainer.appendChild(sideBody);

  // ---- 分隔条（可拖拽） ----
  const splitter = el('div', 'split-pane-divider') as HTMLElement;
  splitter.id = 'splitter';
  let dragging = false;
  splitter.addEventListener('mousedown', (e) => {
    dragging = true;
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const pct = (e.clientX / window.innerWidth) * 100;
    const clamped = Math.max(10, Math.min(70, pct));
    root.style.setProperty('--split', clamped + 'vw');
  });
  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      document.body.style.cursor = '';
    }
  });

  // ---- 主容器 ----
  const mainContainer = el('div', 'split-pane-component') as HTMLElement;
  mainContainer.id = 'main-container';

  // 工具条 #misc-ui
  const miscUi = el('div') as HTMLElement;
  miscUi.id = 'misc-ui';
  const form = el('div', 'form-inline') as HTMLElement;

  // 翻转按钮组
  const flipGroup = el('div', 'btn-group psdtool-flip-buttons') as HTMLElement;
  const flipXLabel = el('label', 'btn btn-default') as HTMLLabelElement;
  flipXLabel.title = t('flipH');
  const flipX = document.createElement('input') as HTMLInputElement;
  flipX.type = 'checkbox';
  flipX.id = 'flip-x';
  flipXLabel.appendChild(flipX);
  flipXLabel.appendChild(document.createTextNode(' \u21c4 '));
  const flipYLabel = el('label', 'btn btn-default') as HTMLLabelElement;
  flipYLabel.title = t('flipV');
  const flipY = document.createElement('input') as HTMLInputElement;
  flipY.type = 'checkbox';
  flipY.id = 'flip-y';
  flipYLabel.appendChild(flipY);
  flipYLabel.appendChild(document.createTextNode(' \u21c5 '));
  flipGroup.appendChild(flipXLabel);
  flipGroup.appendChild(flipYLabel);
  const flipWrap = el('div', 'form-group psdtool-ui-item') as HTMLElement;
  flipWrap.appendChild(flipGroup);
  form.appendChild(flipWrap);

  // 缩放：fixed-side + max-pixels
  const scaleWrap = el('div', 'form-group psdtool-ui-item psdtool-scale-row') as HTMLElement;
  const fixedSide = document.createElement('select') as HTMLSelectElement;
  fixedSide.id = 'fixed-side';
  fixedSide.className = 'form-control';
  const optH = el('option') as HTMLOptionElement;
  optH.value = 'h';
  optH.textContent = t('sideV');
  optH.selected = true;
  const optW = el('option') as HTMLOptionElement;
  optW.value = 'w';
  optW.textContent = t('sideH');
  fixedSide.appendChild(optH);
  fixedSide.appendChild(optW);
  scaleWrap.appendChild(fixedSide);
  const maxPixelsGroup = el('div', 'input-group') as HTMLElement;
  const maxPixels = document.createElement('input') as HTMLInputElement;
  maxPixels.type = 'text';
  maxPixels.id = 'max-pixels';
  maxPixels.className = 'form-control';
  maxPixels.inputMode = 'numeric';
  maxPixels.value = '1200';
  maxPixels.title = t('maxPixelsTitle');
  const maxPixelsAddon = el('div', 'input-group-addon input-sm') as HTMLElement;
  maxPixelsAddon.innerHTML = '<small>' + t('maxPixelsSuffix') + '</small>';
  maxPixelsGroup.appendChild(maxPixels);
  maxPixelsGroup.appendChild(maxPixelsAddon);
  scaleWrap.appendChild(maxPixelsGroup);
  form.appendChild(scaleWrap);

  // PNG 保存：prefix + num + button
  const saveWrap = el('div', 'form-group psdtool-ui-item') as HTMLElement;
  const seqDlPrefix = document.createElement('input') as HTMLInputElement;
  seqDlPrefix.id = 'seq-dl-prefix';
  seqDlPrefix.type = 'text';
  seqDlPrefix.className = 'form-control';
  seqDlPrefix.value = 'file_';
  seqDlPrefix.title = t('prefixTitle');
  const seqDlNum = document.createElement('input') as HTMLInputElement;
  seqDlNum.id = 'seq-dl-num';
  seqDlNum.type = 'number';
  seqDlNum.className = 'form-control';
  seqDlNum.inputMode = 'numeric';
  seqDlNum.value = '0';
  seqDlNum.title = t('numTitle');
  const seqDl = document.createElement('button') as HTMLButtonElement;
  seqDl.id = 'seq-dl';
  seqDl.className = 'btn btn-primary';
  seqDl.textContent = t('savePng');
  seqDl.title = t('saveTitle');
  saveWrap.appendChild(seqDlPrefix);
  saveWrap.appendChild(seqDlNum);
  saveWrap.appendChild(seqDl);
  form.appendChild(saveWrap);

  miscUi.appendChild(form);
  mainContainer.appendChild(miscUi);

  // 预览区
  const previewContainer = el('div') as HTMLElement;
  previewContainer.id = 'preview-container';
  const previewBackground = el('div') as HTMLElement;
  previewBackground.id = 'preview-background';
  const previewCanvas = document.createElement('canvas') as HTMLCanvasElement;
  previewCanvas.id = 'preview';
  previewBackground.appendChild(previewCanvas);
  previewContainer.appendChild(previewBackground);
  mainContainer.appendChild(previewContainer);

  root.appendChild(sideContainer);
  root.appendChild(splitter);
  root.appendChild(mainContainer);

  return {
    root,
    layerTreeEl,
    previewBackground,
    previewCanvas,
    flipX,
    flipY,
    fixedSide,
    maxPixels,
    seqDlPrefix,
    seqDlNum,
    seqDl,
  };
}
