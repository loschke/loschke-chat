## 2026-04-06 - Timing Attack in Cron Auth
**Vulnerability:** The CRON_SECRET auth token was compared using strict equality (`!==`), which leaks timing information and enables timing attacks to forge the secret.
**Learning:** Standard string comparison operators leak information about how much of the string matched.
**Prevention:** Always use constant-time comparison methods (like `timingSafeCompare` built over `crypto.timingSafeEqual`) when checking tokens, secrets, or passwords.
