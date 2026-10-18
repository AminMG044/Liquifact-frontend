const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://liquifact-frontend.vercel.app";

export default function sitemap() {
  return ["", "/marketplace", "/submit", "/docs"].map((p) => ({ url: `${BASE}${p}`, lastModified: new Date() }));
}
