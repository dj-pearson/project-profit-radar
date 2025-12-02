# Script to rename migration files from hyphen format to underscore format
# Pattern: YYYYMMDDHHMMSS-name.sql -> YYYYMMDDHHMMSS_name.sql

$migrationsPath = ".\supabase\migrations"

# Get all .sql files in the migrations directory
$files = Get-ChildItem -Path $migrationsPath -Filter "*.sql"

$renamedCount = 0
$skippedCount = 0

foreach ($file in $files) {
    $oldName = $file.Name
    
    # Check if filename matches the hyphen pattern: timestamp-rest.sql
    if ($oldName -match '^(\d{14})-(.+\.sql)$') {
        $timestamp = $Matches[1]
        $rest = $Matches[2]
        $newName = "${timestamp}_${rest}"
        
        $oldPath = Join-Path $migrationsPath $oldName
        $newPath = Join-Path $migrationsPath $newName
        
        Write-Host "Renaming: $oldName -> $newName" -ForegroundColor Cyan
        Rename-Item -Path $oldPath -NewName $newName
        $renamedCount++
    }
    # Check for files without timestamp (like expo_builds_table.sql)
    elseif ($oldName -notmatch '^\d{14}_') {
        Write-Host "SKIPPED (no timestamp): $oldName" -ForegroundColor Yellow
        $skippedCount++
    }
    else {
        # Already in correct format
        $skippedCount++
    }
}

Write-Host "`nSummary:" -ForegroundColor Green
Write-Host "  Renamed: $renamedCount files" -ForegroundColor Green
Write-Host "  Skipped/Already correct: $skippedCount files" -ForegroundColor Gray

if ($skippedCount -gt 0) {
    Write-Host "`nNote: Files without proper timestamps need manual review" -ForegroundColor Yellow
}
