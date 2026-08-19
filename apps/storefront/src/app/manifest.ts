import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IT Market",
    short_name: "IT Market",
    description: "IT Market — Elektronika və texnologiya məhsulları vitrini",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ff6a00",
    icons: [
      {
        src: "/favicon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
