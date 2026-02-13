# iOS App Store Deployment Checklist

**BuildDesk** - Complete setup guide for automated iOS builds and TestFlight/App Store deployment via GitHub Actions.

---

## 🎯 Quick Status Check

Run this command to verify your setup:

```bash
node scripts/verify-ios-setup.js
```

---

## ✅ Phase 1: Apple Developer Setup (COMPLETED ✓)

According to your message, you've completed:

- [x] Enrolled in Apple Developer Program ($99/year)
- [x] Created App Store Connect API Key (.p8 file)
- [x] Saved Issuer ID, Key ID, and Private Key
- [x] Added GitHub Secrets (see verification below)

### What you should have:

- ✅ Apple Developer Account (active membership)
- ✅ App Store Connect API Key downloaded (.p8 file)
- ✅ 3 pieces of information saved:
  - Issuer ID (UUID format)
  - Key ID (10-character alphanumeric)
  - Private Key (contents of .p8 file)

---

## 📋 Phase 2: Required Apple Developer Portal Setup

### 2.1 Register Bundle ID

1. Go to: https://developer.apple.com/account/resources/identifiers/list
2. Click **"+"** → **App IDs** → **App**
3. Enter:
   - **Description**: `BuildDesk`
   - **Bundle ID**: `com.builddesk.app` _(matches capacitor.config.ts)_
4. Enable capabilities:
   - [x] Push Notifications
   - [x] Sign in with Apple (if needed)
   - [x] Associated Domains (if needed)
5. Click **Register**

**Status**: ⏳ To be completed

---

### 2.2 Create Distribution Certificate

#### Option A: Let GitHub Actions Handle It (Recommended)

You'll need to create a certificate locally first, then export it.

**On a Mac (or temporary Mac access):**

```bash
# 1. Open Keychain Access
# 2. Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority
# 3. Enter your email, select "Saved to disk", Continue

# 4. Go to Apple Developer Portal:
# https://developer.apple.com/account/resources/certificates/list

# 5. Click "+" → "Apple Distribution" → Continue
# 6. Upload the CertificateSigningRequest.certSigningRequest file
# 7. Download the certificate (.cer file)

# 8. Double-click the .cer file to install it in Keychain Access

# 9. Export as .p12:
# - In Keychain Access, find "Apple Distribution: [Your Name]"
# - Right-click → Export "Apple Distribution: [Your Name]"
# - Save as: BuildDesk-Distribution.p12
# - Set a password (remember it!)

# 10. Convert to base64 for GitHub Secret:
base64 -i BuildDesk-Distribution.p12 | pbcopy
# (Now paste into GitHub Secret: IOS_DISTRIBUTION_CERT_P12)

# 11. Save the password as GitHub Secret: IOS_DISTRIBUTION_CERT_PASSWORD
```

#### Option B: Use Fastlane Match (Advanced)

If you have multiple apps, consider using Fastlane Match to store certificates in a private repo.

**Status**: ⏳ To be completed

---

### 2.3 Create Provisioning Profile

1. Go to: https://developer.apple.com/account/resources/profiles/list
2. Click **"+"** → **App Store** (under Distribution)
3. Select your Bundle ID: `com.builddesk.app`
4. Select your Distribution Certificate
5. Name it: `BuildDesk App Store Profile`
6. Click **Generate** and **Download**

**Save for GitHub:**

```bash
# Convert to base64:
base64 -i BuildDesk_App_Store_Profile.mobileprovision | pbcopy
# Paste into GitHub Secret: IOS_PROVISIONING_PROFILE

# Also save the NAME (not the filename) as:
# GitHub Secret: IOS_PROVISIONING_PROFILE_NAME
# Value: "BuildDesk App Store Profile"
```

**Status**: ⏳ To be completed

---

### 2.4 Create App in App Store Connect

1. Go to: https://appstoreconnect.apple.com/apps
2. Click **"+"** → **New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: BuildDesk
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: Select `com.builddesk.app`
   - **SKU**: `builddesk-ios-001` (any unique string)
   - **User Access**: Full Access
4. Click **Create**

**Note**: You don't need to fill out all metadata yet. Just creating the app record is enough for TestFlight.

**Status**: ⏳ To be completed

---

## 🔐 Phase 3: GitHub Secrets Verification

### Check Your GitHub Secrets

Go to: `https://github.com/[your-username]/project-profit-radar/settings/secrets/actions`

You mentioned you've set up GitHub Secrets. Verify you have **ALL 8** of these:

| Secret Name                      | Description                                                   | Status            |
| -------------------------------- | ------------------------------------------------------------- | ----------------- |
| `APPLE_TEAM_ID`                  | 10-character Team ID from https://developer.apple.com/account | ✓ Set?            |
| `APPSTORE_ISSUER_ID`             | UUID from App Store Connect API page                          | ✓ Set?            |
| `APPSTORE_API_KEY_ID`            | 10-char Key ID from API page                                  | ✓ Set?            |
| `APPSTORE_API_PRIVATE_KEY`       | Full contents of .p8 file                                     | ✓ Set?            |
| `IOS_DISTRIBUTION_CERT_P12`      | Base64 of Distribution cert (.p12)                            | ⏳ Need to create |
| `IOS_DISTRIBUTION_CERT_PASSWORD` | Password for .p12 file                                        | ⏳ Need to create |
| `IOS_PROVISIONING_PROFILE`       | Base64 of .mobileprovision                                    | ⏳ Need to create |
| `IOS_PROVISIONING_PROFILE_NAME`  | Name of provisioning profile                                  | ⏳ Need to create |

### How to Base64 Encode Files

**On macOS/Linux:**

```bash
base64 -i file.p12 | pbcopy  # Copies to clipboard
base64 -i file.mobileprovision
```

**On Windows (PowerShell):**

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("file.p12")) | Set-Clipboard
[Convert]::ToBase64String([IO.File]::ReadAllBytes("file.mobileprovision"))
```

---

## 🏗️ Phase 4: Project Initialization (Local)

### 4.1 Build Web Assets

```bash
npm run build:mobile
```

This creates the `dist-mobile/` folder that Capacitor needs.

**Expected output:**

- ✅ `dist-mobile/` directory created
- ✅ `dist-mobile/index.html` exists
- ✅ All assets bundled and optimized

---

### 4.2 Initialize iOS Platform

```bash
# Add iOS platform (only needed once)
npx cap add ios

# Sync web assets to iOS
npx cap sync ios
```

**Expected output:**

- ✅ `ios/App/App.xcworkspace` created
- ✅ `ios/App/App.xcodeproj` created
- ✅ `ios/App/Podfile` created
- ✅ Native plugins configured

---

### 4.3 Update ExportOptions.plist (Manual Step)

The file was created at `ios/App/ExportOptions.plist` with a placeholder.

**Manual edit required:**

Open `ios/App/ExportOptions.plist` and replace:

```xml
<key>teamID</key>
<string>YOUR_TEAM_ID_HERE</string>
```

with your actual Team ID:

```xml
<key>teamID</key>
<string>ABCD123456</string>
```

**OR** let GitHub Actions replace it automatically (already configured in workflow).

---

## 🚀 Phase 5: GitHub Actions Deployment

### 5.1 Verify Workflow File

Check that `.github/workflows/ios-release.yml` exists:

```bash
ls .github/workflows/ios-release.yml
```

✅ **File created** - Ready to use!

---

### 5.2 Trigger Your First Build

1. Go to: `https://github.com/[your-username]/project-profit-radar/actions`
2. Click **"Build & Submit iOS to App Store"** in the left sidebar
3. Click **"Run workflow"** (top right)
4. Configure options:
   - **Branch**: `main`
   - **Build environment**: `production`
   - **Submit to TestFlight**: ✅ `true`
   - **Skip tests**: `false`
5. Click **"Run workflow"**

---

### 5.3 Monitor the Build

The build takes approximately **20-40 minutes**. Watch the progress:

| Step                 | Duration  | What's Happening                 |
| -------------------- | --------- | -------------------------------- |
| Setup & Checkout     | 1-2 min   | Cloning repo, installing Node.js |
| Install dependencies | 2-3 min   | npm ci                           |
| Run tests            | 1-2 min   | Unit tests (if not skipped)      |
| Build web assets     | 3-5 min   | Vite production build            |
| Sync Capacitor       | 1 min     | Copying to iOS project           |
| Install CocoaPods    | 3-5 min   | Native dependencies              |
| Code signing setup   | 1 min     | Importing certificates           |
| Build iOS Archive    | 10-15 min | Compiling native iOS app         |
| Export IPA           | 2-3 min   | Creating .ipa file               |
| Upload to TestFlight | 2-5 min   | Submitting to Apple              |

---

### 5.4 Common Build Failures & Fixes

| Error                                | Cause                        | Fix                                              |
| ------------------------------------ | ---------------------------- | ------------------------------------------------ |
| `Credentials not found`              | Missing GitHub Secrets       | Verify all 8 secrets are set                     |
| `Provisioning profile doesn't match` | Bundle ID mismatch           | Check `capacitor.config.ts` matches Apple Portal |
| `Code signing identity not found`    | Invalid .p12 or password     | Re-export certificate and re-encode              |
| `No matching provisioning profiles`  | Profile expired or incorrect | Download new profile from Apple Portal           |
| `Could not find dist-mobile`         | Build failed                 | Check `npm run build:mobile` works locally       |
| `Pod install failed`                 | Dependency conflict          | Update CocoaPods or check Podfile                |

---

## 📱 Phase 6: TestFlight & App Store

### 6.1 After Successful Upload

1. Go to: https://appstoreconnect.apple.com
2. Select **BuildDesk** → **TestFlight** tab
3. Wait for **"Processing"** to complete (5-30 minutes)
4. Build will appear under **iOS Builds**

---

### 6.2 Export Compliance

Apple will prompt you about export compliance:

**Question**: "Does your app use encryption?"

**Answer for most apps**:

- ✅ **Yes** - if your app uses HTTPS (which BuildDesk does)
- Select: "Your app uses standard encryption"
- No additional compliance required

Click **Start Internal Testing** or **Submit for Review** (for external testers).

---

### 6.3 TestFlight Testing

**Internal Testing** (up to 100 testers, instant):

1. Go to TestFlight tab
2. Click **Internal Testing** → **"+"** → Add testers
3. Testers receive email to install TestFlight app
4. Build available immediately

**External Testing** (up to 10,000 testers, requires Apple review):

1. Go to TestFlight tab
2. Click **External Testing** → **Create Group**
3. Add testers
4. Submit for Beta App Review (~24 hours)

---

### 6.4 Submit to App Store

1. Go to **App Store** tab in App Store Connect
2. Click **"+"** next to iOS App
3. Enter version number (1.0.0)
4. Fill out required metadata:

**Required before first submission:**

- [ ] App Name
- [ ] Subtitle (optional but recommended)
- [ ] Description
- [ ] Keywords
- [ ] Support URL
- [ ] Marketing URL (optional)
- [ ] Privacy Policy URL
- [ ] App Category (Primary & Secondary)
- [ ] Content Rights (your company info)
- [ ] Age Rating (complete questionnaire)
- [ ] App Review Information (contact info)
- [ ] Version Information (What's New in this Version)

**Required screenshots** (use `npm run mobile:screenshots`):

- 6.7" iPhone (1290 x 2796 px) - 3-10 screenshots
- 6.5" iPhone (1242 x 2688 px) - Required if not providing 6.7"
- 5.5" iPhone (1242 x 2208 px) - Optional
- iPad Pro (2048 x 2732 px) - If supporting iPad

5. Under **Build**, click **"+"** and select your TestFlight build
6. Click **Submit for Review**

**Review time**: Usually 24-48 hours (sometimes longer)

---

## 🔄 Phase 7: Continuous Deployment

### 7.1 Version Management

**Automatic** (recommended):

- The workflow uses `autoIncrement: true` in `eas.json`
- Build number increments automatically on each GitHub Actions run

**Manual** (if needed):

```json
// capacitor.config.ts or package.json
{
  "version": "1.0.1" // Update for each App Store release
}
```

---

### 7.2 Update App Icon & Splash Screen

**App Icon** (required):

- Size: 1024×1024 px
- Format: PNG (no transparency)
- Location: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

Generate all sizes:

```bash
# Use a tool like https://appicon.co
# Or create manually in Xcode
```

**Splash Screen**:

```bash
# Update in capacitor.config.ts:
plugins: {
  SplashScreen: {
    backgroundColor: '#1A2332',
    // ... other settings
  }
}
```

---

### 7.3 Automated Release Process

**For production releases:**

1. Update version in `package.json`:

   ```json
   "version": "1.1.0"
   ```

2. Commit changes:

   ```bash
   git add package.json
   git commit -m "chore: bump version to 1.1.0"
   git push origin main
   ```

3. Trigger GitHub Actions:
   - Go to Actions → Run workflow
   - Select `production` environment
   - Enable `submit_to_testflight`

4. After TestFlight processing:
   - Test the build internally
   - Promote to App Store when ready

---

## 📊 Monitoring & Maintenance

### Build Artifacts

Every build is saved as a GitHub Actions artifact:

- **Retention**: 30 days
- **Download**: Actions → Workflow run → Artifacts section
- **Use case**: Manual upload if automated submission fails

---

### App Store Connect Analytics

Monitor in App Store Connect:

- **Sales and Trends**: Download numbers
- **App Analytics**: User engagement
- **Crash Reports**: Production crashes
- **TestFlight**: Beta testing metrics

---

### Certificate Expiration

**Distribution certificates expire after 1 year.**

**Reminder**:

- Set a calendar reminder for certificate renewal
- Process: Same as section 2.2 (create new certificate)
- Update GitHub Secrets with new .p12

---

## 🆘 Troubleshooting Guide

### Issue: "No matching provisioning profiles found"

**Cause**: Provisioning profile doesn't match bundle ID or certificate.

**Fix**:

1. Verify bundle ID in `capacitor.config.ts`: `com.builddesk.app`
2. Check Apple Developer Portal → Profiles
3. Ensure profile is "App Store" (not "Development")
4. Re-download and re-encode profile
5. Update GitHub Secret: `IOS_PROVISIONING_PROFILE`

---

### Issue: "Code signing identity not found"

**Cause**: Certificate not imported or password incorrect.

**Fix**:

1. Verify certificate is "Apple Distribution" (not "Development")
2. Check GitHub Secret `IOS_DISTRIBUTION_CERT_PASSWORD` is correct
3. Re-export certificate from Keychain Access as .p12
4. Re-encode and update `IOS_DISTRIBUTION_CERT_P12`

---

### Issue: "Build timeout"

**Cause**: Build takes longer than 90 minutes.

**Fix**:

1. Check CocoaPods dependencies (remove unused)
2. Increase timeout in `.github/workflows/ios-release.yml`:
   ```yaml
   timeout-minutes: 120 # Increase from 90
   ```

---

### Issue: "Upload to TestFlight failed"

**Cause**: App Store Connect API key has insufficient permissions.

**Fix**:

1. Go to https://appstoreconnect.apple.com/access/integrations/api
2. Edit your API key
3. Ensure role is **"App Manager"** (minimum)
4. Verify all 3 secrets are correct:
   - `APPSTORE_ISSUER_ID`
   - `APPSTORE_API_KEY_ID`
   - `APPSTORE_API_PRIVATE_KEY`

---

## ✅ Final Checklist

Before triggering your first GitHub Actions build:

### Apple Developer Portal

- [ ] Enrolled in Apple Developer Program ($99/year)
- [ ] Created App Store Connect API Key
- [ ] Registered Bundle ID: `com.builddesk.app`
- [ ] Created Distribution Certificate (exported as .p12)
- [ ] Created App Store Provisioning Profile
- [ ] Created App in App Store Connect

### GitHub Repository

- [ ] All 8 GitHub Secrets configured
- [ ] `.github/workflows/ios-release.yml` exists
- [ ] `ios/App/ExportOptions.plist` configured

### Local Project

- [ ] `npm run build:mobile` succeeds
- [ ] `npx cap add ios` completed (or will be done first time)
- [ ] `npx cap sync ios` works
- [ ] Run `node scripts/verify-ios-setup.js` with no errors

### Ready to Deploy

- [ ] All above items checked
- [ ] Committed all changes to git
- [ ] Ready to trigger GitHub Actions workflow

---

## 🎉 Success!

Once all checklist items are complete, you're ready to:

1. **Trigger GitHub Actions** → Wait 30-40 min → Build completes
2. **Check App Store Connect** → Wait 5-30 min → Processing completes
3. **TestFlight testing** → Install and test
4. **Submit to App Store** → Wait 24-48 hours → Review complete
5. **App Store launch!** 🚀

---

## 📚 Additional Resources

- **Apple Documentation**: https://developer.apple.com/documentation/
- **App Store Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Capacitor iOS**: https://capacitorjs.com/docs/ios
- **GitHub Actions**: https://docs.github.com/en/actions
- **TestFlight**: https://developer.apple.com/testflight/

---

**Last Updated**: February 12, 2026  
**BuildDesk Version**: 1.0.0  
**Workflow Version**: 1.0

---

## Need Help?

Run the verification script anytime:

```bash
node scripts/verify-ios-setup.js
```

Check workflow logs:

```bash
# GitHub repo → Actions tab → Select workflow run → View logs
```
