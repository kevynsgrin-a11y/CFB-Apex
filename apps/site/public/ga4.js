// GA4 bootstrap, served same-origin so no inline script is needed.
// Per-site stream first, then the portfolio roll-up. The per-site ID must be
// sent in-page: the Cloudflare Zaraz GA4 tool on this zone delivers no data.
window.dataLayer = window.dataLayer || [];
function gtag() {
  window.dataLayer.push(arguments);
}
gtag("js", new Date());
gtag("config", "G-JBM2K5GD33");
gtag("config", "G-CRGEH5DN9E");
