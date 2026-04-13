# iOS App Store Submission via GitHub Actions + EAS Local Builds

**No Mac Required | Unlimited Builds | Works for Multiple Apps**

---

## Architecture Overview

```
Your Windows/Linux Machine
    │
    ├── Code + push to GitHub
    │
    ▼
GitHub Actions (macos-latest runner)  ◄── Free macOS build environment
    │
    ├── eas build --local          ◄── Builds .ipa on GitHub's Mac
    ├── Code signs with your certs ◄── Managed by EAS credentials
    │
    ▼
apple-actions/upload-testflight-build
    │
    ▼
App Store Connect / TestFlight
    │
    ▼
App Store (after review)
```

**Cost breakdown:**
- Apple Developer Program: $99/year (required, no way around it)
- EAS first build per app: ~$2 (one-time credential setup)
- GitHub Actions: Free tier = 2,000 macOS minutes/month
- Subsequent builds: $0 (all on GitHub Actions)

---

## Phase 1: Apple Developer Account Setup

### Step 1: Enroll in Apple Developer Program

1. Go to https://developer.apple.com/programs/enroll/
2. Sign in with your Apple ID (create one if needed)
3. Pay $99/year
4. Wait for approval (usually 24-48 hours, sometimes instant for individuals)

**Important:** You need a PAID developer account. Free accounts cannot submit to the App Store.

### Step 2: Create an App Store Connect API Key

This key lets GitHub Actions submit builds without needing your Apple ID credentials.

1. Go to https://appstoreconnect.apple.com/access/integrations/api
2. Click the **"+"** button to generate a new key
3. Name: `GitHub Actions CI/CD`
4. Access: **App Manager** (minimum needed for submission)
5. Click **Generate**
6. **Download the .p8 file immediately** — Apple only lets you download it once
7. Note down:
   - **Issuer ID** (shown at top of the page)
   - **Key ID** (shown next to your key name)
   - **Private Key** (contents of the .p8 file)

Store these securely — you'll add them as GitHub Secrets later.

### Step 3: Register Your App Bundle ID

1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Click **"+"** → **App IDs** → **App**
3. Enter:
   - Description: `Brikly` (or your app name)
   - Bundle ID: Explicit → `com.yourcompany.yourapp`
4. Enable any capabilities you need (Push Notifications, Sign in with Apple, etc.)
5. Click **Register**

### Step 4: Create Your App in App Store Connect

1. Go to https://appstoreconnect.apple.com/apps
2. Click **"+"** → **New App**
3. Fill in:
   - Platform: iOS
   - Name: Your app's display name
   - Primary Language: English (U.S.)
   - Bundle ID: Select the one you just registered
   - SKU: Any unique string (e.g., `brikly-ios-001`)
4. Click **Create**

You don't need to fill out all the metadata yet — just having the app record is enough for TestFlight uploads.

---

## Phase 2: Project Configuration

### Step 5: Initialize Your Expo/React Native Project

If you're starting fresh or converting an existing project:

```bash
# If starting new
npx create-expo-app my-app
cd my-app

# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login
```

### Step 6: Configure app.json / app.config.js

```json
{
  "expo": {
    "name": "Brikly",
    "slug": "brikly",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1A2332"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.brikly",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Brikly uses your camera to capture site photos",
        "NSLocationWhenInUseUsageDescription": "Brikly uses your location for time tracking"
      }
    },
    "android": {
      "package": "com.yourcompany.brikly",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1A2332"
      }
    }
  }
}
```

### Step 7: Configure eas.json

Create `eas.json` in your project root:

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m-medium"
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": {
        "resourceClass": "m-medium"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

**Finding your IDs:**
- `ascAppId`: App Store Connect → Your App → General → App Information → Apple ID (numeric)
- `appleTeamId`: https://developer.apple.com/account → Membership → Team ID

---

## Phase 3: First Build (One-Time EAS Cloud Build)

This is the only step that costs EAS credits. It initializes your iOS credentials (Distribution Certificate + Provisioning Profile) that all future builds will reuse.

### Step 8: Run First EAS Cloud Build

```bash
# This will interactively set up iOS credentials
eas build -p ios --profile production

# EAS will ask:
# 1. "Would you like to log in to your Apple account?" → Yes
# 2. Enter Apple ID + password (+ 2FA code)
# 3. "Generate a new Apple Distribution Certificate?" → Yes
# 4. "Generate a new provisioning profile?" → Yes
```

**What happens:**
- EAS creates a Distribution Certificate in your Apple Developer account
- EAS creates a Provisioning Profile linked to your Bundle ID
- EAS stores both encrypted on Expo's servers
- The build runs on EAS cloud (uses 1 iOS build credit)
- You get an .ipa file

**You don't even need to download this .ipa.** The point is just to initialize credentials. From now on, all builds happen on GitHub Actions for free.

### Step 9: Create an Expo Access Token

For GitHub Actions to authenticate with EAS:

1. Go to https://expo.dev/settings/access-tokens
2. Click **Create Token**
3. Name: `GitHub Actions`
4. Click **Create**
5. Copy the token immediately

---

## Phase 4: GitHub Actions Workflow

### Step 10: Add GitHub Secrets

In your GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret Name | Value | Where to Get It |
|---|---|---|
| `EXPO_TOKEN` | Expo access token | Step 9 |
| `APPSTORE_ISSUER_ID` | App Store Connect API Issuer ID | Step 2 |
| `APPSTORE_API_KEY_ID` | App Store Connect API Key ID | Step 2 |
| `APPSTORE_API_PRIVATE_KEY` | Full contents of .p8 file | Step 2 |

### Step 11: Create the Workflow File

Create `.github/workflows/ios-release.yml`:

```yaml
name: Build & Submit iOS to App Store

on:
  # Manual trigger with optional version bump
  workflow_dispatch:
    inputs:
      build_profile:
        description: 'EAS build profile'
        required: true
        default: 'production'
        type: choice
        options:
          - production
          - preview
      submit_to_store:
        description: 'Submit to TestFlight after build?'
        required: true
        default: true
        type: boolean

# Prevent concurrent builds
concurrency:
  group: ios-build
  cancel-in-progress: false

jobs:
  build-ios:
    name: Build iOS IPA
    runs-on: macos-latest
    timeout-minutes: 60

    steps:
      # 1. Checkout code
      - name: Checkout repository
        uses: actions/checkout@v4

      # 2. Setup Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      # 3. Install dependencies
      - name: Install dependencies
        run: npm ci

      # 4. Setup EAS
      - name: Setup EAS CLI
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          expo-cache: true
          token: ${{ secrets.EXPO_TOKEN }}

      # 5. Build IPA locally on the GitHub runner
      - name: Build iOS app (local)
        run: |
          eas build --local \
            --platform ios \
            --profile ${{ inputs.build_profile }} \
            --non-interactive \
            --output ./app.ipa

      # 6. Upload IPA as artifact (backup/debugging)
      - name: Upload IPA artifact
        uses: actions/upload-artifact@v4
        with:
          name: ios-build-${{ github.sha }}
          path: ./app.ipa
          retention-days: 14

      # 7. Submit to TestFlight
      - name: Submit to TestFlight
        if: ${{ inputs.submit_to_store == true || inputs.submit_to_store == 'true' }}
        uses: apple-actions/upload-testflight-build@v3
        with:
          app-path: './app.ipa'
          issuer-id: ${{ secrets.APPSTORE_ISSUER_ID }}
          api-key-id: ${{ secrets.APPSTORE_API_KEY_ID }}
          api-private-key: ${{ secrets.APPSTORE_API_PRIVATE_KEY }}

      # 8. Notify on completion
      - name: Build Summary
        if: always()
        run: |
          echo "## iOS Build Summary" >> $GITHUB_STEP_SUMMARY
          echo "- **Profile:** ${{ inputs.build_profile }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Submitted:** ${{ inputs.submit_to_store }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Commit:** ${{ github.sha }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Branch:** ${{ github.ref_name }}" >> $GITHUB_STEP_SUMMARY
```

---

## Phase 5: Running Your First Automated Build

### Step 12: Trigger the Build

1. Go to your GitHub repo → **Actions** tab
2. Select **"Build & Submit iOS to App Store"** from the left sidebar
3. Click **"Run workflow"**
4. Choose:
   - Branch: `main`
   - Build profile: `production`
   - Submit to TestFlight: `true`
5. Click **"Run workflow"**

### Step 13: Monitor the Build

The build typically takes 15-30 minutes. Watch for:

- **Install dependencies** — should complete in 1-2 min
- **Build iOS app (local)** — the long step, 10-25 min
- **Submit to TestFlight** — 2-5 min for upload

If it fails, check the logs. Common issues:

| Error | Fix |
|---|---|
| `Credentials not found` | Run `eas credentials` locally to re-initialize |
| `Bundle ID mismatch` | Verify `app.json` bundleIdentifier matches Apple Developer Portal |
| `Provisioning profile expired` | Run `eas credentials --platform ios` to regenerate |
| `Upload failed: asset validation` | Check icon sizes, splash screen, and Info.plist |
| `Build timeout` | Increase `timeout-minutes` in workflow |

### Step 14: TestFlight → App Store

After successful upload:

1. Go to https://appstoreconnect.apple.com
2. Select your app → **TestFlight** tab
3. Wait for "Processing" to complete (5-30 minutes)
4. You'll see your build under iOS Builds
5. If you see **"Missing Compliance"** — click it, answer the export compliance question (usually "No" for standard apps)
6. Add test groups or submit for external testing

**To submit to the App Store:**
1. Go to your app → **App Store** tab
2. Click **"+"** next to iOS App to create a new version
3. Fill in: screenshots, description, keywords, support URL, privacy policy URL
4. Under **Build**, click **"+"** and select your TestFlight build
5. Click **"Submit for Review"**

---

## Phase 6: Multi-App Setup

Since you have multiple apps, here's how to scale this efficiently.

### Option A: Reusable Workflow (Recommended)

Create a shared workflow in a central repo, then call it from each app repo.

**Central repo: `.github/workflows/ios-build-reusable.yml`**

```yaml
name: Reusable iOS Build

on:
  workflow_call:
    inputs:
      build_profile:
        required: true
        type: string
        default: 'production'
    secrets:
      EXPO_TOKEN:
        required: true
      APPSTORE_ISSUER_ID:
        required: true
      APPSTORE_API_KEY_ID:
        required: true
      APPSTORE_API_PRIVATE_KEY:
        required: true

jobs:
  build-and-submit:
    runs-on: macos-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          eas-version: latest
          expo-cache: true
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Build iOS
        run: |
          eas build --local \
            -p ios \
            --profile ${{ inputs.build_profile }} \
            --non-interactive \
            --output ./app.ipa
      - uses: actions/upload-artifact@v4
        with:
          name: ios-${{ github.repository }}-${{ github.sha }}
          path: ./app.ipa
          retention-days: 14
      - uses: apple-actions/upload-testflight-build@v3
        with:
          app-path: './app.ipa'
          issuer-id: ${{ secrets.APPSTORE_ISSUER_ID }}
          api-key-id: ${{ secrets.APPSTORE_API_KEY_ID }}
          api-private-key: ${{ secrets.APPSTORE_API_PRIVATE_KEY }}
```

**Each app repo: `.github/workflows/release-ios.yml`**

```yaml
name: Release iOS
on:
  workflow_dispatch:

jobs:
  ios:
    uses: your-org/shared-workflows/.github/workflows/ios-build-reusable.yml@main
    secrets:
      EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
      APPSTORE_ISSUER_ID: ${{ secrets.APPSTORE_ISSUER_ID }}
      APPSTORE_API_KEY_ID: ${{ secrets.APPSTORE_API_KEY_ID }}
      APPSTORE_API_PRIVATE_KEY: ${{ secrets.APPSTORE_API_PRIVATE_KEY }}
```

### Option B: Organization-Level Secrets

If all your apps are in the same GitHub org:

1. Go to GitHub Org → Settings → Secrets and variables → Actions
2. Add `APPSTORE_ISSUER_ID`, `APPSTORE_API_KEY_ID`, `APPSTORE_API_PRIVATE_KEY` as org secrets
3. Set repository access to "All repositories" or select specific ones
4. Each repo only needs its own `EXPO_TOKEN` (tied to the Expo project)

**The App Store Connect API key works across ALL your apps** under the same Apple Developer account. You only create it once.

---

## Phase 7: Capacitor Apps (Brikly Specific)

Brikly uses Capacitor, not Expo. The workflow differs slightly.

### Capacitor Build Workflow

For Capacitor apps, you skip EAS entirely and use Xcode command-line tools directly on the GitHub runner.

**`.github/workflows/ios-capacitor.yml`**

```yaml
name: Build & Submit Capacitor iOS App

on:
  workflow_dispatch:
    inputs:
      submit:
        description: 'Submit to TestFlight?'
        required: true
        default: true
        type: boolean

jobs:
  build-ios:
    runs-on: macos-latest
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci

      # Build the web app
      - name: Build web assets
        run: npm run build

      # Sync to Capacitor iOS project
      - name: Sync Capacitor
        run: npx cap sync ios

      # Setup Ruby for Fastlane (optional but recommended)
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      # Install CocoaPods
      - name: Install CocoaPods
        run: |
          cd ios/App
          pod install

      # Import signing certificate
      - name: Install Apple Certificate
        uses: apple-actions/import-codesign-certs@v3
        with:
          p12-file-base64: ${{ secrets.IOS_DISTRIBUTION_CERT_P12 }}
          p12-password: ${{ secrets.IOS_DISTRIBUTION_CERT_PASSWORD }}

      # Install provisioning profile
      - name: Install Provisioning Profile
        run: |
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          echo "${{ secrets.IOS_PROVISIONING_PROFILE }}" | base64 --decode \
            > ~/Library/MobileDevice/Provisioning\ Profiles/profile.mobileprovision

      # Build with xcodebuild
      - name: Build IPA
        run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
            -scheme App \
            -configuration Release \
            -archivePath build/App.xcarchive \
            archive \
            CODE_SIGN_IDENTITY="Apple Distribution" \
            PROVISIONING_PROFILE_SPECIFIER="${{ secrets.IOS_PROVISIONING_PROFILE_NAME }}"

          xcodebuild -exportArchive \
            -archivePath build/App.xcarchive \
            -exportPath build/output \
            -exportOptionsPlist ExportOptions.plist

      # Submit to TestFlight
      - name: Upload to TestFlight
        if: ${{ inputs.submit }}
        uses: apple-actions/upload-testflight-build@v3
        with:
          app-path: 'ios/App/build/output/App.ipa'
          issuer-id: ${{ secrets.APPSTORE_ISSUER_ID }}
          api-key-id: ${{ secrets.APPSTORE_API_KEY_ID }}
          api-private-key: ${{ secrets.APPSTORE_API_PRIVATE_KEY }}
```

**Additional secrets needed for Capacitor:**

| Secret | How to Get It |
|---|---|
| `IOS_DISTRIBUTION_CERT_P12` | Base64 of your .p12 certificate (export from Apple Developer Portal or Keychain, then `base64 -i cert.p12`) |
| `IOS_DISTRIBUTION_CERT_PASSWORD` | Password you set when exporting the .p12 |
| `IOS_PROVISIONING_PROFILE` | Base64 of your .mobileprovision file |
| `IOS_PROVISIONING_PROFILE_NAME` | Name of the provisioning profile |

**ExportOptions.plist** (place in `ios/App/`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>signingStyle</key>
    <string>manual</string>
    <key>provisioningProfiles</key>
    <dict>
        <key>com.yourcompany.brikly</key>
        <string>Your Provisioning Profile Name</string>
    </dict>
</dict>
</plist>
```

> **Note:** Capacitor requires more manual certificate management than EAS/Expo.
> If you're submitting multiple apps, the Expo + EAS route is significantly
> easier because EAS handles all the signing complexity for you. Consider
> wrapping Brikly's Capacitor project with Expo if you want the simpler
> credential management.

---

## Quick Reference: The Credential Chain

```
Apple Developer Account ($99/year)
    │
    ├── App Store Connect API Key (.p8)
    │   ├── Issuer ID      → GitHub Secret: APPSTORE_ISSUER_ID
    │   ├── Key ID          → GitHub Secret: APPSTORE_API_KEY_ID
    │   └── Private Key     → GitHub Secret: APPSTORE_API_PRIVATE_KEY
    │
    ├── Distribution Certificate
    │   └── Managed by EAS (Expo apps)
    │       OR manual .p12 (Capacitor apps)
    │
    ├── Provisioning Profile
    │   └── Managed by EAS (Expo apps)
    │       OR manual .mobileprovision (Capacitor apps)
    │
    └── Bundle IDs (one per app)
        ├── com.yourcompany.brikly
        ├── com.yourcompany.app2
        └── com.yourcompany.app3

Expo Account (free)
    │
    └── Access Token → GitHub Secret: EXPO_TOKEN
```

---

## Troubleshooting Cheat Sheet

| Problem | Solution |
|---|---|
| "No matching provisioning profiles" | Run `eas credentials --platform ios` to regenerate |
| "The bundle identifier is not available" | Someone already registered it — pick a different one |
| "Missing compliance information" | Go to TestFlight → your build → answer export compliance |
| "Invalid binary" | Check minimum iOS version, required device capabilities |
| "Asset validation failed" | Ensure app icon is 1024x1024 PNG with no alpha channel |
| GitHub Action times out | Increase `timeout-minutes` to 90 |
| "Could not find a simulator" | Add `--no-wait` flag to eas build |
| Build succeeds but upload fails | Check API key permissions — needs "App Manager" role |
| "Profile doesn't match bundle ID" | Verify `bundleIdentifier` in app.json matches Apple portal exactly |
| EAS asks for credentials interactively | You skipped Phase 3 — do the first cloud build |

---

## Estimated Timeline

| Phase | Time | Notes |
|---|---|---|
| Apple Developer enrollment | 1-2 days | Waiting for approval |
| API key + app registration | 30 min | One-time setup |
| Project configuration | 1-2 hours | eas.json, app.json tuning |
| First EAS cloud build | 30 min | One-time per app ($2) |
| GitHub Actions setup | 30 min | One-time, reusable across apps |
| First automated build | 15-30 min | Hands-off after trigger |
| App Store review | 1-7 days | Apple's timeline |

**Total hands-on time for first app: ~3-4 hours**
**Each additional app: ~1 hour** (just config + first EAS build)
