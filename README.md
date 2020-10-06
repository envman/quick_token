node index.js [mode] [path]

# examples
## generate values files from code in ./
node index.js scan ./

## tokenise ./ to dist folder
node index.js generate ./

mode
- scan (generates empty values file)
- generate (applies values to path and creates dist folder)