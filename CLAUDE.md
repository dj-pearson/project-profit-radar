# BuildDesk - Construction Management Platform

## Overview

BuildDesk is a comprehensive construction management platform designed for small to medium-sized construction businesses. It's a B2B SaaS platform that provides real-time project management, financial tracking, and collaborative tools specifically tailored for the construction industry.

### Key Business Context
- **Target Market**: SMB construction companies ($199-799/month segment)
- **Platform Status**: ~70% complete for target SMB market
- **Business Model**: SaaS subscription platform with Stripe integration
- **Current Pricing**: $350/month unlimited users
- **Differentiator**: Real-time job costing and financial control without enterprise complexity

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4.1
- **Styling**: Tailwind CSS 3.4.11 with shadcn/ui components
- **State Management**: React Context + TanStack Query 5.56.2
- **Routing**: React Router DOM 6.26.2
- **UI Components**: Radix UI primitives with custom component system
- **Mobile**: Capacitor 7.4.1 (for native mobile apps)

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Edge Functions**: Supabase Edge Functions (Deno runtime)
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

### Third-Party Integrations
- **Payments**: Stripe (subscriptions, invoicing, webhooks)
- **Accounting**: QuickBooks Online (2-way sync)
- **Calendar**: Google Calendar & Outlook integration
- **PDF Generation**: jsPDF
- **Excel Export**: xlsx
- **OCR**: Tesseract.js
- **Charts**: Recharts

### Deployment
- **Primary**: Cloudflare Pages
- **Package Manager**: npm (explicitly configured)
- **Node Version**: 18+
- **Build Output**: dist/ folder

## Project Structure

```
/workspaces/project-profit-radar/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── financial/       # Financial management components
│   │   ├── dashboard/       # Dashboard components
│   │   ├── mobile/          # Mobile-specific components
│   │   └── [domain]/        # Domain-specific components
│   ├── pages/               # Route pages
│   ├── contexts/            # React contexts (Auth, Theme)
│   ├── hooks/               # Custom React hooks
│   ├── integrations/        # Third-party integrations
│   │   └── supabase/        # Supabase client and types
│   ├── lib/                 # Utility functions
│   └── utils/               # Additional utilities
├── supabase/
│   ├── functions/           # Edge functions
│   ├── migrations/          # Database migrations
│   └── config.toml          # Supabase configuration
├── public/                  # Static assets
├── android/                 # Android app (Capacitor)
├── ios/                     # iOS app (Capacitor)
└── [config files]          # Various configuration files
```

## Development Environment Setup

### Prerequisites
- Node.js 18+ (check with `node --version`)
- npm 9+ (check with `npm --version`)
- Git

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd project-profit-radar

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Configuration
The application uses Supabase for backend services. The configuration is already set up in:
- `/src/integrations/supabase/client.ts`
- Database URL and keys are hardcoded for the development environment

## Available Commands

### Development
```bash
npm run dev          # Start development server on port 8080
npm run preview      # Preview production build locally
```

### Building
```bash
npm run build        # Production build
npm run build:dev    # Development build
npm run build:prod   # Production build (optimized)
npm run build:cloudflare  # Build for Cloudflare Pages
```

### Code Quality
```bash
npm run lint         # Run ESLint
# Note: No test scripts are configured
```

### Mobile Development
```bash
# Build for mobile platforms (requires Capacitor CLI)
npx cap build android
npx cap build ios
npx cap run android
npx cap run ios
```

## Database Architecture

### Core Tables
- **companies**: Company profiles and subscription info
- **user_profiles**: User accounts with role-based access
- **projects**: Construction projects and metadata
- **time_entries**: Time tracking for workers
- **change_orders**: Change order management
- **daily_reports**: Daily progress reports
- **financial_records**: Job costing and financial data
- **documents**: Document management system

### Key Features
- Role-based access control (7 user roles)
- Multi-tenant architecture (company-based)
- Real-time collaboration
- Audit logging
- Subscription management

## Authentication & Authorization

### User Roles
1. **root_admin**: Platform administrator
2. **admin**: Company administrator
3. **project_manager**: Project management access
4. **field_supervisor**: Field operations
5. **office_staff**: Office operations
6. **accounting**: Financial access
7. **client_portal**: Client view access

### Authentication Flow
- Supabase Auth handles authentication
- JWT tokens for API access
- Role-based route protection
- Session persistence

## Key Features Implementation

### Financial Management
- **Real-time job costing**: Live cost tracking per project
- **Budget vs actual**: Variance analysis and alerts
- **Cash flow forecasting**: Financial projections
- **Stripe integration**: Automated billing and payments
- **QuickBooks sync**: 2-way accounting integration

### Project Management
- **Project scheduling**: Gantt charts and timelines
- **Change order management**: Workflow and approvals
- **Document management**: Version control and categorization
- **Daily reports**: Progress tracking and reporting
- **Mobile accessibility**: Responsive design (native apps in development)

### Collaboration
- **Team messaging**: Real-time communication
- **Client portal**: External stakeholder access
- **File sharing**: Document collaboration
- **Progress updates**: Automated notifications

## Mobile Strategy

### Current State
- **Web responsive**: Mobile-optimized web interface
- **Capacitor integration**: Native app shell configured
- **PWA support**: Progressive Web App capabilities

### Mobile Features
- **Camera integration**: Photo capture for documentation
- **Geolocation**: GPS tracking for time entries
- **Offline sync**: Work without internet connectivity
- **Push notifications**: Real-time alerts

## API Architecture

### Supabase Edge Functions
Located in `/supabase/functions/`, these handle:
- **Stripe webhooks**: Payment processing
- **Calendar sync**: Google/Outlook integration
- **Document processing**: OCR and classification
- **Analytics**: Performance metrics generation
- **Notifications**: Email and push notifications

### Authentication
- JWT verification on protected endpoints
- Role-based access control
- Company-level data isolation

## Configuration Files

### Key Configuration
- **vite.config.ts**: Build configuration and optimizations
- **tailwind.config.ts**: Styling configuration
- **tsconfig.json**: TypeScript configuration
- **capacitor.config.ts**: Mobile app configuration
- **wrangler.toml**: Cloudflare Pages deployment
- **components.json**: shadcn/ui configuration

### Build Optimizations
- **Code splitting**: Vendor and feature-based chunks
- **Tree shaking**: Unused code elimination
- **Minification**: ESBuild optimization
- **Asset optimization**: Hashed filenames and compression

## Testing Strategy

### Current State
- **ESLint**: Code linting configured
- **TypeScript**: Type checking
- **No unit tests**: Testing framework not configured

### Component Testing Structure
The codebase includes testing component templates in `/src/components/testing/`:
- Browser compatibility testing
- End-to-end testing
- Performance testing
- Security testing
- User acceptance testing

## Performance Considerations

### Build Performance
- **Bundle size**: ~1MB optimized
- **Chunk splitting**: Vendor, UI, and feature chunks
- **Lazy loading**: Route-based code splitting
- **CDN optimization**: Cloudflare Pages deployment

### Runtime Performance
- **React Query**: Efficient data fetching and caching
- **Memoization**: Component optimization
- **Real-time updates**: Efficient WebSocket usage
- **Progressive loading**: Skeleton states and loading indicators

## Security Features

### Authentication Security
- **JWT tokens**: Secure API access
- **Role-based access**: Principle of least privilege
- **Session management**: Secure session handling
- **Password security**: Supabase Auth best practices

### Data Security
- **Row Level Security**: Database-level access control
- **HTTPS enforcement**: All communications encrypted
- **Input validation**: Zod schema validation
- **CSRF protection**: Built-in protections

## Business Intelligence

### Analytics Implementation
- **Executive dashboards**: KPI tracking
- **Performance benchmarking**: Industry comparisons
- **Predictive analytics**: AI-powered insights
- **Risk assessment**: Project risk analysis
- **Custom reporting**: Flexible report builder

### Data Integration
- **QuickBooks sync**: Financial data integration
- **Calendar integration**: Schedule synchronization
- **Document processing**: OCR and classification
- **Usage tracking**: Platform analytics

## Deployment

### Cloudflare Pages
```bash
# Build settings
Build command: npm ci && npm run build
Build output directory: dist
Node.js version: 18+
```

### Environment Variables
- Supabase configuration is hardcoded for development
- Stripe keys managed through Supabase functions
- Calendar API credentials in edge functions

### Domain Configuration
- Primary: builddesk.pearsonperformance.workers.dev
- Custom domain: build-desk.com
- SSL/TLS: Managed by Cloudflare

## Known Issues & Technical Debt

### Critical Gaps (from analysis)
1. **Mobile apps**: Native iOS/Android apps needed
2. **GPS tracking**: Geofencing for time tracking
3. **Offline sync**: Improved offline capabilities
4. **Safety automation**: OSHA compliance automation

### Performance Optimizations
1. **Database queries**: Some N+1 query patterns
2. **Image optimization**: Large image handling
3. **Real-time performance**: WebSocket connection management
4. **Memory usage**: Large dataset handling

## Development Guidelines

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Configured for React/TypeScript
- **Component patterns**: Functional components with hooks
- **State management**: Context + TanStack Query pattern

### Component Architecture
- **shadcn/ui**: Consistent component library
- **Atomic design**: Reusable component patterns
- **Accessibility**: ARIA compliance and keyboard navigation
- **Theme support**: Dark/light theme system

### Git Workflow
- **Branch protection**: Main branch protected
- **Commit messages**: Conventional commit format
- **Pull requests**: Required for changes
- **Automated deployment**: Cloudflare Pages integration

## Support & Maintenance

### Monitoring
- **Error tracking**: Console logging (needs improvement)
- **Performance monitoring**: Basic metrics
- **Usage analytics**: Custom implementation
- **Uptime monitoring**: Cloudflare monitoring

### Backup & Recovery
- **Database backups**: Supabase managed
- **File storage**: Supabase Storage
- **Configuration**: Version controlled
- **Disaster recovery**: Cloud-based resilience

## Future Roadmap

### Immediate Priorities (30 days)
1. **Mobile app development**: React Native implementation
2. **GPS time tracking**: Geofencing and location services
3. **Crew dispatch**: Visual scheduling interface
4. **Safety automation**: OSHA compliance features

### Medium-term Goals (3-6 months)
1. **Advanced analytics**: AI/ML features
2. **Integration marketplace**: Third-party connectors
3. **API platform**: Public API for integrations
4. **White-label solution**: Multi-tenant platform

### Long-term Vision (6-12 months)
1. **Industry specialization**: Vertical-specific features
2. **Global expansion**: Multi-region deployment
3. **Enterprise features**: Advanced security and compliance
4. **Marketplace ecosystem**: Plugin architecture

---

*This documentation reflects the current state of the BuildDesk platform as of the latest analysis. The platform is actively developed and deployed, serving construction SMBs with a focus on real-time financial management and project collaboration.*