/**
 * シンプルなメモリキャッシュクラス
 */
class MemoryCache {
  constructor(defaultTTL = 300000) { // デフォルト5分
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * キャッシュに値を設定
   * @param {string} key - キー
   * @param {*} value - 値
   * @param {number} ttl - 生存時間（ミリ秒）
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * キャッシュから値を取得
   * @param {string} key - キー
   * @returns {*} 値（期限切れまたは存在しない場合はnull）
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * キャッシュから削除
   * @param {string} key - キー
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * 期限切れのアイテムをクリーンアップ
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * キャッシュをクリア
   */
  clear() {
    this.cache.clear();
  }

  /**
   * キャッシュサイズを取得
   */
  size() {
    return this.cache.size;
  }
}

/**
 * グローバルキャッシュインスタンス
 */
const globalCache = new MemoryCache();

// 10分ごとにクリーンアップ
setInterval(() => {
  globalCache.cleanup();
}, 10 * 60 * 1000);

/**
 * 関数の結果をキャッシュするデコレータ
 * @param {Function} fn - キャッシュする関数
 * @param {number} ttl - キャッシュ時間（ミリ秒）
 * @param {Function} keyGenerator - キー生成関数
 * @returns {Function} キャッシュ付きの関数
 */
function withCache(fn, ttl = 300000, keyGenerator = (...args) => JSON.stringify(args)) {
  return async function (...args) {
    const key = `${fn.name}:${keyGenerator(...args)}`;

    // キャッシュから取得を試行
    const cached = globalCache.get(key);
    if (cached !== null) {
      console.log(`📋 Cache hit: ${key}`);
      return cached;
    }

    // キャッシュミスの場合は実行
    console.log(`🔄 Cache miss: ${key}`);
    const result = await fn.apply(this, args);

    // 結果をキャッシュ
    globalCache.set(key, result, ttl);

    return result;
  };
}

module.exports = {
  MemoryCache,
  globalCache,
  withCache,
};
