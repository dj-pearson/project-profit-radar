# Dependency Update Guide

This guide outlines safe dependency updates that can be performed to keep the BuildDesk platform up-to-date with security patches and performance improvements.

## ⚠️ Important Notes

- Always test thoroughly after updating dependencies
- Run `npm run build` to ensure no build errors
- Test authentication flow after Supabase updates
- Test UI components after UI library updates
- Run in development mode first before deploying to production

---

## 🟢 Safe Minor/Patch Updates (Low Risk)

These updates are backwards compatible and can be applied safely:

```bash
# UI Icons - safe to update
npm install lucide-react@latest

# MCP Utilities - patch updates
npm install @supabase/mcp-utils@latest @upstash/context7-mcp@latest

# Build tools - patch updates
npm install vite-plugin-image-optimizer@latest

# Expo CLI - minor update
npm install @expo/cli@latest

# React Native safe area - patch update
npm install react-native-safe-area-context@latest

# Expo packages - patch updates
npm install expo-camera@latest expo-constants@latest
```

---

## 🟡 Medium Risk Updates (Test Thoroughly)

These might have minor breaking changes - review changelog first:

### React Router v6 → v7
```bash
npm install react-router-dom@7
```
**Breaking Changes:**
- New data loading patterns
- Changes to Route component API
- Update route definitions in `App.tsx`
**Migration Guide**: https://reactrouter.com/en/main/upgrading/v6-to-v7

### Date-fns v3 → v4
```bash
npm install date-fns@4
```
**Breaking Changes:**
- Some function signatures changed
- TypeScript types updated
**Migration Guide**: https://date-fns.org/v4.1.0/docs/Upgrade-Guide

### React Day Picker v8 → v9
```bash
npm install react-day-picker@9
```
**Breaking Changes:**
- Component API changes
- Styling updates
**Migration Guide**: https://daypicker.dev/docs/upgrading

---

## 🔴 High Risk Updates (Major Versions)

These require significant code changes - plan carefully:

### Zod v3 → v4
```bash
npm install zod@4
```
**Impact**: Form validation throughout the app
**Required Changes:**
- Review all schema definitions
- Update error handling
- Test all forms thoroughly

### @hookform/resolvers v3 → v5
```bash
npm install @hookform/resolvers@5
```
**Impact**: Works with react-hook-form
**Dependencies**: May require updating react-hook-form as well

### Recharts v2 → v3
```bash
npm install recharts@3
```
**Impact**: All charts and graphs
**Required Changes:**
- Review chart configurations
- Update responsive behavior
- Test all dashboard charts

### Next-themes v0.3 → v0.4
```bash
npm install next-themes@0.4
```
**Impact**: Dark/light theme switching
**Required Changes:**
- Review ThemeProvider configuration
- Test theme persistence

### Sonner v1 → v2
```bash
npm install sonner@2
```
**Impact**: Toast notifications
**Required Changes:**
- Update toast API calls
- Review styling

---

## 📋 Update Process Checklist

### Before Updating:
- [ ] Create a new git branch
- [ ] Backup current `package-lock.json`
- [ ] Note current versions in `package.json`
- [ ] Review dependency changelogs

### During Update:
```bash
# Create branch
git checkout -b feature/dependency-updates

# Update specific package
npm install package-name@version

# Or update all patch/minor versions
npm update

# Rebuild lock file if needed
rm package-lock.json node_modules -rf
npm install
```

### After Updating:
- [ ] Run `npm install` to update lock file
- [ ] Run `npm run build` - should succeed without errors
- [ ] Run `npm run lint` - should pass
- [ ] Run `npm run dev` - test in development
- [ ] Test critical flows:
  - [ ] User authentication (login/logout)
  - [ ] Project creation
  - [ ] Form submissions
  - [ ] Data fetching/display
  - [ ] Theme switching
  - [ ] Toast notifications
  - [ ] File uploads
  - [ ] Charts/graphs
- [ ] Check browser console for errors
- [ ] Test on mobile responsive views
- [ ] Test in production build mode

### Deployment:
```bash
# Commit changes
git add package.json package-lock.json
git commit -m "chore: update dependencies [list major ones]"

# Push and create PR
git push origin feature/dependency-updates
```

---

## 🛠️ Troubleshooting

### Build Fails After Update
```bash
# Clear caches and reinstall
rm -rf node_modules package-lock.json .vite
npm install
npm run build
```

### TypeScript Errors
```bash
# Update TypeScript definitions
npm install --save-dev @types/react@latest @types/react-dom@latest @types/node@latest
```

### Vite Issues
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

### Supabase Client Issues
- Verify environment variables are set
- Check Supabase client initialization in `src/integrations/supabase/client.ts`
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are correct

---

## 🎯 Recommended Update Schedule

### Monthly (Low Risk):
- Patch updates (x.x.X)
- Security updates
- lucide-react icons
- Build tool updates

### Quarterly (Medium Risk):
- Minor updates (x.X.x)
- React Router updates
- Date utility updates
- UI component updates

### Annually (High Risk):
- Major updates (X.x.x)
- Plan dedicated sprint
- Comprehensive testing required
- Zod, form libraries, charting libraries

---

## 🔒 Security Updates

Always prioritize security updates regardless of risk level:

```bash
# Check for security vulnerabilities
npm audit

# Fix automatically fixable issues
npm audit fix

# For breaking changes, update manually
npm audit fix --force  # Use with caution!
```

---

## 📊 Current Outdated Packages (as of 2025-11-06)

### Critical Security Updates Needed:
- None currently

### Recommended Updates:
- lucide-react: 0.462.0 → 0.552.0 (90 versions behind)
- @supabase/mcp-utils: 0.2.1 → 0.2.4
- @upstash/context7-mcp: 1.0.14 → 1.0.26

### Plan for Major Updates:
- React Router: v6 → v7 (Q1 2025)
- Zod: v3 → v4 (Q2 2025)
- Date-fns: v3 → v4 (Q2 2025)
- Recharts: v2 → v3 (Q3 2025)

---

## 🤝 Getting Help

If you encounter issues after updates:
1. Check the package's changelog/migration guide
2. Search GitHub issues for the package
3. Revert the update if critical issues occur
4. Test updates in isolation when possible

---

**Last Updated**: 2025-11-06
**Next Review**: 2025-12-06
