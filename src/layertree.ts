import type { Root, Layer } from './types';

export enum FlipType {
  NoFlip,
  FlipX,
  FlipY,
  FlipXY,
}

interface FlipSet {
  normal: TreeNode;
  flipped: TreeNode;
}

interface DeserializeNode {
  children: { [k: string]: DeserializeNode };
  checked: boolean;
}

export class TreeNode {
  get checked(): boolean { return this.input.checked; }
  set checked(v: boolean) { this.input.checked = v; }
  get disabled(): boolean { return this.input.disabled; }
  set disabled(v: boolean) { this.input.disabled = v; }
  get name(): string { return this.name_; }
  get displayName(): string { return this.displayName_.data; }
  get internalName(): string { return this.internalName_; }
  get fullPath(): string { return this.fullPath_; }
  get isRoot(): boolean { return this === this.parent; }
  get isRadio(): boolean { return this.input.type === 'radio'; }
  get isForceVisible(): boolean { return this.input.classList.contains('psdtool-layer-force-visible'); }
  public li: HTMLLIElement;
  public children: TreeNode[] = [];
  public clip: TreeNode[];
  public clippedBy: TreeNode;
  private fullPath_: string;
  private internalName_: string;
  public parent = this;

  constructor(
    private input: HTMLInputElement,
    private displayName_: Text,
    private name_: string,
    currentPath: string[],
    indexInSameName: number,
  ) {
    this.internalName_ = TreeNode.encodeLayerName(this.name, indexInSameName);
    if (currentPath.length) {
      this.fullPath_ = currentPath.join('/') + '/' + this.internalName_;
    } else {
      this.fullPath_ = this.internalName_;
    }
  }

  private static encodeLayerName(s: string, index: number): string {
    return s.replace(/[\x00-\x1f\x22\x25\x27\x2f\x5c\x7e\x7f]/g, (m): string => {
      return '%' + ('0' + m[0].charCodeAt(0).toString(16)).slice(-2);
    }) + (index === 0 ? '' : '\\' + index.toString());
  }
}

export class LayerTree {
  public root: TreeNode;
  public nodes: { [seqId: number]: TreeNode } = {};
  private flipX: FlipSet[] = [];
  private flipY: FlipSet[] = [];
  private flipXY: FlipSet[] = [];
  private flip_ = FlipType.NoFlip;

  get flip(): FlipType { return this.flip_; }
  set flip(v: FlipType) {
    this.flip_ = v;
    this.treeRoot.classList.remove('psdtool-flip-x', 'psdtool-flip-y', 'psdtool-flip-xy');
    switch (v) {
      case FlipType.NoFlip:
        this.doFlip(this.flipX, false);
        this.doFlip(this.flipY, false);
        this.doFlip(this.flipXY, false);
        break;
      case FlipType.FlipX:
        this.doFlip(this.flipY, false);
        this.doFlip(this.flipXY, false);
        this.doFlip(this.flipX, true);
        this.treeRoot.classList.add('psdtool-flip-x');
        break;
      case FlipType.FlipY:
        this.doFlip(this.flipXY, false);
        this.doFlip(this.flipX, false);
        this.doFlip(this.flipY, true);
        this.treeRoot.classList.add('psdtool-flip-y');
        break;
      case FlipType.FlipXY:
        this.doFlip(this.flipX, false);
        this.doFlip(this.flipY, false);
        this.doFlip(this.flipXY, true);
        this.treeRoot.classList.add('psdtool-flip-xy');
        break;
    }
  }

  constructor(private disableExtendedFeature: boolean, private treeRoot: HTMLUListElement, psdRoot: Root) {
    this.root = new TreeNode(document.createElement('input'), document.createTextNode(''), '', [], 0);
    const path: string[] = [];
    const r = (ul: HTMLUListElement, n: TreeNode, l: Layer[], parentSeqID: number): void => {
      const indexes: { [SeqID: number]: number } = {};
      const founds: { [name: string]: number } = {};
      for (const ll of l) {
        if (ll.Name in founds) {
          indexes[ll.SeqID] = ++founds[ll.Name];
        } else {
          indexes[ll.SeqID] = founds[ll.Name] = 0;
        }
      }
      for (let i = l.length - 1; i >= 0; --i) {
        const elems = this.createElements(l[i], parentSeqID);
        const cn = new TreeNode(elems.input, elems.text, l[i].Name, path, indexes[l[i].SeqID]);
        cn.parent = n;
        n.children.push(cn);
        this.nodes[l[i].SeqID] = cn;
        const cul = document.createElement('ul');
        path.push(cn.internalName);
        r(cul, cn, l[i].Children, l[i].SeqID);
        path.pop();
        cn.li = document.createElement('li');
        if (l[i].Folder) {
          cn.li.classList.add('psdtool-folder');
        }
        cn.li.appendChild(elems.div);
        cn.li.appendChild(cul);
        if (elems.toggle) {
          elems.toggle.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            cn.li.classList.toggle('psdtool-collapsed');
          });
        }
        ul.appendChild(cn.li);
      }
    };
    r(treeRoot, this.root, psdRoot.Children, -1);
    this.registerClippingGroup(psdRoot.Children);
    if (!this.disableExtendedFeature) {
      this.registerFlippingGroup();
    }
    this.normalize();
    this.flip = this.flip;
  }

  private flipSerialize(root: TreeNode): DeserializeNode {
    const r = (n: TreeNode, dn: DeserializeNode): void => {
      let cdn: DeserializeNode;
      for (const cn of n.children) {
        dn.children[cn.internalName] = cdn = {
          checked: cn.checked,
          children: {},
        };
        r(cn, cdn);
      }
    };
    const result: DeserializeNode = {
      checked: root.checked,
      children: {},
    };
    r(root, result);
    return result;
  }

  private flipDeserialize(root: TreeNode, state: DeserializeNode): void {
    const r = (n: TreeNode, dn: DeserializeNode): void => {
      let cdn: DeserializeNode;
      for (const cn of n.children) {
        if (!(cn.internalName in dn.children)) {
          continue;
        }
        cdn = dn.children[cn.internalName];
        cn.checked = cdn.checked;
        r(cn, cdn);
      }
    };
    r(root, state);
  }

  private doFlip(flipSet: FlipSet[], flip: boolean): void {
    for (const fs of flipSet) {
      if (flip && fs.normal.checked) {
        const state = this.flipSerialize(fs.normal);
        this.flipDeserialize(fs.flipped, state);
        fs.flipped.checked = true;
        fs.normal.checked = false;
      } else if (!flip && fs.flipped.checked) {
        const state = this.flipSerialize(fs.flipped);
        this.flipDeserialize(fs.normal, state);
        fs.normal.checked = true;
        fs.flipped.checked = false;
      }
    }
  }

  private createElements(l: Layer, parentSeqID: number): {
    text: Text;
    div: HTMLDivElement;
    input: HTMLInputElement;
    toggle?: HTMLSpanElement;
  } {
    const label = document.createElement('label');
    const input = document.createElement('input');
    let toggle: HTMLSpanElement | undefined;
    let layerName = l.Name;
    // Generally '!?' does not expect any extended features.
    if (!this.disableExtendedFeature && layerName.length > 1 && layerName !== '!?') {
      switch (layerName.charAt(0)) {
        case '!':
          input.className = 'psdtool-layer-visible psdtool-layer-force-visible';
          input.name = 'l' + l.SeqID;
          input.type = 'checkbox';
          input.checked = true;
          input.disabled = true;
          input.style.display = 'none';
          layerName = layerName.substring(1);
          break;
        case '*':
          input.className = 'psdtool-layer-visible psdtool-layer-radio';
          input.name = 'r_' + parentSeqID;
          input.type = 'radio';
          input.checked = l.Visible;
          layerName = layerName.substring(1);
          break;
      }
    }
    if (!input.name) {
      input.className = 'psdtool-layer-visible';
      input.name = 'l' + l.SeqID;
      input.type = 'checkbox';
      input.checked = l.Visible;
    }

    if (!this.disableExtendedFeature) {
      // trim :flipx :flipy :flipxy
      layerName = this.parseToken(layerName).name;
    }

    input.setAttribute('data-seq', l.SeqID.toString());
    label.appendChild(input);

    if (l.Clipping) {
      const clip = document.createElement('span');
      clip.className = 'psdtool-clipped-mark';
      clip.textContent = '⬇';
      clip.title = 'clipped';
      label.appendChild(clip);
    }

    if (l.Folder) {
      const icon = document.createElement('span');
      icon.className = 'psdtool-icon psdtool-folder-icon';
      label.appendChild(icon);
    } else {
      // 叶子层：从图层 Canvas 生成 96x96 缩略图，CSS 缩到 24x24 显示
      const thumb = document.createElement('canvas');
      thumb.className = 'psdtool-thumbnail';
      thumb.width = 96;
      thumb.height = 96;
      if (l.Canvas) {
        let w = l.Width, h = l.Height;
        if (w > h) {
          w = thumb.width;
          h = thumb.width / l.Width * h;
        } else {
          h = thumb.height;
          w = thumb.height / l.Height * w;
        }
        const ctx = thumb.getContext('2d');
        if (ctx) {
          ctx.drawImage(l.Canvas.canvas, (thumb.width - w) / 2, (thumb.height - h) / 2, w, h);
        }
      }
      label.appendChild(thumb);
    }
    const text = document.createTextNode(layerName);
    label.appendChild(text);

    const div = document.createElement('div');
    div.className = 'psdtool-layer-name';
    if (l.Folder) {
      toggle = document.createElement('span');
      toggle.className = 'psdtool-fold-toggle';
      toggle.title = '折叠 / 展开';
      div.appendChild(toggle);
    }
    div.appendChild(label);
    return {
      text: text,
      div: div,
      input: input,
      toggle: toggle,
    };
  }

  public updateClass(): void {
    const r = (n: TreeNode): void => {
      if (n.checked) {
        n.li.classList.remove('psdtool-hidden');
        if (n.clip) {
          for (let i = 0; i < n.clip.length; ++i) {
            n.clip[i].li.classList.remove('psdtool-hidden-by-clipping');
          }
        }
      } else {
        n.li.classList.add('psdtool-hidden');
        if (n.clip) {
          for (let i = 0; i < n.clip.length; ++i) {
            n.clip[i].li.classList.add('psdtool-hidden-by-clipping');
          }
        }
      }
      for (let i = 0; i < n.children.length; ++i) {
        r(n.children[i]);
      }
    };
    for (let i = 0; i < this.root.children.length; ++i) {
      r(this.root.children[i]);
    }
  }

  private registerClippingGroup(l: Layer[]): void {
    let clip: TreeNode[] = [];
    let n: TreeNode;
    for (let i = l.length - 1; i >= 0; --i) {
      this.registerClippingGroup(l[i].Children);
      n = this.nodes[l[i].SeqID];
      if (l[i].Clipping) {
        clip.unshift(n);
      } else {
        if (clip.length) {
          for (let j = 0; j < clip.length; ++j) {
            clip[j].clippedBy = n;
          }
          n.clip = clip;
        }
        clip = [];
      }
    }
  }

  private parseToken(name: string): { tokens: string[]; name: string } {
    const token: string[] = [];
    const p = name.split(':');
    for (let i = p.length - 1; i >= 0; --i) {
      switch (p[i]) {
        case 'flipx':
        case 'flipy':
        case 'flipxy':
          token.push(p[i]);
          p.pop();
          break;
        default:
          return { tokens: token, name: p.join(':') };
      }
    }
    throw new Error('cannot parse token from name: ' + name);
  }

  private registerFlippingGroup(): void {
    const r = (n: TreeNode): void => {
      for (const cn of n.children) {
        r(cn);

        const tokens = this.parseToken(cn.name);
        const flips: FlipType[] = [];
        for (const tk of tokens.tokens) {
          switch (tk) {
            case 'flipx':
              flips.push(FlipType.FlipX);
              break;
            case 'flipy':
              flips.push(FlipType.FlipY);
              break;
            case 'flipxy':
              flips.push(FlipType.FlipXY);
              break;
          }
        }
        if (flips.length === 0) {
          continue;
        }

        let o: TreeNode | undefined;
        for (const on of n.children) {
          if (on.name === tokens.name) {
            o = on;
            break;
          }
        }
        if (!o) {
          continue;
        }

        for (const fp of flips) {
          switch (fp) {
            case FlipType.FlipX:
              o.li.classList.add('psdtool-item-flip-x-orig');
              cn.li.classList.add('psdtool-item-flip-x');
              this.flipX.push({ normal: o, flipped: cn });
              break;
            case FlipType.FlipY:
              o.li.classList.add('psdtool-item-flip-y-orig');
              cn.li.classList.add('psdtool-item-flip-y');
              this.flipY.push({ normal: o, flipped: cn });
              break;
            case FlipType.FlipXY:
              o.li.classList.add('psdtool-item-flip-xy-orig');
              cn.li.classList.add('psdtool-item-flip-xy');
              this.flipXY.push({ normal: o, flipped: cn });
              break;
          }
        }
      }
    };
    r(this.root);
  }

  private clear(): void {
    for (const key in this.nodes) {
      if (!this.nodes.hasOwnProperty(key)) {
        continue;
      }
      this.nodes[key].checked = false;
    }
  }

  private normalize(): void {
    // force-visible 层强制勾选
    const forceVisibleElems = <NodeListOf<HTMLInputElement>>this.treeRoot.querySelectorAll('.psdtool-layer-force-visible');
    for (let i = 0; i < forceVisibleElems.length; ++i) {
      forceVisibleElems[i].checked = true;
    }

    // 单选组：每组至少选中一个（若都未选则选第一个）
    const set: { [name: string]: boolean } = {};
    const radios = this.treeRoot.querySelectorAll('.psdtool-layer-radio');
    for (let i = 0; i < radios.length; ++i) {
      const radio = radios[i];
      if (!(radio instanceof HTMLInputElement)) {
        continue;
      }
      if (radio.name in set) {
        continue;
      }
      set[radio.name] = true;
      const checkedInGroup = this.treeRoot.querySelectorAll('.psdtool-layer-radio[name="' + radio.name + '"]:checked');
      if (!checkedInGroup.length) {
        radio.checked = true;
      }
    }
  }
}
