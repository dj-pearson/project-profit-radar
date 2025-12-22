# Save this as scripts/bulk-cleanup-siteid.ps1

Write-Host "🔄 Bulk cleanup of siteId references..." -ForegroundColor Cyan

$filesChanged = 0
$totalChanges = 0

# Pattern 1: Remove siteId from destructuring
$files = Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $originalContent = $content
    
    # Remove ", siteId" from destructuring
    $content = $content -replace ',\s*siteId\s*}', ' }'
    $content = $content -replace '{\s*siteId\s*,', '{ '
    
    # Remove .eq('site_id', siteId) from queries
    $content = $content -replace "\.eq\('site_id',\s*siteId\)\s*\.?", '.'
    $content = $content -replace "\.eq\(`"site_id`",\s*siteId\)\s*\.?", '.'
    
    # Remove site_id: siteId from inserts
    $content = $content -replace '\s*site_id:\s*siteId,?\s*', "`n"
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $filesChanged++
        $changes = ($originalContent.Length - $content.Length) / 10  # Rough estimate
        $totalChanges += [Math]::Abs($changes)
        Write-Host "✓ $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "  Files modified: $filesChanged"
Write-Host "  Estimated changes: ~$([Math]::Round($totalChanges))"
Write-Host "`n⚠️  Manual review still needed for AuthContext and complex cases!"