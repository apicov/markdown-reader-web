# Markdown Reader Web

A modern, performant React + Capacitor application for reading large markdown documents with advanced features like LaTeX rendering, table of contents navigation, and LLM-powered translation.

This is the **web + mobile** version of the Markdown Reader app, converted from Expo/React Native to pure React with Capacitor for mobile deployment.

## ✨ Features

### Core Reading Features
- 📱 **Cross-Platform** - Works on Web, Android, and iOS
- 📄 **Large Document Support** - Efficient rendering of multi-MB markdown files
- 📚 **Table of Contents** - Hierarchical navigation tree
- 🎯 **Reading Position Memory** - Always return to where you left off
- 🔍 **Smart Scrolling** - Smooth navigation through documents

### Content Rendering
- ✅ **Rich Markdown** - Full GFM support (tables, task lists, strikethrough)
- 🧮 **LaTeX/Math** - Beautiful equation rendering with KaTeX
- 🎨 **Syntax Highlighting** - Code blocks with proper formatting
- 🖼️ **Images** - Support for local and remote images

### Customization
- 🌙 **Dark Mode** - Red text on black background for night reading
- 🔤 **Adjustable Font** - Slider control for font size (10-32px)
- 🎨 **Material-UI** - Clean, modern interface

### Advanced Features
- 🌐 **LLM Translation** - Select text for instant translation
- ⚡ **Performance Optimized** - Lazy loading, caching, efficient rendering
- 💾 **Smart Caching** - Faster startup with cached document data

## 🚀 Quick Start

### Installation

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev
\`\`\`

The app will open at \`http://localhost:5173\`

## 📱 Building for Mobile

### Android

\`\`\`bash
npm run build
npx cap sync android
npx cap open android
\`\`\`

### iOS

\`\`\`bash
npm run build
npx cap sync ios
npx cap open ios
\`\`\`

## 🛠️ Technologies

- **React 18** + **TypeScript**
- **Material-UI v6** - Component library and theming
- **Capacitor** - Native mobile wrapper
- **react-markdown** - Markdown rendering
- **KaTeX** - LaTeX math rendering
- **Vite** - Build tool

## 📄 License

MIT License
