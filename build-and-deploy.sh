#!/bin/bash

# Sri Lanka Hindu Temples - Build and Deploy Script
# This script handles cleaning, building, packaging, and deploying to mobile device

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_PACKAGE="srilankan.hindu.temples"
APK_BUILD_DIR="apk-builds"
KEYSTORE_PATH="my-release-key.keystore"
KEY_ALIAS="my-key-alias"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi

    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi

    # Check if adb is installed
    if ! command -v adb &> /dev/null; then
        log_error "ADB is not installed. Please install Android SDK platform tools."
        exit 1
    fi

    # Check if device is connected
    if ! adb devices | grep -q "device$"; then
        log_error "No Android device connected. Please connect your device and enable USB debugging."
        exit 1
    fi

    log_success "All dependencies are available"
}

clean_builds() {
    log_info "Cleaning previous builds..."

    # Clean npm cache
    npm cache clean --force 2>/dev/null || true

    # Clean Android build
    if [ -d "android" ]; then
        cd android
        ./gradlew clean 2>/dev/null || true
        cd ..
    fi

    # Remove old APK files
    if [ -d "$APK_BUILD_DIR" ]; then
        rm -f "$APK_BUILD_DIR"/*.apk
    else
        mkdir -p "$APK_BUILD_DIR"
    fi

    # Clean web build
    if [ -d "mobile/dist" ]; then
        rm -rf mobile/dist
    fi

    log_success "Clean completed"
}

build_web_app() {
    log_info "Building web application..."

    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm install
    fi

    # Build the web app
    npm run build

    if [ ! -d "mobile/dist" ]; then
        log_error "Web build failed - dist directory not created"
        exit 1
    fi

    log_success "Web application built successfully"
}

sync_to_android() {
    log_info "Syncing web assets to Android..."

    # Sync Capacitor
    npx cap sync android

    log_success "Assets synced to Android"
}

build_android_apk() {
    log_info "Building Android APK..."

    cd android

    # Build debug APK
    log_info "Building debug APK..."
    ./gradlew assembleDebug

    # Check if debug APK was created
    if [ ! -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
        log_error "Debug APK build failed"
        cd ..
        exit 1
    fi

    # Copy debug APK to builds directory
    cp app/build/outputs/apk/debug/app-debug.apk "../$APK_BUILD_DIR/"

    # Build release APK
    log_info "Building release APK..."
    ./gradlew assembleRelease

    # Check if release APK was created
    if [ ! -f "app/build/outputs/apk/release/app-release-unsigned.apk" ]; then
        log_error "Release APK build failed"
        cd ..
        exit 1
    fi

    # Copy release APK to builds directory
    cp app/build/outputs/apk/release/app-release-unsigned.apk "../$APK_BUILD_DIR/"

    cd ..
    log_success "Android APKs built successfully"
}

sign_release_apk() {
    log_info "Checking for APK signing..."

    RELEASE_APK="$APK_BUILD_DIR/app-release-unsigned.apk"
    SIGNED_APK="$APK_BUILD_DIR/app-release.apk"

    if [ -f "$RELEASE_APK" ] && [ -f "$KEYSTORE_PATH" ]; then
        log_info "Signing release APK..."

        # Sign the APK
        jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
            -keystore "$KEYSTORE_PATH" \
            "$RELEASE_APK" "$KEY_ALIAS"

        # Verify signature
        if jarsigner -verify -verbose "$RELEASE_APK" | grep -q "verified"; then
            log_success "APK signed successfully"
        else
            log_warning "APK signature verification failed"
        fi

        # Align the APK (optimization)
        if command -v zipalign &> /dev/null; then
            log_info "Optimizing APK with zipalign..."
            zipalign -v 4 "$RELEASE_APK" "$SIGNED_APK"
            log_success "APK optimized"
        else
            log_warning "zipalign not found, skipping optimization"
            cp "$RELEASE_APK" "$SIGNED_APK"
        fi
    else
        log_warning "Keystore or unsigned APK not found, skipping signing"
    fi
}

deploy_to_device() {
    log_info "Deploying to connected device..."

    # Check device connection again
    if ! adb devices | grep -q "device$"; then
        log_error "Device disconnected during build process"
        exit 1
    fi

    # Uninstall existing app (optional, uncomment if needed)
    # log_info "Uninstalling existing app..."
    # adb uninstall "$APP_PACKAGE" 2>/dev/null || true

    # Clear app data (optional, uncomment if needed)
    # log_info "Clearing app data..."
    # adb shell pm clear "$APP_PACKAGE" 2>/dev/null || true

    # Determine which APK to install (prefer signed release, fallback to debug)
    if [ -f "$APK_BUILD_DIR/app-release.apk" ]; then
        APK_TO_INSTALL="$APK_BUILD_DIR/app-release.apk"
        log_info "Installing signed release APK..."
    elif [ -f "$APK_BUILD_DIR/app-release-unsigned.apk" ]; then
        APK_TO_INSTALL="$APK_BUILD_DIR/app-release-unsigned.apk"
        log_info "Installing unsigned release APK..."
    elif [ -f "$APK_BUILD_DIR/app-debug.apk" ]; then
        APK_TO_INSTALL="$APK_BUILD_DIR/app-debug.apk"
        log_info "Installing debug APK..."
    else
        log_error "No APK found to install"
        exit 1
    fi

    # Install APK
    if adb install -r "$APK_TO_INSTALL"; then
        log_success "APK installed successfully"

        # Launch the app
        log_info "Launching app..."
        if adb shell am start -n "$APP_PACKAGE/.MainActivity"; then
            log_success "App launched successfully"
        else
            log_warning "App installed but failed to launch automatically"
        fi
    else
        log_error "APK installation failed"
        exit 1
    fi
}

show_summary() {
    log_success "Build and deploy completed successfully!"
    echo
    echo "📱 App Details:"
    echo "   Package: $APP_PACKAGE"
    echo "   Status: Installed and launched"
    echo
    echo "📂 Build outputs:"
    if [ -f "$APK_BUILD_DIR/app-debug.apk" ]; then
        echo "   Debug APK: $(du -h "$APK_BUILD_DIR/app-debug.apk" | cut -f1)"
    fi
    if [ -f "$APK_BUILD_DIR/app-release.apk" ]; then
        echo "   Release APK: $(du -h "$APK_BUILD_DIR/app-release.apk" | cut -f1)"
    fi
    echo
    echo "🔧 Useful commands:"
    echo "   View logs: adb logcat -v threadtime"
    echo "   Restart app: adb shell am start -n $APP_PACKAGE/.MainActivity"
    echo "   Uninstall: adb uninstall $APP_PACKAGE"
}

main() {
    echo
    echo "🏗️  Sri Lanka Hindu Temples - Build & Deploy"
    echo "═══════════════════════════════════════════════"
    echo

    check_dependencies
    clean_builds
    build_web_app
    sync_to_android
    build_android_apk
    sign_release_apk
    deploy_to_device
    show_summary

    echo
    echo "🎉 Build and deploy process completed!"
    echo
}

# Handle command line arguments
case "${1:-all}" in
    "clean")
        clean_builds
        log_success "Clean completed"
        ;;
    "build")
        check_dependencies
        build_web_app
        sync_to_android
        build_android_apk
        sign_release_apk
        log_success "Build completed"
        ;;
    "deploy")
        check_dependencies
        deploy_to_device
        ;;
    "all"|*)
        main
        ;;
esac
