Running "expo doctor"
env: load .env
env: export VITE_SUPABASE_PROJECT_ID VITE_SUPABASE_PUBLISHABLE_KEY VITE_SUPABASE_URL
Running 17 checks on your project...
11/17 checks passed. 6 checks failed. Possible issues detected:
Use the --verbose flag to see more details about passed checks.

✖ Check for common project setup issues
The .expo directory is not ignored by Git. It contains machine-specific device history and development server settings and should not be committed.
Advice:
Add ".expo/" to your .gitignore to avoid committing local Expo state.

✖ Check Expo config (app.json/ app.config.js) schema
Error validating asset fields in /Users/expo/workingdir/build/app.json:
 Field: Splash.image - cannot access file at './public/splash-screen.png'.
 Field: Android.adaptiveIcon.foregroundImage - cannot access file at './public/adaptive-icon.png'.
 Field: icon - cannot access file at './public/icon-512x512.png'.
Advice:
Resolve schema errors in your app config. Learn more: https://docs.expo.dev/workflow/configuration/
✖ Check Expo config for common issues
You have an app.json file in your project, but your app.config.js is not using the values from it.
Advice:
Remove the static app.json, or use its values in your dynamic app.config.js. Learn more: https://docs.expo.dev/workflow/configuration

✖ Check that required peer dependencies are installed
Missing peer dependency: expo-linking
Required by: expo-router
Missing peer dependency: react-native-screens
Required by: expo-router
Advice:
Install missing required peer dependencies with "npx expo install expo-linking react-native-screens"
Your app may crash outside of Expo Go without these dependencies. Native module peer dependencies must be installed directly.

✖ Check for app config fields that may not be synced in a non-CNG project
This project contains native project folders but also has native configuration properties in app.config.js, indicating it is configured to use Prebuild. When the android/ios folders are present, EAS Build will not sync the following properties: orientation, icon, userInterfaceStyle, splash, ios, android, plugins. 

Advice:
Add '/ios' to your .gitignore file if you intend to use CNG / Prebuild. Learn more: https://docs.expo.dev/workflow/prebuild/#usage-with-eas-build

✖ Check that packages match versions required by installed Expo SDK

❗ Major version mismatches
package           expected  found    
react             19.1.0    18.3.1   
react-dom         19.1.0    18.3.1   
@types/react      ~19.1.10  18.3.24  
@types/react-dom  ~19.1.7   18.3.7   

⚠️ Minor version mismatches
package           expected  found    
react-native      0.81.4    0.82.0   
typescript        ~5.9.2    5.8.3    



6 packages out of date.
Advice:
Use 'npx expo install --check' to review and upgrade your dependencies.
To ignore specific packages, add them to "expo.install.exclude" in package.json. Learn more: https://expo.fyi/dependency-validation
6 checks failed, indicating possible issues with the project.
Command "expo doctor" failed.

Preparing credentials
Creating keychain
Preparing credentials for target 'BuildDesk'
Getting distribution certificate fingerprint and common name
Fingerprint = "BD7CEDA17E343EED3DB80DA40B37DD55B5A4B12F", common name = iPhone Distribution: Pearson Media LLC (4G65K64G73)
Writing distribution certificate to /var/folders/5_/4knlryn57n39p2c_jw8567z00000gn/T/af717a6e-249a-4b71-a750-2a6f0e883363.p12
Importing distribution certificate into the keychain
Initializing provisioning profile
Validating whether the distribution certificate has been imported successfully
Verifying whether the distribution certificate and provisioning profile match

env: load .env
env: export VITE_SUPABASE_PROJECT_ID VITE_SUPABASE_PUBLISHABLE_KEY VITE_SUPABASE_URL
- Creating native directory (./ios)
✔ Created native directory
- Updating package.json
› Using react-native@0.82.0 instead of recommended react-native@0.81.4.
- Updating package.json
✔ Updated package.json
- Running prebuild
✖ Prebuild failed
Error: [ios.dangerous]: withIosDangerousBaseMod: ENOENT: no such file or directory, open './public/icon-512x512.png'
Error: [ios.dangerous]: withIosDangerousBaseMod: ENOENT: no such file or directory, open './public/icon-512x512.png'
    at Object.openSync (node:fs:573:18)
    at Object.readFileSync (node:fs:452:35)
    at calculateHash (/Users/expo/workingdir/build/node_modules/@expo/image-utils/build/Cache.js:19:76)
    at createCacheKey (/Users/expo/workingdir/build/node_modules/@expo/image-utils/build/Cache.js:24:18)
    at Object.createCacheKeyWithDirectoryAsync (/Users/expo/workingdir/build/node_modules/@expo/image-utils/build/Cache.js:32:33)
    at generateImageAsync (/Users/expo/workingdir/build/node_modules/@expo/image-utils/build/Image.js:227:34)
    at async generateUniversalIconAsync (/Users/expo/workingdir/build/node_modules/@expo/prebuild-config/build/plugins/icons/withIosIcons.js:187:15)
    at async setIconsAsync (/Users/expo/workingdir/build/node_modules/@expo/prebuild-config/build/plugins/icons/withIosIcons.js:121:20)
    at async /Users/expo/workingdir/build/node_modules/@expo/prebuild-config/build/plugins/icons/withIosIcons.js:53:5
    at async action (/Users/expo/workingdir/build/node_modules/@expo/config-plugins/build/plugins/withMod.js:199:23)
Error: Unknown error. See logs of the Prebuild build phase for more information.

Destroying keychain - /var/folders/5_/4knlryn57n39p2c_jw8567z00000gn/T/eas-build-48d066ac-9aab-4659-94a0-f8dbbeb67b0f.keychain
Removing provisioning profile

Build failed: Unknown error. See logs of the Prebuild build phase for more information.