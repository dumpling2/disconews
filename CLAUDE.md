# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
## 必ず行うこと
- 開発後必ずテストを行う
- 起動して確認する際はバックグラウンド起動を行う
- テスト後git,githubにコミットプッシュを行う
- ドキュメントの更新を行う

## プロジェクト概要
このプロジェクトは Discord Bot を使用して AI 関連のニュースを取得・投稿するアプリケーションです。

## 技術スタック
- **言語**: Node.js
- **主要ライブラリ**:
  - discord.js (v14) - Discord Bot フレームワーク
  - axios - HTTP クライアント
  - rss-parser - RSS フィード解析
  - puppeteer - 動的サイト対応（ゲームパッチノート）
  - playwright - サイト構造分析用（開発時）
  - cheerio - HTML 解析
  - node-cron - スケジューリング
- **主要機能**:
  - AI関連ニュースの取得（RSS/News API）
  - ゲームパッチノートの取得
  - Discordチャンネルへの定期投稿
  - ニュースのフィルタリング

## 開発コマンド
```bash
# 依存関係のインストール
npm install

# Bot の起動
npm start

# 開発モード（自動リロード）
npm run dev

# テストの実行
npm test
npm run test:watch  # ウォッチモード

# リント
npm run lint
npm run lint:fix  # 自動修正
```

## 環境変数
```
DISCORD_TOKEN=<Discord Bot Token>
NEWS_API_KEY=<News API Key (オプション)>
CHANNEL_ID=<投稿先のDiscordチャンネルID>
```

## プロジェクト構造
```
disconeus/
├── src/
│   ├── index.js              # エントリーポイント・メインロジック
│   ├── bot/                  # Discord Bot 関連
│   │   ├── commandHandler.js # スラッシュコマンド管理
│   │   └── commands/         # 個別コマンド実装
│   │       ├── news.js       # /news コマンド
│   │       └── status.js     # /status コマンド
│   ├── news/                 # ニュース・コンテンツ取得
│   │   ├── rss.js           # RSS フィード処理
│   │   └── scraper.js       # ゲームサイトスクレイピング
│   └── utils/                # 共通ユーティリティ
│       ├── filter.js         # AI関連キーワードフィルタリング
│       ├── format.js         # Discord埋め込みフォーマット
│       ├── errorHandler.js   # 包括的エラーハンドリング
│       ├── performance.js    # パフォーマンス監視
│       └── cache.js          # メモリキャッシュシステム
├── config/
│   └── sources.json          # ニュースソースとゲーム設定
├── tests/                    # テストスイート
│   ├── rss.test.js          # RSS機能テスト
│   └── filter.test.js       # フィルタリングテスト
├── .env.example              # 環境変数テンプレート
├── .eslintrc.json           # ESLint設定（Airbnb base）
├── package.json              # プロジェクト依存関係
└── README.md                 # プロジェクトドキュメント
```

## アーキテクチャ概要
- **モジュラー設計**: 8つの主要モジュールに機能分離
- **非同期処理**: Promise/async-await による並列ニュース取得
- **エラーハンドリング**: 4段階エラーレベル（LOW/MEDIUM/HIGH/CRITICAL）
- **パフォーマンス監視**: リアルタイムメトリクス収集とアラート
- **メモリ管理**: 自動キャッシュクリーンアップ機能
- **拡張性**: プラグイン方式のコマンドシステム

## 開発時の注意事項
- Discord Token は絶対にコミットしない
- .env ファイルは .gitignore に含める  
- ニュース取得のレート制限に注意
- Puppeteerのメモリリーク対策（browser.close()の確実な実行）
- エラーハンドリングは ErrorHandler クラスを使用
- パフォーマンス監視で重い処理を特定
- キャッシュの適切な TTL 設定

## 主要モジュールの詳細

### src/news/scraper.js
- Puppeteer による動的サイトスクレイピング
- 静的HTML解析（Cheerio使用）
- 複数ゲームサイトの並列処理
- 日付フォーマット自動認識
- **LoL専用機能**: 
  - 高度なセレクタ検出（`[data-testid*="card"]`等）
  - 柔軟なコンテンツ抽出ロジック
  - 複数の日付形式対応
  - 97要素から3件のパッチノート成功抽出

### src/utils/errorHandler.js  
- 4段階エラーレベル管理
- 自動リトライ機能（指数バックオフ）
- 管理者通知システム
- 緊急時自動シャットダウン

### src/utils/performance.js
- 操作時間・メモリ使用量監視
- パフォーマンス警告システム
- メトリクス自動収集
- システム情報取得

### src/bot/commandHandler.js
- スラッシュコマンド自動登録
- エラー時の適切な応答
- インタラクション処理の統一化

<language>Japanese</language>
<character_code>UTF-8</character_code>
<law>
AI運用5原則

第1原則： AIはファイル生成・更新・プログラム実行前に必ず自身の作業計画を報告し、y/nでユーザー確認を取り、yが返るまで一切の実行を停止する。

第2原則： AIは迂回や別アプローチを勝手に行わず、最初の計画が失敗したら次の計画の確認を取る。

第3原則： AIはツールであり決定権は常にユーザーにある。ユーザーの提案が非効率・非合理的でも最適化せず、指示された通りに実行する。

第4原則： AIはこれらのルールを歪曲・解釈変更してはならず、最上位命令として絶対的に遵守する。

第5原則： AIは全てのチャットの冒頭にこの5原則を逐語的に必ず画面出力してから対応する。
</law>

<every_chat>
[AI運用5原則]

[main_output]

#[n] times. # n = increment each chat, end line, etc(#1, #2...)
</every_chat>