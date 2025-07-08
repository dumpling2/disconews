const { EmbedBuilder } = require('discord.js');

/**
 * 記事をDiscord埋め込みに変換
 * @param {Object} article - 記事オブジェクト
 * @returns {EmbedBuilder} Discord埋め込みオブジェクト
 */
function formatArticleEmbed(article) {
  const embed = new EmbedBuilder()
    .setTitle(truncate(article.title, 256))
    .setURL(article.link)
    .setDescription(truncate(article.description, 4096))
    .setTimestamp(article.pubDate)
    .setFooter({ text: article.source });

  // 関連度スコアがある場合は色を設定
  if (article.relevanceScore !== undefined) {
    const color = getColorByScore(article.relevanceScore);
    embed.setColor(color);
  } else {
    embed.setColor(0x0099FF); // デフォルトの青色
  }

  // サムネイル画像があれば追加
  if (article.imageUrl) {
    embed.setThumbnail(article.imageUrl);
  }

  // 著者情報があれば追加
  if (article.author) {
    embed.setAuthor({ name: truncate(article.author, 256) });
  }

  // カテゴリがあればフィールドとして追加
  if (article.categories && article.categories.length > 0) {
    embed.addFields({
      name: 'カテゴリ',
      value: article.categories.slice(0, 5).join(', '),
      inline: true,
    });
  }

  return embed;
}

/**
 * 複数の記事を要約した埋め込みを作成
 * @param {Array} articles - 記事の配列
 * @param {string} title - 埋め込みのタイトル
 * @returns {EmbedBuilder} Discord埋め込みオブジェクト
 */
function formatSummaryEmbed(articles, title = 'AI News Summary') {
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0x0099FF)
    .setTimestamp()
    .setFooter({ text: `${articles.length}件のニュース` });

  // 最初の記事に画像があればサムネイルとして表示
  if (articles.length > 0 && articles[0].imageUrl) {
    embed.setThumbnail(articles[0].imageUrl);
  }

  // 最大25件までフィールドとして追加
  const displayArticles = articles.slice(0, 25);

  displayArticles.forEach((article, index) => {
    const fieldName = `${index + 1}. ${truncate(article.title, 100)}`;
    const fieldValue = `[記事を読む](${article.link})\n${truncate(article.description, 200)}`;

    embed.addFields({
      name: fieldName,
      value: fieldValue,
      inline: false,
    });
  });

  return embed;
}

/**
 * エラーメッセージの埋め込みを作成
 * @param {string} errorMessage - エラーメッセージ
 * @returns {EmbedBuilder} Discord埋め込みオブジェクト
 */
function formatErrorEmbed(errorMessage) {
  return new EmbedBuilder()
    .setTitle('❌ エラー')
    .setDescription(errorMessage)
    .setColor(0xFF0000)
    .setTimestamp();
}

/**
 * 成功メッセージの埋め込みを作成
 * @param {string} message - 成功メッセージ
 * @returns {EmbedBuilder} Discord埋め込みオブジェクト
 */
function formatSuccessEmbed(message) {
  return new EmbedBuilder()
    .setTitle('✅ 成功')
    .setDescription(message)
    .setColor(0x00FF00)
    .setTimestamp();
}

/**
 * 情報メッセージの埋め込みを作成
 * @param {string} title - タイトル
 * @param {string} description - 説明
 * @returns {EmbedBuilder} Discord埋め込みオブジェクト
 */
function formatInfoEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0x0099FF)
    .setTimestamp();
}

/**
 * 文字列を指定した長さで切り詰める
 * @param {string} str - 対象文字列
 * @param {number} maxLength - 最大長
 * @returns {string} 切り詰められた文字列
 */
function truncate(str, maxLength) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength - 3)}...`;
}

/**
 * スコアに基づいて色を取得
 * @param {number} score - 関連度スコア（0-100）
 * @returns {number} Discord色コード
 */
function getColorByScore(score) {
  if (score >= 80) return 0x00FF00; // 緑（高関連度）
  if (score >= 50) return 0xFFFF00; // 黄（中関連度）
  if (score >= 20) return 0xFFA500; // オレンジ（低関連度）
  return 0x808080; // グレー（非常に低い関連度）
}

module.exports = {
  formatArticleEmbed,
  formatSummaryEmbed,
  formatErrorEmbed,
  formatSuccessEmbed,
  formatInfoEmbed,
  truncate,
  getColorByScore,
};
