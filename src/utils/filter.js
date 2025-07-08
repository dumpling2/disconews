/**
 * AI関連キーワードの定義
 */
const AI_KEYWORDS = [
  // 一般的なAI用語
  'AI', '人工知能', 'artificial intelligence',
  'ML', '機械学習', 'machine learning',
  'deep learning', 'ディープラーニング', '深層学習',
  'neural network', 'ニューラルネットワーク',

  // 特定のAI技術
  'NLP', '自然言語処理', 'natural language processing',
  'computer vision', 'コンピュータビジョン', '画像認識',
  'reinforcement learning', '強化学習',
  'transformer', 'トランスフォーマー',

  // AIモデル・サービス
  'ChatGPT', 'GPT-4', 'GPT', 'OpenAI',
  'Claude', 'Anthropic',
  'Gemini', 'Bard', 'Google AI',
  'LLM', 'Large Language Model', '大規模言語モデル',
  'Stable Diffusion', 'Midjourney', 'DALL-E',

  // AI関連企業・組織
  'DeepMind', 'Meta AI', 'Microsoft AI',
  'Hugging Face', 'Cohere', 'Mistral',

  // AI倫理・規制
  'AI ethics', 'AI倫理', 'AI規制',
  'AGI', 'Artificial General Intelligence', '汎用人工知能',
];

/**
 * 記事がAI関連かどうかを判定
 * @param {Object} article - 記事オブジェクト
 * @returns {boolean} AI関連の場合true
 */
function isAIRelated(article) {
  const searchText = `${article.title} ${article.description}`.toLowerCase();

  return AI_KEYWORDS.some((keyword) => {
    const lowerKeyword = keyword.toLowerCase();
    // 英語は単語境界、日本語はそのまま検索
    if (/^[a-zA-Z\s]+$/.test(keyword)) {
      const regex = new RegExp(`\\b${lowerKeyword}\\b`, 'i');
      return regex.test(searchText);
    }
    return searchText.includes(lowerKeyword);
  });
}

/**
 * 記事の関連度スコアを計算
 * @param {Object} article - 記事オブジェクト
 * @returns {number} 関連度スコア（0-100）
 */
function calculateRelevanceScore(article) {
  const searchText = `${article.title} ${article.description}`.toLowerCase();
  let score = 0;
  let matchedKeywords = 0;

  AI_KEYWORDS.forEach((keyword) => {
    const lowerKeyword = keyword.toLowerCase();
    const regex = new RegExp(`\\b${lowerKeyword}\\b`, 'gi');
    const matches = searchText.match(regex);

    if (matches) {
      matchedKeywords += 1;
      // タイトルでのマッチは高スコア
      if (article.title.toLowerCase().includes(lowerKeyword)) {
        score += 10 * matches.length;
      } else {
        score += 5 * matches.length;
      }
    }
  });

  // 複数キーワードマッチでボーナス
  if (matchedKeywords > 1) {
    score += matchedKeywords * 5;
  }

  return Math.min(score, 100);
}

/**
 * AI関連記事をフィルタリング
 * @param {Array} articles - 記事の配列
 * @param {number} minScore - 最小関連度スコア（デフォルト: 10）
 * @returns {Array} フィルタリングされた記事の配列
 */
function filterAINews(articles, minScore = 10) {
  return articles
    .map((article) => ({
      ...article,
      relevanceScore: calculateRelevanceScore(article),
    }))
    .filter((article) => article.relevanceScore >= minScore)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

/**
 * カスタムキーワードでフィルタリング
 * @param {Array} articles - 記事の配列
 * @param {Array} keywords - カスタムキーワードの配列
 * @returns {Array} フィルタリングされた記事の配列
 */
function filterByKeywords(articles, keywords) {
  return articles.filter((article) => {
    const searchText = `${article.title} ${article.description}`.toLowerCase();
    return keywords.some((keyword) => {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'i');
      return regex.test(searchText);
    });
  });
}

module.exports = {
  AI_KEYWORDS,
  isAIRelated,
  calculateRelevanceScore,
  filterAINews,
  filterByKeywords,
};
