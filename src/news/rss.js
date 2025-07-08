const Parser = require('rss-parser');

const parser = new Parser();

/**
 * RSS フィードから記事を取得
 * @param {string} feedUrl - RSS フィードのURL
 * @returns {Promise<Array>} 記事の配列
 */
async function fetchRSSFeed(feedUrl) {
  try {
    const feed = await parser.parseURL(feedUrl);

    return feed.items.map((item) => ({
      title: item.title || '',
      link: item.link || '',
      description: item.content || item.contentSnippet || '',
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      author: item.creator || item.author || '',
      categories: item.categories || [],
      source: feed.title || 'Unknown Source',
      feedUrl,
    }));
  } catch (error) {
    console.error(`Error fetching RSS feed from ${feedUrl}:`, error.message);
    return [];
  }
}

/**
 * 複数のRSSフィードから記事を取得
 * @param {Array<string>} feedUrls - RSS フィードURLの配列
 * @returns {Promise<Array>} すべての記事の配列
 */
async function fetchMultipleFeeds(feedUrls) {
  const feedPromises = feedUrls.map((url) => fetchRSSFeed(url));
  const results = await Promise.allSettled(feedPromises);

  const allArticles = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
    } else {
      console.error(`Failed to fetch feed ${feedUrls[index]}:`, result.reason);
    }
  });

  // 日付順にソート（新しい順）
  allArticles.sort((a, b) => b.pubDate - a.pubDate);

  return allArticles;
}

/**
 * 重複記事を除去
 * @param {Array} articles - 記事の配列
 * @returns {Array} 重複を除去した記事の配列
 */
function removeDuplicates(articles) {
  const seen = new Set();
  return articles.filter((article) => {
    const key = article.link || article.title;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

module.exports = {
  fetchRSSFeed,
  fetchMultipleFeeds,
  removeDuplicates,
};
