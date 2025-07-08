const { SlashCommandBuilder } = require('discord.js');
const { formatInfoEmbed } = require('../../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Botの状態と設定を表示します'),

  async execute(interaction, config) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const rssFeeds = config.rssFeeds || [];
    const gamePatches = config.gamePatches || [];
    const enabledRss = rssFeeds.filter(feed => feed.enabled).length;
    const enabledGames = gamePatches.filter(game => game.enabled).length;

    const statusInfo = [
      `⏰ **稼働時間**: ${hours}時間 ${minutes}分 ${seconds}秒`,
      `📡 **RSSフィード**: ${enabledRss}/${rssFeeds.length} 有効`,
      `🎮 **ゲームソース**: ${enabledGames}/${gamePatches.length} 有効`,
      `🔍 **最小関連度スコア**: ${config.filterSettings?.minRelevanceScore || 20}`,
      `📊 **最大記事数/回**: ${config.filterSettings?.maxArticlesPerFetch || 10}`,
      `🔄 **投稿間隔**: ${process.env.POST_INTERVAL || 60}分`,
    ].join('\n');

    const embed = formatInfoEmbed('🤖 DiscoNews Bot ステータス', statusInfo);
    
    // 有効なソース一覧を追加
    if (enabledRss > 0) {
      const rssNames = rssFeeds
        .filter(feed => feed.enabled)
        .map(feed => feed.name)
        .join('\n• ');
      embed.addFields({ name: '📰 有効なRSSフィード', value: `• ${rssNames}`, inline: false });
    }

    if (enabledGames > 0) {
      const gameNames = gamePatches
        .filter(game => game.enabled)
        .map(game => game.name)
        .join('\n• ');
      embed.addFields({ name: '🎮 有効なゲームソース', value: `• ${gameNames}`, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  },
};