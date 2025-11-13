// Main exports
export { SesameSSO } from './SesameSSO.js';
export { default } from './SesameSSO.js';

// Export store for custom implementations
export { InMemoryTTLStore } from './utils/InMemoryTTLStore.js';

// Export helpers for advanced usage
export {
  normalizeBaseUrl,
  buildBasicAuth,
  toFormUrlEncoded,
  generateRandomHex,
  formatOAuthError,
  redactSecret,
} from './utils/helpers.js';
