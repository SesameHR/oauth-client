/**
 * In-memory store with TTL and automatic cleanup
 * For production in clusters/serverless, use Redis or similar distributed store
 */
export class InMemoryTTLStore {
  constructor({ ttlMs = 600_000, max = 10_000, cleanupIntervalMs = 60_000 } = {}) {
    this.ttlMs = ttlMs;
    this.max = max;
    this._store = new Map();

    // Periodic cleanup to prevent memory leaks
    this._cleanupTimer = setInterval(
      () => this.cleanup(),
      Math.min(cleanupIntervalMs, ttlMs)
    );
    this._cleanupTimer.unref?.(); // Don't prevent Node.js from exiting
  }

  /**
   * Set a value with expiration
   * @param {string} key
   * @param {*} value
   * @param {number} expiresAt - Timestamp in ms (defaults to now + ttlMs)
   */
  set(key, value, expiresAt = Date.now() + this.ttlMs) {
    // Aggressive cleanup if we hit the limit
    if (this._store.size >= this.max) {
      this.cleanup(true);
    }
    this._store.set(key, { value, expiresAt });
  }

  /**
   * Get a value if not expired
   * @param {string} key
   * @returns {*} The value or undefined
   */
  get(key) {
    const record = this._store.get(key);
    if (!record) return undefined;

    if (record.expiresAt <= Date.now()) {
      this._store.delete(key);
      return undefined;
    }

    return record.value;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== undefined;
  }

  /**
   * Delete a key
   * @param {string} key
   */
  delete(key) {
    this._store.delete(key);
  }

  /**
   * Clean up expired entries
   * @param {boolean} aggressive - If true, cleanup all entries (used when hitting max limit)
   */
  cleanup(aggressive = false) {
    const now = Date.now();
    for (const [key, record] of this._store.entries()) {
      if (aggressive || record.expiresAt <= now) {
        this._store.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup timer (call when shutting down)
   */
  stop() {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }

  /**
   * Get current store size (for testing/monitoring)
   */
  get size() {
    return this._store.size;
  }
}
