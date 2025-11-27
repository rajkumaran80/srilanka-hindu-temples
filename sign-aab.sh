#!/bin/bash
# AAB Signing Script for Google Play Store using jarsigner
# 
# Usage: ./sign-aab.sh [keystore-path] [key-alias]
# NOTE: This script assumes you have an unsigned AAB file ready.

set -e

# --- Configuration Variables ---
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values (Set these to match your actual key details and file paths)
KEYSTORE_PATH="${1:-my-release-key.keystore}"
KEY_ALIAS="${2:-my-key-alias}"

# Input and Output AAB file paths
UNSIGNED_AAB="apk-builds/app-release-unsigned.aab"
SIGNED_AAB="apk-builds/app-release-signed.aab" 

# Passwords (FOR SECURITY, replace these hardcoded values with secure input methods)
STORE_PASS="password" 
KEY_PASS="password"   

echo -e "${BLUE}🔐 AAB Signing Script for Sri Lanka Hindu Temples${NC}"
echo "=================================================="

# --- Pre-flight Checks ---

# 1. Check if unsigned AAB exists
if [ ! -f "$UNSIGNED_AAB" ]; then
    echo -e "${RED}❌ Error: Unsigned AAB not found at $UNSIGNED_AAB${NC}"
    echo -e "${RED}💡 You must first build the unsigned AAB (e.g., run: ./gradlew bundleRelease)${NC}"
    exit 1
fi

# 2. Check if keystore exists
if [ ! -f "$KEYSTORE_PATH" ]; then
    echo -e "${RED}❌ Error: Keystore file not found at $KEYSTORE_PATH${NC}"
    exit 1
fi

# 3. Check for jarsigner (part of JDK)
if [ -z "$JAVA_HOME" ]; then
    echo -e "${RED}❌ JAVA_HOME is not set. jarsigner requires the JDK to be available.${NC}"
    exit 1
fi

JAR_SIGNER="$JAVA_HOME/bin/jarsigner"

if [ ! -f "$JAR_SIGNER" ]; then
    echo -e "${RED}❌ jarsigner tool not found at $JAR_SIGNER${NC}"
    echo -e "${RED}💡 Ensure your JDK is correctly installed and JAVA_HOME is set.${NC}"
    exit 1
fi

# --- Signing Process ---

echo -e "${BLUE}📝 Signing AAB with jarsigner...${NC}"

# Jarsigner is the correct tool for signing AAB files.
"$JAR_SIGNER" -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
    -keystore "$KEYSTORE_PATH" \
    -storepass "$STORE_PASS" \
    -keypass "$KEY_PASS" \
    -signedjar "$SIGNED_AAB" \
    "$UNSIGNED_AAB" \
    "$KEY_ALIAS"

echo -e "${GREEN}✅ AAB signed successfully! Output file: $SIGNED_AAB${NC}"

# --- Verification ---

echo -e "${BLUE}🔎 Verifying AAB signature...${NC}"

# Verify the signature using jarsigner
# The output should show "jar verified."
"$JAR_SIGNER" -verify -verbose -certs "$SIGNED_AAB"

echo -e "${GREEN}✅ Signature verification complete. The AAB is ready for Google Play.${NC}"
echo ""
echo -e "${BLUE}📊 File Information:${NC}"
echo "  Signed AAB: $(stat -f%z "$SIGNED_AAB" 2>/dev/null | awk '{print $1/1024/1024 " MB"}')"
echo ""
echo -e "${GREEN}🚀 Next Step: Upload the file $SIGNED_AAB to the Google Play Console.${NC}"
echo -e "${YELLOW}⚠️ If this is your first upload, be prepared to enroll in Google Play App Signing.${NC}"