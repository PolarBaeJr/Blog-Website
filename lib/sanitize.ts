import DOMPurify from 'isomorphic-dompurify';

/**
 * Allowed HTML tags for blog post content.
 * Includes formatting, headings, lists, media, and structural elements.
 */
const ALLOWED_TAGS = [
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'em', 'u', 's',
  'ul', 'ol', 'li',
  'a', 'img',
  'blockquote', 'code', 'pre',
  'br', 'hr',
  'span', 'div',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

/**
 * Allowed HTML attributes for blog post content.
 * Only safe attributes are permitted — no event handlers.
 */
const ALLOWED_ATTR = [
  'href', 'target', 'rel',      // for <a>
  'src', 'alt', 'width', 'height', // for <img>
  'class',                        // for styling
];

/**
 * Sanitize HTML content using DOMPurify.
 * Strips all script tags, event handlers, and unsafe elements.
 * Only allows safe tags and attributes for blog post content.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Strip all HTML tags from a string, returning plain text.
 * Useful for sanitizing settings inputs and comment content.
 */
export function stripHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}
