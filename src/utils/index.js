import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function parseTicketPoints(pointsStr) {
    if (!pointsStr) return [];
    const str = String(pointsStr).trim();
    if (!str) return [];

    // If string contains newlines, split primarily by line breaks (allows commas inside each line)
    if (str.includes('\n')) {
        return str
            .split(/\r?\n/)
            .map(p => p.trim())
            .filter(p => p.length > 0);
    }

    // Handle escaped commas (\,) and quoted substrings ("...")
    const placeholder = '___ESCAPED_COMMA___';
    const safeStr = str.replace(/\\,/g, placeholder);
    
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < safeStr.length; i++) {
        const char = safeStr[i];
        if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            if (current.trim()) {
                result.push(current.trim().replace(new RegExp(placeholder, 'g'), ','));
            }
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) {
        result.push(current.trim().replace(new RegExp(placeholder, 'g'), ','));
    }

    return result
        .map(p => p.replace(/^["']|["']$/g, '').trim())
        .filter(p => p.length > 0);
}

