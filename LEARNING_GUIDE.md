# 📚 Learning Guide: React & Capacitor

Welcome! This codebase is now extensively commented to help you learn React and Capacitor development.

## 🎯 What You'll Learn

### React Concepts
- **Functional Components** - Modern React component syntax
- **Hooks** - useState, useEffect, useCallback, useMemo, useContext
- **Custom Hooks** - Building reusable logic (useDialog, useTranslation)
- **Context API** - Global state without prop drilling
- **Conditional Rendering** - Showing/hiding components based on state
- **State Management** - Local state, lifted state, global state
- **Component Composition** - Building UIs from small pieces

### TypeScript with React
- **Type Safety** - Interfaces, types, generics
- **Props Typing** - Defining component prop types
- **Generic Hooks** - Building flexible, reusable hooks
- **Type Inference** - Letting TypeScript figure out types
- **Utility Types** - Partial, Pick, Omit, etc.

### Capacitor Integration
- **Cross-Platform APIs** - Same code, multiple platforms
- **Preferences API** - Persistent storage (replaces localStorage)
- **Filesystem API** - Reading files on mobile devices
- **Plugin System** - Bridging JavaScript to native code
- **Platform Detection** - Web vs. mobile behavior

### Material-UI (MUI)
- **Component Library** - Pre-built React components
- **Theming** - Creating consistent designs
- **Responsive Design** - Mobile-first layouts
- **Icons** - Using Material Icons

### Architecture Patterns
- **Service Layer** - Separating business logic from UI
- **Provider Pattern** - Wrapping app with functionality
- **Custom Hook Pattern** - Extracting component logic
- **Error Handling** - Graceful degradation, user-friendly messages

## 📂 Where to Start

### 1. **Entry Point** → [src/main.tsx](src/main.tsx)
Start here to see how the app initializes. This file:
- Sets up the root React element
- Uses `createRoot` (React 18+)
- Wraps app in `StrictMode`

**Key Concepts:** `createRoot`, `StrictMode`, DOM mounting

---

### 2. **Main App** → [src/App.tsx](src/App.tsx)
The root component that manages navigation. Learn about:
- Manual routing with state (simpler than react-router for learning)
- Provider composition (wrapping with Context providers)
- Conditional rendering
- Callback props for communication

**Key Concepts:** `useState`, conditional rendering, props, callbacks

---

### 3. **Context Providers** → [src/contexts/](src/contexts/)

#### [ThemeContext.tsx](src/contexts/ThemeContext.tsx)
Learn the Context API pattern:
- Creating a Context
- Building a Provider component
- Creating a custom hook for consumption
- Using `useMemo` for performance
- Integrating with Material-UI theming

**Key Concepts:** `createContext`, `useContext`, custom hooks, `useMemo`

#### [SettingsContext.tsx](src/contexts/SettingsContext.tsx)
Similar to ThemeContext but with:
- Object state (vs. boolean)
- Partial updates pattern
- Default value merging
- Persistent storage integration

**Key Concepts:** `Partial<T>`, spread operator, async state updates

---

### 4. **Custom Hooks** → [src/hooks/](src/hooks/)

#### [useDialog.ts](src/hooks/useDialog.ts)
Reusable dialog state management:
- TypeScript generics in hooks
- `useCallback` for performance
- Managing multiple related pieces of state
- Async form submission handling

**Key Concepts:** Generics, `useCallback`, form patterns

#### [useTranslation.ts](src/hooks/useTranslation.ts)
Real-world API integration:
- HTTP requests with `fetch` API
- Error handling (network, HTTP, parsing)
- Configuration validation
- Loading states
- User-friendly error messages

**Key Concepts:** `fetch`, async/await, error handling, HTTP status codes

---

### 5. **Capacitor Integration** → [src/plugins/](src/plugins/) & [src/services/storageService.ts](src/services/storageService.ts)

#### [documentProvider.ts](src/plugins/documentProvider.ts)
Learn about Capacitor plugins:
- Plugin interface definition
- Registering plugins
- Platform-specific implementations
- Web fallbacks for development

**Key Concepts:** Capacitor plugins, platform bridges, TypeScript interfaces

#### [storageService.ts](src/services/storageService.ts)
Cross-platform storage:
- Capacitor Preferences API
- Service layer pattern
- Generic functions with TypeScript
- JSON serialization/deserialization

**Key Concepts:** Service pattern, generics, async storage

---

### 6. **Components** → [src/components/](src/components/)
Browse the component files to see everything in action:
- `DocumentListScreen.tsx` - List rendering, file picking
- `MarkdownReader.tsx` - Markdown rendering, text selection
- `DecksScreen.tsx` - CRUD operations, dialogs
- `ReviewScreen.tsx` - Spaced repetition algorithm
- `SettingsScreen.tsx` - Form handling, validation

---

## 🛠️ Development Workflow

### Running the App

```bash
# Install dependencies
npm install

# Run in browser (web development)
npm run dev

# Build for production
npm run build

# Run on Android
npx cap sync android
npx cap open android

# Run on iOS
npx cap sync ios
npx cap open ios
```

### Learning Path

1. **Week 1: React Basics**
   - Read through `main.tsx`, `App.tsx`
   - Understand components, props, state
   - Try modifying the navigation logic

2. **Week 2: Context & Hooks**
   - Study `ThemeContext.tsx`, `SettingsContext.tsx`
   - Understand `useDialog.ts`
   - Try creating your own custom hook

3. **Week 3: API Integration**
   - Read `useTranslation.ts` thoroughly
   - Understand the fetch API flow
   - Try adding your own API call

4. **Week 4: Capacitor**
   - Study `storageService.ts`
   - Read `documentProvider.ts`
   - Try using another Capacitor plugin

5. **Week 5+: Build Features**
   - Add a new screen
   - Create a new custom hook
   - Integrate a new Capacitor plugin

---

## 📖 Key Patterns to Study

### 1. **Custom Hook Pattern**
```typescript
// Extract reusable logic
export function useMyHook() {
  const [state, setState] = useState();
  // ... logic
  return { state, actions };
}
```

### 2. **Context Provider Pattern**
```typescript
const MyContext = createContext();
export const MyProvider = ({ children }) => {
  // state & logic
  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
};
export const useMyContext = () => useContext(MyContext);
```

### 3. **Service Layer Pattern**
```typescript
// services/myService.ts
export const fetchData = async () => {
  // API logic isolated from components
};
```

### 4. **Conditional Rendering**
```typescript
{isLoading && <Spinner />}
{error && <ErrorMessage />}
{data && <Content data={data} />}
```

### 5. **Optimistic Updates**
```typescript
// Update UI immediately
setState(newValue);
// Save in background
await saveToBackend(newValue);
```

---

## 🚀 Challenges to Try

1. **Add a new theme color** - Modify `ThemeContext.tsx`
2. **Create a "favorites" feature** - New context, new storage key
3. **Add a loading skeleton** - Learn about loading states
4. **Build a search feature** - Filter documents by name
5. **Add dark/light mode toggle button** - Use the existing `useTheme()` hook
6. **Create a settings export/import** - Practice file handling
7. **Add a new Capacitor plugin** - Try Camera or Geolocation

---

## 📚 Additional Resources

### React
- [React Docs (official)](https://react.dev/)
- [TypeScript + React Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### Capacitor
- [Capacitor Docs](https://capacitorjs.com/docs)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)

### Material-UI
- [MUI Documentation](https://mui.com/material-ui/)
- [MUI Component API](https://mui.com/material-ui/api/button/)

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)

---

## 💡 Tips for Learning

1. **Read the comments** - Every file has extensive educational comments
2. **Follow the imports** - See how files connect to each other
3. **Use TypeScript's IntelliSense** - Hover over code to see types
4. **Experiment** - Change values, break things, see what happens
5. **Use console.log** - Add logging to understand execution flow
6. **Read error messages** - TypeScript errors are very informative
7. **Start small** - Don't try to understand everything at once
8. **Build something** - The best way to learn is by doing

---

## 🎓 Understanding the App Flow

```
User opens app
    ↓
main.tsx renders <App />
    ↓
App.tsx wraps everything in ThemeProvider & SettingsProvider
    ↓
Providers load saved preferences from storage
    ↓
App shows DocumentListScreen (default)
    ↓
User clicks "Select Folder" → Capacitor FilePicker
    ↓
User selects document → App navigates to MarkdownReader
    ↓
User selects text → useTranslation hook calls LLM API
    ↓
Translation shown in dialog
```

---

## 🤔 Common Questions

**Q: Why use Context instead of props?**
A: To avoid "prop drilling" - passing props through many intermediate components.

**Q: When should I use `useCallback`?**
A: When passing functions as props to child components, to prevent unnecessary re-renders.

**Q: What's the difference between `useState` and `useRef`?**
A: `useState` triggers re-renders when changed; `useRef` doesn't.

**Q: Why are Capacitor functions async?**
A: Native operations (file I/O, storage, etc.) can be slow, so they're asynchronous.

**Q: Should I use class or functional components?**
A: Functional components (with hooks) are the modern standard.

---

Happy Learning! 🎉

Start with the entry point ([src/main.tsx](src/main.tsx)) and follow the comments.
Feel free to modify anything - the best way to learn is by breaking things!
