const { formatErrorEmbed } = require('./format');

/**
 * エラーレベルの定義
 */
const ERROR_LEVELS = {
  LOW: 'low', // ログのみ
  MEDIUM: 'medium', // ログ + 管理者通知
  HIGH: 'high', // ログ + 管理者通知 + サービス停止検討
  CRITICAL: 'critical', // ログ + 管理者通知 + 即座サービス停止
};

/**
 * エラーハンドラークラス
 */
class ErrorHandler {
  constructor(client = null, config = {}) {
    this.client = client;
    this.config = config;
    this.errorCount = new Map(); // エラー種別ごとのカウント
    this.lastErrors = []; // 最近のエラーを保持
    this.maxLastErrors = 50;
  }

  /**
   * エラーを処理
   * @param {Error} error - エラーオブジェクト
   * @param {string} context - エラーが発生したコンテキスト
   * @param {string} level - エラーレベル
   * @param {Object} metadata - 追加メタデータ
   */
  async handleError(error, context = 'Unknown', level = ERROR_LEVELS.MEDIUM, metadata = {}) {
    const errorInfo = {
      timestamp: new Date(),
      error: error.message,
      stack: error.stack,
      context,
      level,
      metadata,
    };

    // エラーカウントを増加
    const errorKey = `${context}:${error.name}`;
    this.errorCount.set(errorKey, (this.errorCount.get(errorKey) || 0) + 1);

    // 最近のエラーリストに追加
    this.lastErrors.unshift(errorInfo);
    if (this.lastErrors.length > this.maxLastErrors) {
      this.lastErrors = this.lastErrors.slice(0, this.maxLastErrors);
    }

    // ログ出力
    this.logError(errorInfo);

    // レベルに応じた処理
    switch (level) {
      case ERROR_LEVELS.LOW:
        // ログのみ
        break;

      case ERROR_LEVELS.MEDIUM:
        await this.notifyAdministrator(errorInfo);
        break;

      case ERROR_LEVELS.HIGH:
        await this.notifyAdministrator(errorInfo);
        this.checkForCriticalState();
        break;

      case ERROR_LEVELS.CRITICAL:
        await this.notifyAdministrator(errorInfo, true);
        await this.handleCriticalError(errorInfo);
        break;
    }
  }

  /**
   * エラーをログに出力
   * @param {Object} errorInfo - エラー情報
   */
  logError(errorInfo) {
    const {
      timestamp, error, context, level, metadata,
    } = errorInfo;

    const logLevel = {
      [ERROR_LEVELS.LOW]: 'INFO',
      [ERROR_LEVELS.MEDIUM]: 'WARN',
      [ERROR_LEVELS.HIGH]: 'ERROR',
      [ERROR_LEVELS.CRITICAL]: 'FATAL',
    }[level] || 'ERROR';

    console.log(`[${timestamp.toISOString()}] ${logLevel} - ${context}: ${error}`);

    if (Object.keys(metadata).length > 0) {
      console.log('Metadata:', JSON.stringify(metadata, null, 2));
    }
  }

  /**
   * 管理者に通知
   * @param {Object} errorInfo - エラー情報
   * @param {boolean} urgent - 緊急フラグ
   */
  async notifyAdministrator(errorInfo, urgent = false) {
    if (!this.client || !this.config.adminChannelId) {
      return;
    }

    try {
      const channel = await this.client.channels.fetch(this.config.adminChannelId);
      if (!channel) return;

      const title = urgent ? '🚨 CRITICAL ERROR' : '⚠️ Error Notification';
      const description = [
        `**Context**: ${errorInfo.context}`,
        `**Error**: ${errorInfo.error}`,
        `**Level**: ${errorInfo.level}`,
        `**Time**: ${errorInfo.timestamp.toLocaleString()}`,
      ].join('\n');

      const embed = formatErrorEmbed(description);
      embed.setTitle(title);

      if (urgent) {
        embed.setColor(0xFF0000); // 赤色で強調
      }

      await channel.send({ embeds: [embed] });
    } catch (notificationError) {
      console.error('管理者通知の送信に失敗:', notificationError);
    }
  }

  /**
   * 重要な状態をチェック
   */
  checkForCriticalState() {
    const recentErrors = this.lastErrors.filter(
      (err) => Date.now() - err.timestamp.getTime() < 5 * 60 * 1000, // 5分以内
    );

    if (recentErrors.length > 10) {
      console.warn('⚠️ 高頻度エラーが検出されました。システムの安定性を確認してください。');
    }
  }

  /**
   * クリティカルエラーの処理
   * @param {Object} errorInfo - エラー情報
   */
  async handleCriticalError(errorInfo) {
    console.error('🚨 CRITICAL ERROR - システムを安全に停止します');

    // 緊急時の設定保存
    try {
      await this.saveEmergencyState();
    } catch (saveError) {
      console.error('緊急状態の保存に失敗:', saveError);
    }

    // Graceful shutdown
    setTimeout(() => {
      process.exit(1);
    }, 5000); // 5秒後に強制終了
  }

  /**
   * 緊急状態の保存
   */
  async saveEmergencyState() {
    const fs = require('fs').promises;
    const path = require('path');

    const emergencyData = {
      timestamp: new Date(),
      lastErrors: this.lastErrors.slice(0, 10),
      errorCounts: Object.fromEntries(this.errorCount),
      uptime: process.uptime(),
    };

    const emergencyFile = path.join(__dirname, '..', '..', 'emergency-state.json');
    await fs.writeFile(emergencyFile, JSON.stringify(emergencyData, null, 2));

    console.log('✅ 緊急状態を保存しました:', emergencyFile);
  }

  /**
   * エラー統計を取得
   * @returns {Object} エラー統計
   */
  getErrorStats() {
    const recentErrors = this.lastErrors.filter(
      (err) => Date.now() - err.timestamp.getTime() < 24 * 60 * 60 * 1000, // 24時間以内
    );

    return {
      totalErrors: this.lastErrors.length,
      recentErrors: recentErrors.length,
      errorCounts: Object.fromEntries(this.errorCount),
      lastError: this.lastErrors[0] || null,
    };
  }

  /**
   * 特定のコンテキストでのリトライ処理
   * @param {Function} operation - 実行する操作
   * @param {string} context - コンテキスト
   * @param {number} maxRetries - 最大リトライ回数
   * @param {number} delay - リトライ間隔（ミリ秒）
   * @returns {Promise} 操作結果
   */
  async retry(operation, context, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          await this.handleError(
            error,
            `${context} (最終試行失敗)`,
            ERROR_LEVELS.HIGH,
            { attempts: attempt, maxRetries },
          );
          throw error;
        }

        await this.handleError(
          error,
          `${context} (試行 ${attempt}/${maxRetries})`,
          ERROR_LEVELS.LOW,
          { attempts: attempt, maxRetries },
        );

        // 指数バックオフ
        await new Promise((resolve) => setTimeout(resolve, delay * attempt));
      }
    }

    throw lastError;
  }
}

module.exports = {
  ErrorHandler,
  ERROR_LEVELS,
};
