# Sri Lanka Hindu Temples - Mobile APK Build Information

## Build Summary
**Build Date**: November 13, 2025  
**Build Status**: ✅ SUCCESS  
**Build Tool**: Android Gradle (Capacitor)

## APK Files Generated

### Release Build
- **File**: `app-release-unsigned.apk`
- **Location**: `android/app/build/outputs/apk/release/`
- **Size**: 3.1 MB
- **Status**: Unsigned (requires signing before publishing to Play Store)

### Debug Build
- **File**: `app-debug.apk`
- **Location**: `android/app/build/outputs/apk/debug/`
- **Size**: 4.0 MB
- **Status**: Debuggable (suitable for testing on devices/emulators)

## Build Configuration

### App Details
- **App ID**: `srilankan.hindu.temples`
- **App Name**: Sri Lanka Hindu Temples
- **Version Code**: 1
- **Version Name**: 1.0.0

### Android Configuration
- **Compile SDK**: 35
- **Target SDK**: 35
- **Min SDK**: 24 (Android 7.0)
- **Namespace**: `srilankan.hindu.temples`

### Framework Stack
- **React**: 18.2.0
- **React Leaflet**: 4.2.1 (Mapping library)
- **Capacitor**: 7.4.3 (React to Native bridge)
- **Vite**: 5.4.20 (Build tool)

## Features Included

### Offline Functionality
✅ Offline map browsing with cached tiles  
✅ Offline status indicator bar  
✅ Auto-reload when connection restored  
✅ Map dragging enabled offline (zoom disabled)

### Map Features
✅ Interactive OpenStreetMap integration  
✅ Temple markers with location information  
✅ Temple search by name with dropdown suggestions  
✅ Fly-to animation for selected temples  
✅ Temple detail view with images and information

### User Interaction
✅ Add comments to temples  
✅ Suggest alternative temple names  
✅ Real-time feedback messages  
✅ Responsive UI for mobile devices

## Installation Instructions

### For Testing (Debug APK)
1. Enable Developer Mode on your Android device
2. Enable USB Debugging
3. Connect device via USB
4. Run: `adb install apk-builds/app-debug.apk`
5. Or manually install by transferring the APK file

### For Production Release (Release APK)
1. **Sign the APK** (required for Play Store):
   ```bash
   jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
     -keystore my-release-key.keystore \
     app-release-unsigned.apk my-key-alias
   ```

2. **Align the APK** (optimize for package manager):
   ```bash
   zipalign -v 4 app-release-unsigned.apk app-release.apk
   ```

3. **Upload to Google Play Console** for distribution

## Build Process Steps Executed

```
1. ✅ Web Asset Build (Vite)
   - React components compiled
   - CSS bundled and minified
   - JavaScript minified and tree-shook
   - Output: dist/ directory (339 KB total)

2. ✅ Capacitor Sync
   - Web assets copied to Android project
   - capacitor.config.json created
   - Android plugins updated

3. ✅ Gradle Build
   - Java compilation
   - DEX generation
   - Resources processed
   - APK packaging
   - Build time: 1m 59s
```

## File Locations

- **Debug APK**: `apk-builds/app-debug.apk`
- **Release APK**: `apk-builds/app-release-unsigned.apk`
- **Source Code**: `mobile/src/`
- **Build Output**: `android/app/build/outputs/apk/`
- **Web Assets**: `mobile/dist/`

## Bundle Composition

### Web Assets (339 KB)
- HTML: 0.47 KB
- CSS: 26.06 KB (gzipped: 7.94 KB)
- JavaScript: 313.08 KB (gzipped: 96.12 KB)

### Native Components
- Capacitor Bridge
- Android Framework Libraries
- Plugin Dependencies

## Performance Metrics

- **Build Time**: ~2 minutes
- **APK Size**: 3.1-4.0 MB (depending on build type)
- **Min Android Version**: API 24 (Android 7.0)
- **Target Android Version**: API 35

## Next Steps for Release

1. **Sign the APK** with your release keystore
2. **Test on physical devices** (various Android versions)
3. **Upload to Google Play Console**
4. **Configure App Store Listing** (description, screenshots, etc.)
5. **Set Pricing and Distribution** (countries, device compatibility)
6. **Submit for Review** on Google Play

## Troubleshooting

### APK Won't Install
- Ensure debug mode is enabled (for debug APK)
- Check device storage space
- Verify Android version compatibility (min API 24)

### App Crashes on Launch
- Check Android logs: `adb logcat`
- Verify capacitor.config.json is properly synced
- Ensure web assets are in correct location

### Build Failures
- Clean build: `./gradlew clean`
- Sync again: `npx cap sync android`
- Check Java version compatibility

## Support & Resources

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Android Build Docs**: https://developer.android.com/build
- **Google Play Console**: https://play.google.com/console
- **Repository**: https://github.com/rajkumaran80/srilanka-hindu-temples

---

**Built with ❤️ for Sri Lanka Hindu Temples**
