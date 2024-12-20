#!/bin/bash

# Load NVM (ensures Node.js is available)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"


echo "Starting git pull at $PWD"
echo "Git pull: $(sudo git pull origin master)"

# Verify node, npm, and tsc versions
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "TSC version: $(npx tsc -v)"

# Run your TypeScript build
/home/bioheating/.nvm/versions/node/v23.3.0/bin/npx tsc --build
