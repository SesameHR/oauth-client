// Main exports
export { SesameSSO } from './SesameSSO.js';
export { default } from './SesameSSO.js';

// Sesame API integration utilities
export { SesameHelpers } from './SesameHelpers.js';
export { SesameApiClient } from './SesameApiClient.js';

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
