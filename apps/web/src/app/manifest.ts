import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sri Sai Anu Driving School",
    short_name: "Sri Sai Anu",
    description: "Driving school lessons, progress, payments and support.",
    start_url: "/login",
    display: "standalone",
    background_color: "#070707",
    theme_color: "#e4ff33",
    icons: [
      { src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
