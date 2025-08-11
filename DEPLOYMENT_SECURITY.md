# Deployment Security Guide

This app applies a strict CSP via a meta tag at runtime for client-side protection. Some directives (notably `frame-ancestors`) are ignored when delivered via meta. To fully secure your deployment, set security headers at the edge (hosting/CDN) level.

Key recommendations
- Move `frame-ancestors` to an HTTP response header (server-side). The runtime CSP meta strips it to avoid console warnings.
- Define a Permissions-Policy (or Feature-Policy) that only enables features you use.
- Enable HSTS, Referrer-Policy, and X-Content-Type-Options.
- Configure a CSP report endpoint to collect violations (optional but recommended).

1) Example security headers (Nginx)
add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" always;
add_header Content-Security-Policy "frame-ancestors 'self' https://yourdomain.com" always;  # Must be in HTTP header
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Content-Type-Options "nosniff" always;

2) Example (Vercel)
- In vercel.json:
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" },
        { "key": "Content-Security-Policy", "value": "frame-ancestors 'self' https://yourdomain.com" },
        { "key": "Permissions-Policy", "value": "geolocation=(), microphone=(), camera=()" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}

3) Example (Netlify)
In netlify.toml:
[[headers]]
  for = "/"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co; base-uri 'self'; form-action 'self'; upgrade-insecure-requests"
[[headers]]
  for = "/"
  [headers.values]
    Content-Security-Policy = "frame-ancestors 'self' https://yourdomain.com"
[[headers]]
  for = "/"
  [headers.values]
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"

4) CSP violation reports (Supabase Edge Function)
If you deployed the security-csp-violation edge function, point CSP reports to it:
- report-uri: https://<your-project-ref>.functions.supabase.co/security-csp-violation
- or relative path if you proxy: /functions/v1/security-csp-violation

Example addition to your CSP header:
report-uri https://<your-project-ref>.functions.supabase.co/security-csp-violation; report-to csp-endpoint;

5) Permissions-Policy tips
Remove unsupported features to avoid Edge/Chromium warnings. Example policy:
Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=(), fullscreen=(self)

Notes
- Keep the runtime CSP meta for client-side safety in SPA flows. Server headers are authoritative and should include frame-ancestors.
- Test policies in all target browsers and verify console is clean of warnings.
