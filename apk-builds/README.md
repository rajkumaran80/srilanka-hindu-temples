# APK Build Directory

This directory contains the packaged Android applications for the Sri Lanka Hindu Temples mobile app.

## 📦 Files

### `app-debug.apk` (4.0 MB)
**For Testing & Development**

- ✅ Ready to install immediately
- ✅ Includes debug symbols for troubleshooting
- ✅ Can be installed on any Android device (API 24+)
- ✅ Direct install via: `adb install -r app-debug.apk`

**Installation:**
```bash
adb install -r app-debug.apk
```

### `app-release-unsigned.apk` (3.1 MB)
**For Google Play Store Submission**

- ⚠️ Unsigned (requires signing before distribution)
- ✅ Optimized and minified
- ✅ No debug symbols
- ✅ Smaller file size than debug APK

**Before Publishing:**
1. Sign the APK with your keystore
2. Align the APK
3. Upload to Google Play Console

See `APK_BUILD_INFO.md` for detailed signing instructions.

## 🚀 Quick Start

### Test Immediately
```bash
# Connect Android device with USB debugging
adb devices

# Install debug APK
adb install -r app-debug.apk

# Launch app
adb shell am start -n srilankan.hindu.temples/.MainActivity
```

### Prepare for Release
```bash
# Sign the release APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore my-release-key.keystore \
  app-release-unsigned.apk my-key-alias

# Align for optimization
zipalign -v 4 app-release-unsigned.apk app-release.apk

# Now ready to upload to Play Store
```

## 📋 What to Do With Each APK

### Debug APK (app-debug.apk)
Use this for:
- ✅ Testing on personal devices
- ✅ QA and internal testing
- ✅ Feature verification
- ✅ Performance testing
- ✅ Bug discovery and reporting

### Release APK (app-release-unsigned.apk)
Use this for:
- ✅ Create production builds
- ✅ Sign for distribution
- ✅ Submit to Google Play Store
- ✅ Release to beta testers
- ✅ Archive for version control

## 📊 APK Specifications

| Property | Value |
|----------|-------|
| **App ID** | `srilankan.hindu.temples` |
| **App Name** | Sri Lanka Hindu Temples |
| **Version** | 1.0.0 |
| **Min SDK** | 24 (Android 7.0) |
| **Target SDK** | 35 (Android 15) |
| **Debug APK Size** | 4.0 MB |
| **Release APK Size** | 3.1 MB |

## 🔐 Signing (For Release)

To sign the release APK:

```bash
# Create keystore (one-time, keep this file safe!)
keytool -genkey -v -keystore my-release-key.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias my-key-alias

# Sign the APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore my-release-key.keystore \
  app-release-unsigned.apk my-key-alias

# Verify the signature
jarsigner -verify -verbose -certs app-release-unsigned.apk

# Optimize (optional but recommended)
zipalign -v 4 app-release-unsigned.apk app-release.apk
```

**⚠️ Important**: Keep your keystore file (`my-release-key.keystore`) in a safe place. You'll need it to release app updates.

## 🧪 Testing

### On Physical Device
```bash
# Install with ADB
adb devices
adb install -r app-debug.apk

# Or transfer APK to phone and install manually
```

### On Emulator
```bash
# Launch Android emulator first
emulator -avd Pixel_API_31

# Wait for it to load, then install
adb install -r app-debug.apk
```

### Test Checklist
- [ ] App installs without errors
- [ ] App launches without crashes
- [ ] Map displays temples correctly
- [ ] Search functionality works
- [ ] Offline mode is detected
- [ ] Comments can be added
- [ ] No memory leaks or ANRs

## 📚 Related Documentation

- `APK_BUILD_INFO.md` - Detailed technical information
- `APK_BUILD_SUMMARY.md` - Complete build overview
- `APK_TESTING_GUIDE.md` - Comprehensive testing guide
- `APK_COMMANDS.sh` - Quick reference commands

## ❓ FAQ

**Q: Can I install the debug APK on multiple devices?**  
A: Yes! The debug APK can be installed on any Android device (API 24+).

**Q: Do I need to sign the debug APK?**  
A: No, the debug APK is already signed with the debug keystore.

**Q: Why is the debug APK larger than the release APK?**  
A: Debug APK includes debugging symbols and is not minified.

**Q: Can I submit the debug APK to Google Play?**  
A: No, you must use the signed release APK.

**Q: What if I lose my keystore file?**  
A: You'll need to create a new one with a different key alias and can't update existing apps.

**Q: How do I update the app after release?**  
A: Increment the `versionCode` and `versionName`, rebuild, sign, and submit.

## 🆘 Troubleshooting

### APK Won't Install
```bash
# Clear existing app first
adb shell pm clear srilankan.hindu.temples

# Then reinstall
adb install -r app-debug.apk
```

### App Crashes
```bash
# Check logs
adb logcat | grep "temples"

# Uninstall and reinstall
adb uninstall srilankan.hindu.temples
adb install -r app-debug.apk
```

### Can't Connect with ADB
```bash
# Restart ADB server
adb kill-server
adb start-server

# Check connected devices
adb devices
```

## 📞 Support

For detailed help:
- Read `APK_TESTING_GUIDE.md` for testing instructions
- Check `APK_BUILD_INFO.md` for technical details
- Review `APK_COMMANDS.sh` for common commands

---

**Ready to test? Run:** `adb install -r app-debug.apk`

**Ready to release? See:** `APK_BUILD_INFO.md` for signing instructions

Built with ❤️ for the Sri Lankan Hindu community.
