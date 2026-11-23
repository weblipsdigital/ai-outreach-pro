/**
 * Safe logging utility that masks secrets, keys, and tokens.
 */
const SENSITIVE_PATTERNS = [
  /bearer\s+[a-zA-Z0-9_\-\.]+/gi,
  /password["']?\s*[:=]\s*["']?([^"',\s]+)/gi,
  /key["']?\s*[:=]\s*["']?([^"',\s]+)/gi,
  /secret["']?\s*[:=]\s*["']?([^"',\s]+)/gi,
  /token["']?\s*[:=]\s*["']?([^"',\s]+)/gi,
];

export function maskSensitive(text: string): string {
  let masked = text;
  for (const pattern of SENSITIVE_PATTERNS) {
    masked = masked.replace(pattern, (match) => {
      if (match.length <= 8) return '***';
      return match.substring(0, 4) + '***' + match.substring(match.length - 2);
    });
  }
  return masked;
}

export const logger = {
  info: (message: string, meta?: any) => {
    const time = new Date().toISOString();
    console.log(`[INFO ${time}] ${message}`, meta ? maskSensitive(JSON.stringify(meta)) : '');
  },
  warn: (message: string, meta?: any) => {
    const time = new Date().toISOString();
    console.warn(`[WARN ${time}] ${message}`, meta ? maskSensitive(JSON.stringify(meta)) : '');
  },
  error: (message: string, error?: any) => {
    const time = new Date().toISOString();
    console.error(`[ERROR ${time}] ${message}`, error ? maskSensitive(String(error?.stack || error)) : '');
  },
  debug: (message: string, meta?: any) => {
    if (process.env.NODE_ENV === 'development') {
      const time = new Date().toISOString();
      console.debug(`[DEBUG ${time}] ${message}`, meta ? maskSensitive(JSON.stringify(meta)) : '');
    }
  },
};
