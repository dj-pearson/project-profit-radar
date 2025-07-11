GitHub Repository Structure
Create a develop branch from your main/production branch
Use main for production, develop for testing
Feature branches can branch off develop
Supabase Environment Separation
Create a separate Supabase project for development
Keep your production Supabase project untouched
Copy your schema/migrations to the dev project
Use different environment variables for each
Lovable Integration
Connect Lovable to your develop branch (if using GitHub integration)
Update your Lovable project's Supabase connection to point to the dev project
Add your Lovable preview URLs to the dev Supabase auth settings
Deployment Workflow
Development: Make changes in Lovable → pushes to develop branch
Testing: Test thoroughly in the development environment
Production: Merge develop to main via pull request
Database: Run tested migrations on production Supabase manually
Environment Variables
Keep separate .env configurations for dev/prod
Use different Supabase project URLs and keys
Different auth redirect URLs for each environment