# iOS App Store Deployment Guide - BuildDesk

## 🎯 Current Status

- ✅ Capacitor iOS setup complete
- ✅ Xcode project created
- ✅ Bundle ID configured: `com.builddesk.app`
- ⚠️ Need to configure Apple Developer account
- ⚠️ Need to fix Capacitor configuration for production

---

## 📋 STEP 1: Clean Up & Configure Capacitor for Production

### 1.1 Fix Capacitor Configuration

Your `capacitor.config.ts` currently has a development server URL that needs to be removed for production builds.

**Current Issue:**

```typescript
server: {
  url: 'https://ed4c0428-159f-4b25-8136-15b119a75bd5.lovableproject.com?forceHideBadge=true',
  cleartext: true,
}
```

**Action Required:**

- Remove the `server` configuration for production builds
- Keep only for development if needed

**Recommended Fix:**
Create separate config files or remove the server block entirely since you're building for production.

### 1.2 Update iOS Project Configuration

**Current Settings:**

- Bundle ID: `com.builddesk.app` ✅
- Display Name: `project-profit-radar` ⚠️ (Should be "BuildDesk")
- App Name: `BuildDesk` ✅

---

## 📱 STEP 2: Prepare Your iOS Build

### 2.1 Build Your Web Assets

```powershell
npm run build
```

This creates optimized production files in the `dist` folder.

### 2.2 Sync with Capacitor

```powershell
npx cap sync ios
```

This copies your web assets to the iOS project and updates native dependencies.

### 2.3 Open in Xcode

```powershell
npx cap open ios
```

This opens your iOS project in Xcode.

---

## 🔐 STEP 3: Configure Apple Developer Account in Xcode

This is your **PRIMARY STEP** right now!

### 3.1 Add Your Apple Developer Account

1. Open Xcode (via `npx cap open ios`)
2. Go to **Xcode → Settings** (or Preferences on older versions)
3. Click **Accounts** tab
4. Click the **+** button
5. Select **Apple ID**
6. Sign in with your Apple Developer account

### 3.2 Configure Signing & Capabilities

1. In Xcode, select the **App** project in the left sidebar
2. Select the **App** target
3. Click the **Signing & Capabilities** tab
4. Check **"Automatically manage signing"**
5. Select your **Team** from the dropdown (your Apple Developer account)
6. Verify the **Bundle Identifier**: `com.builddesk.app`

**Xcode will automatically:**

- Create provisioning profiles
- Generate certificates (if needed)
- Configure App ID in your Apple Developer account

### 3.3 Verify Bundle ID is Unique

- Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
- Check if `com.builddesk.app` is available
- If taken, you'll need to change it to something like:
  - `com.yourcompany.builddesk`
  - `com.builddesk.construction`
  - `app.builddesk.construction`

---

## 📝 STEP 4: Update App Information

### 4.1 Update Display Name

In `ios/App/App/Info.plist`, change:

```xml
<key>CFBundleDisplayName</key>
<string>BuildDesk</string>
```

### 4.2 Update App Version

In Xcode:

1. Select App target
2. Go to **General** tab
3. Set **Version**: `1.0.0`
4. Set **Build**: `1`

### 4.3 Configure Required Permissions

Your app uses these features, so you need to add permission descriptions in `Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>BuildDesk needs camera access to capture photos of construction sites, materials, and documents.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>BuildDesk needs photo library access to save and retrieve construction site images.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>BuildDesk uses your location to tag construction sites and field reports.</string>
```

---

## 🎨 STEP 5: Prepare App Assets

### 5.1 App Icon

You need an **1024x1024px** app icon (no transparency, no alpha channel).

**Current location:** `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

**Requirements:**

- PNG format
- 1024x1024 pixels
- No transparency
- No rounded corners (iOS adds them automatically)

### 5.2 Launch Screen

Configure your splash screen in:

- `ios/App/App/Assets.xcassets/Splash.imageset/`

---

## 🧪 STEP 6: Test on Real Device

### 6.1 Connect Your iPhone

1. Connect iPhone to Mac via USB
2. Trust the computer on your iPhone
3. In Xcode, select your device from the device dropdown (top toolbar)
4. Click **Run** (Play button) or press `Cmd + R`

### 6.2 Trust Developer Certificate

First time running:

1. On your iPhone: **Settings → General → VPN & Device Management**
2. Find your developer profile
3. Tap **Trust**

### 6.3 Test Key Features

- [ ] App launches successfully
- [ ] Camera access works
- [ ] Location services work
- [ ] Push notifications (if implemented)
- [ ] All main features function correctly
- [ ] No crashes or freezes

---

## 🚀 STEP 7: Create App Store Listing

### 7.1 Register Your App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps**
3. Click **+** → **New App**
4. Fill in:
   - **Platform**: iOS
   - **Name**: BuildDesk
   - **Primary Language**: English
   - **Bundle ID**: com.builddesk.app
   - **SKU**: BUILDDESK001 (or any unique identifier)

### 7.2 Prepare App Store Screenshots

Required sizes (or use Screenshot Tool):

- **6.7" Display (iPhone 14 Pro Max)**

  - 1290 x 2796 pixels (portrait)
  - At least 3-10 screenshots

- **6.5" Display (iPhone 11 Pro Max, XS Max)**
  - 1242 x 2688 pixels (portrait)
  - At least 3-10 screenshots

### 7.3 Write App Store Metadata

Prepare:

- **App Name** (30 characters max)
- **Subtitle** (30 characters max)
- **Description** (4000 characters max)
- **Keywords** (100 characters max, comma-separated)
- **Support URL**
- **Marketing URL** (optional)
- **Privacy Policy URL** (required)

---

## 📦 STEP 8: Create Archive & Upload

### 8.1 Create Archive

1. In Xcode, select **Any iOS Device (arm64)** as the destination
2. Go to **Product → Archive**
3. Wait for archive to complete

### 8.2 Upload to App Store Connect

1. When archive completes, **Organizer** window opens
2. Select your archive
3. Click **Distribute App**
4. Choose **App Store Connect**
5. Click **Upload**
6. Follow the wizard (Xcode will handle signing)

### 8.3 Wait for Processing

- Upload takes 5-30 minutes depending on size
- Processing in App Store Connect takes 10-60 minutes
- You'll receive an email when processing is complete

---

## ✅ STEP 9: Submit for Review

### 9.1 Complete All Information

In App Store Connect:

- [ ] App Information
- [ ] Pricing & Availability
- [ ] App Privacy (required)
- [ ] Screenshots & Previews
- [ ] Description & Keywords
- [ ] Support & Marketing URLs
- [ ] Build (select your uploaded build)
- [ ] Age Rating
- [ ] Review Information (contact info, demo account if needed)

### 9.2 Submit for Review

1. Click **Save**
2. Click **Add for Review** (or **Submit for Review**)
3. Confirm submission

### 9.3 Review Timeline

- **First app review**: 24-48 hours (sometimes up to 7 days)
- **Updates**: Usually 24 hours
- You'll receive emails about status changes

---

## 🎯 YOUR IMMEDIATE ACTION ITEMS

### Priority 1: Configuration (Do This Now)

1. ✅ Fix `capacitor.config.ts` - remove development server URL
2. ✅ Update app display name to "BuildDesk" in Info.plist
3. ✅ Add permission descriptions to Info.plist
4. ✅ Run `npm run build` to create production web assets
5. ✅ Run `npx cap sync ios` to update iOS project

### Priority 2: Xcode Setup (Main Focus)

6. ✅ Open project in Xcode: `npx cap open ios`
7. ✅ Add your Apple Developer account to Xcode
8. ✅ Configure automatic signing with your Team
9. ✅ Verify bundle ID `com.builddesk.app` (or update if taken)
10. ✅ Test on your physical iPhone device

### Priority 3: Assets & Testing

11. ⬜ Create 1024x1024 app icon (no transparency)
12. ⬜ Test all app features on real device
13. ⬜ Take App Store screenshots on real device

### Priority 4: App Store Preparation

14. ⬜ Create app listing in App Store Connect
15. ⬜ Write app description and metadata
16. ⬜ Create privacy policy
17. ⬜ Create archive and upload to App Store Connect
18. ⬜ Submit for review

---

## 📚 Quick Reference Commands

```powershell
# Build web assets
npm run build

# Sync with iOS
npx cap sync ios

# Open in Xcode
npx cap open ios

# Update Capacitor iOS platform
npx cap update ios

# Clean and rebuild iOS (if issues)
cd ios/App
rm -rf Pods Podfile.lock
pod install
cd ../..
npx cap sync ios
```

---

## 🆘 Common Issues & Solutions

### Issue: Bundle ID Already Registered

**Solution:** Change bundle ID in:

1. `capacitor.config.json` → `appId`
2. `capacitor.config.ts` → `appId`
3. Run `npx cap sync ios`
4. Update in Xcode project settings

### Issue: Provisioning Profile Errors

**Solution:**

- Ensure Apple Developer Program is fully active (paid)
- Check "Automatically manage signing" in Xcode
- Try manual signing if automatic fails
- Verify your Apple ID has proper permissions

### Issue: Archive Creation Fails

**Solution:**

- Clean build folder: Product → Clean Build Folder (Cmd + Shift + K)
- Delete DerivedData folder
- Restart Xcode
- Update CocoaPods: `pod install` in ios/App directory

---

## 🎉 Success Checklist

Before submitting to App Store:

- [ ] App builds without errors
- [ ] Runs successfully on real iOS device
- [ ] All features tested and working
- [ ] No crashes or major bugs
- [ ] App icon looks good
- [ ] Launch screen displays correctly
- [ ] All permissions requested properly
- [ ] App Store metadata complete
- [ ] Screenshots prepared
- [ ] Privacy policy created and linked
- [ ] Support URL available
- [ ] Archive created and uploaded successfully

---

## 📞 Need Help?

- **Apple Developer Support**: https://developer.apple.com/support/
- **App Store Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Capacitor iOS Docs**: https://capacitorjs.com/docs/ios
- **TestFlight Beta Testing**: Consider testing with TestFlight before public release

---

**Good luck with your App Store submission! 🚀**
