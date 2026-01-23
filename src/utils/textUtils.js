/**
 * Converts a string to title case
 * @param {string} str - The string to convert
 * @returns {string} The string in title case
 */
export const toTitleCase = (str) => {
    if (!str) return '';
    
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};
