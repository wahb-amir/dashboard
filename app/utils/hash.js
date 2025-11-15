import bcryptjs from 'bcryptjs';

export const hashPassword = async (password) => {
    const salt = await bcryptjs.genSalt(12);
    const hashedPassword = await bcryptjs.hash(password, salt);
    return hashedPassword;
};

export const verifyPassword = async (password, hashedPassword) => {
    const isValid = await bcryptjs.compare(password, hashedPassword);
    return isValid;
};