const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');

/**
 * 動的サイトからゲームパッチノートを取得
 * @param {Object} config - スクレイピング設定
 * @returns {Promise<Array>} パッチノートの配列
 */
async function scrapeGamePatches(config) {
  const {
    url, selector, type = 'dynamic', name,
  } = config;

  try {
    console.log(`🎮 ${name} のパッチノートを取得中...`);

    if (type === 'static') {
      return await scrapeStaticSite(url, selector, name);
    }
    return await scrapeDynamicSite(url, selector, name);
  } catch (error) {
    console.error(`❌ ${name} のスクレイピングエラー:`, error.message);
    return [];
  }
}

/**
 * 静的サイトをスクレイピング
 * @param {string} url - 対象URL
 * @param {string} selector - CSSセレクタ
 * @param {string} source - ソース名
 * @returns {Promise<Array>} 記事の配列
 */
async function scrapeStaticSite(url, selector, source) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    timeout: 10000,
  });

  const $ = cheerio.load(response.data);
  const articles = [];

  $(selector).each((index, element) => {
    const $el = $(element);
    const title = $el.find('h2, h3, .title, [class*="title"]').first().text().trim();
    const link = $el.find('a').first().attr('href');
    const description = $el.find('p, .description, .excerpt').first().text().trim();
    const dateText = $el.find('.date, time, [class*="date"]').first().text().trim();

    if (title && link) {
      articles.push({
        title,
        link: link.startsWith('http') ? link : new URL(link, url).href,
        description: description || '',
        pubDate: parseGameDate(dateText) || new Date(),
        author: '',
        categories: ['Game Update', 'Patch Notes'],
        source,
        feedUrl: url,
      });
    }
  });

  return articles.slice(0, 10); // 最新10件まで
}

/**
 * 動的サイトをスクレイピング（Puppeteer使用）
 * @param {string} url - 対象URL
 * @param {string} selector - CSSセレクタ
 * @param {string} source - ソース名
 * @returns {Promise<Array>} 記事の配列
 */
async function scrapeDynamicSite(url, selector, source) {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
      ],
    });

    const page = await browser.newPage();

    // リクエストインターセプト（パフォーマンス向上）
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // ページの読み込み完了を待機
    await page.waitForSelector(selector, { timeout: 10000 });

    // 記事情報を抽出
    const articles = await page.evaluate((sel, sourceName, baseUrl) => {
      const elements = document.querySelectorAll(sel);
      const results = [];

      elements.forEach((element, index) => {
        if (index >= 10) return; // 最新10件まで

        const titleEl = element.querySelector('h2, h3, .title, [class*="title"]');
        const linkEl = element.querySelector('a');
        const descEl = element.querySelector('p, .description, .excerpt, .summary');
        const dateEl = element.querySelector('.date, time, [class*="date"]');

        const title = titleEl?.textContent?.trim();
        const link = linkEl?.href;
        const description = descEl?.textContent?.trim() || '';
        const dateText = dateEl?.textContent?.trim() || '';

        if (title && link) {
          results.push({
            title,
            link: link.startsWith('http') ? link : new URL(link, baseUrl).href,
            description,
            dateText,
            source: sourceName,
            feedUrl: baseUrl,
          });
        }
      });

      return results;
    }, selector, source, url);

    // 日付を解析
    const processedArticles = articles.map((article) => ({
      ...article,
      pubDate: parseGameDate(article.dateText) || new Date(),
      author: '',
      categories: ['Game Update', 'Patch Notes'],
    }));

    return processedArticles;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * ゲーム関連の日付テキストを解析
 * @param {string} dateText - 日付テキスト
 * @returns {Date|null} 解析された日付
 */
function parseGameDate(dateText) {
  if (!dateText) return null;

  try {
    // よくある日付形式を試行
    const patterns = [
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/, // YYYY/MM/DD
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
      /(\d{1,2})\s+(days?|hours?|minutes?)\s+ago/i, // X days ago
    ];

    for (const pattern of patterns) {
      const match = dateText.match(pattern);
      if (match) {
        if (match[0].includes('ago')) {
          const value = parseInt(match[1]);
          const unit = match[2].toLowerCase();
          const now = new Date();

          if (unit.startsWith('day')) {
            now.setDate(now.getDate() - value);
          } else if (unit.startsWith('hour')) {
            now.setHours(now.getHours() - value);
          } else if (unit.startsWith('minute')) {
            now.setMinutes(now.getMinutes() - value);
          }

          return now;
        }
        const date = new Date(dateText);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    // 最後の手段として Date コンストラクタを使用
    const parsed = new Date(dateText);
    return isNaN(parsed.getTime()) ? null : parsed;
  } catch (error) {
    console.warn(`日付解析エラー: ${dateText}`, error.message);
    return null;
  }
}

/**
 * 複数のゲームサイトからパッチノートを取得
 * @param {Array} gameConfigs - ゲーム設定の配列
 * @returns {Promise<Array>} すべてのパッチノートの配列
 */
async function scrapeMultipleGames(gameConfigs) {
  const enabledConfigs = gameConfigs.filter((config) => config.enabled);

  if (enabledConfigs.length === 0) {
    console.log('⚠️ 有効なゲーム設定がありません');
    return [];
  }

  const scrapePromises = enabledConfigs.map((config) => scrapeGamePatches(config));
  const results = await Promise.allSettled(scrapePromises);

  const allPatches = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allPatches.push(...result.value);
    } else {
      console.error(`ゲーム ${enabledConfigs[index].name} のスクレイピング失敗:`, result.reason);
    }
  });

  // 日付順にソート
  allPatches.sort((a, b) => b.pubDate - a.pubDate);

  return allPatches;
}

module.exports = {
  scrapeGamePatches,
  scrapeStaticSite,
  scrapeDynamicSite,
  scrapeMultipleGames,
  parseGameDate,
};
