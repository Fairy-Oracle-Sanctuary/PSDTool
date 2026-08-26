import { t, getLang, setLang, allLangs, type Lang } from '../i18n';
import {
  saveRecent,
  getHandleFromDrop,
  createRecentFilesPanel,
} from './recent-files';
import { storePendingFile } from './pending-file';

export interface FileOpenResult {
  file: File;
  autoTrim: boolean;
}

export function createFileOpenUI(onOpen: (r: FileOpenResult) => void): HTMLElement {
  const container = document.createElement('div');
  container.id = 'file-open-ui';
  container.className = 'container';

  const headerRow = el('div', 'row');
  const headerCol = el('div', 'col-sm-7 text-nowrap');
  const h1 = document.createElement('h1');
  const titleSpan = document.createElement('span');
  titleSpan.textContent = t('appTitle');
  h1.appendChild(titleSpan);
  headerCol.appendChild(h1);
  headerRow.appendChild(headerCol);

  // 语言切换（右侧）
  const langCol = el('div', 'col-sm-5 text-right');
  langCol.style.paddingTop = '1.2rem';
  const langGroup = el('div', 'btn-group btn-group-sm');

  // 调音参考入口
  const yukkuri = document.createElement('a');
  yukkuri.href = '/调音参考.html';
  yukkuri.className = 'btn btn-primary btn-sm';
  yukkuri.textContent = '油库里调音';
  yukkuri.title = '油库里调音参考';
  yukkuri.style.marginRight = '8px';
  yukkuri.style.verticalAlign = 'middle';
  langCol.appendChild(yukkuri);
  for (const l of allLangs) {
    const btn = document.createElement('button') as HTMLButtonElement;
    btn.type = 'button';
    btn.className = 'btn btn-default' + (getLang() === l.code ? ' active' : '');
    btn.textContent = l.label;
    btn.addEventListener('click', () => {
      if (getLang() === l.code) return;
      setLang(l.code as Lang);
      location.reload();
    });
    langGroup.appendChild(btn);
  }
  langCol.appendChild(langGroup);
  headerRow.appendChild(langCol);
  container.appendChild(headerRow);

  const panelRow = el('div', 'row');
  const panelCol = el('div', 'col-sm-6');
  const panel = el('div', 'panel panel-primary');
  const heading = el('div', 'panel-heading');
  const headingTitle = document.createElement('h2');
  headingTitle.className = 'panel-title';
  headingTitle.textContent = t('openFile');
  heading.appendChild(headingTitle);
  panel.appendChild(heading);

  const body = el('div', 'panel-body');
  const dropzone = el('div');
  dropzone.id = 'dropzone';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.psd';
  const p1 = document.createElement('p');
  p1.appendChild(fileInput);
  dropzone.appendChild(p1);

  const desc = document.createElement('p');
  const small = document.createElement('small');
  small.textContent = t('dropHint');
  desc.appendChild(small);
  dropzone.appendChild(desc);

  const options = document.createElement('dl');
  options.id = 'additional-options';
  const dt = document.createElement('dt');
  dt.textContent = t('options');
  const dd = document.createElement('dd');
  dd.className = 'checkbox';
  const autoTrimLabel = document.createElement('label');
  autoTrimLabel.htmlFor = 'option-auto-trim';
  const autoTrim = document.createElement('input');
  autoTrim.type = 'checkbox';
  autoTrim.id = 'option-auto-trim';
  autoTrimLabel.appendChild(autoTrim);
  autoTrimLabel.appendChild(document.createTextNode(' ' + t('autoTrim')));
  dd.appendChild(autoTrimLabel);
  options.appendChild(dt);
  options.appendChild(dd);
  dropzone.appendChild(options);

  body.appendChild(dropzone);
  panel.appendChild(body);
  panelCol.appendChild(panel);

  const open = async (file: File): Promise<void> => {
    if (!file) return;
    await storePendingFile(file, autoTrim.checked);
    window.open(location.href);
  };

  fileInput.addEventListener('change', async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) {
      saveRecent(f, null);
      await open(f);
      recentPanel.refresh();
    }
  });

  ['dragenter', 'dragover'].forEach((ev) => {
    dropzone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropzone.classList.add('psdtool-drop-active');
    });
  });
  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('psdtool-drop-active');
    const f = e.dataTransfer?.files?.[0];
    if (f) {
      const handle = await getHandleFromDrop(e);
      saveRecent(f, handle);
      await open(f);
      recentPanel.refresh();
    }
  });

  // 最近打开面板
  const recentPanel = createRecentFilesPanel((file) => {
    void open(file);
  });
  panelCol.appendChild(recentPanel.container);

  panelRow.appendChild(panelCol);
  container.appendChild(panelRow);

  return container;
}

function el(tag: string, cls?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}
