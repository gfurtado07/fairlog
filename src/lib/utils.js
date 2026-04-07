import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with clsx and tailwind-merge
 * @param {...any} inputs - Class inputs
 * @returns {string} - Merged class string
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date string to dd/mm/yyyy format
 * @param {string|Date} dateStr - Date string or Date object
 * @returns {string} - Formatted date
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''

  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr

  if (isNaN(date.getTime())) return ''

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

/**
 * Format a number as currency
 * @param {number} value - Value to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(value, currency = 'USD') {
  if (typeof value !== 'number' || isNaN(value)) return ''

  const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    BRL: 'R$',
    JPY: '¥',
    CNY: '¥',
    INR: '₹',
    AUD: 'A$',
  }

  const symbol = currencySymbols[currency] || '$'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Format price with currency symbol
 * @param {number} value - Value to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} - Formatted price string
 */
export function formatPrice(value, currency = 'USD') {
  return formatCurrency(value, currency)
}

/**
 * Truncate a string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated string
 */
export function truncate(str, maxLength = 100) {
  if (!str || str.length <= maxLength) return str
  return str.substring(0, maxLength - 3) + '...'
}

/**
 * Get initials from a name for use in avatars
 * @param {string} name - Full name
 * @returns {string} - Initials (up to 2 characters)
 */
export function getInitials(name) {
  if (!name) return 'NA'

  return name
    .split(' ')
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
}

/**
 * Generate a UUID v4
 * @returns {string} - Generated UUID
 */
export function generateId() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID()
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export default {
  cn,
  formatDate,
  formatCurrency,
  truncate,
  getInitials,
  generateId,
}
