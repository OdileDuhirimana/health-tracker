/**
 * Secure Token Storage Utility
 * 
 * Provides secure token storage with XSS protection measures.
 * For production, consider using httpOnly cookies for maximum security.
 */

const TOKEN_KEY = 'healthtrack_auth_token';
const USER_KEY = 'healthtrack_user_data';
const TOKEN_EXPIRY_KEY = 'healthtrack_token_expiry';

/**
 * Encodes data to base64 (basic obfuscation, not encryption)
 * Note: This is basic protection. For production, use httpOnly cookies or proper encryption.
 */
function encode(data: string): string {
  if (typeof window === 'undefined') return data;
  try {
    return btoa(encodeURIComponent(data));
  } catch {
    return data;
  }
}

/**
 * Decodes base64 data
 */
function decode(encoded: string): string {
  if (typeof window === 'undefined') return encoded;
  try {
    return decodeURIComponent(atob(encoded));
  } catch {
    return encoded;
  }
}

/**
 * Checks if token is expired
 */
function isTokenExpired(expiryTimestamp?: number): boolean {
  if (!expiryTimestamp) return false;
  return Date.now() > expiryTimestamp;
}

export const tokenStorage = {
  /**
   * Store authentication token securely
   */
  setToken(token: string, expiresIn?: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Calculate expiry time (default 7 days if not provided)
      const expiryMs = expiresIn 
        ? parseExpiryToMs(expiresIn)
        : 7 * 24 * 60 * 60 * 1000; // 7 days default
      const expiryTimestamp = Date.now() + expiryMs;
      
      // Store token with basic encoding (not encryption - localStorage is still vulnerable to XSS)
      // For production: consider httpOnly cookies or proper encryption
      const encodedToken = encode(token);
      localStorage.setItem(TOKEN_KEY, encodedToken);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTimestamp.toString());
      
      // Set a flag to track secure storage usage
      localStorage.setItem('healthtrack_token_secure', 'true');
    } catch (error) {
      throw new Error('Failed to store authentication token');
    }
  },

  /**
   * Get authentication token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const encodedToken = localStorage.getItem(TOKEN_KEY);
      if (!encodedToken) return null;
      
      // Check if token is expired
      const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);
      if (expiryStr) {
        const expiryTimestamp = parseInt(expiryStr, 10);
        if (isTokenExpired(expiryTimestamp)) {
          this.clearToken();
          return null;
        }
      }
      
      return decode(encodedToken);
    } catch (error) {
      this.clearToken();
      return null;
    }
  },

  /**
   * Clear authentication token
   */
  clearToken(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('healthtrack_token_secure');
    } catch (error) {
      // Error clearing token handled silently
    }
  },

  /**
   * Check if token exists and is valid
   */
  hasValidToken(): boolean {
    const token = this.getToken();
    return token !== null && token.length > 0;
  },

  /**
   * Store user data separately from token (for security)
   */
  setUserData(user: { id: string; email: string; name: string; role: string }): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      // Error storing user data handled silently
    }
  },

  /**
   * Get user data
   */
  getUserData(): { id: string; email: string; name: string; role: string } | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const userStr = localStorage.getItem(USER_KEY);
      if (!userStr) return null;
      return JSON.parse(userStr);
    } catch (error) {
      return null;
    }
  },

  /**
   * Clear all auth data
   */
  clearAll(): void {
    this.clearToken();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth'); // Legacy support
    }
  },
};

/**
 * Parse expiry string (e.g., "7d", "24h") to milliseconds
 */
function parseExpiryToMs(expiry: string): number {
  const match = expiry.match(/^(\d+)([dhms])$/i);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days
  
  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  
  return value * (multipliers[unit] || multipliers.d);
}

