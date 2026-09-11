/**
 * Script to add OnePassDB.ensureHydrated() to all OnePass API routes.
 * Run with: node scripts/add-hydration.js
 */
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'src', 'app', 'api', 'onepass');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has ensureHydrated
    if (content.includes('ensureHydrated')) {
        console.log(`  SKIP (already has ensureHydrated): ${filePath}`);
        return;
    }
    
    // Skip if doesn't import OnePassDB
    if (!content.includes('OnePassDB')) {
        console.log(`  SKIP (no OnePassDB import): ${filePath}`);
        return;
    }

    let modified = false;

    // Find all route handler functions and add ensureHydrated after try {
    // Pattern: export async function GET/POST/PATCH/PUT/DELETE(...) {\n    try {
    const handlerPattern = /(export async function (?:GET|POST|PATCH|PUT|DELETE)\([^)]*\)\s*\{[\s\S]*?)\n(\s*try\s*\{)/g;
    
    content = content.replace(handlerPattern, (match, before, tryBlock) => {
        modified = true;
        // Get the indentation of the try block
        const indent = tryBlock.match(/^(\s*)/)[1];
        const innerIndent = indent + '    ';
        return `${before}\n${tryBlock}\n${innerIndent}await OnePassDB.ensureHydrated();`;
    });

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  UPDATED: ${filePath}`);
    } else {
        // Try alternative pattern for functions that don't have try blocks
        // or have the try block on the same line
        const altPattern = /(export async function (?:GET|POST|PATCH|PUT|DELETE)\([^)]*\)\s*\{\s*\n\s*try\s*\{\s*\n)/g;
        content = fs.readFileSync(filePath, 'utf8'); // re-read
        const newContent = content.replace(altPattern, (match) => {
            modified = true;
            // Find indentation
            const lines = match.split('\n');
            const tryLine = lines.find(l => l.includes('try'));
            const indent = tryLine ? tryLine.match(/^(\s*)/)[1] : '        ';
            return match + indent + '    await OnePassDB.ensureHydrated();\n';
        });

        if (modified) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`  UPDATED (alt): ${filePath}`);
        } else {
            console.log(`  SKIP (no matching pattern): ${filePath}`);
        }
    }
}

function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(fullPath);
        } else if (entry.name === 'route.js' || entry.name === 'route.ts') {
            console.log(`Processing: ${fullPath}`);
            processFile(fullPath);
        }
    }
}

console.log('Adding OnePassDB.ensureHydrated() to all OnePass API routes...\n');
walkDir(API_DIR);
console.log('\nDone!');
