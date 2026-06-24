# Emergency Fix - Remove ALL siteId from src/
# This removes ALL references causing the "siteId is not defined" error

Write-Host "EMERGENCY FIX - Removing ALL siteId from src/" -ForegroundColor Red
Write-Host ""

$filesChanged = 0
$totalChanges = 0

Write-Host "Scanning ALL files in src/..." -ForegroundColor Yellow
$files = Get-ChildItem -Path src -Include *.ts,*.tsx,*.js,*.jsx -Recurse | Where-Object { 
    $_.FullName -notlike "*node_modules*" -and 
    $_.FullName -notlike "*dist*" -and
    $_.FullName -notlike "*types.ts"
}

Write-Host "Found $($files.Count) files to process`n" -ForegroundColor Yellow

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        if (!$content) { continue }
        
        $originalContent = $content
        
        # Remove const { siteId } = useAuth();
        $content = $content -replace 'const\s+{\s*siteId\s*}\s*=\s*useAuth\(\);?\s*\n', ''
        
        # Remove , siteId from destructuring
        $content = $content -replace ',\s*siteId\s*}', ' }'
        $content = $content -replace '{\s*siteId\s*,', '{ '
        
        # Remove .eq('site_id', siteId)
        $content = $content -replace "\.eq\('site_id',\s*siteId\)\s*\.", '.'
        $content = $content -replace '\.eq\("site_id",\s*siteId\)\s*\.', '.'
        $content = $content -replace "\.eq\('site_id',\s*siteId\)", ''
        
        # Remove site_id: siteId from inserts
        $content = $content -replace '\s*site_id:\s*siteId,', ''
        $content = $content -replace '\s*site_id:\s*siteId\s*([}\)])', ' $1'
        
        # Remove siteId from queryKey arrays
        $content = $content -replace ",\s*siteId\s*\]", ']'
        $content = $content -replace "['`"][^'`"]+['`"],\s*siteId,", ""
        
        # Remove if (!siteId) checks
        $content = $content -replace "if\s*\(\s*!siteId\s*\)\s*throw\s+new\s+Error\([^)]+\);?\s*\n", ''
        $content = $content -replace "if\s*\(\s*!siteId\s*\|\|\s*", "if ("
        $content = $content -replace "\s*\|\|\s*!siteId", ""
        
        # Remove !!siteId from enabled
        $content = $content -replace '!!\s*siteId\s*&&\s*', ''
        $content = $content -replace '\s*&&\s*!!\s*siteId', ''
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -NoNewline
            $filesChanged++
            Write-Host "+ $($file.Name)" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "X $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Files modified: $filesChanged" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Rebuilding..." -ForegroundColor Yellow

