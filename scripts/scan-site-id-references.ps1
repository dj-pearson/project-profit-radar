# Comprehensive site_id Reference Scanner
# Searches codebase for remaining site_id references

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "site_id REFERENCE SCANNER" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

$patterns = @("site_id", "siteId", "getSiteConfig", "getCurrentSiteId", "getSiteByDomain", "useSiteQuery", "site-resolver")
$paths = @("src", "supabase/functions")
$totalMatches = 0
$results = @()

foreach ($path in $paths) {
    Write-Host "Scanning: $path" -ForegroundColor Yellow
    
    foreach ($pattern in $patterns) {
        $files = Get-ChildItem -Path $path -Include *.ts,*.tsx,*.js,*.jsx -Recurse -ErrorAction SilentlyContinue |
            Where-Object { 
                $_.FullName -notlike "*node_modules*" -and
                $_.FullName -notlike "*dist*" -and
                $_.FullName -notlike "*ROLLBACK*"
            }
        
        foreach ($file in $files) {
            $matches = Select-String -Path $file.FullName -Pattern $pattern -AllMatches -ErrorAction SilentlyContinue
            
            if ($matches) {
                $relativePath = $file.FullName -replace [regex]::Escape($PWD.Path + "\"), ""
                
                foreach ($match in $matches) {
                    $totalMatches++
                    $results += [PSCustomObject]@{
                        File = $relativePath
                        Line = $match.LineNumber
                        Pattern = $pattern
                        Content = $match.Line.Trim()
                    }
                }
            }
        }
    }
}

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "RESULTS" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host ""

if ($totalMatches -eq 0) {
    Write-Host "SUCCESS: No site_id references found!" -ForegroundColor Green
} else {
    Write-Host "Found $totalMatches references across $($results | Select-Object -Unique File | Measure-Object | Select-Object -ExpandProperty Count) files" -ForegroundColor Yellow
    Write-Host ""
    
    # Group by file
    $groupedResults = $results | Group-Object File
    
    foreach ($group in $groupedResults) {
        Write-Host "$($group.Name)" -ForegroundColor White
        $group.Group | ForEach-Object {
            Write-Host "  Line $($_.Line): $($_.Pattern)" -ForegroundColor Gray
            Write-Host "    $($_.Content)" -ForegroundColor DarkGray
        }
        Write-Host ""
    }
    
    # Export to CSV
    $results | Export-Csv -Path "site_id_references.csv" -NoTypeInformation
    Write-Host "Full report exported to: site_id_references.csv" -ForegroundColor Cyan
}

Write-Host ""
