// utils/localStorage.js

export function setItemWithExpiry(key, value, ttlMs) {
    const now = new Date().getTime();
    const item = {
        value,
        expiry: now + ttlMs, // timestamp in ms
    };
    localStorage.setItem(key, JSON.stringify(item));
}

export function getItemWithExpiry(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;

    try {
        const item = JSON.parse(itemStr);
        const now = new Date().getTime();

        if (now > item.expiry) {
            // expired
            localStorage.removeItem(key);
            return null;
        }

        return item.value;
    } catch (err) {
        console.error("Error parsing localStorage item", err);
        localStorage.removeItem(key);
        return null;
    }
}
export function removeItem(key) {
    localStorage.removeItem(key);
}