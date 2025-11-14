/**
 * @fileoverview Utility helpers for Sesame API integration
 */

/**
 * Sesame API helper utilities
 */
export class SesameHelpers {
  /**
   * Get the Sesame API base URL for a given region
   * @param {string} region - The region code (e.g., 'eu', 'us', 'eu-4')
   * @returns {string} The base URL for the Sesame API
   * @throws {Error} If region is not provided
   *
   * @example
   * const url = SesameHelpers.getApiUrl('eu');
   * // Returns: 'https://back-eu.sesametime.com'
   *
   * @example
   * const url = SesameHelpers.getApiUrl('eu-4');
   * // Returns: 'https://back-eu-4.sesametime.com'
   */
  static getApiUrl(region) {
    if (!region || typeof region !== 'string') {
      throw new Error('Region is required and must be a string');
    }

    return `https://back-${region.toLowerCase()}.sesametime.com`;
  }

  /**
   * Get the list of employees from Sesame credentials
   * @param {Object} sesameCredentials - The Sesame credentials object from OAuth response
   * @returns {Array} Array of employee objects, or empty array if none
   *
   * @example
   * const employees = SesameHelpers.getEmployees(credentials);
   * // Returns: [{ sesame_employee_id: '123', company_id: '456', ... }]
   */
  static getEmployees(sesameCredentials) {
    if (!sesameCredentials || typeof sesameCredentials !== 'object') {
      return [];
    }

    return Array.isArray(sesameCredentials.employees)
      ? sesameCredentials.employees
      : [];
  }

  /**
   * Check if the user has multiple employee records
   * @param {Object} sesameCredentials - The Sesame credentials object from OAuth response
   * @returns {boolean} True if user has more than one employee record
   *
   * @example
   * const hasMultiple = SesameHelpers.hasMultipleEmployees(credentials);
   * if (hasMultiple) {
   *   // Show employee selector UI
   * }
   */
  static hasMultipleEmployees(sesameCredentials) {
    const employees = this.getEmployees(sesameCredentials);
    return employees.length > 1;
  }

  /**
   * Get the first employee from credentials (useful for single-employee scenarios)
   * @param {Object} sesameCredentials - The Sesame credentials object from OAuth response
   * @returns {Object|null} First employee object or null if none
   *
   * @example
   * const employee = SesameHelpers.getFirstEmployee(credentials);
   * if (employee) {
   *   console.log(employee.sesame_employee_id);
   * }
   */
  static getFirstEmployee(sesameCredentials) {
    const employees = this.getEmployees(sesameCredentials);
    return employees.length > 0 ? employees[0] : null;
  }

  /**
   * Check if user has any employees
   * @param {Object} sesameCredentials - The Sesame credentials object from OAuth response
   * @returns {boolean} True if user has at least one employee
   *
   * @example
   * if (!SesameHelpers.hasEmployees(credentials)) {
   *   throw new Error('User is not associated with any company');
   * }
   */
  static hasEmployees(sesameCredentials) {
    const employees = this.getEmployees(sesameCredentials);
    return employees.length > 0;
  }
}
