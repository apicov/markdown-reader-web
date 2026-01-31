/**
 * Application-wide constants and configuration values
 */

// ============================================================================
// CHUNK LOADING & PAGINATION
// ============================================================================

/** Size of each markdown chunk in characters (25KB) */
export const CHUNK_SIZE = 25000;

/** Number of chunks to load initially around saved position */
export const INITIAL_CHUNK_COUNT = 3;

/** Debounce time in milliseconds for scroll-triggered chunk loading */
export const CHUNK_LOAD_DEBOUNCE_MS = 2000;

// ============================================================================
// SCROLL & POSITION RESTORATION
// ============================================================================

/** Auto-save scroll position interval in milliseconds */
export const AUTO_SAVE_INTERVAL_MS = 3000;

/** Delay before restoring scroll position after content loads (ms) */
export const SCROLL_RESTORE_DELAY_MS = 300;

/** Distance from top/bottom to trigger chunk loading (as fraction of viewport height) */
export const SCROLL_TRIGGER_DISTANCE_RATIO = 0.2;

/** Scroll percentage threshold for "near bottom" detection */
export const SCROLL_NEAR_BOTTOM_THRESHOLD = 0.90;

/** Scroll percentage threshold for "near top" detection */
export const SCROLL_NEAR_TOP_THRESHOLD = 0.10;

/** Debounce time for scroll event handler (ms) */
export const SCROLL_DEBOUNCE_MS = 300;

// ============================================================================
// TEXT SELECTION & TRANSLATION
// ============================================================================

/** Delay before capturing text selection to ensure full selection (ms) */
export const SELECTION_CAPTURE_DELAY_MS = 500;

/** Default target language for translation */
export const DEFAULT_TARGET_LANGUAGE = 'Spanish';

/** LLM API request timeout in milliseconds */
export const LLM_API_TIMEOUT_MS = 10000;

/** LLM temperature for translation requests (0-1, lower = more deterministic) */
export const LLM_TEMPERATURE = 0.3;

// ============================================================================
// FONT SIZES
// ============================================================================

/** Default font size in pixels */
export const DEFAULT_FONT_SIZE = 16;

/** Minimum allowed font size */
export const MIN_FONT_SIZE = 10;

/** Maximum allowed font size */
export const MAX_FONT_SIZE = 32;

/** Font size increment/decrement step */
export const FONT_SIZE_STEP = 2;

/** Font size multipliers for headings */
export const FONT_SIZE_MULTIPLIERS = {
  h1: 1.8,
  h2: 1.5,
  h3: 1.3,
  body: 1.0,
  code: 0.9,
  lineHeight: 1.6,
};

// ============================================================================
// IMAGE LOADING
// ============================================================================

/** Number of images to load simultaneously in a batch */
export const IMAGE_BATCH_SIZE = 2;

/** Delay between image batches to prevent UI freezing (ms) */
export const IMAGE_BATCH_DELAY_MS = 50;

// ============================================================================
// UI & LAYOUT
// ============================================================================

/** Standard horizontal padding (px) */
export const STANDARD_PADDING = 16;

/** Tap zone width for page navigation (px) */
export const TAP_ZONE_WIDTH = 40;

/** Modal overlay background opacity */
export const MODAL_OVERLAY_OPACITY = 0.7;

// ============================================================================
// STORAGE KEYS
// ============================================================================

/** Storage key for reading positions */
export const STORAGE_KEY_READING_POSITIONS = 'readingPositions';

/** Storage key for app settings */
export const STORAGE_KEY_APP_SETTINGS = 'appSettings';

/** Storage key for documents cache */
export const STORAGE_KEY_DOCUMENTS_CACHE = '@documents_cache';

// ============================================================================
// ZOOM CONSTRAINTS
// ============================================================================

/** Minimum zoom scale for image modal */
export const MIN_IMAGE_ZOOM = 1;

/** Maximum zoom scale for image modal */
export const MAX_IMAGE_ZOOM = 5;
