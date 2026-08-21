import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Carbon Food Delivery",
    short_name: "Carbon Delivery",
    description: "A touch-first delivery workflow for Carbon Food Delivery staff.",
    start_url: "/deliveryman",
    display: "standalone",
    background_color: "#f6f7f2",
    theme_color: "#244d3e",
    icons: [
      {
        src: "/delivery-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
