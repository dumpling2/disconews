const EventEmitter = require('events');

/**
 * パフォーマンス監視クラス
 */
class PerformanceMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = new Map();
    this.activeOperations = new Map();
  }

  /**
   * 操作の開始を記録
   * @param {string} operation - 操作名
   * @param {Object} metadata - 追加メタデータ
   * @returns {string} 操作ID
   */
  start(operation, metadata = {}) {
    const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.activeOperations.set(operationId, {
      operation,
      startTime: process.hrtime.bigint(),
      startMemory: process.memoryUsage(),
      metadata,
    });

    return operationId;
  }

  /**
   * 操作の終了を記録
   * @param {string} operationId - 操作ID
   * @param {Object} result - 操作結果の情報
   */
  end(operationId, result = {}) {
    const operationData = this.activeOperations.get(operationId);
    if (!operationData) {
      console.warn(`警告: 不明な操作ID: ${operationId}`);
      return;
    }

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    const duration = Number(endTime - operationData.startTime) / 1000000; // ナノ秒をミリ秒に変換

    const metric = {
      operation: operationData.operation,
      duration,
      memoryUsed: endMemory.heapUsed - operationData.startMemory.heapUsed,
      timestamp: new Date(),
      metadata: operationData.metadata,
      result,
    };

    // メトリクスを保存
    if (!this.metrics.has(operationData.operation)) {
      this.metrics.set(operationData.operation, []);
    }

    const operationMetrics = this.metrics.get(operationData.operation);
    operationMetrics.push(metric);

    // 最新100件のみ保持
    if (operationMetrics.length > 100) {
      operationMetrics.shift();
    }

    // アクティブ操作から削除
    this.activeOperations.delete(operationId);

    // イベント発火
    this.emit('operationComplete', metric);

    // 警告チェック
    this.checkPerformanceWarnings(metric);
  }

  /**
   * パフォーマンス警告をチェック
   * @param {Object} metric - メトリクス
   */
  checkPerformanceWarnings(metric) {
    const { operation, duration, memoryUsed } = metric;

    // 実行時間の警告（操作によって閾値を調整）
    const durationThresholds = {
      rss_fetch: 30000, // RSS取得: 30秒
      game_scrape: 60000, // ゲームスクレイピング: 60秒
      ai_filter: 5000, // AIフィルタリング: 5秒
      discord_post: 10000, // Discord投稿: 10秒
      default: 15000, // デフォルト: 15秒
    };

    const threshold = durationThresholds[operation] || durationThresholds.default;

    if (duration > threshold) {
      this.emit('performanceWarning', {
        type: 'slowOperation',
        operation,
        duration,
        threshold,
        message: `操作 "${operation}" が${(duration / 1000).toFixed(2)}秒かかりました（閾値: ${(threshold / 1000).toFixed(2)}秒）`,
      });
    }

    // メモリ使用量の警告（10MB以上）
    if (memoryUsed > 10 * 1024 * 1024) {
      this.emit('performanceWarning', {
        type: 'highMemoryUsage',
        operation,
        memoryUsed,
        message: `操作 "${operation}" で${(memoryUsed / 1024 / 1024).toFixed(2)}MB のメモリを消費しました`,
      });
    }
  }

  /**
   * 操作の統計を取得
   * @param {string} operation - 操作名
   * @returns {Object} 統計情報
   */
  getStats(operation) {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map((m) => m.duration);
    const memoryUsages = metrics.map((m) => m.memoryUsed);

    return {
      operation,
      count: metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      avgMemoryUsage: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
      recentMetrics: metrics.slice(-10), // 最新10件
    };
  }

  /**
   * 全操作の統計を取得
   * @returns {Object} 全統計情報
   */
  getAllStats() {
    const stats = {};
    for (const operation of this.metrics.keys()) {
      stats[operation] = this.getStats(operation);
    }
    return stats;
  }

  /**
   * システム全体のパフォーマンス情報を取得
   * @returns {Object} システム情報
   */
  getSystemInfo() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      uptime: process.uptime(),
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        rss: memUsage.rss,
      },
      cpu: cpuUsage,
      activeOperations: this.activeOperations.size,
      timestamp: new Date(),
    };
  }
}

/**
 * 関数の実行時間を測定するデコレータ
 * @param {string} operationName - 操作名
 * @param {PerformanceMonitor} monitor - パフォーマンスモニター
 * @returns {Function} デコレータ関数
 */
function measurePerformance(operationName, monitor) {
  return function (target, propertyName, descriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args) {
      const operationId = monitor.start(operationName, { args: args.length });

      try {
        const result = await method.apply(this, args);
        monitor.end(operationId, { success: true, resultSize: JSON.stringify(result).length });
        return result;
      } catch (error) {
        monitor.end(operationId, { success: false, error: error.message });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * グローバルパフォーマンスモニター
 */
const globalMonitor = new PerformanceMonitor();

// 警告をログに出力
globalMonitor.on('performanceWarning', (warning) => {
  console.warn(`⚠️ パフォーマンス警告: ${warning.message}`);
});

module.exports = {
  PerformanceMonitor,
  measurePerformance,
  globalMonitor,
};
