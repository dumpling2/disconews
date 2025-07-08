# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
## 必ず行うこと
- 開発後必ずテストを行う
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
disconews/
├── src/
│   ├── index.js      # エントリーポイント
│   ├── bot/          # Discord Bot 関連
│   │   ├── client.js # Discord クライアント設定
│   │   └── commands/ # コマンド実装
│   ├── news/         # ニュース取得機能
│   │   ├── rss.js    # RSS フィード処理
│   │   ├── api.js    # News API 統合
│   │   └── scraper.js # Webスクレイピング
│   └── utils/        # ユーティリティ
│       ├── filter.js  # ニュースフィルタリング
│       └── format.js  # メッセージフォーマット
├── config/           # 設定ファイル
│   └── sources.json  # ニュースソース設定
├── tests/            # テストコード
├── .env.example      # 環境変数の例
├── .gitignore        # Git除外設定
├── package.json      # プロジェクト設定
└── README.md         # プロジェクトドキュメント
```

## アーキテクチャ概要
- **モジュラー設計**: 機能ごとに分離されたモジュール
- **非同期処理**: Promise/async-await による効率的な並列処理
- **エラーハンドリング**: 各レイヤーでの適切なエラー処理
- **設定の外部化**: 環境変数と設定ファイルによる柔軟な構成

## 開発時の注意事項
- Discord Token は絶対にコミットしない
- .env ファイルは .gitignore に含める
- ニュース取得のレート制限に注意
- エラーハンドリングを適切に実装

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