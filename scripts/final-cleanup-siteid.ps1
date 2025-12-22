# Final Cleanup - Remove ALL remaining siteId references
# This is a comprehensive cleanup of all patterns

Write-Host "FINAL CLEANUP - Removing ALL site_id references" -ForegroundColor Cyan
Write-Host ""

$filesChanged = 0
$totalChanges = 0

# Pattern replacements (comprehensive)
$patterns = @(
    # Remove siteId from destructuring
    @{Name="Remove siteId from destructuring (comma after)"; Pattern=',\s*siteId\s*}'; Replace=' }'},
    @{Name="Remove siteId from destructuring (comma before)"; Pattern='{\s*siteId\s*,'; Replace='{ '},
    @{Name="Remove standalone const siteId ="; Pattern='const\s+{\s*siteId\s*}\s*=\s*useAuth\(\);?\s*\n'; Replace=''},
    
    # Remove .eq('site_id', siteId) from queries
    @{Name="Remove .eq('site_id', siteId) mid-chain"; Pattern="\.eq\('site_id',\s*siteId\)\s*\."; Replace='.'},
    @{Name="Remove .eq(`"site_id`", siteId) mid-chain"; Pattern='\.eq\("site_id",\s*siteId\)\s*\.'; Replace='.'},
    @{Name="Remove .eq('site_id', siteId) end of chain"; Pattern="\.eq\('site_id',\s*siteId\)"; Replace=''},
    
    # Remove site_id from inserts
    @{Name="Remove site_id: siteId (comma after)"; Pattern='\s*site_id:\s*siteId,'; Replace=''},
    @{Name="Remove site_id: siteId (no comma)"; Pattern='\s*site_id:\s*siteId\s*([}\)])'; Replace=' $1'},
    
    # Remove siteId from query keys
    @{Name="Remove siteId from queryKey array"; Pattern="'[\w_-]+',\s*siteId,"; Replace=""},
    @{Name="Remove siteId from end of queryKey"; Pattern=",\s*siteId\s*\]"; Replace=']'},
    
    # Remove if (!siteId) checks
    @{Name="Remove siteId validation"; Pattern="if\s*\(\s*!siteId\s*\)\s*throw\s+new\s+Error\([^)]+\);?\s*\n"; Replace=''},
    @{Name="Remove siteId||condition checks"; Pattern="if\s*\(\s*!siteId\s*\|\|[^{]+{\s*\n[^}]+}\s*\n"; Replace=''},
    
    # Remove enabled: !!siteId checks
    @{Name="Remove !!siteId from enabled"; Pattern='!!\s*siteId\s*&&\s*'; Replace=''},
    @{Name="Remove &&  !!siteId from enabled"; Pattern='\s*&&\s*!!\s*siteId'; Replace=''}
)

Write-Host "Scanning hooks and services..." -ForegroundColor Yellow
$files = Get-ChildItem -Path src -Include *.ts,*.tsx -Recurse | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    $_.FullName -notlike "*dist*" -and
    $_.FullName -notlike "*types.ts" -and
    $_.DirectoryName -like "*hooks*" -or $_.DirectoryName -like "*services*"
}

Write-Host "Found $($files.Count) files to process`n" -ForegroundColor Yellow

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        if (!$content) { continue }
        
        $originalContent = $content
        $fileChanges = 0
        
        # Apply all patterns
        foreach ($pattern in $patterns) {
            $newContent = $content -replace $pattern.Pattern, $pattern.Replace
            if ($newContent -ne $content) {
                $content = $newContent
                $fileChanges++
            }
        }
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $filesChanged++
            $totalChanges += $fileChanges
            Write-Host "+ " -NoNewline -ForegroundColor Green
            Write-Host $file.Name -ForegroundColor White
        }
    }
    catch {
        Write-Host "X " -NoNewline -ForegroundColor Red
        Write-Host "$($file.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Cleanup Summary" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Files modified: " -NoNewline
Write-Host $filesChanged -ForegroundColor Green
Write-Host "  Pattern matches: " -NoNewline
Write-Host $totalChanges -ForegroundColor Green
Write-Host ""
Write-Host "NEXT: Run the scanner again to see remaining references" -ForegroundColor Yellow
Write-Host "  powershell -ExecutionPolicy Bypass -File scripts/scan-site-id-references.ps1" -ForegroundColor Cyan
Write-Host ""

