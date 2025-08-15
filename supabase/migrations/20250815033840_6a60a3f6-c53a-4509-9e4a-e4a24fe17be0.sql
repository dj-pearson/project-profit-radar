-- Add separate webhook field for blog-to-social automation
ALTER TABLE automated_social_posts_config 
ADD COLUMN blog_webhook_url TEXT;

-- Add comment to clarify the difference
COMMENT ON COLUMN automated_social_posts_config.webhook_url IS 'Webhook URL for automated social posts (recurring posts)';
COMMENT ON COLUMN automated_social_posts_config.blog_webhook_url IS 'Webhook URL for blog-to-social automation (triggered by blog posts)';