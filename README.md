# DiscoNews - Discord News Bot

AI関連のニュースやゲームのパッチノートを自動取得してDiscordに投稿するBotです。

## 機能

- RSS フィードからのニュース取得
- News API を使用したニュース取得
- ゲームパッチノートの取得（動的サイト対応）
- AI関連キーワードでのフィルタリング
- 定期的な自動投稿
- リッチな埋め込み表示

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、必要な情報を入力：

```bash
cp .env.example .env
```

### 3. Discord Bot の設定

1. [Discord Developer Portal](https://discord.com/developers/applications) でアプリケーションを作成
2. Bot セクションでトークンを取得
3. `.env` ファイルに `DISCORD_TOKEN` を設定
4. Bot を Discord サーバーに招待

### 4. 起動

```bash
# 本番環境
npm start

# 開発環境（自動リロード）
npm run dev
```

## 開発

### テスト

```bash
npm test
```

### リント

```bash
npm run lint
```

## ディレクトリ構造

```
disconews/
├── src/
│   ├── bot/          # Discord Bot 関連
│   ├── news/         # ニュース取得機能
│   └── utils/        # ユーティリティ
├── config/           # 設定ファイル
├── tests/            # テストコード
└── package.json
```

## ライセンス

MIT