import { expect, test } from 'vitest';
import { comparePasswords, hashPassword } from '../src/lib/auth';

test('hashPassword creates a hash that can be verified', async () => {
  const plain = 'SecurePass123!';
  const hash = await hashPassword(plain);

  expect(hash).not.toBe(plain);
  expect(await comparePasswords(plain, hash)).toBe(true);
  expect(await comparePasswords('wrong-password', hash)).toBe(false);
});
