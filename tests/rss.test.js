const { fetchRSSFeed, fetchMultipleFeeds, removeDuplicates } = require('../src/news/rss');

describe('RSS Module', () => {
  describe('fetchRSSFeed', () => {
    it('should return an array of articles', async () => {
      // テスト用のRSSフィードURL（実際のテストでは、モックを使用することを推奨）
      const testFeedUrl = 'https://techcrunch.com/category/artificial-intelligence/feed/';
      const articles = await fetchRSSFeed(testFeedUrl);
      
      expect(Array.isArray(articles)).toBe(true);
      
      if (articles.length > 0) {
        const article = articles[0];
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('link');
        expect(article).toHaveProperty('description');
        expect(article).toHaveProperty('pubDate');
        expect(article.pubDate).toBeInstanceOf(Date);
      }
    });

    it('should return empty array for invalid URL', async () => {
      const articles = await fetchRSSFeed('https://invalid-url-that-does-not-exist.com/feed');
      expect(articles).toEqual([]);
    });
  });

  describe('fetchMultipleFeeds', () => {
    it('should fetch from multiple feeds and sort by date', async () => {
      const testFeeds = [
        'https://techcrunch.com/category/artificial-intelligence/feed/',
        'https://invalid-url.com/feed',
      ];
      
      const articles = await fetchMultipleFeeds(testFeeds);
      
      expect(Array.isArray(articles)).toBe(true);
      
      // 日付順にソートされているか確認
      for (let i = 1; i < articles.length; i++) {
        expect(articles[i - 1].pubDate >= articles[i].pubDate).toBe(true);
      }
    });
  });

  describe('removeDuplicates', () => {
    it('should remove duplicate articles based on link', () => {
      const articles = [
        { title: 'Article 1', link: 'https://example.com/1' },
        { title: 'Article 2', link: 'https://example.com/2' },
        { title: 'Article 1 Duplicate', link: 'https://example.com/1' },
        { title: 'Article 3', link: 'https://example.com/3' },
      ];
      
      const unique = removeDuplicates(articles);
      
      expect(unique).toHaveLength(3);
      expect(unique.map(a => a.link)).toEqual([
        'https://example.com/1',
        'https://example.com/2',
        'https://example.com/3',
      ]);
    });

    it('should handle articles without links', () => {
      const articles = [
        { title: 'Article 1', link: null },
        { title: 'Article 1', link: null },
        { title: 'Article 2', link: null },
      ];
      
      const unique = removeDuplicates(articles);
      
      expect(unique).toHaveLength(2);
    });
  });
});