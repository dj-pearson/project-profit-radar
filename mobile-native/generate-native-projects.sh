#!/bin/bash

# Generate native iOS and Android projects for React Native
# This script will create the necessary native project files

echo "Generating native iOS and Android projects..."

# Create iOS directory structure
mkdir -p ios/BuildDeskMobile.xcodeproj
mkdir -p ios/BuildDeskMobile
mkdir -p ios/BuildDeskMobileTests

# Create Android directory structure
mkdir -p android/app/src/main/java/com/builddeskmo mobile
mkdir -p android/app/src/main/res/values
mkdir -p android/app/src/main/res/drawable
mkdir -p android/gradle/wrapper

echo "Creating Podfile for iOS..."
cat > ios/Podfile << 'EOF'
# Resolve react_native_pods.rb with node to allow for hoisting
require Pod::Executable.execute_command('node', ['-p',
  'require.resolve(
    "react-native/scripts/react_native_pods.rb",
    {paths: [process.argv[1]]},
  )', __dir__]).strip

platform :ios, min_ios_version_supported
prepare_react_native_project!

linkage = ENV['USE_FRAMEWORKS']
if linkage != nil
  Pod::UI.puts "Configuring Pod with #{linkage}ally linked Frameworks".green
  use_frameworks! :linkage => linkage.to_sym
end

target 'BuildDeskMobile' do
  config = use_native_modules!

  use_react_native!(
    :path => config[:reactNativePath],
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false
    )
  end
end
EOF

echo "Creating build.gradle for Android..."
cat > android/build.gradle << 'EOF'
buildscript {
    ext {
        buildToolsVersion = "35.0.0"
        minSdkVersion = 24
        compileSdkVersion = 35
        targetSdkVersion = 35
        ndkVersion = "26.1.10909125"
        kotlinVersion = "1.9.24"
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin")
    }
}

apply plugin: "com.facebook.react.rootproject"

allprojects {
    repositories {
        maven {
            url("$rootDir/../node_modules/react-native/android")
        }
        maven {
            url("$rootDir/../node_modules/jsc-android/dist")
        }
        google()
        mavenCentral()
    }
}
EOF

echo "Native project structure created!"
echo "Run 'cd ios && pod install' to install iOS dependencies"
echo "Run './gradlew assembleDebug' in android folder to build Android"
