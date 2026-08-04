export function GET() {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>CFB Apex coaching feed</title><subtitle>Unavailable until production verification is configured.</subtitle></feed>`,
    {
      status: 503,
      headers: {
        "Content-Type": "application/atom+xml; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
