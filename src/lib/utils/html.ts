/**
 * Strip HTML tags from a string and return plain text
 */
export function stripHtmlTags(html: string): string {
  if (typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Get a text preview from HTML content, stripping tags and limiting length
 */
export function getTextPreview(html: string, maxLength: number = 200): string {
  const text = stripHtmlTags(html);
  return text.substring(0, maxLength);
}

