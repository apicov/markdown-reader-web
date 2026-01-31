# Quick Start Guide

## ✅ What's Working

Both critical features are now fully implemented:

1. **✅ File Picker for Web** - Click "Pick Folder" to select a directory
2. **✅ Text Selection Translation** - Select any text to translate it

## 🚀 Running the App

### Web (Recommended for Testing)

```bash
cd markdown-reader-web
npm run dev
```

Then open http://localhost:5173

### How to Use on Web:

1. **Pick a folder**: Click the "Pick Folder" button
2. **Grant permission**: Your browser will ask for folder access
3. **Select your markdown folder**: Choose a folder containing subdirectories with .md files
4. **Browse documents**: Click on any document to open it
5. **Select text to translate**: Highlight any text and it will automatically translate (if configured)

### Mobile (Android)

```bash
npm run build
npx cap sync android
npx cap open android
```

Then build and run in Android Studio.

## 📝 File Structure for Documents

Your markdown documents should be organized like this:

```
my-documents/
├── Document1/
│   ├── chapter1.md
│   └── image1.png
├── Document2/
│   ├── content.md
│   └── diagram.jpg
└── Document3/
    └── notes.md
```

Each subdirectory represents one document.

## 🌐 Translation Setup

To enable translation:

1. Click the ⚙️ Settings icon
2. Enable "Translation Feature"
3. Enter your LLM API details:
   - **API URL**: `https://api.openai.com/v1/chat/completions`
   - **API Key**: Your OpenAI/Groq key
   - **Model**: `gpt-4` or `llama-3.3-70b-versatile`
   - **Target Language**: `Spanish`, `French`, etc.
4. Save settings

Now when you select text in a document, it will automatically translate!

## 🎨 Features

- **📁 File Picker**: Modern File System Access API (Chrome/Edge)
- **📖 Markdown Rendering**: Full GFM support with code highlighting
- **🧮 LaTeX Math**: Beautiful equations with KaTeX
- **📚 Table of Contents**: Hierarchical navigation
- **🌙 Dark Mode**: Toggle with the moon/sun icon
- **🔤 Font Size**: Adjust with the Aa button
- **🌐 Translation**: Select text to translate
- **💾 Auto-save**: Reading position saved automatically

## 🔧 Browser Compatibility

**File Picker requires:**
- Chrome 86+
- Edge 86+
- Safari 15.2+ (limited support)

Firefox doesn't support File System Access API yet. Use Chrome or Edge for best experience.

## ⚡ Performance Tips

The app caches:
- ✅ Document structure (TOC)
- ✅ File handles (no re-picking needed)
- ✅ Reading positions

All cached data persists across sessions!

## 🐛 Troubleshooting

**"Pick Folder" button doesn't work?**
- Use Chrome or Edge browser
- Make sure you're on HTTPS or localhost
- Check browser console for errors

**Documents not showing?**
- Make sure each folder contains at least one .md file
- Check folder structure matches the example above

**Translation not working?**
- Verify API settings in Settings screen
- Check browser console for errors
- Make sure you have internet connection

**Images not loading?**
- Images must be in the same folder as the markdown file
- Use relative paths in markdown: `![alt](image.png)`

## 📱 Mobile Notes

On Android:
- Use Settings to set document path (e.g., `/sdcard/Documents/MarkdownDocs`)
- Grant file permission when prompted
- File picker not needed (uses native filesystem)

## 🎉 Enjoy!

The app is now **fully functional** with all core features working!
