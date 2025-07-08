const { SlashCommandBuilder } = require('discord.js');
const { fetchMultipleFeeds, removeDuplicates } = require('../../news/rss');
const { scrapeMultipleGames } = require('../../news/scraper');
const { filterAINews, filterByKeywords } = require('../../utils/filter');
const { formatArticleEmbed, formatSummaryEmbed } = require('../../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('news')
    .setDescription('ニュースを手動で取得・表示します')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('取得するニュースのタイプ')
        .setRequired(false)
        .addChoices(
          { name: 'AI関連ニュース', value: 'ai' },
          { name: 'ゲームパッチノート', value: 'game' },
          { name: 'すべて', value: 'all' }
        ))
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('表示する記事数（最大10）')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)),

  async execute(interaction, config) {
    const type = interaction.options.getString('type') || 'ai';
    const count = interaction.options.getInteger('count') || 5;

    await interaction.deferReply();

    try {
      let articles = [];

      if (type === 'ai' || type === 'all') {
        // RSSフィードから記事を取得
        const enabledFeeds = config.rssFeeds
          .filter(feed => feed.enabled)
          .map(feed => feed.url);

        if (enabledFeeds.length > 0) {
          const rssArticles = await fetchMultipleFeeds(enabledFeeds);
          const aiArticles = filterAINews(rssArticles, config.filterSettings.minRelevanceScore);
          articles.push(...aiArticles);
        }
      }

      if (type === 'game' || type === 'all') {
        // ゲームパッチノートを取得
        const enabledGames = config.gamePatches || [];
        if (enabledGames.length > 0) {
          const gameArticles = await scrapeMultipleGames(enabledGames);
          articles.push(...gameArticles);
        }
      }

      // 重複除去とソート
      articles = removeDuplicates(articles);
      articles.sort((a, b) => b.pubDate - a.pubDate);

      if (articles.length === 0) {
        await interaction.editReply('❌ 条件に合う記事が見つかりませんでした。');
        return;
      }

      // 指定された数の記事を表示
      const articlesToShow = articles.slice(0, count);

      if (count === 1 || articlesToShow.length === 1) {
        // 1件の場合は詳細表示
        const embed = formatArticleEmbed(articlesToShow[0]);
        await interaction.editReply({ embeds: [embed] });
      } else {
        // 複数件の場合は要約表示
        const embed = formatSummaryEmbed(articlesToShow, `${type.toUpperCase()} ニュース (${articlesToShow.length}件)`);
        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error('ニュース取得エラー:', error);
      await interaction.editReply('❌ ニュースの取得中にエラーが発生しました。');
    }
  },
};