#!/bin/bash
# APK Signing Script for Google Play Store using apksigner
# Usage: ./sign-apk.sh [keystore-path] [key-alias]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
KEYSTORE_PATH="${1:-my-release-key.keystore}"
KEY_ALIAS="${2:-my-key-alias}"
UNSIGNED_APK="apk-builds/app-release-unsigned.apk"
SIGNED_APK="apk-builds/app-release.apk"
ALIGNED_APK="apk-builds/app-release-aligned.apk"
STORE_PASS="password"
KEY_PASS="password"

echo -e "${BLUE}🔐 APK Signing Script for Sri Lanka Hindu Temples${NC}"
echo "=================================================="

# Check if unsigned APK exists
if [ ! -f "$UNSIGNED_APK" ]; then
    echo -e "${RED}❌ Error: Unsigned APK not found at $UNSIGNED_APK${NC}"
    echo -e "${YELLOW}💡 Make sure to build the APK first: npm run build:apk${NC}"
    exit 1
fi

# Check if keystore exists
if [ ! -f "$KEYSTORE_PATH" ]; then
    echo -e "${YELLOW}⚠️  Keystore not found. Creating new keystore...${NC}"

    # Create keystore
    keytool -genkey -v -keystore "$KEYSTORE_PATH" \
      -keyalg RSA -keysize 2048 -validity 10000 \
      -alias "$KEY_ALIAS" \
      -dname "CN=Sri Lanka Hindu Temples, OU=Mobile App, O=Sri Lanka Hindu Temples Project, L=Colombo, ST=Western Province, C=LK" \
      -storetype PKCS12 \
      -storepass "$STORE_PASS" \
      -keypass "$KEY_PASS"

    echo -e "${GREEN}✅ Keystore created successfully!${NC}"
    echo -e "${YELLOW}🔑 Keep this file ($KEYSTORE_PATH) safe - you'll need it for future updates!${NC}"
fi

echo -e "${BLUE}📝 Signing APK with apksigner...${NC}"

# Check if ANDROID_HOME is set
if [ -z "$ANDROID_HOME" ]; then
    echo -e "${RED}❌ ANDROID_HOME is not set. Please set it to your Android SDK path.${NC}"
    exit 1
fi

APKSIGNER="$ANDROID_HOME/build-tools/35.0.0/apksigner"
ZIPALIGN="$ANDROID_HOME/build-tools/35.0.0/zipalign"

# Sign APK
"$APKSIGNER" sign \
    --ks "$KEYSTORE_PATH" \
    --ks-pass pass:"$STORE_PASS" \
    --key-pass pass:"$KEY_PASS" \
    --out "$SIGNED_APK" \
    "$UNSIGNED_APK"

# Verify APK
"$APKSIGNER" verify "$SIGNED_APK"

echo -e "${BLUE}🔧 Zip-aligning APK...${NC}"

# Zip-align
"$ZIPALIGN" -v 4 "$SIGNED_APK" "$ALIGNED_APK"

echo -e "${GREEN}✅ APK signed and aligned successfully!${NC}"
echo ""
echo -e "${BLUE}📊 APK Information:${NC}"
echo "  Original unsigned: $(stat -f%z "$UNSIGNED_APK" | awk '{print $1/1024/1024 " MB"}')"
echo "  Signed:           $(stat -f%z "$SIGNED_APK" | awk '{print $1/1024/1024 " MB"}')"
echo "  Aligned:          $(stat -f%z "$ALIGNED_APK" | awk '{print $1/1024/1024 " MB"}')"
echo ""
echo -e "${GREEN}🚀 Ready for Google Play Store upload!${NC}"
echo -e "${BLUE}📁 Aligned APK: $ALIGNED_APK${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "  1. Go to Google Play Console"
echo "  2. Upload $ALIGNED_APK"
echo "  3. Complete store listing"
echo "  4. Submit for review"
echo ""
echo -e "${BLUE}🔗 Google Play Console: https://play.google.com/console${NC}"
