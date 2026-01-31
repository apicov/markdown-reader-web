/**
 * Table of Contents Service
 *
 * Provides utilities for extracting and processing table of contents from markdown.
 * Handles heading parsing, text cleaning, and hierarchical structure detection.
 */

/**
 * Represents a single item in the table of contents
 */
export interface TocItem {
  /** Heading level (1-6 corresponding to h1-h6) */
  level: number;
  /** Cleaned heading text without markdown formatting */
  text: string;
  /** Unique identifier for navigation (e.g., "heading-0") */
  id: string;
  /** Whether this heading has child headings beneath it */
  hasChildren?: boolean;
}

/**
 * Extract table of contents from markdown content
 *
 * Parses markdown to find all headings (h1-h6), cleans their text,
 * assigns unique IDs, and marks items that have children.
 *
 * @param markdown - Full markdown content to parse
 * @returns Array of TOC items in document order
 *
 * @example
 * const markdown = `
 * # Main Title
 * ## Subsection
 * ### Detail
 * ## Another Section
 * `;
 * const toc = extractTableOfContents(markdown);
 * // Returns 4 items with properly nested structure
 */
export const extractTableOfContents = (markdown: string): TocItem[] => {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const toc: TocItem[] = [];
  let match;
  let index = 0;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const rawText = match[2].trim();
    const cleanText = cleanHeadingText(rawText);

    const id = `heading-${index++}`;
    toc.push({ level, text: cleanText, id });
  }

  // Mark items that have children (for expand/collapse UI)
  for (let i = 0; i < toc.length; i++) {
    const currentLevel = toc[i].level;
    // Check if next item is a child (has higher level number = deeper nesting)
    if (i + 1 < toc.length && toc[i + 1].level > currentLevel) {
      toc[i].hasChildren = true;
    }
  }

  return toc;
};

/**
 * Clean markdown formatting from heading text
 *
 * Removes:
 * - Bold/italic markers (**text**, *text*, __text__, _text_)
 * - Inline code backticks (`code`)
 * - Links ([text](url))
 * - HTML tags
 * - HTML entities (&nbsp;, &lt;, etc.)
 *
 * @param text - Raw heading text with markdown formatting
 * @returns Clean text without any markdown syntax
 *
 * @example
 * cleanHeadingText('**Bold** and *italic* and `code`')
 * // Returns: 'Bold and italic and code'
 */
export const cleanHeadingText = (text: string): string => {
  let cleaned = text;

  // Remove bold/italic
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');  // **bold**
  cleaned = cleaned.replace(/\*(.+?)\*/g, '$1');      // *italic*
  cleaned = cleaned.replace(/__(.+?)__/g, '$1');      // __bold__
  cleaned = cleaned.replace(/_(.+?)_/g, '$1');        // _italic_

  // Remove inline code
  cleaned = cleaned.replace(/`(.+?)`/g, '$1');        // `code`

  // Remove links but keep text
  cleaned = cleaned.replace(/\[(.+?)\]\(.+?\)/g, '$1'); // [text](url)

  // Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&quot;/g, '"');

  return cleaned.trim();
};

/**
 * Check if a TOC item should be visible based on parent expansion state
 *
 * Used for implementing collapsible TOC tree navigation.
 * An item is visible if:
 * 1. It's a top-level heading (no parent), OR
 * 2. All its ancestors are expanded
 *
 * @param index - Index of the item to check
 * @param tocItems - Full TOC array
 * @param expandedItems - Set of indices that are currently expanded
 * @returns True if item should be shown, false if hidden
 *
 * @example
 * // TOC structure:
 * // 0: # Level 1 (expanded)
 * // 1:   ## Level 2 (collapsed)
 * // 2:     ### Level 3
 * shouldShowTocItem(2, toc, new Set([0])) // false (parent 1 not expanded)
 * shouldShowTocItem(2, toc, new Set([0, 1])) // true (all parents expanded)
 */
export const shouldShowTocItem = (
  index: number,
  tocItems: TocItem[],
  expandedItems: Set<number>
): boolean => {
  if (index === 0) return true;

  const currentLevel = tocItems[index].level;

  // Find the parent (previous item with lower level)
  for (let i = index - 1; i >= 0; i--) {
    if (tocItems[i].level < currentLevel) {
      // Found parent, check if it's expanded and visible
      return expandedItems.has(i) && shouldShowTocItem(i, tocItems, expandedItems);
    }
  }

  // No parent found (top level item)
  return true;
};

/**
 * Find all headings in markdown and return their positions
 *
 * Useful for navigation - maps heading IDs to character positions in the document.
 *
 * @param markdown - Full markdown content
 * @returns Map of heading ID to character position
 *
 * @example
 * const positions = getHeadingPositions(markdown);
 * const heading5Position = positions.get('heading-5');
 * // Returns character offset where heading-5 appears
 */
export const getHeadingPositions = (markdown: string): Map<string, number> => {
  const headingRegex = /^#{1,6}\s+.+$/gm;
  const positions = new Map<string, number>();
  const matches = [...markdown.matchAll(headingRegex)];

  matches.forEach((match, index) => {
    const headingId = `heading-${index}`;
    const position = match.index ?? 0;
    positions.set(headingId, position);
  });

  return positions;
};
