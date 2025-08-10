"use client";

import { PortableText } from "@portabletext/react";
import { ptComponents } from "@/lib/ptComponents";
import type { PortableTextBlock } from "sanity";

export default function PortableRenderer({
  value,
}: {
  value: PortableTextBlock[];
}) {
  return <PortableText value={value} components={ptComponents} />;
}
