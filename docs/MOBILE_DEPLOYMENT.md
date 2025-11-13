# Mobile App Deployment Guide

**Last Updated:** 2025-11-13
**Version:** 1.0
**App ID:** com.builddesk.app
**App Name:** BuildDesk

---

## Overview

This guide covers the complete process for deploying BuildDesk to the Apple App Store (iOS) and Google Play Store (Android).

### Current Status
- ✅ Capacitor configured (v7.4.1)
- ✅ App ID: com.builddesk.app
- ✅ Android project initialized
- ⚠️ iOS project needs initialization
- ❌ Not yet deployed to stores

---

## Prerequisites

### Development Environment

**For iOS:**
- macOS computer (required for iOS development)
- Xcode 14+ installed
- Apple Developer Account ($99/year)
- CocoaPods installed (`sudo gem install cocoapods`)

**For Android:**
- Android Studio installed
- Java JDK 11+ installed
- Android SDK installed (via Android Studio)
- Google Play Developer Account ($25 one-time)

**Common:**
- Node.js 18+ and npm 9+
- Capacitor CLI (`npm install -g @capacitor/cli`)
- Build dependencies installed (`npm install`)

---

## Pre-Deployment Checklist

### 1. Environment Configuration

Create `.env.production` file:
```bash
VITE_SUPABASE_URL=https://ilhzuvemiuyfuxfegtlv.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-production-key
VITE_SENTRY_DSN=your-sentry-dsn
VITE_ENVIRONMENT=production
```

### 2. Update Version Numbers

**package.json:**
```json
{
  "version": "1.0.0"
}
```

**Android (android/app/build.gradle):**
```gradle
versionCode 1
versionName "1.0.0"
```

**iOS (ios/App/App/Info.plist):**
```xml
<key>CFBundleShortVersionString</key>
<string>1.0.0</string>
<key>CFBundleVersion</key>
<string>1</string>
```

### 3. Build Web Assets

```bash
# Build production version
npm run build:prod

# Verify build output
ls -lh dist/
```

### 4. Sync with Native Projects

```bash
# Sync web assets to native projects
npx cap sync

# Copy assets to iOS (if iOS project exists)
npx cap sync ios

# Copy assets to Android
npx cap sync android
```

---

## Platform Permissions Configuration

After initializing the iOS and Android platforms, you need to configure the required permissions for app features. These permissions are required for Camera, Geolocation, and other native features.

### iOS Permissions (Info.plist)

Add the following keys to `ios/App/App/Info.plist` after initialization:

```xml
<!-- Camera and Photo Library -->
<key>NSCameraUsageDescription</key>
<string>BuildDesk needs access to your camera to capture photos of work sites, materials, and documents.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>BuildDesk needs access to your photo library to attach images to daily reports and documents.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>BuildDesk needs permission to save photos to your library.</string>

<!-- Location Services -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>BuildDesk needs your location to track time entries at job sites and provide location-based features.</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>BuildDesk needs continuous location access for geofencing and automatic check-in/out at job sites.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>BuildDesk uses your location to track work hours at job sites and enable automatic time tracking.</string>
```

### Android Permissions (AndroidManifest.xml)

Add the following permissions to `android/app/src/main/AndroidManifest.xml` after initialization:

```xml
<!-- Camera permissions -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />

<!-- Storage permissions -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

<!-- Location permissions -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- Notification permissions -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<!-- Network state for offline detection -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

**Note:** These permissions are automatically requested at runtime when the user first uses features that require them. The app follows best practices for permission handling.

---

## iOS Deployment

### Step 1: Initialize iOS Project (First Time Only)

```bash
# Add iOS platform
npx cap add ios

# Open in Xcode
npx cap open ios
```

### Step 2: Configure App in Xcode

1. **Open the project in Xcode**
   ```bash
   npx cap open ios
   ```

2. **Set Team and Bundle ID**
   - Select "App" target in project navigator
   - Go to "Signing & Capabilities" tab
   - Select your Apple Developer Team
   - Verify Bundle Identifier: `com.builddesk.app`
   - Enable "Automatically manage signing"

3. **Configure App Icons**
   - In Assets.xcassets, add AppIcon images
   - Required sizes:
     - 20x20 (@2x, @3x)
     - 29x29 (@2x, @3x)
     - 40x40 (@2x, @3x)
     - 60x60 (@2x, @3x)
     - 1024x1024 (App Store)

4. **Configure Launch Screen**
   - Update LaunchScreen.storyboard
   - Add BuildDesk logo and branding

5. **Set Deployment Target**
   - Set to iOS 13.0 or higher
   - Verify in General > Deployment Info

6. **Configure Capabilities**
   - Enable required capabilities:
     - Camera
     - Location (When In Use)
     - Push Notifications
     - Background Modes (if needed)

### Step 3: App Store Connect Setup

1. **Create App Listing**
   - Go to https://appstoreconnect.apple.com
   - Click "My Apps" → "+" → "New App"
   - Fill in required information:
     - Platform: iOS
     - Name: BuildDesk
     - Primary Language: English (U.S.)
     - Bundle ID: com.builddesk.app
     - SKU: com.builddesk.app

2. **App Information**
   ```
   Name: BuildDesk - Construction Management
   Subtitle: Real-time Job Costing & Project Tracking
   Category: Business
   Secondary Category: Productivity
   ```

3. **Pricing and Availability**
   - Free (with in-app purchases via Stripe)
   - Available in all territories

### Step 4: Prepare App Store Assets

**Screenshots Required:**

iPhone (6.7" Display - iPhone 14 Pro Max):
- At least 3 screenshots (up to 10)
- Size: 1290 x 2796 pixels

iPhone (6.5" Display - iPhone 11 Pro Max):
- Size: 1242 x 2688 pixels

iPad Pro (12.9" - 3rd Gen):
- Size: 2048 x 2732 pixels

**App Preview Video (Optional but Recommended):**
- 15-30 seconds
- Showcase key features
- No more than 500 MB

**App Icon:**
- 1024 x 1024 pixels
- No transparency
- No rounded corners (iOS adds them)

**Text Content:**
```
Description:
BuildDesk is the construction management platform built for contractors who need real-time job costing without enterprise complexity.

⭐ KEY FEATURES

📊 Real-Time Job Costing
• Live budget vs actual tracking
• Cost breakdown by category (labor, materials, equipment)
• Profitability alerts and variance tracking
• Cash flow forecasting

📱 Mobile-First Field Management
• GPS crew check-in with geofencing
• Photo documentation with OCR
• Works offline on job sites
• Daily report creation
• Automatic sync when connected

💰 Complete Financial Suite
• Generate professional invoices
• Track expenses and receipts
• QuickBooks Online integration
• Payment reminders and tracking
• Retention scheduling

👷 Team Collaboration
• Visual crew scheduling
• Digital time tracking and approval
• Task management
• Real-time updates across devices
• Document sharing

🔒 Enterprise Security
• Bank-level encryption
• Multi-factor authentication
• Role-based permissions (7 user types)
• Audit logging
• GDPR compliant

📈 Smart Analytics
• Executive dashboard with KPIs
• Performance benchmarking
• Predictive analytics
• Custom reports
• Risk assessment

💼 PERFECT FOR:
• General contractors
• Specialty contractors (plumbing, HVAC, electrical)
• Small to medium construction businesses
• Project managers
• Field supervisors

📊 PRICING:
Starting at $350/month with unlimited users
✓ Free 14-day trial - no credit card required
✓ All features included
✓ Cancel anytime

🏆 WHY BUILDDESK?
Unlike complicated enterprise software, BuildDesk is designed specifically for SMB contractors who need powerful features without the complexity. Get up and running in minutes, not months.

📞 SUPPORT:
• In-app chat support
• Knowledge base
• Video tutorials
• Email support: support@builddesk.com

Built by contractors, for contractors. Start managing your projects more profitably today.

Keywords:
construction, contractor, job costing, project management, building, estimating, invoicing, time tracking, field management, construction software

What's New (Version 1.0.0):
• Initial release
• Real-time job costing
• Mobile field management
• GPS time tracking
• QuickBooks integration
• Offline mode support
```

### Step 5: Build for App Store

1. **Select Build Target**
   - In Xcode, select "Any iOS Device (arm64)" from the device dropdown

2. **Archive the App**
   - Product → Archive (⌘ + B to build first)
   - Wait for archive to complete (5-10 minutes)

3. **Validate Archive**
   - When archive completes, Organizer window opens
   - Select your archive
   - Click "Validate App"
   - Choose "Automatically manage signing"
   - Click "Validate"
   - Fix any issues found

4. **Upload to App Store Connect**
   - Click "Distribute App"
   - Select "App Store Connect"
   - Choose "Upload"
   - Select "Automatically manage signing"
   - Click "Upload"
   - Wait for upload (10-20 minutes)

5. **Complete App Store Listing**
   - Go to App Store Connect
   - Your build will appear in "App Store" → "TestFlight" section after processing (1-2 hours)
   - Add build to version
   - Complete all required fields
   - Add screenshots and descriptions
   - Submit for review

### Step 6: TestFlight Beta Testing (Recommended)

```bash
# Before submitting to App Store, test with TestFlight

1. In App Store Connect, go to TestFlight
2. Select your app
3. Add internal testers (up to 100)
4. They'll receive email invitation
5. Test thoroughly before public release
```

### Step 7: Submit for Review

1. Review App Store listing one final time
2. Click "Submit for Review"
3. Review typically takes 1-3 business days
4. Monitor status in App Store Connect
5. Respond quickly to any rejection reasons

---

## Android Deployment

### Step 1: Configure Android Project

1. **Open Android Studio**
   ```bash
   npx cap open android
   ```

2. **Update app/build.gradle**
   ```gradle
   android {
       compileSdk 34

       defaultConfig {
           applicationId "com.builddesk.app"
           minSdk 22
           targetSdk 34
           versionCode 1
           versionName "1.0.0"
       }
   }
   ```

3. **Update app name and colors**
   - Edit `android/app/src/main/res/values/strings.xml`:
   ```xml
   <string name="app_name">BuildDesk</string>
   <string name="title_activity_main">BuildDesk</string>
   <string name="package_name">com.builddesk.app</string>
   ```

### Step 2: Generate Signing Key

```bash
# Navigate to android directory
cd android

# Generate keystore (run once, keep secure!)
keytool -genkey -v -keystore builddesk-release.keystore \
  -alias builddesk \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You'll be prompted for:
# - Keystore password (save this!)
# - Key password (save this!)
# - Your name, organization, etc.

# Store passwords securely (use password manager)
# NEVER commit keystore to git!
```

**IMPORTANT:** Back up the keystore file and passwords immediately. Without them, you cannot update your app!

### Step 3: Configure Gradle for Release

Create `android/key.properties`:
```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=builddesk
storeFile=builddesk-release.keystore
```

Add to `android/.gitignore`:
```
key.properties
*.keystore
*.jks
```

Update `android/app/build.gradle`:
```gradle
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 4: Create Play Store Assets

**App Icons:**
- 512 x 512 pixels (high-res icon)
- 1024 x 500 pixels (feature graphic)

**Screenshots Required:**

Phone (at least 2, up to 8):
- 1080 x 1920 pixels or higher
- Landscape: 1920 x 1080 pixels

7-inch Tablet (optional but recommended):
- 1200 x 1920 pixels

10-inch Tablet (optional but recommended):
- 1600 x 2560 pixels

**Promo Video (Optional):**
- YouTube link
- 30 seconds to 2 minutes
- Showcase app features

### Step 5: Play Console Setup

1. **Create App**
   - Go to https://play.google.com/console
   - Click "Create app"
   - Fill in:
     - App name: BuildDesk
     - Default language: English (United States)
     - App or game: App
     - Free or paid: Free

2. **App Content**
   ```
   Short description (80 chars max):
   Real-time job costing and project management for contractors

   Full description (4000 chars max):
   BuildDesk is the construction management platform designed for contractors
   who need real-time financial control without enterprise complexity.

   ⚡ REAL-TIME JOB COSTING
   Track costs as they happen with live budget updates, profitability alerts,
   and instant variance reporting.

   📱 BUILT FOR THE FIELD
   • GPS-based crew check-in and time tracking
   • Camera integration for daily reports
   • OCR for receipt scanning
   • Works offline on job sites
   • Automatic sync when connected

   💼 COMPLETE FINANCIAL SUITE
   • Generate professional invoices
   • Track expenses and receipts
   • QuickBooks Online integration
   • Payment reminders and tracking
   • Cash flow forecasting

   👥 TEAM COLLABORATION
   • Visual crew scheduling
   • Time tracking and approval
   • Task management
   • Real-time updates across devices
   • Document sharing

   🔐 ENTERPRISE SECURITY
   • Bank-level encryption
   • Multi-factor authentication
   • Role-based permissions
   • Audit logging
   • GDPR compliant

   📊 SMART ANALYTICS
   • Executive dashboard
   • Performance benchmarking
   • Predictive analytics
   • Custom reports

   Perfect for general contractors, specialty contractors, builders,
   and construction project managers.

   PRICING: $350/month, unlimited users
   FREE TRIAL: 14 days, no credit card required

   Join hundreds of contractors who trust BuildDesk for their
   construction management needs.
   ```

3. **App Category and Tags**
   - Category: Business
   - Tags: construction, project management, contractor, job costing

4. **Content Rating**
   - Complete questionnaire
   - Likely rating: Everyone

5. **Target Audience**
   - Age: 18+
   - Target audience: Business professionals

### Step 6: Build Release APK/AAB

```bash
# Build Android App Bundle (recommended for Play Store)
cd android
./gradlew bundleRelease

# Output location:
# android/app/build/outputs/bundle/release/app-release.aab

# OR build APK (for direct distribution)
./gradlew assembleRelease

# Output location:
# android/app/build/outputs/apk/release/app-release.apk
```

### Step 7: Upload to Play Console

1. **Create Release**
   - Go to Play Console
   - Select your app
   - Production → Create new release

2. **Upload App Bundle**
   - Upload `app-release.aab`
   - Enter release notes:
   ```
   Version 1.0.0

   Initial release of BuildDesk for Android!

   Features:
   • Real-time job costing and project management
   • GPS-based crew time tracking
   • Camera integration for daily reports
   • Works offline on job sites
   • QuickBooks Online integration
   • Multi-factor authentication
   • Professional invoice generation

   Get started with your 14-day free trial today!
   ```

3. **Review Release**
   - Check app bundle details
   - Verify version code and name
   - Review warnings (fix critical ones)

4. **Roll Out Release**
   - Choose rollout type:
     - Internal testing (recommended first)
     - Closed testing (beta testers)
     - Open testing (public beta)
     - Production (full release)

   For first release, recommend:
   - Start with Internal testing
   - Then Closed testing (100-1000 users)
   - Finally Production

5. **Submit for Review**
   - Review typically takes 1-7 days
   - Longer for first release
   - Monitor status in Play Console

---

## Post-Deployment

### Monitor App Performance

**iOS (App Store Connect):**
- App Analytics - Usage, crashes, engagement
- TestFlight - Beta tester feedback
- Ratings & Reviews - User feedback

**Android (Play Console):**
- Statistics - Installs, uninstalls, ratings
- Android Vitals - Crashes, ANRs, battery
- User feedback - Reviews and ratings

### Respond to Reviews

- Respond to all reviews (good and bad)
- Address issues raised
- Thank users for positive feedback
- Direct users to support for problems

### Update Process

**For Updates:**
1. Increment version numbers
2. Build new version
3. Update "What's New" text
4. Submit for review
5. Typically approved faster than initial submission

**Version Numbering:**
- Major updates: 1.0.0 → 2.0.0
- Minor updates: 1.0.0 → 1.1.0
- Patches: 1.0.0 → 1.0.1

---

## Troubleshooting

### iOS Common Issues

**"No valid code signing identity"**
- Solution: Select team in Xcode signing settings

**"Missing required icon sizes"**
- Solution: Add all required AppIcon sizes in Assets.xcassets

**"Invalid Bundle ID"**
- Solution: Verify Bundle ID matches App Store Connect

**Build fails with "Command PhaseScriptExecution failed"**
- Solution: Run `npx cap sync ios` and try again

### Android Common Issues

**"Keystore was tampered with, or password was incorrect"**
- Solution: Verify passwords in key.properties match keystore

**"Failed to find Build Tools revision"**
- Solution: Install required SDK version in Android Studio

**"Duplicate class found"**
- Solution: Clean build: `./gradlew clean`

**"AAB upload failed"**
- Solution: Verify version code is higher than previous release

---

## Security Best Practices

### Keystore Management

1. **Backup keystore files**
   - Store in secure location (password manager)
   - Keep multiple backups
   - Never commit to git

2. **Secure passwords**
   - Use strong, unique passwords
   - Store in password manager
   - Never share or commit

3. **Access control**
   - Limit who has keystore access
   - Use different keys for debug/release
   - Rotate if compromised

### Environment Variables

1. **Never commit secrets**
   - Add to .gitignore
   - Use environment variables
   - Different values for dev/prod

2. **Secure API keys**
   - Supabase keys
   - Sentry DSN
   - Stripe keys

---

## Automation Scripts

### Build Script (build-mobile.sh)

```bash
#!/bin/bash

# Build script for mobile apps
set -e

echo "🏗️  Building BuildDesk Mobile Apps"

# Build web assets
echo "📦 Building web assets..."
npm run build:prod

# Sync with native projects
echo "🔄 Syncing with native projects..."
npx cap sync

echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "iOS: npx cap open ios (then archive in Xcode)"
echo "Android: cd android && ./gradlew bundleRelease"
```

### Version Bump Script (bump-version.sh)

```bash
#!/bin/bash

# Bump version script
VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./bump-version.sh 1.0.1"
  exit 1
fi

echo "📝 Updating version to $VERSION"

# Update package.json
npm version $VERSION --no-git-tag-version

# Update Android version
# (requires manual edit of build.gradle)

# Update iOS version
# (requires manual edit in Xcode)

echo "✅ Version updated to $VERSION"
echo "⚠️  Don't forget to update Android and iOS version numbers!"
```

---

## Resources

### Official Documentation
- [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
- [Capacitor Android Docs](https://capacitorjs.com/docs/android)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)

### Tools
- [App Icon Generator](https://appicon.co/)
- [Screenshot Design](https://www.figma.com/)
- [LaunchScreen Builder](https://www.tinydesign.dev/)

### Support
- [Capacitor Community](https://capacitorjs.com/community)
- [Ionic Forum](https://forum.ionicframework.com/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/capacitor)

---

**Document maintained by:** Development Team
**Last reviewed:** 2025-11-13
**Next review:** 2026-02-13

---

*This guide is part of the BuildDesk documentation suite. For other guides, see `/docs/README.md`*
