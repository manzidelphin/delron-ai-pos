import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DELRON AI POS",
    short_name: "DELRON",
    description: "Rwanda's AI-powered business management and Point of Sale platform",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#1e293b",
    theme_color: "#1e293b",
    orientation: "landscape",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Dashboard",
        url: "/dashboard",
        description: "Open the main dashboard",
      },
    ],
  };
}
