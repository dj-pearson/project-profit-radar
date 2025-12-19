#!/bin/bash
# Setup script for Edge Functions template

set -e

echo "🚀 Setting up Self-Hosted Supabase Edge Functions"
echo ""

# Check if .env exists
if [ -f ".env" ]; then
  echo "⚠️  .env file already exists"
  read -p "Do you want to overwrite it? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "✅ Keeping existing .env file"
  else
    cp env.example.txt .env
    echo "✅ Created new .env file from template"
  fi
else
  cp env.example.txt .env
  echo "✅ Created .env file from template"
fi

echo ""
echo "📝 Next steps:"
echo "1. Edit .env and add your Supabase credentials"
echo "2. Add your functions to the functions/ directory"
echo "3. Test locally: docker-compose up"
echo "4. Deploy to production (see DEPLOYMENT.md)"
echo ""
echo "Example function structure:"
echo "  functions/"
echo "    ├── my-function/"
echo "    │   └── index.ts"
echo "    └── another-function/"
echo "        └── index.ts"
echo ""
echo "✨ Happy coding!"

