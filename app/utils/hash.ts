import bcryptjs from 'bcryptjs';

// Hash a plain password
export const hashPassword = async (password: string): Promise<string> => {
    const salt = await bcryptjs.genSalt(12);
    const hashedPassword = await bcryptjs.hash(password, salt);
    return hashedPassword;
};

// Verify a plain password against a hashed one
export const verifyPassword = async (
    password: string,
    hashedPassword: string
): Promise<boolean> => {
    const isValid = await bcryptjs.compare(password, hashedPassword);
    return isValid;
};
