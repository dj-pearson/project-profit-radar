-- Check current user role
SELECT user_id, role, email 
FROM user_profiles 
WHERE user_id = '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19';

-- If the role is not 'root_admin', update it
UPDATE user_profiles 
SET role = 'root_admin' 
WHERE user_id = '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19'
AND role != 'root_admin';

-- Verify the update
SELECT user_id, role, email 
FROM user_profiles 
WHERE user_id = '0f91e0b7-ddd2-4dad-ad7b-3d339ffaee19';
