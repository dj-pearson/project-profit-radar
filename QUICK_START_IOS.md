# iOS App Store - Quick Start Guide

## ✅ What's Been Set Up

Your iOS deployment infrastructure is now ready! Here's what was configured:

### Files Created

1. ✅ **`.github/workflows/ios-release.yml`** - GitHub Actions workflow for automated iOS builds
2. ✅ **`ios/App/ExportOptions.plist`** - Code signing configuration for App Store
3. ✅ **`scripts/verify-ios-setup.js`** - Verification script to check your setup
4. ✅ **`IOS_DEPLOYMENT_CHECKLIST.md`** - Comprehensive deployment guide
5. ✅ **`package.json`** - Added helpful npm scripts:
   - `npm run ios:verify` - Check setup status
   - `npm run ios:init` - Initialize iOS platform
   - `npm run build:mobile:ios` - Build and sync to iOS

---

## 🚦 Current Status

Run this to see your current setup status:

```bash
npm run ios:verify
```

### Summary from Verification

- ✅ Node.js and npm installed
- ✅ Capacitor configuration exists (Bundle ID: `com.brikly.app`)
- ✅ GitHub Actions workflow configured
- ✅ ExportOptions.plist created
- ⚠️ iOS platform not initialized yet (will do this next)
- ⚠️ Web assets not built yet (will do this next)

---

## 📝 What You Still Need to Do

### 1. Complete Apple Developer Portal Setup (15-30 min)

You mentioned you've done Phase 1 (Apple Developer enrollment and API key), but you still need:

#### A. Register Bundle ID

- Go to: https://developer.apple.com/account/resources/identifiers/list
- Create App ID with Bundle ID: `com.brikly.app`

#### B. Create Distribution Certificate

- Requires temporary Mac access (or use a Mac VM)
- Export as .p12 file with password
- Base64 encode for GitHub Secret

#### C. Create Provisioning Profile

- Go to: https://developer.apple.com/account/resources/profiles/list
- Create "App Store" profile for `com.brikly.app`
- Download and base64 encode

#### D. Create App in App Store Connect

- Go to: https://appstoreconnect.apple.com/apps
- Create new iOS app
- Link to Bundle ID: `com.brikly.app`

**Detailed instructions**: See `IOS_DEPLOYMENT_CHECKLIST.md` Phase 2

---

### 2. Add GitHub Secrets (5 min)

Go to: `https://github.com/[your-username]/project-profit-radar/settings/secrets/actions`

You already have these 4 (from Phase 1):

- ✅ `APPLE_TEAM_ID`
- ✅ `APPSTORE_ISSUER_ID`
- ✅ `APPSTORE_API_KEY_ID`
- ✅ `APPSTORE_API_PRIVATE_KEY`

**Still need these 4:**

- ⏳ `IOS_DISTRIBUTION_CERT_P12` - Base64 of .p12 certificate
- ⏳ `IOS_DISTRIBUTION_CERT_PASSWORD` - Password for .p12
- ⏳ `IOS_PROVISIONING_PROFILE` - Base64 of .mobileprovision
- ⏳ `IOS_PROVISIONING_PROFILE_NAME` - Profile name (e.g., "Brikly App Store Profile")

**How to base64 encode** (PowerShell):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("file.p12")) | Set-Clipboard
```

---

### 3. Initialize iOS Project Locally (5 min)

```bash
# Build web assets and initialize iOS
npm run ios:init

# This runs:
# 1. npm run build:mobile  (builds dist-mobile/)
# 2. npx cap add ios       (creates iOS project)
# 3. npx cap sync ios      (syncs assets)
```

**Expected output:**

- ✅ `dist-mobile/` directory created
- ✅ `ios/App/App.xcworkspace` created
- ✅ `ios/App/Podfile` and pods installed

---

### 4. Trigger GitHub Actions Build (30-40 min build time)

Once all secrets are set:

1. Go to: `https://github.com/[your-username]/project-profit-radar/actions`
2. Click: **"Build & Submit iOS to App Store"**
3. Click: **"Run workflow"**
4. Configure:
   - Branch: `main`
   - Environment: `production`
   - Submit to TestFlight: ✅ `true`
   - Skip tests: `false`
5. Click: **"Run workflow"**

**Build takes 30-40 minutes:**

- 3-5 min: Build web assets
- 3-5 min: Install CocoaPods
- 10-15 min: Compile iOS app
- 2-5 min: Upload to TestFlight

---

### 5. TestFlight Processing (5-30 min)

After successful upload:

1. Go to: https://appstoreconnect.apple.com
2. Select: **Brikly** → **TestFlight**
3. Wait: Build processing (5-30 min)
4. Answer: Export compliance question
5. Test: Add internal testers

---

### 6. Submit to App Store (24-48 hour review)

1. Go to: **App Store** tab in App Store Connect
2. Create: New version (1.0.0)
3. Fill in: App metadata (name, description, screenshots, etc.)
4. Select: Your TestFlight build
5. Submit: For App Review

---

## 🔧 Helpful Commands

```bash
# Check setup status
npm run ios:verify

# Build web assets for mobile
npm run build:mobile

# Initialize iOS platform (first time only)
npm run ios:init

# Build and sync to iOS
npm run build:mobile:ios

# Open full deployment checklist
code IOS_DEPLOYMENT_CHECKLIST.md

# View GitHub Actions workflow
code .github/workflows/ios-release.yml
```

---

## 📚 Documentation Files

1. **`IOS_DEPLOYMENT_CHECKLIST.md`** - Complete step-by-step guide (most detailed)
2. **`ios-app-store-guide.md`** - Original guide from your research
3. **`QUICK_START_IOS.md`** - This file (quick overview)
4. **`.github/workflows/ios-release.yml`** - GitHub Actions workflow
5. **`ios/App/ExportOptions.plist`** - Code signing configuration

---

## ❓ Common Questions

### Do I need a Mac?

**For GitHub Actions**: No! The build runs on GitHub's macOS runners for free.

**For creating certificates**: Yes, temporarily. You need Mac access to:

- Generate Certificate Signing Request
- Export Distribution Certificate as .p12

**Options**:

- Borrow a friend's Mac for 30 minutes
- Use a Mac VM (e.g., MacStadium, MacinCloud)
- Use a library/university Mac
- Rent a Mac remotely

### How much does this cost?

- **Apple Developer Program**: $99/year (required)
- **GitHub Actions**: Free (2,000 macOS minutes/month)
- **Subsequent builds**: $0 (all on GitHub's infrastructure)

### What if I have multiple apps?

The same Apple Developer account works for all apps:

- **API Key**: Reuse across all apps (same 4 GitHub Secrets)
- **Team ID**: Same for all apps
- **Certificates**: Can reuse the same Distribution Certificate
- **Provisioning Profiles**: Need one per app (different Bundle IDs)

Just create separate Bundle IDs and Provisioning Profiles for each app.

### Can I test locally without GitHub Actions?

On macOS only:

```bash
npm run build:mobile
npx cap sync ios
npx cap open ios
# Xcode opens, click Run
```

On Windows: You must use GitHub Actions (no way to run Xcode locally).

---

## 🆘 Troubleshooting

### Build fails with "Credentials not found"

**Fix**: Verify all 8 GitHub Secrets are set correctly.

### "No matching provisioning profiles"

**Fix**:

- Check Bundle ID matches exactly: `com.brikly.app`
- Ensure provisioning profile is "App Store" type (not Development)

### "Code signing identity not found"

**Fix**:

- Verify .p12 password is correct
- Re-export certificate from Keychain Access

### Need more help?

1. Run: `npm run ios:verify` to diagnose issues
2. Check: GitHub Actions workflow logs
3. Review: `IOS_DEPLOYMENT_CHECKLIST.md` troubleshooting section

---

## ✅ Next Steps (In Order)

1. [ ] Complete Apple Developer Portal setup (Bundle ID, Certificate, Profile, App)
2. [ ] Add remaining 4 GitHub Secrets
3. [ ] Run `npm run ios:init` locally to initialize iOS project
4. [ ] Commit and push changes to GitHub
5. [ ] Trigger GitHub Actions workflow
6. [ ] Wait for build to complete
7. [ ] Check TestFlight in App Store Connect
8. [ ] Test the app
9. [ ] Submit to App Store

---

**Ready to start?**

```bash
# First, check your current status:
npm run ios:verify

# Then follow the checklist in:
code IOS_DEPLOYMENT_CHECKLIST.md
```

Good luck! 🚀
