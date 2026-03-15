/**
 * Application Entry Point
 *
 * This is the main entry file for the React application.
 * It's the first JavaScript/TypeScript file that runs when the app loads.
 *
 * LEARNING NOTES:
 * - React 18+ uses `createRoot` instead of the older `ReactDOM.render`
 * - StrictMode is a development tool that helps identify potential problems
 * - The `!` after getElementById is TypeScript's non-null assertion operator
 */

// Polyfill for older browsers that don't support Object.hasOwn (ES2022)
if (!Object.hasOwn) {
  Object.hasOwn = function (obj: object, prop: PropertyKey) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

/**
 * Initialize and render the React application
 *
 * BREAKDOWN:
 * 1. document.getElementById('root') - Finds the HTML element with id="root" (defined in index.html)
 * 2. createRoot() - Creates a React root for rendering (React 18+ Concurrent Mode)
 * 3. render() - Renders the component tree into the root element
 * 4. StrictMode - Wrapper that activates additional checks and warnings in development
 *
 * StrictMode benefits:
 * - Identifies unsafe lifecycles
 * - Warns about deprecated APIs
 * - Detects unexpected side effects
 * - Only runs in development, removed in production builds
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
