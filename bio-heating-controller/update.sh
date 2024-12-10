#!/bin/bash

# Load NVM (ensures Node.js is available)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

git pull origin master

# Verify node, npm, and tsc versions
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "TSC version: $(npx tsc -v)"

# Clear TypeScript cache
npx tsc --build --clean

# Run your TypeScript build
npx tsc --build
