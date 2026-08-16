# PSDTool

[English](README.md) | [日本語](README.ja.md) | [中文](README.zh.md)

[PSDTool](https://github.com/ChibiCC/PSDTool) のモダン Web 書き直し版です。PSD レイヤーのインタラクティブな表示切替、ライブプレビュー、反転ペアリング、PNG 書き出しを提供します。

## 機能

- **PSD 解析** — [ag-psd](https://github.com/Agamnentzar/ag-psd) 使用（Go / WebAssembly 非依存）
- **レイヤーツリー** — ラジオグループ（`*`）、強制表示（`!`）、反転ペア（`:flipx` / `:flipy` / `:flipxy`）
- **ライブレンダリング** — ブレンドモード、クリッピングマスク、レイヤーマスク、パススルーフォルダ対応
- **反転・縮小** — 左右 / 上下反転、指定ピクセル数への縮小
- **PNG 書き出し** — 接頭辞 + 連番によるファイル名自動生成
- **レイヤーサムネイル** — ツリー内に部品の縮小画像を表示
- **i18n** — 日本語 / 英語 / 中国語（ブラウザ言語から自動判定）
- **レスポンシブ UI** — ドラッグで幅調整可能な分割レイアウト

## 技術スタック

- TypeScript（strict モード）
- Vite
- ag-psd
- 手書き CSS（Bootstrap 3 風の見た目、フレームワーク非依存）

## クイックスタート

```bash
npm install
npm run dev      # http://localhost:5173 で開発サーバー起動
npm run build    # dist/ に本番ビルド
```

ファイル選択またはドラッグ＆ドロップで `.psd` を開きます。ツリーでレイヤーを切り替え、反転・縮小を調整して `.png` ボタンで書き出します。

## プロジェクト構成

```
src/
  main.ts            # アプリ本体：読込・描画・書き出しの統合
  i18n.ts            # 翻訳と言語判定
  psd-adapter.ts     # ag-psd → 内部 Root/Layer 型への変換
  renderer.ts        # レイヤー合成パイプライン
  layertree.ts       # ツリー状態・トークン解析・反転グループ
  downscaler.ts      # 画像縮小
  blend/blend.ts     # 純 TS ブレンドモード実装
  ui/
    file-open.ts     # ファイルを開く画面
    main-view.ts     # メイン UI（分割ペイン・ツールバー・プレビュー）
  styles/
    main.css         # スタイル一式
```

## 原版との違い

| 項目 | 原版 | 本書き直し版 |
|------|------|-------------|
| PSD パーサー | Go → WebAssembly | ag-psd（純 JS） |
| UI フレームワーク | Bootstrap 3 + jstree | 手書き CSS |
| バンドラー | webpack | Vite |
| ビルド要件 | Go ツールチェーン | Node.js のみ |

## ライセンス

MIT
