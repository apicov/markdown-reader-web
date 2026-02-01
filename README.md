# Markdown Reader

A markdown reader application with spaced repetition learning features built with React, Vite, and Capacitor.

## Prerequisites

- Node.js and npm
- Android Studio (for Android builds)
- Java Development Kit (JDK) 17 or higher

## Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

## Building

### Web Build

```bash
npm run build
```

The build output will be in the `dist` directory.

## Capacitor (Mobile)

### Initial Setup

If you haven't initialized Capacitor platforms yet:

```bash
npx cap add android
npx cap add ios
```

### Sync Web Build to Native Projects

After building the web application, sync the changes to native projects:

```bash
npm run build
npx cap sync
```

### Open in Android Studio

```bash
npx cap open android
```

### Build Android APK

#### Using Android Studio

1. Open the project in Android Studio: `npx cap open android`
2. Select Build > Build Bundle(s) / APK(s) > Build APK(s)
3. The APK will be generated in `android/app/build/outputs/apk/`

#### Using Gradle Wrapper (gradlew)

From the project root:

```bash
cd android
./gradlew assembleDebug
```

For release build:

```bash
./gradlew assembleRelease
```

The APK will be located at:
- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

### Install APK with ADB

#### Install Debug APK

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

#### Install Release APK

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

#### Install with Replacement (if app already exists)

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

#### Check Connected Devices

```bash
adb devices
```

#### Uninstall App

```bash
adb uninstall com.markdownreader.app
```

## Project Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build locally

## Tech Stack

- React 19
- TypeScript
- Vite
- Material-UI (MUI)
- Capacitor 8
- PouchDB
- React Markdown
- KaTeX (math rendering)
- ts-fsrs (spaced repetition algorithm)
