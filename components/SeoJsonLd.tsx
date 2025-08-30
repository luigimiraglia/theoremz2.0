// components/SeoJsonLd.tsx
import React from "react";

export default function SeoJsonLd({ data }: { data: unknown }) {
  const json = JSON.stringify(data, null, 0);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
