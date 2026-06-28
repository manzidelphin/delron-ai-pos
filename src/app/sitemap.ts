import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://delron-ai-pos.vercel.app",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
