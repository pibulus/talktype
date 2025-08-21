#!/bin/bash
# Development server launcher with correct Node version

# Load NVM
source ~/.nvm/nvm.sh

# Use the Node version specified in .nvmrc
nvm use

# Start the dev server
npm run dev