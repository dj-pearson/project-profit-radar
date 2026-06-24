#!/usr/bin/env node

/**
 * iOS App Store Setup Verification Script
 *
 * This script checks all requirements for automated iOS builds via GitHub Actions.
 * Run this before triggering your first GitHub Actions iOS build.
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ANSI colors for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const icon = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
};

let errors = 0;
let warnings = 0;

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  console.log(`${icon.success} ${colors.green}${message}${colors.reset}`);
}

function error(message) {
  errors++;
  console.log(`${icon.error} ${colors.red}${message}${colors.reset}`);
}

function warning(message) {
  warnings++;
  console.log(`${icon.warning} ${colors.yellow}${message}${colors.reset}`);
}

function info(message) {
  console.log(`${icon.info} ${colors.cyan}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    success(`${description} exists`);
    return true;
  } else {
    error(`${description} NOT found at: ${filePath}`);
    return false;
  }
}

function checkDirectory(dirPath, description) {
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    success(`${description} exists`);
    return true;
  } else {
    error(`${description} NOT found at: ${dirPath}`);
    return false;
  }
}

function checkCommand(command, description) {
  try {
    execSync(command, { stdio: "ignore" });
    success(`${description} is available`);
    return true;
  } catch (e) {
    error(`${description} is NOT available`);
    return false;
  }
}

console.log("\n" + "=".repeat(70));
log("  iOS App Store Setup Verification", "cyan");
log("  Brikly - Automated Build & Deploy", "cyan");
console.log("=".repeat(70) + "\n");

// ============================================================================
// 1. LOCAL ENVIRONMENT CHECK
// ============================================================================

log("📦 Checking Local Environment...", "blue");

checkCommand("node --version", "Node.js");
checkCommand("npm --version", "npm");

const packageJson = path.join(__dirname, "..", "package.json");
if (checkFile(packageJson, "package.json")) {
  const pkgContent = fs.readFileSync(packageJson, "utf8");
  const pkg = JSON.parse(pkgContent);
  info(`  Project: ${pkg.name} v${pkg.version}`);
}

console.log("");

// ============================================================================
// 2. CAPACITOR CONFIGURATION
// ============================================================================

log("📱 Checking Capacitor Configuration...", "blue");

const capacitorConfig = path.join(__dirname, "..", "capacitor.config.ts");
if (checkFile(capacitorConfig, "capacitor.config.ts")) {
  const configContent = fs.readFileSync(capacitorConfig, "utf8");

  // Check appId
  const appIdMatch = configContent.match(/appId:\s*['"]([^'"]+)['"]/);
  if (appIdMatch) {
    const appId = appIdMatch[1];
    success(`  Bundle ID: ${appId}`);

    if (!appId.match(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/)) {
      warning("  Bundle ID format might be invalid (should be reverse-DNS)");
    }
  } else {
    error("  Could not find appId in capacitor.config.ts");
  }

  // Check appName
  const appNameMatch = configContent.match(/appName:\s*['"]([^'"]+)['"]/);
  if (appNameMatch) {
    success(`  App Name: ${appNameMatch[1]}`);
  }

  // Check webDir
  const webDirMatch = configContent.match(/webDir:\s*['"]([^'"]+)['"]/);
  if (webDirMatch) {
    const webDir = webDirMatch[1];
    success(`  Web Directory: ${webDir}`);

    const webDirPath = path.join(__dirname, "..", webDir);
    if (!fs.existsSync(webDirPath)) {
      warning(
        `  Web directory doesn't exist yet (will be created during build)`,
      );
      info(`    Run: npm run build:mobile`);
    } else {
      if (fs.existsSync(path.join(webDirPath, "index.html"))) {
        success(`  index.html found in ${webDir}`);
      } else {
        error(`  index.html NOT found in ${webDir}`);
      }
    }
  }
}

console.log("");

// ============================================================================
// 3. iOS PROJECT STRUCTURE
// ============================================================================

log("🍎 Checking iOS Project...", "blue");

const iosDir = path.join(__dirname, "..", "ios");
const iosAppDir = path.join(iosDir, "App");

if (checkDirectory(iosDir, "ios/ directory")) {
  if (checkDirectory(iosAppDir, "ios/App/ directory")) {
    // Check for Xcode project/workspace
    const xcworkspace = path.join(iosAppDir, "App.xcworkspace");
    const xcodeproj = path.join(iosAppDir, "App.xcodeproj");

    let hasXcodeProject = false;
    if (fs.existsSync(xcworkspace)) {
      success("Xcode workspace found");
      hasXcodeProject = true;
    } else if (fs.existsSync(xcodeproj)) {
      success("Xcode project found");
      hasXcodeProject = true;
    } else {
      error("No Xcode project or workspace found");
      info("  Initialize iOS platform with: npx cap add ios");
    }

    // Check for Podfile
    const podfile = path.join(iosAppDir, "Podfile");
    if (fs.existsSync(podfile)) {
      success("Podfile found");

      const podfileLock = path.join(iosAppDir, "Podfile.lock");
      if (fs.existsSync(podfileLock)) {
        success("Podfile.lock found (pods installed)");
      } else {
        warning("Podfile.lock NOT found (pods not installed yet)");
        info("  GitHub Actions will handle pod install");
      }
    } else if (hasXcodeProject) {
      warning("Podfile NOT found (might be needed for native plugins)");
    }

    // Check ExportOptions.plist
    const exportOptions = path.join(iosAppDir, "ExportOptions.plist");
    if (checkFile(exportOptions, "ExportOptions.plist")) {
      const content = fs.readFileSync(exportOptions, "utf8");
      if (content.includes("YOUR_TEAM_ID_HERE")) {
        warning(
          "  ExportOptions.plist contains placeholder - will be replaced by GitHub Actions",
        );
      } else {
        success("  ExportOptions.plist configured");
      }
    }
  }
}

console.log("");

// ============================================================================
// 4. GITHUB ACTIONS WORKFLOW
// ============================================================================

log("🔧 Checking GitHub Actions Setup...", "blue");

const workflowsDir = path.join(__dirname, "..", ".github", "workflows");
const iosWorkflow = path.join(workflowsDir, "ios-release.yml");

if (checkDirectory(workflowsDir, ".github/workflows/ directory")) {
  checkFile(iosWorkflow, "ios-release.yml workflow");
}

console.log("");

// ============================================================================
// 5. GITHUB SECRETS CHECK
// ============================================================================

log("🔐 GitHub Secrets Required...", "yellow");

const requiredSecrets = [
  {
    name: "APPLE_TEAM_ID",
    description: "Your 10-character Apple Developer Team ID",
    where: "https://developer.apple.com/account → Membership → Team ID",
  },
  {
    name: "APPSTORE_ISSUER_ID",
    description: "App Store Connect API Issuer ID",
    where: "https://appstoreconnect.apple.com/access/integrations/api",
  },
  {
    name: "APPSTORE_API_KEY_ID",
    description: "App Store Connect API Key ID",
    where: "https://appstoreconnect.apple.com/access/integrations/api",
  },
  {
    name: "APPSTORE_API_PRIVATE_KEY",
    description: "App Store Connect API Private Key (contents of .p8 file)",
    where: "https://appstoreconnect.apple.com/access/integrations/api",
  },
  {
    name: "IOS_DISTRIBUTION_CERT_P12",
    description: "Base64-encoded iOS Distribution Certificate (.p12)",
    where:
      "Apple Developer Portal → Certificates → Export as .p12 → base64 encode",
  },
  {
    name: "IOS_DISTRIBUTION_CERT_PASSWORD",
    description: "Password for the .p12 certificate",
    where: "Password you set when exporting the certificate",
  },
  {
    name: "IOS_PROVISIONING_PROFILE",
    description: "Base64-encoded Provisioning Profile (.mobileprovision)",
    where: "Apple Developer Portal → Profiles → Download → base64 encode",
  },
  {
    name: "IOS_PROVISIONING_PROFILE_NAME",
    description:
      'Name of the provisioning profile (e.g., "Brikly App Store Profile")',
    where: "Apple Developer Portal → Profiles → Name column",
  },
];

info("The following secrets must be set in GitHub:");
info(
  "Repository → Settings → Secrets and variables → Actions → New repository secret\n",
);

requiredSecrets.forEach((secret, index) => {
  log(`${index + 1}. ${secret.name}`, "yellow");
  log(`   📝 ${secret.description}`, "reset");
  log(`   🔗 ${secret.where}\n`, "cyan");
});

console.log("");

// ============================================================================
// 6. APPLE DEVELOPER SETUP
// ============================================================================

log("🍏 Apple Developer Requirements...", "yellow");

const appleSetup = [
  {
    step: "Enroll in Apple Developer Program",
    status: "Required",
    details: "$99/year - https://developer.apple.com/programs/enroll/",
  },
  {
    step: "Create App Store Connect API Key",
    status: "Required",
    details: "https://appstoreconnect.apple.com/access/integrations/api",
  },
  {
    step: "Register Bundle ID",
    status: "Required",
    details: "https://developer.apple.com/account/resources/identifiers/list",
  },
  {
    step: "Create Distribution Certificate",
    status: "Required",
    details: "https://developer.apple.com/account/resources/certificates/list",
  },
  {
    step: "Create App Store Provisioning Profile",
    status: "Required",
    details: "https://developer.apple.com/account/resources/profiles/list",
  },
  {
    step: "Create App in App Store Connect",
    status: "Required",
    details: "https://appstoreconnect.apple.com/apps",
  },
];

appleSetup.forEach((item, index) => {
  info(`${index + 1}. ${item.step} [${item.status}]`);
  log(`   ${item.details}\n`, "cyan");
});

console.log("");

// ============================================================================
// 7. BUILD COMMANDS
// ============================================================================

log("🚀 Build Commands...", "blue");

info("Local testing:");
console.log("  npm run build:mobile        # Build web assets for mobile");
console.log("  npx cap sync ios           # Sync to iOS project");
console.log("  npx cap open ios           # Open Xcode (requires macOS)\n");

info("GitHub Actions:");
console.log("  1. Go to: GitHub Repository → Actions tab");
console.log('  2. Select: "Build & Submit iOS to App Store"');
console.log('  3. Click: "Run workflow"');
console.log('  4. Choose options and click "Run workflow"\n');

console.log("");

// ============================================================================
// 8. SUMMARY
// ============================================================================

console.log("=".repeat(70));
log("  Summary", "cyan");
console.log("=".repeat(70));

if (errors === 0 && warnings === 0) {
  success("All checks passed! ✨");
  info("Next steps:");
  console.log("  1. Ensure all GitHub Secrets are set (see list above)");
  console.log("  2. Ensure Apple Developer setup is complete");
  console.log("  3. Trigger GitHub Actions workflow to build & submit");
} else {
  if (errors > 0) {
    error(`Found ${errors} error(s) that must be fixed`);
  }
  if (warnings > 0) {
    warning(`Found ${warnings} warning(s) to review`);
  }

  info("\nCommon fixes:");
  console.log('  • Run "npm run build:mobile" to create web assets');
  console.log('  • Run "npx cap add ios" to initialize iOS platform');
  console.log("  • Set all required GitHub Secrets");
  console.log("  • Complete Apple Developer setup");
}

console.log("=".repeat(70) + "\n");

process.exit(errors > 0 ? 1 : 0);
