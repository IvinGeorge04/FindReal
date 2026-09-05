const path = require('path');

// Ensure module resolution looks into frontend/node_modules where dependencies were pre-installed
const frontendNodeModules = path.resolve(__dirname, '../../../frontend/node_modules');
if (!process.env.NODE_PATH || !process.env.NODE_PATH.includes(frontendNodeModules)) {
  process.env.NODE_PATH = (process.env.NODE_PATH ? process.env.NODE_PATH + ';' : '') + frontendNodeModules;
  require('module').Module._initPaths();
}
