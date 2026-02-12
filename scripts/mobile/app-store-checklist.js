#!/usr/bin/env node

/**
 * BuildDesk App Store Submission Checklist
 *
 * Run before submitting to Apple App Store or Google Play Store.
 * Usage: npm run mobile:checklist
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const MOBILE_APP = resolve(ROOT, 'mobile-app');

const PASS = '\x1b[32m✓\x1b[0m';
const FAIL = '\x1b[31m✗\x1b[0m';
const WARN = '\x1b[33m⚠\x1b[0m';
const INFO = '\x1b[34mℹ\x1b[0m';

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function pass(msg) {
  console.log(`  ${PASS} ${msg}`);
  passCount++;
}

function fail(msg) {
  console.log(`  ${FAIL} ${msg}`);
  failCount++;
}

function warn(msg) {
  console.log(`  ${WARN} ${msg}`);
  warnCount++;
}

function info(msg) {
  console.log(`  ${INFO} ${msg}`);
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

function readJSON(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

// ─── Configuration Files ───

section('Configuration Files');

const appJson = readJSON(resolve(MOBILE_APP, 'app.json'));
if (appJson) {
  pass('mobile-app/app.json exists');
} else {
  fail('mobile-app/app.json missing or invalid');
}

const easJson = readJSON(resolve(MOBILE_APP, 'eas.json'));
if (easJson) {
  pass('mobile-app/eas.json exists');
} else {
  fail('mobile-app/eas.json missing or invalid');
}

if (existsSync(resolve(ROOT, 'capacitor.config.ts'))) {
  pass('capacitor.config.ts exists');
} else {
  fail('capacitor.config.ts missing');
}

if (existsSync(resolve(ROOT, 'vite.config.mobile.ts'))) {
  pass('vite.config.mobile.ts exists (isolated mobile build)');
} else {
  fail('vite.config.mobile.ts missing — mobile builds not isolated from web');
}

// ─── iOS Checks ───

section('iOS App Store Requirements');

if (appJson) {
  const ios = appJson.expo?.ios;

  if (ios?.bundleIdentifier) {
    pass(`Bundle ID: ${ios.bundleIdentifier}`);
  } else {
    fail('Bundle identifier not set');
  }

  if (ios?.buildNumber) {
    pass(`Build number: ${ios.buildNumber}`);
  } else {
    fail('Build number not set');
  }

  const plist = ios?.infoPlist || {};

  // Check required permission descriptions
  const requiredPermissions = [
    'NSCameraUsageDescription',
    'NSPhotoLibraryUsageDescription',
    'NSLocationWhenInUseUsageDescription',
  ];

  for (const perm of requiredPermissions) {
    if (plist[perm]) {
      pass(`${perm} is set`);
    } else {
      fail(`${perm} is missing — Apple will reject`);
    }
  }

  // Check for unused / problematic permission declarations
  const problematicPermissions = [
    'NSAppleMusicUsageDescription',
    'NSBluetoothAlwaysUsageDescription',
    'NSHealthShareUsageDescription',
  ];

  for (const perm of problematicPermissions) {
    if (plist[perm]) {
      fail(`${perm} is declared but likely unused — Apple will reject`);
    } else {
      pass(`${perm} not declared (correct if unused)`);
    }
  }

  // Check for "always" location with proper justification
  if (plist.NSLocationAlwaysAndWhenInUseUsageDescription) {
    if (plist.NSLocationAlwaysAndWhenInUseUsageDescription.length > 30) {
      pass('Background location description is detailed');
    } else {
      warn('Background location description is too short — Apple may reject');
    }
  }

  // Privacy manifest (required since iOS 17)
  if (ios?.privacyManifests) {
    pass('iOS Privacy Manifest configured');

    if (ios.privacyManifests.NSPrivacyTracking === false) {
      pass('NSPrivacyTracking is false (correct for non-tracking apps)');
    } else if (ios.privacyManifests.NSPrivacyTracking === true) {
      warn('NSPrivacyTracking is true — ensure ATT prompt is implemented');
    }

    if (ios.privacyManifests.NSPrivacyAccessedAPITypes?.length > 0) {
      pass(`Privacy API declarations: ${ios.privacyManifests.NSPrivacyAccessedAPITypes.length} types`);
    } else {
      warn('No NSPrivacyAccessedAPITypes — most apps use UserDefaults at minimum');
    }
  } else {
    fail('iOS Privacy Manifest missing — required for App Store since Spring 2024');
  }

  // ATT
  if (plist.NSUserTrackingUsageDescription) {
    pass('NSUserTrackingUsageDescription is set (App Tracking Transparency)');
  } else {
    warn('NSUserTrackingUsageDescription not set — needed if using analytics SDKs');
  }

  // Encryption
  const config = ios?.config || {};
  if (config.usesNonExemptEncryption === false) {
    pass('usesNonExemptEncryption is false (avoids export compliance upload)');
  } else {
    warn('usesNonExemptEncryption not set to false');
  }
}

// ─── Android Checks ───

section('Google Play Store Requirements');

if (appJson) {
  const android = appJson.expo?.android;

  if (android?.package) {
    pass(`Package name: ${android.package}`);
  } else {
    fail('Android package name not set');
  }

  if (android?.versionCode >= 1) {
    pass(`Version code: ${android.versionCode}`);
  } else {
    fail('Android versionCode not set');
  }

  if (android?.adaptiveIcon?.foregroundImage) {
    pass('Adaptive icon configured');
  } else {
    fail('Adaptive icon not configured — required for modern Android');
  }

  const permissions = android?.permissions || [];
  const blocked = android?.blockedPermissions || [];

  // Check for required Android 13+ permission
  if (permissions.includes('POST_NOTIFICATIONS')) {
    pass('POST_NOTIFICATIONS permission declared (required for Android 13+)');
  } else {
    fail('POST_NOTIFICATIONS missing — notifications won\'t work on Android 13+');
  }

  // Check deprecated storage permissions are blocked
  if (blocked.includes('READ_EXTERNAL_STORAGE')) {
    pass('READ_EXTERNAL_STORAGE blocked (deprecated on Android 13+)');
  } else if (permissions.includes('READ_EXTERNAL_STORAGE')) {
    fail('READ_EXTERNAL_STORAGE still declared — use READ_MEDIA_IMAGES on Android 13+');
  }

  if (blocked.includes('WRITE_EXTERNAL_STORAGE')) {
    pass('WRITE_EXTERNAL_STORAGE blocked (deprecated on Android 13+)');
  } else if (permissions.includes('WRITE_EXTERNAL_STORAGE')) {
    fail('WRITE_EXTERNAL_STORAGE still declared — use scoped storage on Android 13+');
  }

  // Check foreground service type for location
  if (permissions.includes('FOREGROUND_SERVICE_LOCATION')) {
    pass('FOREGROUND_SERVICE_LOCATION declared (required for background location on Android 14+)');
  } else if (permissions.includes('ACCESS_BACKGROUND_LOCATION')) {
    fail('FOREGROUND_SERVICE_LOCATION missing — needed alongside ACCESS_BACKGROUND_LOCATION');
  }
}

// ─── EAS Build Config ───

section('EAS Build Configuration');

if (easJson) {
  const prod = easJson.build?.production;
  if (prod) {
    pass('Production build profile exists');

    if (prod.android?.buildType === 'aab') {
      pass('Android production uses AAB (required by Google Play)');
    } else {
      fail('Android production should use AAB format');
    }

    if (prod.autoIncrement) {
      pass('Auto-increment version enabled');
    } else {
      warn('Auto-increment not enabled — remember to bump versions manually');
    }
  } else {
    fail('No production build profile');
  }

  const submit = easJson.submit?.production;
  if (submit?.ios?.ascAppId) {
    pass(`iOS App Store Connect ID: ${submit.ios.ascAppId}`);
  } else {
    fail('iOS App Store Connect ID not configured');
  }

  if (submit?.android?.serviceAccountKeyPath) {
    if (existsSync(resolve(MOBILE_APP, submit.android.serviceAccountKeyPath))) {
      pass('Google Play service account key file exists');
    } else {
      warn(`Service account key file not found: ${submit.android.serviceAccountKeyPath}`);
      info('You\'ll need this for automated Play Store submission');
    }
  } else {
    fail('Android service account key not configured');
  }
}

// ─── Build Properties ───

section('Build Properties (SDK Targets)');

if (appJson) {
  const plugins = appJson.expo?.plugins || [];
  const buildProps = plugins.find(
    (p) => Array.isArray(p) && p[0] === 'expo-build-properties'
  );

  if (buildProps) {
    const config = buildProps[1];

    if (config?.android?.targetSdkVersion >= 34) {
      pass(`Android targetSdkVersion: ${config.android.targetSdkVersion} (meets 2025 requirement)`);
    } else {
      fail('Android targetSdkVersion must be >= 34 for Google Play submission');
    }

    if (config?.android?.minSdkVersion >= 24) {
      pass(`Android minSdkVersion: ${config.android.minSdkVersion}`);
    } else {
      warn('Android minSdkVersion below 24 may limit Capacitor plugin compatibility');
    }

    if (config?.ios?.deploymentTarget) {
      const target = parseFloat(config.ios.deploymentTarget);
      if (target >= 16.0) {
        pass(`iOS deployment target: ${config.ios.deploymentTarget}`);
      } else {
        warn(`iOS deployment target ${config.ios.deploymentTarget} is low — consider 16.0+`);
      }
    } else {
      warn('iOS deployment target not set in build properties');
    }
  } else {
    fail('expo-build-properties plugin not configured — SDK targets not set');
  }
}

// ─── Assets ───

section('App Store Assets');

const iconPath = resolve(MOBILE_APP, 'assets', 'icon.png');
if (existsSync(iconPath)) {
  pass('App icon exists (assets/icon.png)');
} else {
  fail('App icon missing — required for both stores');
}

const splashPath = resolve(MOBILE_APP, 'assets', 'splash.png');
if (existsSync(splashPath)) {
  pass('Splash screen exists (assets/splash.png)');
} else {
  fail('Splash screen missing');
}

const adaptiveIconPath = resolve(MOBILE_APP, 'assets', 'adaptive-icon.png');
if (existsSync(adaptiveIconPath)) {
  pass('Adaptive icon exists (assets/adaptive-icon.png)');
} else {
  fail('Adaptive icon missing — required for Android');
}

const faviconPath = resolve(MOBILE_APP, 'assets', 'favicon.png');
if (existsSync(faviconPath)) {
  const stats = readFileSync(faviconPath);
  if (stats.length > 0) {
    pass('Favicon exists and has content');
  } else {
    warn('Favicon exists but is empty (0 bytes)');
  }
} else {
  warn('Favicon missing');
}

// ─── Capacitor (for Capacitor builds) ───

section('Capacitor Configuration');

try {
  const capConfig = readFileSync(resolve(ROOT, 'capacitor.config.ts'), 'utf8');

  if (capConfig.includes('dist-mobile')) {
    pass('Capacitor webDir points to dist-mobile (isolated from web)');
  } else if (capConfig.includes("'dist'") || capConfig.includes('"dist"')) {
    fail('Capacitor webDir points to dist — should be dist-mobile for isolation');
  }

  if (capConfig.includes('bundledWebRuntime')) {
    fail('bundledWebRuntime is deprecated in Capacitor 6+ — remove it');
  } else {
    pass('No deprecated bundledWebRuntime option');
  }

  if (capConfig.includes('iosScheme')) {
    pass('iOS scheme configured');
  } else {
    warn('iosScheme not set — defaults to capacitor:// which may cause issues');
  }

  if (capConfig.includes('hostname')) {
    pass('Server hostname configured');
  } else {
    warn('No server hostname — recommended for consistent URL handling');
  }
} catch {
  warn('Could not read capacitor.config.ts');
}

// ─── Build Isolation ───

section('Build Isolation (Web vs Mobile)');

if (existsSync(resolve(ROOT, 'vite.config.mobile.ts'))) {
  pass('Separate mobile Vite config exists');
} else {
  fail('No separate mobile Vite config — mobile builds may affect web production');
}

try {
  const pkg = readJSON(resolve(ROOT, 'package.json'));
  if (pkg?.scripts?.['build:mobile']) {
    pass('build:mobile script configured');
  } else {
    fail('build:mobile script missing');
  }

  if (pkg?.scripts?.['build:mobile:sync']) {
    pass('build:mobile:sync script configured');
  } else {
    warn('build:mobile:sync script missing');
  }

  // Verify web build is unchanged
  if (
    pkg?.scripts?.build &&
    !pkg.scripts.build.includes('mobile') &&
    !pkg.scripts.build.includes('capacitor')
  ) {
    pass('Web build script (npm run build) does not reference mobile');
  } else {
    fail('Web build script references mobile — builds are not isolated');
  }
} catch {
  warn('Could not read package.json');
}

// ─── Summary ───

console.log('\n' + '─'.repeat(50));
console.log(
  `\n  \x1b[1mResults:\x1b[0m ${PASS} ${passCount} passed  ${FAIL} ${failCount} failed  ${WARN} ${warnCount} warnings\n`
);

if (failCount === 0) {
  console.log('  \x1b[32m\x1b[1mReady for submission!\x1b[0m');
  console.log('  Remember to also verify:');
  console.log('    - App Store screenshots (6.7", 6.5", 5.5" for iPhone, 12.9" for iPad)');
  console.log('    - Play Store screenshots (phone and 7" tablet minimum)');
  console.log('    - Privacy policy URL is live');
  console.log('    - App Store description and keywords');
  console.log('    - Play Store short/full descriptions');
  console.log('    - Content rating questionnaire completed');
  console.log('    - Data safety form completed (Google Play)');
  console.log('    - App privacy details completed (App Store)');
} else {
  console.log(`  \x1b[31m\x1b[1m${failCount} issue(s) must be fixed before submission.\x1b[0m`);
}

console.log('');

process.exit(failCount > 0 ? 1 : 0);
