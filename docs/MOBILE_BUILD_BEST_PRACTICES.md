# Mobile Build Best Practices (iOS + Android)

This guide is a repeatable checklist and reference for mass-duplicating reliable iOS and Android builds across multiple projects. It assumes a GitHub Actions build pipeline and uses Apple App Store Connect API keys. For Capacitor apps, it documents signing requirements explicitly.

---

## 1) Prerequisites and Accounts

### Apple (iOS)
- Paid Apple Developer Program ($99/year).
- App Store Connect API key (Issuer ID, Key ID, .p8 private key).
- One App ID per app (explicit bundle identifier).
- App Store Connect app record created.

### Google (Android)
- Google Play Developer account ($25 one-time).
- App created in Play Console.
- Keystore (.jks) generated and stored securely.
- Play Console service account JSON for automated uploads.

### GitHub Actions
- Repo or org secrets configured for build pipelines.
- macos-latest runner used for iOS builds.
- ubuntu-latest runner used for Android builds.

---

## 2) Standardized Project Requirements

Use the same conventions across all projects to simplify duplication.

### Bundle Identifiers and App IDs
- iOS bundle ID: com.company.product
- Android package: com.company.product
- Use matching values in all configs.

### Versioning
- iOS: increment build number on every build.
- Android: increment versionCode on every build.
- Use a single source of truth when possible.

### Icons and Assets
- iOS app icon: 1024x1024 PNG, no alpha channel.
- Android adaptive icon: 1024x1024 foreground + background.
- Use consistent naming and folder layout.

### Privacy Usage Strings (iOS)
Always set required Info.plist strings for any device capability used.
- NSCameraUsageDescription
- NSPhotoLibraryUsageDescription
- NSLocationWhenInUseUsageDescription
- NSMicrophoneUsageDescription
- NSFaceIDUsageDescription
- NSBluetoothAlwaysUsageDescription

Only include keys for features actually used.

### App Encryption Documentation (iOS - REQUIRED)
Apple requires encryption export compliance documentation for all apps. Most modern apps use HTTPS, which counts as encryption.

**For Capacitor Projects with CI/CD:**
Add this step to your iOS workflow YAML (after privacy descriptions):

```yaml
- name: 🔒 Add Encryption Export Compliance
  run: |
    INFO_PLIST="ios/App/App/Info.plist"
    
    # App uses standard HTTPS only (no custom encryption)
    /usr/libexec/PlistBuddy -c "Add :ITSAppUsesNonExemptEncryption bool false" "$INFO_PLIST" 2>/dev/null || \
    /usr/libexec/PlistBuddy -c "Set :ITSAppUsesNonExemptEncryption false" "$INFO_PLIST"
    
    echo "✅ Encryption export compliance added"
```

**For committed iOS projects (Info.plist):**
```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

**OR** if your app uses encryption beyond standard HTTPS:
```xml
<key>ITSAppUsesNonExemptEncryption</key>
<true/>
<key>ITSEncryptionExportComplianceCode</key>
<string>YOUR_ERN_NUMBER</string>
```

**Common scenarios:**
- **Standard HTTPS API calls only**: Set to `false`
- **Custom encryption (AES, RSA, etc.)**: Set to `true` and provide ERN
- **End-to-end encrypted messaging**: Set to `true` and provide ERN
- **Financial/banking features**: Set to `true` and provide ERN

**Reference:** https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations

**For BuildDesk:** Uses standard HTTPS only, so `ITSAppUsesNonExemptEncryption` = `false`

---

## 3) Credential Management (Best Practices)

### iOS
- Use App Store Connect API key for CI uploads.
- Use EAS-managed credentials for Expo projects.
- For Capacitor/native, use manual signing with:
  - Distribution certificate (.p12)
  - Provisioning profile (.mobileprovision)

### Android
- Use a single keystore per app.
- Store the keystore as base64 in secrets.
- Store key alias and passwords in secrets.

### Secrets (Recommended Naming)
- EXPO_TOKEN
- APPSTORE_ISSUER_ID
- APPSTORE_API_KEY_ID
- APPSTORE_API_PRIVATE_KEY
- IOS_DISTRIBUTION_CERT_P12
- IOS_DISTRIBUTION_CERT_PASSWORD
- IOS_PROVISIONING_PROFILE
- ANDROID_KEYSTORE_BASE64
- ANDROID_KEYSTORE_PASSWORD
- ANDROID_KEY_ALIAS
- ANDROID_KEY_PASSWORD
- GOOGLE_PLAY_SERVICE_ACCOUNT_JSON

---

## 4) iOS Build: Capacitor (GitHub Actions)

### Required Files
- ios/App/ExportOptions.plist
- ios/App/App.entitlements (if using push or other capabilities)

### Build Steps (Summary)
1. Checkout repo
2. Install Node.js
3. Install dependencies: npm ci
4. Build web assets: npm run build
5. Sync to iOS: npx cap sync ios
6. Import cert and provisioning profile
7. Build archive with xcodebuild
8. Export .ipa using ExportOptions.plist
9. Upload to TestFlight via App Store Connect API key

### Common Failure Points
- Bundle ID mismatch in provisioning profile.
- Missing usage descriptions in Info.plist.
- Incorrect signing style or missing entitlements.

---

## 5) Android Build: Capacitor (GitHub Actions)

### Required Files
- android/keystore.jks (generated locally, stored as secret)
- android/app/build.gradle with signing config

### Build Steps (Summary)
1. Checkout repo
2. Install Node.js
3. Install dependencies: npm ci
4. Build web assets: npm run build
5. Sync to Android: npx cap sync android
6. Restore keystore from secret
7. Build AAB: ./gradlew bundleRelease
8. Upload to Google Play via service account JSON

### Common Failure Points
- Keystore alias/password mismatch.
- Incorrect Play Console app package name.
- Missing versionCode increment.

---

## 6) Mass Duplication Checklist

Use this checklist when creating a new app or duplicating an existing pipeline.

### Project Setup
- Set bundle ID and package name.
- Update app name, icons, and splash assets.
- Configure required permissions and usage strings.
- Verify versioning strategy.

### Apple Setup
- Register App ID in Apple Developer.
- Create App Store Connect app record.
- Generate API key (once per account).
- Create provisioning profile for bundle ID.

### Google Setup
- Create Play Console app.
- Generate and upload signing key.
- Create service account and grant access.

### GitHub Setup
- Add repository secrets.
- Add workflow files.
- Confirm runner OS per platform.

---

## 7) Recommended Workflow Templates

### iOS (Capacitor) Workflow
- .github/workflows/ios-capacitor.yml
- Use macos-latest
- Upload .ipa as artifact
- Submit with apple-actions/upload-testflight-build

### Android (Capacitor) Workflow
- .github/workflows/android-release.yml
- Use ubuntu-latest
- Upload .aab as artifact
- Submit with r0adkll/upload-google-play or Google Play Developer API

---

## 8) Validation Before Release

- Verify all required Info.plist permissions.
- **Verify ITSAppUsesNonExemptEncryption is set in Info.plist (iOS).**
- Confirm icons and splash sizes.
- Run a local build once to validate signing.
- Confirm TestFlight/Play internal track upload works.
- Confirm release notes and app metadata are set.

---

## 9) Troubleshooting Quick Reference

### iOS
- Missing provisioning profile: regenerate profile for bundle ID.
- Invalid binary: check min iOS target and asset requirements.
- Upload fails: confirm API key role = App Manager.

### Android
- Upload fails: verify service account has Release Manager or Admin.
- App not found: confirm package name matches Play Console.
- Keystore errors: verify alias and passwords.

---

## 10) Scaling Tips

- Keep secrets at the org level when possible.
- Use reusable workflows for iOS and Android builds.
- Keep a spreadsheet of bundle IDs, package names, and app IDs.
- Automate version increments via CI inputs.
- Use a shared docs folder to keep build instructions consistent.
