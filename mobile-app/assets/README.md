# Brikly Mobile Assets

## Required Assets

This directory needs the following image assets:

### 1. `icon.png`
- **Size**: 1024x1024 px
- **Format**: PNG with transparency
- **Usage**: App icon for both iOS and Android
- **Design**: Brikly logo on transparent or branded background

### 2. `splash.png`
- **Size**: 1284x2778 px (iPhone 14 Pro Max resolution)
- **Format**: PNG
- **Background**: #4A90E2 (Brikly blue)
- **Usage**: Launch screen
- **Design**: Brikly logo centered, can include "Brikly" text

### 3. `adaptive-icon.png`
- **Size**: 1024x1024 px
- **Format**: PNG with transparency
- **Usage**: Android adaptive icon foreground
- **Design**: Brikly logo, keep important content within safe zone (center 66%)

### 4. `favicon.png`
- **Size**: 48x48 px
- **Format**: PNG
- **Usage**: Web favicon (for Expo web builds)
- **Design**: Simplified Brikly logo

## Temporary Solution

The current placeholder files need to be replaced with actual branded assets. Until then, you can:

1. Use simple colored squares for testing
2. Generate temporary icons using Expo's asset generation tools
3. Run `npx expo prebuild` which will auto-generate basic icons

## Generating Assets

You can use the following tools to generate all required sizes:

```bash
# Install Expo asset tools
npm install -g sharp-cli

# Generate from a single 1024x1024 source
npx expo prebuild --clean
```

Or use online tools:
- [App Icon Generator](https://www.appicon.co/)
- [Adaptive Icon Generator](https://adapticon.tooo.io/)
