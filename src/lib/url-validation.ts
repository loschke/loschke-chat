/**
 * URL validation to prevent SSRF attacks.
 * Blocks internal IPs, localhost, and cloud metadata endpoints.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
  "metadata.google.internal",
]);

const PRIVATE_IP_RANGES = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/, // Link-local / AWS metadata
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // Loopback range
  /^0\.0\.0\.0$/,
];

/** Extract hostname from a URL string, returns fallback on invalid input. */
export function safeDomain(
  url: string | undefined,
  fallback = "Website",
): string {
  if (!url) return fallback;
  try {
    return new URL(url).hostname;
  } catch {
    return fallback;
  }
}

export function isAllowedUrl(input: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return false;
  }

  // Only allow http and https
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  // Block known internal hostnames
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return false;
  }

  // Block private IP ranges
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(hostname)) {
      return false;
    }
  }

  // Block IPs encoded as decimal (e.g., http://2130706433 = 127.0.0.1)
  if (/^\d+$/.test(hostname)) {
    return false;
  }

  // Block IPv6 shorthand that could resolve to loopback
  if (hostname.startsWith("[")) {
    return false;
  }

  // Block internal TLDs
  if (hostname.endsWith(".internal") || hostname.endsWith(".local")) {
    return false;
  }

  return true;
}
