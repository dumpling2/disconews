require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

// モジュールのインポート
const { fetchMultipleFeeds, removeDuplicates } = require('./news/rss');
const { scrapeMultipleGames } = require('./news/scraper');
const { filterAINews } = require('./utils/filter');
const { formatArticleEmbed, formatSummaryEmbed, formatErrorEmbed } = require('./utils/format');
const { initializeCommands, registerSlashCommands, handleInteraction } = require('./bot/commandHandler');
const { ErrorHandler, ERROR_LEVELS } = require('./utils/errorHandler');

// Discord クライアントの初期化
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// 設定ファイルの読み込み
let config = null;
let errorHandler = null;

async function loadConfig() {
  try {
    const configPath = path.join(__dirname, '..', 'config', 'sources.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    config = JSON.parse(configData);
    console.log('✅ Config loaded successfully');
  } catch (error) {
    console.error('❌ Error loading config:', error);
    config = { rssFeeds: [], filterSettings: { minRelevanceScore: 20, maxArticlesPerFetch: 10 } };
  }
}

// Bot 起動時の処理
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}!`);
  
  // 設定ファイルの読み込み
  await loadConfig();
  
  // エラーハンドラーの初期化
  errorHandler = new ErrorHandler(client, config);
  
  // コマンドの初期化
  initializeCommands(client);
  await registerSlashCommands(client);
  
  // 定期実行の設定（デフォルト: 1時間ごと）
  const interval = process.env.POST_INTERVAL || 60;
  const cronExpression = `*/${interval} * * * *`;
  
  cron.schedule(cronExpression, async () => {
    console.log('🔄 Scheduled news fetch started...');
    await fetchAndPostNews();
  });
  
  // 初回実行
  console.log('🚀 Initial news fetch...');
  await fetchAndPostNews();
});

// インタラクション（コマンド）の処理
client.on('interactionCreate', async (interaction) => {
  await handleInteraction(interaction, config);
});

// ニュース取得と投稿
async function fetchAndPostNews() {
  try {
    const channelId = process.env.CHANNEL_ID;
    const channel = await client.channels.fetch(channelId);
    
    if (!channel) {
      console.error('❌ Channel not found');
      return;
    }
    
    // 有効なRSSフィードのURLを取得
    const enabledFeeds = config.rssFeeds
      .filter(feed => feed.enabled)
      .map(feed => feed.url);
    
    if (enabledFeeds.length === 0) {
      console.log('⚠️  No enabled RSS feeds found');
      return;
    }
    
    console.log(`📡 Fetching from ${enabledFeeds.length} RSS feeds...`);
    
    let allArticles = [];
    
    // RSSフィードから記事を取得
    if (enabledFeeds.length > 0) {
      const rssArticles = await fetchMultipleFeeds(enabledFeeds);
      console.log(`📰 RSS記事取得: ${rssArticles.length}件`);
      
      // AI関連記事をフィルタリング
      const aiArticles = filterAINews(rssArticles, config.filterSettings.minRelevanceScore);
      console.log(`🤖 AI関連記事: ${aiArticles.length}件`);
      allArticles.push(...aiArticles);
    }
    
    // ゲーム関連ニュースを取得
    const enabledGames = config.gamePatches?.filter(game => game.enabled) || [];
    if (enabledGames.length > 0) {
      console.log(`🎮 ${enabledGames.length}個のゲームソースから取得中...`);
      
      // RSS形式とスクレイピング形式を分離
      const rssGames = enabledGames.filter(game => game.type === 'rss');
      const dynamicGames = enabledGames.filter(game => game.type === 'dynamic');
      
      let gameArticles = [];
      
      // RSS形式のゲームニュース
      if (rssGames.length > 0) {
        const gameRssUrls = rssGames.map(game => game.url);
        const rssGameArticles = await fetchMultipleFeeds(gameRssUrls);
        gameArticles.push(...rssGameArticles);
        console.log(`🎮 RSS ゲームニュース: ${rssGameArticles.length}件`);
      }
      
      // 動的スクレイピング形式
      if (dynamicGames.length > 0) {
        const scrapedArticles = await scrapeMultipleGames(dynamicGames);
        gameArticles.push(...scrapedArticles);
        console.log(`🎮 スクレイピング ゲームニュース: ${scrapedArticles.length}件`);
      }
      
      console.log(`🎮 ゲーム関連記事合計: ${gameArticles.length}件`);
      allArticles.push(...gameArticles);
    }
    
    // 重複を除去
    allArticles = removeDuplicates(allArticles);
    console.log(`🔍 重複除去後: ${allArticles.length}件`);
    
    if (allArticles.length === 0) {
      console.log('ℹ️ 投稿する記事が見つかりませんでした');
      return;
    }
    
    // 日付順にソートして最新記事を選択
    allArticles.sort((a, b) => b.pubDate - a.pubDate);
    const articlesToPost = allArticles.slice(0, config.filterSettings.maxArticlesPerFetch);
    
    // 各記事を個別に投稿
    for (const article of articlesToPost) {
      const embed = formatArticleEmbed(article);
      await channel.send({ embeds: [embed] });
      
      // レート制限対策のため少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ Posted ${articlesToPost.length} articles successfully`);
  } catch (error) {
    console.error('❌ Error in fetchAndPostNews:', error);
    
    // エラーメッセージを送信（可能な場合）
    try {
      const channelId = process.env.CHANNEL_ID;
      const channel = await client.channels.fetch(channelId);
      if (channel) {
        const errorEmbed = formatErrorEmbed(`ニュース取得中にエラーが発生しました: ${error.message}`);
        await channel.send({ embeds: [errorEmbed] });
      }
    } catch (sendError) {
      console.error('❌ Failed to send error message:', sendError);
    }
  }
}

// エラーハンドリング
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Bot ログイン
client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log('🔐 Discord login initiated'))
  .catch(error => {
    console.error('❌ Failed to login to Discord:', error);
    process.exit(1);
  });