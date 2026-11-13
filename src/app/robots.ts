import type { MetadataRoute } from "next";

// Courtesy signal for crawlers only – the real protection is the login.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
