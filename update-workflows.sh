#!/bin/bash

echo "🔄 Updating cached workflows..."

# Ensure dist/renderer directory exists
mkdir -p dist/renderer

# Copy all JSON files from public to dist/renderer
echo "📋 Copying workflow files..."
cp public/*.json dist/renderer/

echo "✅ Workflows updated successfully!"
echo "📁 Updated files:"
ls -la dist/renderer/*.json 2>/dev/null || echo "No JSON files found"

echo ""
echo "🚀 You can now restart the dev server if needed:"
echo "   npm run dev"
