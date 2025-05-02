#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// File to modify
const filePath = 'server/routes.ts';

// Read the file content
let content = fs.readFileSync(filePath, 'utf8');

// Regular expression to match all error logging statements without proper error handling
const errorRegex = /(logger\.error\(.*?:.*?)(,\s*error)(.*?\);)/g;

// Replace with proper error handling using our helper function
const fixedContent = content.replace(errorRegex, (match, prefix, errorPart, suffix) => {
  return `${prefix}, handleError(error)${suffix}`;
});

// Write the changes back to the file
fs.writeFileSync(filePath, fixedContent, 'utf8');

console.log('Error handling fixed in server/routes.ts');
