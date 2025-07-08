const {
  isAIRelated,
  calculateRelevanceScore,
  filterAINews,
  filterByKeywords,
} = require('../src/utils/filter');

describe('Filter Module', () => {
  describe('isAIRelated', () => {
    it('should identify AI-related articles', () => {
      const aiArticle = {
        title: 'OpenAI releases new ChatGPT model',
        description: 'The latest AI breakthrough from OpenAI',
      };
      
      expect(isAIRelated(aiArticle)).toBe(true);
    });

    it('should identify non-AI articles', () => {
      const nonAIArticle = {
        title: 'Weather forecast for tomorrow',
        description: 'Sunny with a chance of rain',
      };
      
      expect(isAIRelated(nonAIArticle)).toBe(false);
    });

    it('should match Japanese AI keywords', () => {
      const japaneseArticle = {
        title: '人工知能の最新動向',
        description: '機械学習とディープラーニングの進化について',
      };
      
      expect(isAIRelated(japaneseArticle)).toBe(true);
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should give higher score to title matches', () => {
      const titleMatch = {
        title: 'ChatGPT and AI Revolution',
        description: 'An article about technology',
      };
      
      const descMatch = {
        title: 'Technology News',
        description: 'ChatGPT and AI are changing the world',
      };
      
      const titleScore = calculateRelevanceScore(titleMatch);
      const descScore = calculateRelevanceScore(descMatch);
      
      expect(titleScore).toBeGreaterThan(descScore);
    });

    it('should give bonus for multiple keyword matches', () => {
      const multiKeyword = {
        title: 'OpenAI ChatGPT uses Machine Learning',
        description: 'Deep learning and neural networks power LLM',
      };
      
      const singleKeyword = {
        title: 'AI News',
        description: 'Some general technology content',
      };
      
      const multiScore = calculateRelevanceScore(multiKeyword);
      const singleScore = calculateRelevanceScore(singleKeyword);
      
      expect(multiScore).toBeGreaterThan(singleScore);
    });
  });

  describe('filterAINews', () => {
    it('should filter and sort articles by relevance', () => {
      const articles = [
        {
          title: 'Weather News',
          description: 'Tomorrow will be sunny',
        },
        {
          title: 'ChatGPT Update',
          description: 'OpenAI releases GPT-4 with new features',
        },
        {
          title: 'Stock Market',
          description: 'Markets rise on AI company earnings',
        },
      ];
      
      const filtered = filterAINews(articles, 10);
      
      expect(filtered.length).toBeLessThanOrEqual(articles.length);
      expect(filtered[0].relevanceScore).toBeDefined();
      
      // 関連度順にソートされているか確認
      for (let i = 1; i < filtered.length; i++) {
        expect(filtered[i - 1].relevanceScore).toBeGreaterThanOrEqual(filtered[i].relevanceScore);
      }
    });
  });

  describe('filterByKeywords', () => {
    it('should filter by custom keywords', () => {
      const articles = [
        {
          title: 'League of Legends Patch 13.24',
          description: 'Champion balance changes',
        },
        {
          title: 'AI News',
          description: 'Latest in artificial intelligence',
        },
        {
          title: 'Valorant Update',
          description: 'New agent revealed',
        },
      ];
      
      const gameKeywords = ['League of Legends', 'Valorant'];
      const filtered = filterByKeywords(articles, gameKeywords);
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(article => 
        gameKeywords.some(keyword => 
          article.title.includes(keyword) || article.description.includes(keyword)
        )
      )).toBe(true);
    });
  });
});