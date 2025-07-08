require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

// モジュールのインポート
const { fetchMultipleFeeds, removeDuplicates } = require('./news/rss');
const { filterAINews } = require('./utils/filter');
const { formatArticleEmbed, formatSummaryEmbed, formatErrorEmbed } = require('./utils/format');

// Discord クライアントの初期化
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// 設定ファイルの読み込み
let config = null;

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
    
    // RSSフィードから記事を取得
    let articles = await fetchMultipleFeeds(enabledFeeds);
    console.log(`📰 Fetched ${articles.length} articles`);
    
    // 重複を除去
    articles = removeDuplicates(articles);
    console.log(`🔍 After removing duplicates: ${articles.length} articles`);
    
    // AI関連記事をフィルタリング
    const aiArticles = filterAINews(articles, config.filterSettings.minRelevanceScore);
    console.log(`🤖 Found ${aiArticles.length} AI-related articles`);
    
    if (aiArticles.length === 0) {
      console.log('ℹ️  No AI-related news found in this fetch');
      return;
    }
    
    // 最新記事を選択（設定された最大数まで）
    const articlesToPost = aiArticles.slice(0, config.filterSettings.maxArticlesPerFetch);
    
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