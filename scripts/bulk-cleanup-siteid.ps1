# Bulk cleanup of siteId references from frontend code
# This script removes siteId from TypeScript/TSX files

Write-Host "Bulk cleanup of siteId references..." -ForegroundColor Cyan
Write-Host ""

$filesChanged = 0
$totalChanges = 0
$patterns = @(
    @{Name="siteId destructuring (comma after)"; Pattern=',\s*siteId\s*}'; Replace=' }'},
    @{Name="siteId destructuring (comma before)"; Pattern='{\s*siteId\s*,'; Replace='{ '},
    @{Name="site_id query filter (single quotes)"; Pattern="\.eq\('site_id',\s*siteId\)\s*\."; Replace='.'},
    @{Name="site_id query filter (double quotes)"; Pattern='\.eq\("site_id",\s*siteId\)\s*\.'; Replace='.'},
    @{Name="site_id query filter (end of chain)"; Pattern="\.eq\('site_id',\s*siteId\)\s*$"; Replace=''},
    @{Name="site_id in insert (with comma)"; Pattern='\s*site_id:\s*siteId,'; Replace=''},
    @{Name="site_id in insert (no comma)"; Pattern='\s*site_id:\s*siteId\s*([}\n])'; Replace=' $1'}
)

Write-Host "Scanning files..." -ForegroundColor Yellow
$files = Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    $_.FullName -notlike "*dist*" 
}

Write-Host "Found $($files.Count) files to process`n" -ForegroundColor Yellow

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        $originalContent = $content
        $fileChanges = 0
        
        # Apply all patterns
        foreach ($pattern in $patterns) {
            $beforeLength = $content.Length
            $content = $content -replace $pattern.Pattern, $pattern.Replace
            if ($content.Length -ne $beforeLength) {
                $fileChanges++
            }
        }
        
        # Remove import of site-resolver if it exists
        $content = $content -replace "import\s+{[^}]*getSiteByDomain[^}]*}\s+from\s+['\`"][^'\`"]*site-resolver['\`"];?\s*\n?", ""
        
        # Remove useSiteQuery import if it exists
        $content = $content -replace "import\s+{[^}]*useSiteQuery[^}]*}\s+from\s+['\`"][^'\`"]*useSiteQuery['\`"];?\s*\n?", ""
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $filesChanged++
            $totalChanges += $fileChanges
            Write-Host "checkmark " -NoNewline -ForegroundColor Green
            Write-Host $file.Name -ForegroundColor White
        }
    }
    catch {
        Write-Host "X " -NoNewline -ForegroundColor Red
        Write-Host "$($file.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "Cleanup Summary" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  Files modified: " -NoNewline
Write-Host $filesChanged -ForegroundColor Green
Write-Host "  Pattern matches: " -NoNewline
Write-Host $totalChanges -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Run: " -NoNewline
Write-Host "npm run build" -ForegroundColor Cyan -NoNewline
Write-Host " to check for TypeScript errors"
Write-Host "  2. Fix AuthContext manually (most critical file)"
Write-Host "  3. Review and test the changes"
Write-Host ""
Write-Host "Done! Automated cleanup complete!" -ForegroundColor Green

