import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Zalo's crawler needs metadata in the initial HTML response, as do the
  // built-in social crawlers such as Messenger's facebookexternalhit.
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|Zalo/i,
  experimental: {
    serverActions: {
      // Vercel production requests and multipart form overhead make the default
      // 1 MB action limit too small for image uploads handled by Server Actions.
      bodySizeLimit: "4.5mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
