const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir(__dirname + '/resources/js', function (filePath) {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        // Replace id: number -> id: string
        // Replace something_id: number -> something_id: string
        // Also handling optional like id?: number
        const newContent = content.replace(/(\b\w*_?id\??):\s*number/gi, '$1: string');
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Updated:', filePath);
        }
    }
});
