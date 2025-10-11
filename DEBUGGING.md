# デバッグガイド / Debugging Guide

## VSCode DevContainer環境でのTypeScriptデバッグ

このプロジェクトは、VSCode DevContainerでTypeScriptのデバッグを正しく行えるように設定されています。

### 設定内容

#### 1. tsconfig.json
```json
{
  "compilerOptions": {
    "sourceMap": true,        // ソースマップファイル(.js.map)を生成
    "inlineSources": true,    // ソースマップにTypeScriptコードを埋め込み
    "rootDir": "./src",       // ソースコードのルートディレクトリ
    "outDir": "./dist"        // コンパイル後のファイル出力先
  }
}
```

**重要なポイント:**
- `sourceMap: true` - デバッガーがTypeScriptとJavaScriptを対応付けるために必須
- `inlineSources: true` - ソースマップ内にTypeScriptコードを埋め込むことで、デバッガーがソースファイルを確実に見つけられる
- `rootDir` と `outDir` - ファイルパスの対応付けに使用

#### 2. .vscode/tasks.json
```json
{
  "tasks": [
    {
      "type": "npm",
      "script": "build",
      "label": "npm: build",
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ]
}
```

**役割:**
- TypeScriptをJavaScriptにコンパイルするタスクを定義
- デバッグ前に自動的に実行される

#### 3. .vscode/launch.json
```json
{
  "configurations": [
    {
      "name": "Debug Backtest",
      "type": "node",
      "program": "${workspaceFolder}/dist/backtest.js",  // コンパイル後のJSファイルを実行
      "preLaunchTask": "npm: build",                     // デバッグ前にビルド
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],   // ソースマップ対象ファイル
      "sourceMaps": true                                 // ソースマップを有効化
    }
  ]
}
```

**重要なポイント:**
- `program` - `.ts`ファイルではなく、コンパイル後の`.js`ファイルを指定
- `preLaunchTask` - デバッグ開始前に自動的にビルドを実行
- `outFiles` - デバッガーにコンパイル後のJavaScriptファイルの場所を教える
- `sourceMaps: true` - ソースマップを使用することを明示

### デバッグの使い方

1. **TypeScriptファイルにブレークポイントを設定**
   - `src/backtest.ts` などのファイルを開く
   - 行番号の左側をクリックしてブレークポイントを設定

2. **デバッグ構成を選択**
   - VSCodeのデバッグパネル（Ctrl/Cmd + Shift + D）を開く
   - 以下のいずれかを選択:
     - `Debug Backtest` - バックテストスクリプト
     - `Debug Price Collector` - 価格収集スクリプト
     - `Debug Trading Bot` - 取引ボットスクリプト
     - `Debug Import Historical Data` - 履歴データインポート
     - `Debug current file` - 現在開いているファイル

3. **デバッグ開始**
   - F5キーを押すか、デバッグパネルの「開始」ボタンをクリック
   - 自動的に `npm run build` が実行され、最新のコードがコンパイルされる
   - ブレークポイントで停止し、TypeScriptコードで正しい行が表示される

### トラブルシューティング

#### ブレークポイントがずれる場合

1. **ビルドを確認**
   ```bash
   npm run build
   ```
   最新のコードがコンパイルされているか確認

2. **distフォルダをクリーン**
   ```bash
   rm -rf dist
   npm run build
   ```
   古いファイルを削除して再ビルド

3. **VSCodeをリロード**
   - コマンドパレット（Ctrl/Cmd + Shift + P）
   - "Developer: Reload Window" を実行

4. **DevContainerを再ビルド**
   - コマンドパレット（Ctrl/Cmd + Shift + P）
   - "Dev Containers: Rebuild Container" を実行

#### ソースマップが見つからない場合

ソースマップファイルが正しく生成されているか確認:
```bash
ls -la dist/*.js.map
```

各`.js`ファイルに対応する`.js.map`ファイルが存在するはずです。

#### 自動ビルドが実行されない場合

launch.jsonの`preLaunchTask`が正しく設定されているか確認:
```json
"preLaunchTask": "npm: build"
```

### 利用可能なデバッグ構成

- **Debug current file** - 現在開いているTypeScriptファイルをデバッグ
- **Debug Backtest** - バックテストスクリプト（デフォルト日付範囲）
- **Debug Backtest (Custom Date Range)** - バックテストスクリプト（カスタム日付範囲）
- **Debug Price Collector** - 価格収集スクリプト
- **Debug Trading Bot** - 取引ボットスクリプト
- **Debug Import Historical Data** - 履歴データインポートスクリプト

### 参考情報

- [VSCode Node.js Debugging Guide](https://code.visualstudio.com/docs/nodejs/nodejs-debugging)
- [TypeScript Source Map Documentation](https://www.typescriptlang.org/tsconfig#sourceMap)
- [Source Map Specification](https://sourcemaps.info/spec.html)
