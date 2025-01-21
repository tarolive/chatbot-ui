// This sicript is to add '('// @ts-nocheck')' to all TypeScript files in the sdk directory.
// This is needed because the SDK auto generated and is currently at least circular dependency error.
const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '../src/sdk');

function addTsNoCheckToFile(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  if (!fileContent.startsWith('// @ts-nocheck')) {
    const newContent = `// @ts-nocheck\n${fileContent}`;
    fs.writeFileSync(filePath, newContent, 'utf8');
  }
}

function processDirectory(directory) {
  fs.readdirSync(directory).forEach(file => {
    const fullPath = path.join(directory, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      addTsNoCheckToFile(fullPath);
    }
  });
}

processDirectory(directoryPath);
console.log('Added // @ts-nocheck to all TypeScript files in the sdk directory.');