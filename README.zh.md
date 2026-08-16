# PSDTool

[English](README.md) | [日本語](README.ja.md) | [中文](README.zh.md)

[PSDTool](https://github.com/ChibiCC/PSDTool) 的现代化 Web 重制版 —— 交互式 PSD 图层查看器，支持实时预览、图层切换、翻转配对和 PNG 导出。

## 功能特性

- **PSD 解析** —— 使用 [ag-psd](https://github.com/Agamnentzar/ag-psd)，无需 Go/WebAssembly
- **图层树** —— 支持单选组（`*`）、强制显示（`!`）、翻转配对（`:flipx` / `:flipy` / `:flipxy`）
- **实时渲染** —— 支持混合模式、剪贴蒙版、图层蒙版、pass-through 文件夹
- **翻转与缩放** —— 左右/上下翻转，按目标像素数缩放
- **PNG 导出** —— 自定义前缀 + 自增序号生成文件名
- **图层缩略图** —— 树中显示零件缩略图，快速识别
- **国际化** —— 中文 / 日文 / 英文，根据浏览器语言自动切换
- **响应式布局** —— 可拖拽调整宽度的分栏界面

## 技术栈

- TypeScript（strict 模式）
- Vite
- ag-psd
- 手写 CSS（Bootstrap 3 视觉风格，无框架依赖）

## 快速开始

```bash
npm install
npm run dev      # 启动开发服务器 http://localhost:5173
npm run build    # 生产构建到 dist/
```

通过文件选择器或拖拽打开 `.psd` 文件。在图层树中切换图层，调整翻转和缩放，点击 `.png` 按钮导出。

## 项目结构

```
src/
  main.ts            # 应用入口，整合加载/渲染/导出
  i18n.ts            # 翻译与语言检测
  psd-adapter.ts     # ag-psd → 内部 Root/Layer 类型转换
  renderer.ts        # 图层合成管线
  layertree.ts       # 树状态、标记解析、翻转配对
  downscaler.ts      # 图像缩放
  blend/blend.ts     # 纯 TS 混合模式实现
  ui/
    file-open.ts     # 文件打开界面
    main-view.ts     # 主界面骨架（分栏、工具条、预览区）
  styles/
    main.css         # 全部样式
```

## 与原版的差异

| 方面 | 原版 | 本重制版 |
|------|------|---------|
| PSD 解析器 | Go → WebAssembly | ag-psd（纯 JS） |
| UI 框架 | Bootstrap 3 + jstree | 手写 CSS |
| 打包工具 | webpack | Vite |
| 构建依赖 | Go 工具链 | 仅需 Node.js |

## 许可证

MIT
