import { randomBytes } from 'node:crypto';

/**
 * Normalize base URL by removing trailing slashes
 * @param {string} url
 * @returns {string}
 */
export function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

/**
 * Build Basic Authorization header
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {string}
 */
export function buildBasicAuth(clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * Convert object to application/x-www-form-urlencoded format
 * @param {Object} obj
 * @returns {string}
 */
export function toFormUrlEncoded(obj) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  return params.toString();
}

/**
 * Generate random hex string
 * @param {number} bytes - Number of random bytes
 * @returns {string}
 */
export function generateRandomHex(bytes = 32) {
  return randomBytes(bytes).toString('hex');
}

/**
 * Format axios error with OAuth error details
 * @param {Error} error
 * @param {string} context
 * @returns {string}
 */
export function formatOAuthError(error, context = 'request') {
  const response = error.response?.data || {};
  const status = error.response?.status;

  const errorCode = response.error || 'unknown';
  const errorMsg = response.error_description || response.message || error.message || 'Unknown error';

  return `OAuth ${context} failed${status ? ` [${status}]` : ''} (${errorCode}): ${errorMsg}`;
}

/**
 * Redact sensitive information for logging
 * @param {string} str
 * @param {number} keepChars - Number of characters to keep visible
 * @returns {string}
 */
export function redactSecret(str, keepChars = 4) {
  if (!str) return '';
  return str.slice(0, keepChars) + '...[redacted]';
}
