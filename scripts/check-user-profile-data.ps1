# Check User Profile Data
# Run this on your Supabase database to verify user data

Write-Host "Checking user profile data..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Run these SQL queries on your database:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Check user_profiles table structure:" -ForegroundColor Green
Write-Host @"
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
"@

Write-Host ""
Write-Host "2. Check your user profile data:" -ForegroundColor Green
Write-Host @"
SELECT 
    id,
    email,
    first_name,
    last_name,
    company_id,
    role,
    is_active,
    created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 5;
"@

Write-Host ""
Write-Host "3. Check companies table:" -ForegroundColor Green
Write-Host @"
SELECT 
    id,
    name,
    created_at
FROM companies
ORDER BY created_at DESC
LIMIT 5;
"@

Write-Host ""
Write-Host "4. If user has NULL company_id, check if company exists:" -ForegroundColor Green
Write-Host @"
-- If your user email is known:
SELECT 
    up.*,
    c.name as company_name
FROM user_profiles up
LEFT JOIN companies c ON up.company_id = c.id
WHERE up.email = 'your-email@example.com';
"@

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "POSSIBLE ISSUES:" -ForegroundColor Yellow
Write-Host "1. user_profiles.company_id is NULL" -ForegroundColor White
Write-Host "2. Column site_id still exists (should be removed)" -ForegroundColor White
Write-Host "3. User role is not 'root_admin'" -ForegroundColor White
Write-Host ""
Write-Host "Quick Fix SQL (if company_id is NULL):" -ForegroundColor Green
Write-Host @"
-- Replace with your actual user_id and company_id
UPDATE user_profiles
SET company_id = 'your-company-uuid-here'
WHERE id = 'your-user-uuid-here';
"@

