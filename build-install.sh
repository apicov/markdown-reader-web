#!/bin/bash
# Build and install the Android app for local testing

set -e  # Exit on error

echo "Building frontend..."
npx tsc -b && npx vite build

echo "Syncing to Capacitor..."
npx cap sync

echo "Building APK..."
cd android
./gradlew assembleDebug

echo "Installing..."
adb install -r app/build/outputs/apk/debug/app-debug.apk

echo "Done!"
cd -
