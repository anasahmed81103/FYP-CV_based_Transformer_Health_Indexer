const fs = require('fs');
const path = require('path');

const basePath = 'e:\\My work\\My Projects\\FYP\\FYP-CV_based_Transformer_Health_Indexer\\frontend\\src\\app\\api\\transformers\\[id]\\features';

try {
  fs.mkdirSync(basePath, { recursive: true });
  console.log('Directories created successfully:', basePath);
} catch (error) {
  console.error('Error creating directories:', error);
}
