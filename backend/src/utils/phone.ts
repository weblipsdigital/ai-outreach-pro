/**
 * Phone number normalization to E.164 standard.
 * Handles common international formats, spaces, dashes, brackets.
 */
export function normalizePhoneToE164(rawPhone: string | null | undefined, defaultCountryCode = '1'): string | null {
  if (!rawPhone) return null;

  // Trim whitespace
  const trimmed = rawPhone.trim();
  if (!trimmed) return null;

  // Check if string contains illegal characters
  // Keep +, numbers
  const cleaned = trimmed.replace(/[^\d+]/g, '');

  if (!cleaned) return null;

  if (cleaned.startsWith('+')) {
    const digitsOnly = cleaned.substring(1);
    // E.164 requires 7 to 15 digits
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return `+${digitsOnly}`;
    }
    return null;
  }

  // Handle leading zeros (e.g. 0044 -> +44)
  if (cleaned.startsWith('00')) {
    const digitsOnly = cleaned.substring(2);
    if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
      return `+${digitsOnly}`;
    }
    return null;
  }

  // If local 10-digit number without country code, apply default country code
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+${defaultCountryCode}${digits}`;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}
