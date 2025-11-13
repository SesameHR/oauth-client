import axios from 'axios';
import { InMemoryTTLStore } from './utils/InMemoryTTLStore.js';
import {
  normalizeBaseUrl,
  buildBasicAuth,
  toFormUrlEncoded,
  generateRandomHex,
  formatOAuthError,
} from './utils/helpers.js';

/**
 * Sesame SSO Authentication Library
 * OAuth 2.0 client for Sesame SSO - BACKEND ONLY
 *
 * SECURITY WARNING: This library is designed for backend use only.
 * Never use this in frontend applications as it requires the client secret.
 *
 * @example
 * const sso = new SesameSSO({
 *   ssoBaseUrl: 'http://localhost:8000',
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   redirectUri: 'http://localhost:3000/callback'
 * });
 */
export class SesameSSO {
  constructor(config, options = {}) {
    // Validate required config
    if (!config?.ssoBaseUrl || !config?.clientId || !config?.clientSecret || !config?.redirectUri) {
      throw new Error(
        'Missing required configuration: ssoBaseUrl, clientId, clientSecret, redirectUri'
      );
    }

    this.ssoBaseUrl = normalizeBaseUrl(config.ssoBaseUrl);
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.redirectUri = config.redirectUri;

    // Options with defaults
    this.defaultScope = options.defaultScope || '';
    this.timeout = options.timeout || 10_000;

    // Pluggable state store (defaults to in-memory)
    this._stateStore = options.stateStore || new InMemoryTTLStore();

    // Create axios instance with baseURL and timeout
    this._http = axios.create({
      baseURL: this.ssoBaseUrl,
      timeout: this.timeout,
      validateStatus: (status) => status >= 200 && status < 300,
    });
  }

  /**
   * Generate OAuth authorization URL for login with CSRF protection
   *
   * @param {Object} params - Optional parameters
   * @param {string} params.scope - OAuth scopes (default: empty for basic OAuth)
   * @param {Object} params.extraParams - Additional query params (prompt, login_hint, etc.)
   * @returns {Object} Object containing { url: string, state: string }
   *
   * @example
   * const { url, state } = sso.getLoginUrl();
   * res.redirect(url);
   */
  getLoginUrl({ scope, extraParams = {} } = {}) {
    const state = generateRandomHex(32);
    const finalScope = scope !== undefined ? scope : this.defaultScope;

    // Store state for CSRF validation (10 minute expiry)
    this._stateStore.set(state, { createdAt: Date.now() });

    // Build authorization URL using URL/URLSearchParams for proper encoding
    const url = new URL('/oauth/authorize', this.ssoBaseUrl);
    const params = {
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      state,
      ...extraParams,
    };

    // Only add scope if not empty
    if (finalScope) {
      params.scope = finalScope;
    }

    url.search = new URLSearchParams(params).toString();

    return { url: url.toString(), state };
  }

  /**
   * Validate state parameter for CSRF protection
   * @param {string} state - The state parameter from the callback
   * @returns {boolean} True if valid, false otherwise
   * @private
   */
  _validateState(state) {
    if (!state || !this._stateStore.has(state)) {
      return false;
    }

    // Remove state after validation (one-time use)
    this._stateStore.delete(state);
    return true;
  }

  /**
   * Exchange authorization code for access token
   * Uses application/x-www-form-urlencoded and Basic Auth (RFC 6749 compliant)
   *
   * @param {string} code - The authorization code
   * @returns {Promise<Object>} Token response from server
   * @private
   */
  async _fetchToken(code) {
    const body = toFormUrlEncoded({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
    });

    try {
      const { data } = await this._http.post('/oauth/token', body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: buildBasicAuth(this.clientId, this.clientSecret),
        },
      });

      if (!data?.access_token) {
        throw new Error('Token response missing access_token');
      }

      return data;
    } catch (error) {
      throw new Error(formatOAuthError(error, 'token exchange'));
    }
  }

  /**
   * Get user information from userinfo endpoint
   *
   * @param {string} accessToken - The access token
   * @returns {Promise<Object>} User information
   */
  async getUserInfo(accessToken) {
    if (!accessToken) {
      throw new Error('access_token is required');
    }

    try {
      const { data } = await this._http.get('/api/oauth/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return data;
    } catch (error) {
      throw new Error(formatOAuthError(error, 'userinfo fetch'));
    }
  }

  /**
   * Get Sesame-specific credentials (private_token, public_token, region)
   *
   * @param {string} accessToken - The access token
   * @returns {Promise<Object>} Sesame credentials
   */
  async getSesameCredentials(accessToken) {
    if (!accessToken) {
      throw new Error('access_token is required');
    }

    try {
      const { data } = await this._http.get('/api/oauth/sesame-token', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return data;
    } catch (error) {
      throw new Error(formatOAuthError(error, 'sesame credentials fetch'));
    }
  }

  /**
   * Exchange authorization code for tokens and optionally fetch user data
   *
   * @param {string} code - The authorization code from the callback
   * @param {string} state - The state parameter from the callback (for CSRF validation)
   * @param {Object} options - Optional fetch options
   * @param {boolean} options.includeUserInfo - Fetch user info (default: true)
   * @param {boolean} options.includeSesameCredentials - Fetch Sesame credentials (default: true)
   * @returns {Promise<Object>} Object containing accessToken, userData, and sesameCredentials
   *
   * @example
   * // Fetch everything (backward compatible)
   * const result = await sso.exchangeCodeForToken(code, state);
   *
   * @example
   * // Only fetch token
   * const result = await sso.exchangeCodeForToken(code, state, {
   *   includeUserInfo: false,
   *   includeSesameCredentials: false
   * });
   */
  async exchangeCodeForToken(code, state, options = {}) {
    if (!code) {
      throw new Error('Authorization code is required');
    }

    // Validate state for CSRF protection
    if (!this._validateState(state)) {
      throw new Error('Invalid or expired state parameter. Possible CSRF attack.');
    }

    // Default to true for backward compatibility
    const includeUserInfo = options.includeUserInfo !== false;
    const includeSesameCredentials = options.includeSesameCredentials !== false;

    // Step 1: Exchange code for access token
    const tokenData = await this._fetchToken(code);

    const result = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      tokenType: tokenData.token_type,
    };

    // Step 2: Get user info (if requested)
    if (includeUserInfo) {
      result.userData = await this.getUserInfo(tokenData.access_token);
    }

    // Step 3: Get Sesame credentials (if requested)
    if (includeSesameCredentials) {
      result.sesameCredentials = await this.getSesameCredentials(tokenData.access_token);
    }

    return result;
  }

  /**
   * Refresh an access token using a refresh token
   *
   * @param {string} refreshToken - The refresh token
   * @returns {Promise<Object>} New token data
   *
   * @example
   * const newTokens = await sso.refreshToken(oldRefreshToken);
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('refresh_token is required');
    }

    const body = toFormUrlEncoded({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    try {
      const { data } = await this._http.post('/oauth/token', body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: buildBasicAuth(this.clientId, this.clientSecret),
        },
      });

      if (!data?.access_token) {
        throw new Error('Token response missing access_token');
      }

      return data;
    } catch (error) {
      throw new Error(formatOAuthError(error, 'token refresh'));
    }
  }

  /**
   * Revoke a token (RFC 7009)
   *
   * @param {string} token - The token to revoke
   * @param {string} tokenTypeHint - 'access_token' or 'refresh_token'
   * @returns {Promise<boolean>} True if successful
   *
   * @example
   * await sso.revokeToken(accessToken, 'access_token');
   */
  async revokeToken(token, tokenTypeHint = 'access_token') {
    if (!token) {
      throw new Error('token is required');
    }

    const body = toFormUrlEncoded({
      token,
      token_type_hint: tokenTypeHint,
    });

    try {
      await this._http.post('/oauth/revoke', body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: buildBasicAuth(this.clientId, this.clientSecret),
        },
      });

      return true;
    } catch (error) {
      // Some servers return 200 even if token doesn't exist
      if (error.response?.status === 404) {
        throw new Error('Token revocation endpoint not found at /oauth/revoke');
      }
      throw new Error(formatOAuthError(error, 'token revoke'));
    }
  }

  /**
   * Stop the state store cleanup timer (call when shutting down)
   */
  destroy() {
    if (this._stateStore?.stop) {
      this._stateStore.stop();
    }
  }
}

export default SesameSSO;
