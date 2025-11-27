Here are all the commands executed to clean all builds and create a fresh signed AAB file:

### __1. Clean Android Build Directory__

```bash
cd android && ./gradlew clean
```

### __2. Clean APK Builds Directory__

```bash
rm -rf apk-builds/*
```

### __3. Build Web Assets__

```bash
cd mobile && npm run build
```

### __4. Sync Capacitor Assets__

```bash
npx cap sync android
```

### __5. Build AAB Bundle__

```bash
cd android && ./gradlew bundleRelease
```

### __6. Copy AAB to Signing Directory__

```bash
cp android/app/build/outputs/bundle/release/app-release.aab apk-builds/app-release-unsigned.aab
```

### __7. Sign the AAB File__

```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore my-release-key.keystore -storepass password -keypass password -signedjar apk-builds/app-release-signed.aab apk-builds/app-release-unsigned.aab my-key-alias
```

### __8. Verify AAB Signature__

```bash
jarsigner -verify -verbose -certs apk-builds/app-release-signed.aab | tail -10
```

### __9. Check Final File Size__

```bash
ls -la apk-builds/app-release-signed.aab
```

---

__Result__: `apk-builds/app-release-signed.aab` (3.12 MB) - Ready for Google Play Store upload! ✅
