const HTML_TAG_REGEX = /<[^>]+>/g;

/** Strip HTML tags and normalize line endings. */
export function sanitizeText(input: string): string {
  return input
    .replace(HTML_TAG_REGEX, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
}
