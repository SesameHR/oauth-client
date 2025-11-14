/**
 * @fileoverview Simplified HTTP client for Sesame API
 */

import axios from 'axios';
import { SesameHelpers } from './SesameHelpers.js';

/**
 * Simplified HTTP client for making requests to Sesame API
 *
 * @example
 * const client = SesameApiClient.create(sesameCredentials);
 * const meData = await client.get('/api/v3/security/me-oauth');
 * const employees = await client.get('/api/v3/employees');
 */
export class SesameApiClient {
  /**
   * @private
   */
  constructor(baseURL, token) {
    this.axios = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Create a new SesameApiClient from Sesame credentials
   * @param {Object} sesameCredentials - The Sesame credentials from OAuth response
   * @param {string} sesameCredentials.sesame_private_token - The private token
   * @param {string} sesameCredentials.region - The region code (e.g., 'EU', 'US')
   * @returns {SesameApiClient} Configured API client instance
   * @throws {Error} If credentials are invalid or missing required fields
   *
   * @example
   * const tokens = await sesameAuth.exchangeCodeForToken(code, state);
   * const apiClient = SesameApiClient.create(tokens.sesameCredentials);
   * const userData = await apiClient.get('/api/v3/security/me-oauth');
   */
  static create(sesameCredentials) {
    if (!sesameCredentials || typeof sesameCredentials !== 'object') {
      throw new Error('Sesame credentials are required');
    }

    const { sesame_private_token, region } = sesameCredentials;

    if (!sesame_private_token) {
      throw new Error('sesame_private_token is required in credentials');
    }

    if (!region) {
      throw new Error('region is required in credentials');
    }

    const baseURL = SesameHelpers.getApiUrl(region);
    return new SesameApiClient(baseURL, sesame_private_token);
  }

  /**
   * Make a GET request to the Sesame API
   * @param {string} path - The API endpoint path (e.g., '/api/v3/employees')
   * @param {Object} [config] - Optional axios request config
   * @returns {Promise<any>} Response data
   *
   * @example
   * const employees = await client.get('/api/v3/employees');
   * const meData = await client.get('/api/v3/security/me-oauth');
   */
  async get(path, config = {}) {
    const response = await this.axios.get(path, config);
    return response.data;
  }

  /**
   * Make a POST request to the Sesame API
   * @param {string} path - The API endpoint path
   * @param {Object} [data] - Request body data
   * @param {Object} [config] - Optional axios request config
   * @returns {Promise<any>} Response data
   *
   * @example
   * const newEmployee = await client.post('/api/v3/employees', {
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * });
   */
  async post(path, data = {}, config = {}) {
    const response = await this.axios.post(path, data, config);
    return response.data;
  }

  /**
   * Make a PUT request to the Sesame API
   * @param {string} path - The API endpoint path
   * @param {Object} [data] - Request body data
   * @param {Object} [config] - Optional axios request config
   * @returns {Promise<any>} Response data
   *
   * @example
   * const updated = await client.put('/api/v3/employees/123', {
   *   name: 'Jane Doe'
   * });
   */
  async put(path, data = {}, config = {}) {
    const response = await this.axios.put(path, data, config);
    return response.data;
  }

  /**
   * Make a PATCH request to the Sesame API
   * @param {string} path - The API endpoint path
   * @param {Object} [data] - Request body data
   * @param {Object} [config] - Optional axios request config
   * @returns {Promise<any>} Response data
   *
   * @example
   * const updated = await client.patch('/api/v3/employees/123', {
   *   status: 'active'
   * });
   */
  async patch(path, data = {}, config = {}) {
    const response = await this.axios.patch(path, data, config);
    return response.data;
  }

  /**
   * Make a DELETE request to the Sesame API
   * @param {string} path - The API endpoint path
   * @param {Object} [config] - Optional axios request config
   * @returns {Promise<any>} Response data
   *
   * @example
   * await client.delete('/api/v3/employees/123');
   */
  async delete(path, config = {}) {
    const response = await this.axios.delete(path, config);
    return response.data;
  }

  /**
   * Get the underlying axios instance for advanced usage
   * @returns {import('axios').AxiosInstance} The axios instance
   *
   * @example
   * const axiosInstance = client.getAxiosInstance();
   * axiosInstance.interceptors.request.use(...);
   */
  getAxiosInstance() {
    return this.axios;
  }
}
