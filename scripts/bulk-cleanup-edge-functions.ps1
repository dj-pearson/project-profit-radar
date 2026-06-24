# Bulk cleanup of siteId references from edge functions
# This script removes siteId from Edge Function TypeScript files

Write-Host "Bulk cleanup of Edge Functions..." -ForegroundColor Cyan
Write-Host ""

$filesChanged = 0
$totalChanges = 0

# Pattern replacements
$patterns = @(
    # Change auth-helpers import to single-tenant version
    @{Name="Import single-tenant auth helpers"; Pattern='from [''"]\.\./_shared/auth-helpers[''"]'; Replace='from "../_shared/auth-helpers-single-tenant"'},
    
    # Remove siteId destructuring from authContext
    @{Name="Remove siteId from destructuring (comma after)"; Pattern=',\s*siteId\s*}'; Replace=' }'},
    @{Name="Remove siteId from destructuring (comma before)"; Pattern='{\s*siteId\s*,'; Replace='{ '},
    
    # Remove site_id from database queries
    @{Name="Remove site_id eq filter (single quotes, mid-chain)"; Pattern="\.eq\('site_id',\s*siteId\)\s*\."; Replace='.'},
    @{Name="Remove site_id eq filter (double quotes, mid-chain)"; Pattern='\.eq\("site_id",\s*siteId\)\s*\.'; Replace='.'},
    @{Name="Remove site_id eq filter (end of chain)"; Pattern="\.eq\('site_id',\s*siteId\)\s*;"; Replace=';'},
    @{Name="Remove site_id eq filter (before select)"; Pattern="\.eq\('site_id',\s*siteId\)"; Replace=''},
    
    # Remove site_id from inserts
    @{Name="Remove site_id from insert (with comma)"; Pattern='\s*site_id:\s*siteId,'; Replace=''},
    @{Name="Remove site_id from insert (no comma)"; Pattern='\s*site_id:\s*siteId\s*([}\)])'; Replace=' $1'},
    
    # Remove siteId parameter from function calls
    @{Name="Remove siteId parameter (with comma after)"; Pattern='siteId,\s*'; Replace=''},
    @{Name="Remove siteId parameter (with comma before)"; Pattern=',\s*siteId\s*([}\)])'; Replace='$1'},
    
    # Remove standalone siteId variables/assignments
    @{Name="Remove const siteId extraction from JWT"; Pattern='const\s+siteId\s*=\s*[^;]+;?\s*\n'; Replace=''},
    
    # Remove siteId validation blocks
    @{Name="Remove siteId validation if block"; Pattern='if\s*\(\s*!siteId\s*\)\s*{[^}]+}\s*\n?'; Replace=''}
)

Write-Host "Scanning edge functions..." -ForegroundColor Yellow
$files = Get-ChildItem -Path supabase/functions -Include index.ts -Recurse | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and
    $_.DirectoryName -notlike "*_shared*"
}

Write-Host "Found $($files.Count) edge functions to process`n" -ForegroundColor Yellow

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
        
        # Additional cleanup: Remove comments about site_id
        $content = $content -replace '//[^\n]*site_id[^\n]*\n', ''
        $content = $content -replace '/\*[^*]*site_id[^*]*\*/', ''
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $filesChanged++
            $totalChanges += $fileChanges
            $functionName = $file.Directory.Name
            Write-Host "+ " -NoNewline -ForegroundColor Green
            Write-Host $functionName -ForegroundColor White
        }
    }
    catch {
        Write-Host "X " -NoNewline -ForegroundColor Red
        Write-Host "$($file.Directory.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "Edge Functions Cleanup Summary" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "  Functions modified: " -NoNewline
Write-Host $filesChanged -ForegroundColor Green
Write-Host "  Pattern matches: " -NoNewline
Write-Host $totalChanges -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Review changes in: supabase/functions/"
Write-Host "  2. Test critical edge functions locally"
Write-Host "  3. Commit and push to trigger Coolify deployment"
Write-Host ""
Write-Host "Done! Edge functions updated for single-tenant!" -ForegroundColor Green

