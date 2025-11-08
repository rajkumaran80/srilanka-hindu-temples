The commands executed for packaging the Android APK are:

1. `cd mobile && npm run build` - Builds the web assets
2. `npx cap sync android` - Syncs the web assets to the Android project
3. `cd android && ./gradlew assembleDebug` - Builds the unsigned debug APK
