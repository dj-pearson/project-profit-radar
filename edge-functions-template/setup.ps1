# Setup script for Edge Functions template (PowerShell)

Write-Host "🚀 Setting up Self-Hosted Supabase Edge Functions" -ForegroundColor Green
Write-Host ""

# Check if .env exists
if (Test-Path ".env") {
    Write-Host "⚠️  .env file already exists" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to overwrite it? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "✅ Keeping existing .env file" -ForegroundColor Green
    } else {
        Copy-Item "env.example.txt" ".env"
        Write-Host "✅ Created new .env file from template" -ForegroundColor Green
    }
} else {
    Copy-Item "env.example.txt" ".env"
    Write-Host "✅ Created .env file from template" -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env and add your Supabase credentials"
Write-Host "2. Add your functions to the functions/ directory"
Write-Host "3. Test locally: docker-compose up"
Write-Host "4. Deploy to production (see DEPLOYMENT.md)"
Write-Host ""
Write-Host "Example function structure:" -ForegroundColor Cyan
Write-Host "  functions/"
Write-Host "    ├── my-function/"
Write-Host "    │   └── index.ts"
Write-Host "    └── another-function/"
Write-Host "        └── index.ts"
Write-Host ""
Write-Host "✨ Happy coding!" -ForegroundColor Green

