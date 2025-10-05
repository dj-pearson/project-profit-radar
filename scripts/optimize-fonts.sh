#!/bin/bash

# Font Optimization Script
# Downloads and self-hosts Google Fonts for better performance

set -e

echo "🔤 Font Optimization Script"
echo "=============================="
echo ""

# Create fonts directory if it doesn't exist
FONTS_DIR="public/fonts"
mkdir -p "$FONTS_DIR"

echo "📥 Downloading Inter font files..."
echo ""

# Download Inter font weights 400 and 600 (most commonly used)
# Using Google Fonts Helper API to get direct URLs

BASE_URL="https://fonts.gstatic.com/s/inter/v12"

# Inter Regular (400)
INTER_400_URL="${BASE_URL}/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2"
# Inter Semi-Bold (600)
INTER_600_URL="${BASE_URL}/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2"

echo "Downloading Inter Regular (400)..."
curl -# -L -o "$FONTS_DIR/inter-regular.woff2" "$INTER_400_URL"

echo "Downloading Inter Semi-Bold (600)..."
curl -# -L -o "$FONTS_DIR/inter-semibold.woff2" "$INTER_600_URL"

echo ""
echo "✅ Fonts downloaded successfully!"
echo ""

# Get file sizes
REGULAR_SIZE=$(du -h "$FONTS_DIR/inter-regular.woff2" | cut -f1)
SEMIBOLD_SIZE=$(du -h "$FONTS_DIR/inter-semibold.woff2" | cut -f1)

echo "📊 Font file sizes:"
echo "   Inter Regular (400):    $REGULAR_SIZE"
echo "   Inter Semi-Bold (600):  $SEMIBOLD_SIZE"
echo ""

# Create CSS file
CSS_FILE="$FONTS_DIR/inter.css"

cat > "$CSS_FILE" << 'EOF'
/**
 * Inter Font - Self-hosted for optimal performance
 * Includes weights: 400 (regular), 600 (semi-bold)
 */

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/fonts/inter-regular.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/fonts/inter-semibold.woff2') format('woff2');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
EOF

echo "✅ Created CSS file: $CSS_FILE"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Remove Google Fonts from index.html:"
echo "   - Remove all <link> tags referencing fonts.googleapis.com"
echo "   - Remove preconnect links to fonts.gstatic.com"
echo ""
echo "2. Add preload links to index.html <head>:"
echo '   <link rel="preload" href="/fonts/inter-regular.woff2" as="font" type="font/woff2" crossorigin>'
echo '   <link rel="preload" href="/fonts/inter-semibold.woff2" as="font" type="font/woff2" crossorigin>'
echo ""
echo "3. Import the CSS file in your index.css or index.html:"
echo '   <link rel="stylesheet" href="/fonts/inter.css">'
echo ""
echo "4. Test font rendering across your app"
echo ""
echo "💡 Expected improvements:"
echo "   • 100-300ms faster font load time"
echo "   • No DNS lookup to Google servers"
echo "   • Better privacy (no Google tracking)"
echo "   • Reduced total font payload (2 weights vs 4)"
echo ""
echo "✅ Font optimization complete!"
