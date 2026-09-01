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
  saveDirBtn: HTMLButtonElement;
  drawerBtn: HTMLButtonElement;
  drawerContent: HTMLElement;
  outlineEnabled: HTMLInputElement;
  outlineColor: HTMLInputElement;
  outlineWidth: HTMLInputElement;
  outlineSmooth: HTMLInputElement;
  fillEnabled: HTMLInputElement;
  fillColor: HTMLInputElement;
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
  const saveDirBtn = document.createElement('button') as HTMLButtonElement;
  saveDirBtn.id = 'save-dir-btn';
  saveDirBtn.className = 'btn btn-default';
  saveDirBtn.textContent = '\u{1F4C2}';
  saveDirBtn.title = '选择保存路径';
  saveDirBtn.style.display = 'none';
  saveWrap.appendChild(seqDlPrefix);
  saveWrap.appendChild(seqDlNum);
  saveWrap.appendChild(seqDl);
  saveWrap.appendChild(saveDirBtn);
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

  // ---- 右侧抽屉 ----
  const drawer = el('div', 'psdtool-drawer') as HTMLElement;
  drawer.id = 'right-drawer';
  const drawerToggle = document.createElement('button') as HTMLButtonElement;
  drawerToggle.id = 'drawer-toggle';
  drawerToggle.className = 'btn btn-default btn-sm';
  drawerToggle.textContent = '\u2630';
  drawerToggle.title = '功能面板';

  const drawerContent = el('div', 'psdtool-drawer-content') as HTMLElement;

  // 描边功能
  const outlineSection = el('div', 'psdtool-drawer-section') as HTMLElement;
  const outlineTitle = el('div', 'psdtool-drawer-section-title') as HTMLElement;
  outlineTitle.textContent = '人物描边';
  outlineSection.appendChild(outlineTitle);

  const outlineRow = el('div', 'psdtool-drawer-row') as HTMLElement;
  const outlineEnabled = document.createElement('input') as HTMLInputElement;
  outlineEnabled.type = 'checkbox';
  outlineEnabled.id = 'outline-enabled';
  const outlineLabel = el('label') as HTMLLabelElement;
  outlineLabel.htmlFor = 'outline-enabled';
  outlineLabel.textContent = ' 启用描边';
  outlineRow.appendChild(outlineEnabled);
  outlineRow.appendChild(outlineLabel);
  outlineSection.appendChild(outlineRow);

  const colorRow = el('div', 'psdtool-drawer-row') as HTMLElement;
  const colorLabel = el('span', 'psdtool-drawer-label') as HTMLElement;
  colorLabel.textContent = '颜色';
  const outlineColor = document.createElement('input') as HTMLInputElement;
  outlineColor.type = 'color';
  outlineColor.id = 'outline-color';
  outlineColor.className = 'psdtool-color-input';
  outlineColor.value = '#000000';
  colorRow.appendChild(colorLabel);
  colorRow.appendChild(outlineColor);
  outlineSection.appendChild(colorRow);

  const SWATCH_COLORS = ['#00ff00','#ff0000','#0000ff','#00ffff','#ff00ff','#ffff00','#000000','#808080','#ffffff'];
  const outlineSwatchRow = el('div', 'psdtool-swatch-row') as HTMLElement;
  for (const c of SWATCH_COLORS) {
    const sw = document.createElement('button') as HTMLButtonElement;
    sw.className = 'psdtool-swatch';
    sw.style.backgroundColor = c;
    sw.title = c;
    sw.addEventListener('click', (e) => {
      e.preventDefault();
      outlineColor.value = c;
      outlineColor.dispatchEvent(new Event('input'));
    });
    outlineSwatchRow.appendChild(sw);
  }
  outlineSection.appendChild(outlineSwatchRow);

  const widthRow = el('div', 'psdtool-drawer-row') as HTMLElement;
  const widthLabel = el('span', 'psdtool-drawer-label') as HTMLElement;
  widthLabel.textContent = '粗细';
  const outlineWidth = document.createElement('input') as HTMLInputElement;
  outlineWidth.type = 'range';
  outlineWidth.id = 'outline-width';
  outlineWidth.className = 'psdtool-range-input';
  outlineWidth.min = '1';
  outlineWidth.max = '20';
  outlineWidth.step = '1';
  outlineWidth.value = '3';
  const widthValue = el('span', 'psdtool-drawer-value') as HTMLElement;
  widthValue.textContent = '3';
  outlineWidth.addEventListener('input', () => { widthValue.textContent = outlineWidth.value; });
  widthRow.appendChild(widthLabel);
  widthRow.appendChild(outlineWidth);
  widthRow.appendChild(widthValue);
  outlineSection.appendChild(widthRow);

  const smoothRow = el('div', 'psdtool-drawer-row') as HTMLElement;
  const outlineSmooth = document.createElement('input') as HTMLInputElement;
  outlineSmooth.type = 'checkbox';
  outlineSmooth.id = 'outline-smooth';
  outlineSmooth.disabled = true;
  const smoothLabel = el('label') as HTMLLabelElement;
  smoothLabel.htmlFor = 'outline-smooth';
  smoothLabel.textContent = ' 平滑描边';
  smoothLabel.style.opacity = '0.5';
  smoothRow.appendChild(outlineSmooth);
  smoothRow.appendChild(smoothLabel);
  outlineSection.appendChild(smoothRow);

  // 描边开关 → 启用/禁用子控件
  const updateOutlineControls = () => {
    const enabled = outlineEnabled.checked;
    outlineColor.disabled = !enabled;
    outlineWidth.disabled = !enabled;
    outlineSmooth.disabled = !enabled;
    smoothLabel.style.opacity = enabled ? '1' : '0.5';
    colorLabel.style.opacity = enabled ? '1' : '0.5';
    widthLabel.style.opacity = enabled ? '1' : '0.5';
    outlineSwatchRow.style.opacity = enabled ? '1' : '0.5';
    outlineSwatchRow.querySelectorAll('button').forEach(b => (b as HTMLButtonElement).disabled = !enabled);
  };
  outlineEnabled.addEventListener('change', updateOutlineControls);
  updateOutlineControls();

  drawerContent.appendChild(outlineSection);

  // 填充纯色功能
  const fillSection = el('div', 'psdtool-drawer-section') as HTMLElement;
  const fillTitle = el('div', 'psdtool-drawer-section-title') as HTMLElement;
  fillTitle.textContent = '人物填充';
  fillSection.appendChild(fillTitle);

  const fillRow = el('div', 'psdtool-drawer-row') as HTMLElement;
  const fillEnabled = document.createElement('input') as HTMLInputElement;
  fillEnabled.type = 'checkbox';
  fillEnabled.id = 'fill-enabled';
  const fillLabel = el('label') as HTMLLabelElement;
  fillLabel.htmlFor = 'fill-enabled';
  fillLabel.textContent = ' 填充纯色';
  fillRow.appendChild(fillEnabled);
  fillRow.appendChild(fillLabel);
  fillSection.appendChild(fillRow);

  const fillColorRow = el('div', 'psdtool-drawer-row') as HTMLElement;
  const fillColorLabel = el('span', 'psdtool-drawer-label') as HTMLElement;
  fillColorLabel.textContent = '颜色';
  fillColorLabel.style.opacity = '0.5';
  const fillColor = document.createElement('input') as HTMLInputElement;
  fillColor.type = 'color';
  fillColor.id = 'fill-color';
  fillColor.className = 'psdtool-color-input';
  fillColor.value = '#ffffff';
  fillColor.disabled = true;
  fillColorRow.appendChild(fillColorLabel);
  fillColorRow.appendChild(fillColor);
  fillSection.appendChild(fillColorRow);

  const fillSwatchRow = el('div', 'psdtool-swatch-row') as HTMLElement;
  fillSwatchRow.style.opacity = '0.5';
  for (const c of SWATCH_COLORS) {
    const sw = document.createElement('button') as HTMLButtonElement;
    sw.className = 'psdtool-swatch';
    sw.style.backgroundColor = c;
    sw.title = c;
    sw.disabled = true;
    sw.addEventListener('click', (e) => {
      e.preventDefault();
      fillColor.value = c;
      fillColor.dispatchEvent(new Event('input'));
    });
    fillSwatchRow.appendChild(sw);
  }
  fillSection.appendChild(fillSwatchRow);

  const updateFillControls = () => {
    const en = fillEnabled.checked;
    fillColor.disabled = !en;
    fillColorLabel.style.opacity = en ? '1' : '0.5';
    fillSwatchRow.style.opacity = en ? '1' : '0.5';
    fillSwatchRow.querySelectorAll('button').forEach(b => (b as HTMLButtonElement).disabled = !en);
  };
  fillEnabled.addEventListener('change', updateFillControls);
  updateFillControls();

  drawerContent.appendChild(fillSection);
  drawer.appendChild(drawerContent);
  drawer.appendChild(drawerToggle);

  drawerToggle.addEventListener('click', () => {
    drawer.classList.toggle('psdtool-drawer-open');
  });

  root.appendChild(drawer);

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
    saveDirBtn,
    drawerBtn: drawerToggle,
    drawerContent,
    outlineEnabled,
    outlineColor,
    outlineWidth,
    outlineSmooth,
    fillEnabled,
    fillColor,
  };
}
