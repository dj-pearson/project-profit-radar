# BuildDesk - Construction Management Platform

## Overview

BuildDesk is a comprehensive construction management platform designed for small to medium-sized construction businesses. It's a B2B SaaS platform that provides real-time project management, financial tracking, and collaborative tools specifically tailored for the construction industry.

### Key Features
- **Real-time job costing** - Live cost tracking per project
- **Budget vs actual** - Variance analysis and alerts
- **Project scheduling** - Gantt charts and timelines
- **Change order management** - Workflow and approvals
- **Mobile accessibility** - Native mobile apps and responsive design
- **Team collaboration** - Real-time communication and file sharing
- **Client portal** - External stakeholder access
- **Financial integration** - QuickBooks sync and Stripe payments

## Getting Started

### Prerequisites
- Node.js 18+ ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm 9+

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd project-profit-radar

# Install dependencies
npm install

# Start the development server
npm run dev
```

The application will be available at `http://localhost:8080`

## Development

### Available Scripts

```sh
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Project Structure

```
src/
├── components/           # Reusable UI components
├── pages/               # Route pages
├── contexts/            # React contexts
├── hooks/               # Custom React hooks
├── integrations/        # Third-party integrations
├── lib/                 # Utility functions
└── utils/               # Additional utilities
```

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4.1
- **Styling**: Tailwind CSS 3.4.11 with shadcn/ui components
- **State Management**: React Context + TanStack Query 5.56.2
- **Routing**: React Router DOM 6.26.2
- **Mobile**: Capacitor 7.4.1 (for native mobile apps)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **File Storage**: Supabase Storage

### Integrations
- **Payments**: Stripe
- **Accounting**: QuickBooks Online
- **Calendar**: Google Calendar & Outlook
- **PDF Generation**: jsPDF

## Deployment

### Cloudflare Pages (Recommended)

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

## Environment Configuration

The application uses Supabase for backend services. Configuration is managed through:
- Database connection settings in `/src/integrations/supabase/client.ts`
- Environment variables for production deployments

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For support and questions, please contact the development team.
