import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Security & Admin Authentication', () => {
  const password = 'TestSecureAdminPassword@2026!';
  const jwtSecret = 'outreach_test_secret_key';

  it('hashes passwords securely using bcrypt', async () => {
    const hash = await bcrypt.hash(password, 10);
    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$\d+\$/);

    const matches = await bcrypt.compare(password, hash);
    expect(matches).toBe(true);

    const wrongMatches = await bcrypt.compare('WrongPassword', hash);
    expect(wrongMatches).toBe(false);
  });

  it('generates and verifies JWT admin tokens', () => {
    const userPayload = {
      id: 'admin-test-123',
      email: 'admin@aioutreachpro.local',
      role: 'ADMIN',
    };

    const token = jwt.sign(userPayload, jwtSecret, { expiresIn: '1h' });
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, jwtSecret) as any;
    expect(decoded.id).toBe(userPayload.id);
    expect(decoded.role).toBe('ADMIN');
  });

  it('rejects expired or tampered JWT tokens', () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
    expect(() => jwt.verify(invalidToken, jwtSecret)).toThrow();
  });
});
