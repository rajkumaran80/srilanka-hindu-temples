#!/bin/bash
# Quick Commands for APK Management
# Copy and paste these commands as needed

# ═══════════════════════════════════════════════════════════
# INSTALLATION
# ═══════════════════════════════════════════════════════════

# Install debug APK (testing)
adb install -r apk-builds/app-debug.apk

# Install release APK (after signing)
adb install apk-builds/app-release.apk

# Reinstall with data clear
adb shell pm clear srilankan.hindu.temples && adb install apk-builds/app-debug.apk

# ═══════════════════════════════════════════════════════════
# LAUNCHING & INTERACTION
# ═══════════════════════════════════════════════════════════

# Launch app
adb shell am start -n srilankan.hindu.temples/.MainActivity

# Force stop app
adb shell am force-stop srilankan.hindu.temples

# Uninstall app
adb uninstall srilankan.hindu.temples

# ═══════════════════════════════════════════════════════════
# DEBUGGING
# ═══════════════════════════════════════════════════════════

# View live logs
adb logcat -v threadtime

# View logs filtered by app
adb logcat -s "temples"

# View error logs only
adb logcat -v threadtime *:E

# Save logs to file
adb logcat > logs.txt

# Clear log buffer
adb logcat -c

# View memory usage
adb shell dumpsys meminfo srilankan.hindu.temples

# Check if app is running
adb shell pm list packages | grep temples

# ═══════════════════════════════════════════════════════════
# SIGNING (RELEASE)
# ═══════════════════════════════════════════════════════════

# Create keystore (one-time, keep safe!)
keytool -genkey -v -keystore my-release-key.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias my-key-alias

# Sign APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore my-release-key.keystore \
  apk-builds/app-release-unsigned.apk my-key-alias

# Verify signature
jarsigner -verify -verbose -certs apk-builds/app-release-unsigned.apk

# Align APK (optimization)
zipalign -v 4 app-release-unsigned.apk app-release.apk

# ═══════════════════════════════════════════════════════════
# BUILDING
# ═══════════════════════════════════════════════════════════

# Full build (web + Android)
npm run build && npx cap sync android && cd android && ./gradlew assembleRelease

# Build web only
npm run build

# Sync web to Android
npx cap sync android

# Build Android debug
cd android && ./gradlew assembleDebug

# Build Android release
cd android && ./gradlew assembleRelease

# Clean build
cd android && ./gradlew clean && ./gradlew assembleRelease

# ═══════════════════════════════════════════════════════════
# FILE MANAGEMENT
# ═══════════════════════════════════════════════════════════

# Find APK files
find . -name "*.apk" -type f

# Check APK size
ls -lh apk-builds/*.apk

# List APK contents
unzip -l apk-builds/app-debug.apk | head -20

# Extract APK for inspection
unzip -q apk-builds/app-debug.apk -d apk-extracted/

# ═══════════════════════════════════════════════════════════
# TESTING
# ═══════════════════════════════════════════════════════════

# Record screen (30 seconds)
adb shell screenrecord --time-limit 30 /sdcard/screen.mp4

# Take screenshot
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png ./

# ═══════════════════════════════════════════════════════════
# EMULATOR (if you don't have device)
# ═══════════════════════════════════════════════════════════

# List emulators
emulator -list-avds

# Launch emulator
emulator -avd Pixel_API_31

# Install APK on emulator
adb -e install apk-builds/app-debug.apk

# ═══════════════════════════════════════════════════════════
# DEVICE INFO
# ═══════════════════════════════════════════════════════════

# Check Android version
adb shell getprop ro.build.version.release

# Check device model
adb shell getprop ro.product.model

# List all devices connected
adb devices

# Get device serial number
adb get-serialno

# ═══════════════════════════════════════════════════════════
# OFFLINE TESTING
# ═══════════════════════════════════════════════════════════

# Enable airplane mode (simulates offline)
adb shell settings put global airplane_mode_on 1
adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true

# Disable airplane mode (back online)
adb shell settings put global airplane_mode_on 0
adb shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false

# ═══════════════════════════════════════════════════════════
# BACKUP & RESTORE
# ═══════════════════════════════════════════════════════════

# Backup app data
adb backup -apk srilankan.hindu.temples -f temples-backup.ab

# Restore app data
adb restore temples-backup.ab

# ═══════════════════════════════════════════════════════════
# WORKFLOW: Complete Build to Release
# ═══════════════════════════════════════════════════════════

# 1. Build
cd /path/to/srilanka-hindu-temples
npm run build

# 2. Sync to Android
npx cap sync android

# 3. Build release APK
cd android
./gradlew assembleRelease

# 4. Sign (requires keystore)
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore ~/my-release-key.keystore \
  app/build/outputs/apk/release/app-release-unsigned.apk my-key-alias

# 5. Optimize
zipalign -v 4 app-release-unsigned.apk app-release.apk

# 6. Copy to outputs
cp app/build/outputs/apk/release/app-release-unsigned.apk ../apk-builds/
cp app-release.apk ../apk-builds/

# 7. Test (optional)
adb install -r app-release.apk

# ═══════════════════════════════════════════════════════════
# QUICK REFERENCE
# ═══════════════════════════════════════════════════════════

# File Locations
# Debug APK:     apk-builds/app-debug.apk
# Release APK:   apk-builds/app-release-unsigned.apk
# Build output:  android/app/build/outputs/apk/
# Web assets:    mobile/dist/
# Source code:   mobile/src/

# App Details
# Package:   srilankan.hindu.temples
# Activity:  MainActivity
# Min API:   24 (Android 7.0)
# Target:    35 (Android 15)

# ═══════════════════════════════════════════════════════════
# NOTES
# ═══════════════════════════════════════════════════════════

# • Always backup your keystore file (production signing key)
# • Test on multiple Android versions before release
# • Check app size - aim for under 100MB
# • Review Google Play policies before submission
# • Keep version codes sequential when updating
# • Test offline functionality thoroughly
# • Monitor crash reports after release

# ═══════════════════════════════════════════════════════════
