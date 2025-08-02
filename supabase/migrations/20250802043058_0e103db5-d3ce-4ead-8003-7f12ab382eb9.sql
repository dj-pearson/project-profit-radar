-- Comprehensive Demo Data Migration for Construction Management Platform
-- This creates realistic demo data across all major tables

DO $$
DECLARE
    demo_program_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    demo_user_id UUID := 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
BEGIN
    -- Insert demo affiliate program
    INSERT INTO affiliate_programs (id, name, is_active, referrer_reward_months, referee_reward_months, min_subscription_duration_months) VALUES
    (demo_program_id, 'Default Construction Program', true, 2, 1, 3);

    -- Insert demo blog posts
    INSERT INTO blog_posts (title, slug, excerpt, body, status, seo_title, seo_description, featured_image_url, created_by, published_at) VALUES
    ('5 Essential Safety Practices for Construction Sites', '5-essential-safety-practices-construction-sites', 'Construction sites can be dangerous places. Learn about the five most important safety practices that every construction worker should follow to prevent accidents and injuries.', 'Construction safety is paramount in our industry. Here are five essential practices that every construction site should implement...

## 1. Personal Protective Equipment (PPE)
Always wear appropriate PPE including hard hats, safety glasses, steel-toed boots, and high-visibility clothing.

## 2. Fall Protection
Use proper fall protection equipment when working at heights above 6 feet.

## 3. Tool Safety
Inspect tools before use and maintain them properly.

## 4. Communication
Maintain clear communication with all team members.

## 5. Training
Ensure all workers receive proper safety training.', 'published', '5 Essential Construction Safety Practices | BuildDesk Construction', 'Learn the top 5 safety practices that prevent construction site accidents. Expert tips from BuildDesk Construction for safer worksites.', 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800', demo_user_id, current_date - interval '10 days'),
    ('Modern Construction Technology Trends', 'modern-construction-technology-trends', 'Explore the latest technology trends transforming the construction industry, from drones and IoT to AI and robotics.', 'The construction industry is experiencing a technological revolution. Here are the key trends shaping our future...

## Building Information Modeling (BIM)
BIM technology allows for detailed 3D modeling and collaboration.

## Drones and Aerial Surveying
Drones provide accurate site surveys and progress monitoring.

## Internet of Things (IoT)
Connected devices monitor equipment and site conditions.

## Artificial Intelligence
AI helps with project planning and risk assessment.', 'published', 'Construction Technology Trends 2024 | BuildDesk', 'Discover the latest construction technology trends including BIM, drones, IoT, and AI. Stay ahead in the construction industry.', 'https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=800', demo_user_id, current_date - interval '5 days'),
    ('Project Management Best Practices', 'project-management-best-practices-construction', 'Effective project management is crucial for construction success. Learn the best practices that top contractors use to deliver projects on time and under budget.', 'Project management in construction requires unique skills and approaches. Here are the proven strategies...

## Clear Communication Protocols
Establish regular check-ins and reporting structures.

## Risk Management Planning
Identify potential issues before they become problems.

## Resource Optimization
Efficiently allocate labor, equipment, and materials.

## Technology Integration
Use modern tools to streamline workflows.', 'published', 'Construction Project Management Best Practices | BuildDesk', 'Master construction project management with proven strategies. Learn how to deliver projects on time and under budget.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', demo_user_id, current_date - interval '15 days');

    -- Insert demo automated social content library
    INSERT INTO automated_social_content_library (content_type, topic, title, description, key_points, cta_template) VALUES
    ('features', 'project_management', 'Streamlined Project Management', 'Transform your construction workflow with intelligent project management tools', ARRAY['Real-time progress tracking', 'Team collaboration', 'Budget monitoring', 'Timeline management'], 'Streamline your projects today!'),
    ('benefits', 'cost_savings', 'Reduce Project Costs', 'Save money on every construction project with smart cost management', ARRAY['Budget tracking', 'Change order management', 'Material optimization', 'Labor efficiency'], 'Start saving on your next project!'),
    ('knowledge', 'safety', 'Construction Safety Tips', 'Essential safety practices for construction worksites', ARRAY['PPE requirements', 'Fall protection', 'Tool safety', 'Emergency procedures'], 'Keep your team safe!'),
    ('features', 'mobile_access', 'Mobile Field Management', 'Manage your construction projects from anywhere with mobile access', ARRAY['Offline capabilities', 'Real-time sync', 'Photo documentation', 'GPS tracking'], 'Work from anywhere!'),
    ('benefits', 'compliance', 'Stay Compliant', 'Ensure regulatory compliance with automated tracking and reporting', ARRAY['OSHA compliance', 'Permit tracking', 'Inspection management', 'Audit trails'], 'Stay compliant effortlessly!');

    -- Insert demo AI model configurations
    INSERT INTO ai_model_configurations (provider, model_name, model_display_name, description, context_window, max_tokens, supports_function_calling, supports_vision, cost_rating, quality_rating, speed_rating, good_for_long_form, good_for_seo, recommended_for_blog, is_default, is_active) VALUES
    ('openai', 'gpt-4o', 'GPT-4o', 'Latest OpenAI model with vision capabilities', 128000, 4096, true, true, 7, 9, 8, true, true, true, false, true),
    ('anthropic', 'claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'Anthropic Claude 3.5 Sonnet - excellent for analysis and writing', 200000, 8192, true, true, 8, 9, 7, true, true, true, true, true),
    ('anthropic', 'claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', 'Fast and efficient Claude model for quick tasks', 200000, 8192, true, false, 6, 8, 9, false, true, false, false, true),
    ('openai', 'gpt-3.5-turbo', 'GPT-3.5 Turbo', 'Cost-effective OpenAI model for general tasks', 16384, 4096, true, false, 4, 7, 9, false, true, false, false, true);

    RAISE NOTICE 'Demo data insertion completed successfully!';
    RAISE NOTICE 'Created affiliate programs, blog posts, social content library, and AI model configurations.';
END $$;