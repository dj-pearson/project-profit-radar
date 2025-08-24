-- Update the overdue social posts configuration to set next post time to now
UPDATE automated_social_posts_config 
SET next_post_at = now() + interval '5 minutes'
WHERE enabled = true AND next_post_at < now();