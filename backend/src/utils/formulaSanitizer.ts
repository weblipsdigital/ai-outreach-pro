/**
 * Sanitizes input to defend against CSV / Spreadsheet formula injection.
 * Formula triggers in Excel, Google Sheets, LibreOffice: =, +, -, @, \t, \r
 */
export function sanitizeFormula(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (!str) return '';

  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];
  const firstChar = str.charAt(0);

  if (dangerousPrefixes.includes(firstChar)) {
    // Prefix with single quote to force spreadsheet to treat as literal text
    return `'${str}`;
  }

  return str;
}

/**
 * Sanitizes an entire object of lead fields to prevent formula injection
 */
export function sanitizeRecord<T extends Record<string, any>>(record: T): T {
  const result: any = {};
  for (const [key, val] of Object.entries(record)) {
    if (typeof val === 'string') {
      result[key] = sanitizeFormula(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}
