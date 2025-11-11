import localFont from "next/font/local";

export const montserrat = localFont({
  src: [
    {
      path: "../public/fonts/Montserrat/Montserrat-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/Montserrat/Montserrat-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Montserrat/Montserrat-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/Montserrat/Montserrat-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/Montserrat/Montserrat-LightItalic.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "../public/fonts/Montserrat/Montserrat-Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/fonts/Montserrat/Montserrat-SemiBoldItalic.woff2",
      weight: "600",
      style: "italic",
    },
    {
      path: "../public/fonts/Montserrat/Montserrat-BoldItalic.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  display: "swap",
  preload: true,
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "Roboto",
    "Oxygen",
    "Ubuntu",
    "Cantarell",
    "Fira Sans",
    "Droid Sans",
    "Helvetica Neue",
    "sans-serif",
  ],
  adjustFontFallback: true,
});
