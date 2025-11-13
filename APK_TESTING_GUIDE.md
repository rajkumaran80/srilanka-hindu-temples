# APK Installation & Testing Guide

## Quick Start - Test on Your Device

### Prerequisites
- Android device or emulator (Android 7.0+)
- USB cable (for physical device)
- ADB tools installed (Android SDK Platform Tools)

### Installation Steps

#### Option 1: Using ADB (Fastest)
```bash
# Connect device via USB and enable USB debugging

# Install debug APK
adb install apk-builds/app-debug.apk

# Or reinstall if already exists
adb install -r apk-builds/app-debug.apk
```

#### Option 2: Manual Installation
1. Transfer `app-debug.apk` to your Android device
2. Open file manager on device
3. Navigate to the APK file
4. Tap to install
5. Grant required permissions

#### Option 3: Android Emulator
```bash
# List available emulators
emulator -list-avds

# Launch emulator
emulator -avd <emulator_name>

# Wait for it to boot, then install APK
adb install apk-builds/app-debug.apk
```

## Testing Checklist

### Installation
- [ ] APK installs without errors
- [ ] App icon appears on home screen
- [ ] App name is "Sri Lanka Hindu Temples"

### Startup
- [ ] App launches successfully
- [ ] Map loads and displays
- [ ] Initial temples are visible as markers

### Map Features
- [ ] Can pan/drag the map in all directions
- [ ] Zoom in/out works smoothly
- [ ] Markers are clickable
- [ ] Map tiles load with good detail

### Search Functionality
- [ ] Search input is visible and responsive
- [ ] Typing filters temple list
- [ ] Dropdown suggestions appear
- [ ] Clicking suggestion navigates to temple

### Temple Details
- [ ] Clicking marker shows popup
- [ ] "View Details" button works
- [ ] Details page displays properly
- [ ] Images load correctly

### User Actions
- [ ] Can add comments to temples
- [ ] Comments submit successfully
- [ ] Can suggest alternative names
- [ ] Forms validate input

### Offline Mode
- [ ] Turn off WiFi + mobile data
- [ ] "Offline" status bar appears at top
- [ ] Map is still draggable
- [ ] Zoom controls are disabled
- [ ] Turn connection back on
- [ ] Status bar disappears
- [ ] Data reloads automatically

### Performance
- [ ] App responds quickly to taps
- [ ] No lag when panning map
- [ ] Search results appear instantly
- [ ] No crashes or ANRs (Application Not Responding)

### Device Compatibility
- [ ] Test on multiple Android versions (if possible)
- [ ] Portrait and landscape orientations work
- [ ] Touch gestures are responsive
- [ ] Memory usage is reasonable

## Useful ADB Commands

```bash
# View app logs
adb logcat | grep "srilankan.hindu.temples"

# Clear app data
adb shell pm clear srilankan.hindu.temples

# Uninstall app
adb uninstall srilankan.hindu.temples

# Get device info
adb shell getprop ro.build.version.release

# Record screen
adb shell screenrecord /sdcard/recording.mp4

# View installed packages
adb shell pm list packages | grep temples
```

## Common Issues & Solutions

### "APK not installed"
- Ensure device has enough storage (min 100 MB free)
- Try `adb install -r` to reinstall
- Clear Google Play Services cache: `adb shell pm clear com.google.android.gms`

### App crashes on startup
```bash
# Check logs for errors
adb logcat -v threadtime *:E
```

### Can't connect with ADB
- Enable USB debugging in Developer Options
- Try different USB cable or port
- Accept USB debugging prompt on device
- Run: `adb kill-server && adb start-server`

### Map not loading
- Check internet connection
- Clear app cache: `adb shell pm clear srilankan.hindu.temples`
- Reinstall the app

### App is slow
- Close other running apps
- Restart device
- Check available storage
- Monitor RAM usage: `adb shell dumpsys meminfo srilankan.hindu.temples`

## Release APK Signing

When ready for production release:

```bash
# Create keystore (one-time)
keytool -genkey -v -keystore my-release-key.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias

# Sign the APK
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore my-release-key.keystore \
  android/app/build/outputs/apk/release/app-release-unsigned.apk my-key-alias

# Verify signature
jarsigner -verify -verbose -certs \
  android/app/build/outputs/apk/release/app-release-unsigned.apk

# Align APK (optional but recommended)
zipalign -v 4 app-release-unsigned.apk app-release-signed.apk
```

**⚠️ Important**: Keep your keystore file safe. You'll need it to release updates!

## Firebase Analytics (Optional)

To add Firebase analytics to your app:

1. Add `google-services.json` to `android/app/`
2. Update build.gradle with Firebase dependencies
3. Initialize Firebase in your app
4. View metrics in Firebase Console

## Version Updates

To release a new version:

1. Update version in `android/app/build.gradle`:
   ```groovy
   versionCode 2  // Increment by 1
   versionName "1.1"  // Update version
   ```

2. Rebuild: `./gradlew assembleRelease`

3. Sign the new APK

## Resources

- Android Debug Bridge: https://developer.android.com/studio/command-line/adb
- Google Play Console: https://play.google.com/console
- Android Developer Docs: https://developer.android.com/
- Capacitor Android Guide: https://capacitorjs.com/docs/android

---

**Happy Testing! 📱**
