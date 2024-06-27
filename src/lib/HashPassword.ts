import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hashes a plain text password.
 * @param {string} password - The plain text password to hash.
 * @returns {Promise<string>} - A promise that resolves to the hashed password.
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (err) {
    // Log and/or handle the error appropriately
    console.error('Error hashing password:', err);
    throw new Error('Failed to hash password');
  }
}
