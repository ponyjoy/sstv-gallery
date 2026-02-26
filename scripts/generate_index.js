const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '../assets/images');
const OUTPUT_FILE = path.join(__dirname, '../data.json');

// Helper to recursively walk directories
function walkDir(dir, callback) {
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const images = [];

console.log(`Scanning ${IMAGES_DIR}...`);

if (fs.existsSync(IMAGES_DIR)) {
    walkDir(IMAGES_DIR, (filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
            // Path relative to project root for web access
            // e.g. assets/images/ISS/Event/Image.jpg
            const relativePath = path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/');

            // Expected structure: assets/images/{Satellite}/{Event}/{Filename}
            const parts = relativePath.split('/');
            // parts[0] = assets, parts[1] = images

            let satellite = 'Unknown';
            let event = 'General';

            if (parts.length >= 4) {
                satellite = parts[2];
                // If there is an event folder
                if (parts.length >= 5) {
                    // Replace underscores with spaces for better display
                    event = parts[3].replace(/_/g, ' ');
                }
            }

            // Try to parse date from filename
            const filename = path.basename(filePath, ext);
            let date = '';

            // Regex for YYYY-MM-DD_HH.MM.SS or YYYY-MM-DD_HH.MM (RXSSTV format)
            // Matches anywhere in filename, e.g., "ISS-2025-04-12_07.09.59"
            const rxsstvMatch = filename.match(/(\d{4})-(\d{2})-(\d{2})[_\s](\d{2})\.(\d{2})(?:\.(\d{2}))?/);

            // Regex for YYYYMMDD_HHMM or YYYYMMDD_HHMMSS (Compact format)
            // Matches anywhere in filename
            const compactMatch = filename.match(/(\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})(?:(\d{2}))?/);

            const dateMatch = rxsstvMatch || compactMatch;

            if (dateMatch) {
                // Construct ISO string with Z to indicate UTC
                // If seconds are missing, default to 00
                const seconds = dateMatch[6] || '00';
                date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}T${dateMatch[4]}:${dateMatch[5]}:${seconds}Z`;
            } else {
                // Fallback to file mtime
                date = fs.statSync(filePath).mtime.toISOString();
            }

            images.push({
                path: relativePath,
                satellite: satellite,
                event: event,
                date: date,
                filename: filename
            });
        }
    });
} else {
    console.warn(`Directory ${IMAGES_DIR} does not exist.`);
}

const jsonContent = JSON.stringify(images, null, 2);
fs.writeFileSync(OUTPUT_FILE, jsonContent);

console.log(`Generated index for ${images.length} images at ${OUTPUT_FILE}`);
