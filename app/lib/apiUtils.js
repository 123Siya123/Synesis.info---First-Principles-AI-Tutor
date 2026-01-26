/**
 * API Utilities for robust network operations
 * Provides retry logic, timeout handling, and offline detection
 */

/**
 * Fetch with automatic retry and exponential backoff
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} baseDelay - Base delay in ms for exponential backoff (default: 1000)
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 3, baseDelay = 1000) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);

            // Don't retry on client errors (4xx) except for rate limiting (429)
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                return response;
            }

            // Retry on server errors (5xx) or rate limiting (429)
            if (response.status >= 500 || response.status === 429) {
                if (attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt);
                    console.log(`[API] Retry ${attempt + 1}/${maxRetries} after ${delay}ms (status: ${response.status})`);
                    await sleep(delay);
                    continue;
                }
            }

            return response;
        } catch (error) {
            lastError = error;

            // Network errors are retryable
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt);
                console.log(`[API] Retry ${attempt + 1}/${maxRetries} after ${delay}ms (error: ${error.message})`);
                await sleep(delay);
            }
        }
    }

    throw lastError || new Error('Request failed after retries');
}

/**
 * Fetch with timeout - prevents hanging requests
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30000)
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        return response;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeoutMs}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Fetch with both retry and timeout
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {Object} config - Configuration options
 * @param {number} config.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} config.timeoutMs - Timeout per request in ms (default: 30000)
 * @param {number} config.baseDelay - Base delay for exponential backoff (default: 1000)
 * @returns {Promise<Response>}
 */
export async function robustFetch(url, options = {}, config = {}) {
    const { maxRetries = 3, timeoutMs = 30000, baseDelay = 1000 } = config;
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetchWithTimeout(url, options, timeoutMs);

            // Don't retry on client errors (4xx) except for rate limiting (429)
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                return response;
            }

            // Retry on server errors (5xx) or rate limiting (429)
            if (response.status >= 500 || response.status === 429) {
                if (attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt);
                    console.log(`[API] Retry ${attempt + 1}/${maxRetries} after ${delay}ms (status: ${response.status})`);
                    await sleep(delay);
                    continue;
                }
            }

            return response;
        } catch (error) {
            lastError = error;

            // Network errors and timeouts are retryable
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt);
                console.log(`[API] Retry ${attempt + 1}/${maxRetries} after ${delay}ms (error: ${error.message})`);
                await sleep(delay);
            }
        }
    }

    throw lastError || new Error('Request failed after retries');
}

/**
 * Check if the browser is online
 * @returns {boolean}
 */
export function isOnline() {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
        return navigator.onLine;
    }
    return true; // Assume online if we can't detect
}

/**
 * Sleep utility for delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safe localStorage wrapper that handles errors gracefully
 */
export const safeStorage = {
    get(key, defaultValue = null) {
        try {
            if (typeof window === 'undefined' || !window.localStorage) {
                return defaultValue;
            }
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn(`[Storage] Failed to get ${key}:`, error.message);
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            if (typeof window === 'undefined' || !window.localStorage) {
                return false;
            }
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn(`[Storage] Failed to set ${key}:`, error.message);
            return false;
        }
    },

    remove(key) {
        try {
            if (typeof window === 'undefined' || !window.localStorage) {
                return false;
            }
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn(`[Storage] Failed to remove ${key}:`, error.message);
            return false;
        }
    }
};

/**
 * Queue for pending operations when offline
 * Automatically retries when back online
 */
export class OfflineQueue {
    constructor(storageKey = 'offlineQueue') {
        this.storageKey = storageKey;
        this.queue = safeStorage.get(storageKey, []);

        // Set up online listener for automatic retry
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.processQueue());
        }
    }

    add(operation) {
        this.queue.push({
            ...operation,
            timestamp: Date.now()
        });
        safeStorage.set(this.storageKey, this.queue);
    }

    async processQueue() {
        if (!isOnline() || this.queue.length === 0) return;

        console.log(`[OfflineQueue] Processing ${this.queue.length} pending operations`);

        const pendingOps = [...this.queue];
        this.queue = [];
        safeStorage.set(this.storageKey, this.queue);

        for (const op of pendingOps) {
            try {
                if (op.type === 'fetch') {
                    await robustFetch(op.url, op.options);
                }
                // Add more operation types as needed
            } catch (error) {
                console.warn(`[OfflineQueue] Failed to process operation:`, error.message);
                // Re-add failed operations
                this.queue.push(op);
            }
        }

        safeStorage.set(this.storageKey, this.queue);
    }

    get pendingCount() {
        return this.queue.length;
    }
}
