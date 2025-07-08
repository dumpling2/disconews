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

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log(`🌐 ナビゲート中: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // より長い待機時間でJavaScriptの完全読み込みを待機
    console.log('⏳ コンテンツ読み込み待機中...');
    await page.waitForTimeout(8000);
    
    // LoL専用の高度なセレクタ検出
    let finalSelector = selector;
    if (source.includes('League of Legends') || source.includes('LoL')) {
      console.log('🎮 LoL専用セレクタ検出を実行中...');
      
      const lolSelectors = [
        '[data-testid*="card"]',
        '.sc-985df63-0.cGQgsO',
        'a[href*="patch"]',
        'a[class*="action"]',
        selector // 元のセレクタも試行
      ];
      
      for (const testSelector of lolSelectors) {
        try {
          await page.waitForSelector(testSelector, { timeout: 5000 });
          const elementCount = await page.$$eval(testSelector, els => els.length);
          console.log(`✓ セレクタ "${testSelector}" で${elementCount}個の要素を発見`);
          
          if (elementCount > 0) {
            finalSelector = testSelector;
            break;
          }
        } catch (e) {
          console.log(`✗ セレクタ "${testSelector}" は見つかりませんでした`);
        }
      }
    } else {
      // 通常のサイト用
      try {
        await page.waitForSelector(selector, { timeout: 15000 });
      } catch (error) {
        console.log(`⚠️ セレクタ ${selector} が見つからないため、代替方法を試行中...`);
        await page.waitForSelector('body', { timeout: 10000 });
      }
    }

    // 記事情報を抽出
    const articles = await page.evaluate((sel, sourceName, baseUrl) => {
      const elements = document.querySelectorAll(sel);
      const results = [];

      console.log(`Found ${elements.length} elements with selector: ${sel}`);
      
      elements.forEach((element, index) => {
        let title, link, description, dateText;
        
        // LoL専用の抽出ロジック
        if (sourceName.includes('League of Legends')) {
          console.log(`Processing LoL element ${index}:`, element.innerHTML?.substring(0, 200));
          
          // 要素内のリンクを探す
          const linkEl = element.querySelector('a') || element;
          link = linkEl?.href;
          
          // タイトルを探す（様々なセレクタを試行）
          const titleSelectors = [
            'h1, h2, h3, h4, h5, h6',
            '[class*="title"]',
            '[class*="headline"]',
            '[data-testid*="title"]',
            '.action',
            'a'
          ];
          
          for (const selector of titleSelectors) {
            const titleEl = element.querySelector(selector);
            if (titleEl?.textContent?.trim()) {
              title = titleEl.textContent.trim();
              break;
            }
          }
          
          // タイトルが見つからない場合、要素全体のテキストを使用
          if (!title) {
            const fullText = element.textContent?.trim() || '';
            title = fullText.split('\n')[0]?.trim() || fullText.substring(0, 100);
          }
          
          // 説明文を探す
          const descSelectors = [
            'p',
            '.description',
            '[class*="desc"]',
            '[class*="summary"]'
          ];
          
          for (const selector of descSelectors) {
            const descEl = element.querySelector(selector);
            if (descEl?.textContent?.trim()) {
              description = descEl.textContent.trim();
              break;
            }
          }
          
          if (!description) {
            description = element.textContent?.trim() || '';
          }
          
          // 日付を探す
          const allText = element.textContent || '';
          const datePatterns = [
            /\d{1,2}\/\d{1,2}\/\d{4}/,
            /\d{4}-\d{1,2}-\d{1,2}/,
            /\w+\s+\d{1,2},\s+\d{4}/
          ];
          
          for (const pattern of datePatterns) {
            const dateMatch = allText.match(pattern);
            if (dateMatch) {
              dateText = dateMatch[0];
              break;
            }
          }
          
          console.log(`LoL element ${index}: title="${title}", link="${link}", desc="${description?.substring(0, 50)}"`);
        } else {
          // 通常のサイト用
          const titleEl = element.querySelector('h2, h3, .title, [class*="title"]');
          const linkEl = element.querySelector('a');
          const descEl = element.querySelector('p, .description, .excerpt, .summary');
          const dateEl = element.querySelector('.date, time, [class*="date"]');
          
          title = titleEl?.textContent?.trim();
          link = linkEl?.href;
          description = descEl?.textContent?.trim() || '';
          dateText = dateEl?.textContent?.trim() || '';
        }
        
        // LoL専用の緩い検証条件
        let shouldAdd = false;
        if (sourceName.includes('League of Legends')) {
          // LoLは非常に緩い条件で通す
          shouldAdd = (title && title.length > 1) || (link && link.includes('leagueoflegends.com'));
          console.log(`LoL validation ${index}: title="${title?.substring(0, 30)}", link="${link?.substring(0, 50)}", shouldAdd=${shouldAdd}`);
        } else {
          // 通常サイトは従来通り
          shouldAdd = title && title.length > 2 && link;
        }
        
        if (shouldAdd) {
          // 相対URLを絶対URLに変換
          let fullLink;
          try {
            fullLink = link && link.startsWith('http') ? link : new URL(link || '', baseUrl).href;
          } catch (e) {
            fullLink = baseUrl; // フォールバック
          }
          
          results.push({
            title: title?.substring(0, 200) || `記事 ${index + 1}`,
            link: fullLink,
            description: description?.substring(0, 500) || '',
            dateText: dateText || '',
            source: sourceName,
            feedUrl: baseUrl,
          });
          
          console.log(`Added article ${results.length}: "${title?.substring(0, 50) || 'No title'}..."`);
        } else {
          console.log(`Skipped element ${index}: title="${title?.substring(0, 30) || 'No title'}", link="${link?.substring(0, 50) || 'No link'}"`);
        }
        
        // LoL専用：十分な記事が集まったら処理終了
        if (sourceName.includes('League of Legends') && results.length >= 10) {
          console.log(`LoL: 10件の記事を取得完了、処理を終了`);
          return;
        }
      });
      
      console.log(`Extracted ${results.length} valid articles from ${elements.length} elements`);

      return results;
    }, finalSelector, source, url);

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
