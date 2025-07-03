# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/ed4c0428-159f-4b25-8136-15b119a75bd5

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/ed4c0428-159f-4b25-8136-15b119a75bd5) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

### Deploy to Lovable
Simply open [Lovable](https://lovable.dev/projects/ed4c0428-159f-4b25-8136-15b119a75bd5) and click on Share -> Publish.

### Deploy to Cloudflare Pages

This project is optimized for Cloudflare Pages deployment and **uses npm only**:

1. **Connect your repository** to Cloudflare Pages
2. **Build settings** (IMPORTANT - Set these exactly):
   - **Build command**: `npm ci && npm run build`
   - **Build output directory**: `dist`
   - **Node.js version**: `18` or higher
   - **Environment variables**: 
     - `NODE_VERSION` = `18`
     - `NPM_CONFIG_PRODUCTION` = `false`
3. **Force npm usage** (if build still tries to use Bun):
   - In your Cloudflare Pages project settings, go to "Build & Deploy"
   - Under "Build configurations", set:
     - **Build command**: `rm -f bun.lockb && npm ci && npm run build`
     - This ensures any cached Bun files are removed
4. **Deploy**: Cloudflare will automatically build and deploy your app

⚠️ **Important**: If you see "bun install" in the build logs, it means Cloudflare detected Bun. Make sure:
- No `bun.lockb` file exists in your repository
- The `package.json` has `"packageManager": "npm@10.9.2"`
- Use the build command with `npm ci` (not just `npm install`)

The project includes:
- `_headers` file for security headers and caching
- `_redirects` file for SPA routing
- `wrangler.toml` for Cloudflare configuration
- `.nvmrc` for Node.js version specification
- `.npmrc` for npm configuration
- **Explicit npm configuration** to prevent Bun usage

For custom domains, configure them in your Cloudflare Pages dashboard.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
