// lib/sanityFetch.ts
import { createClient } from "next-sanity";
import { cache } from "react";

const config = {
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "1",
  useCdn: process.env.NODE_ENV === "production",
};

export const client = createClient(config);

/**
 * Wrapper tipizzato su `client.fetch` che viene deduplicato
 * grazie a React cache () => Promise<T>
 */
export const sanityFetch = cache(
  <T>(query: string, params: Record<string, unknown> = {}) =>
    client.fetch<T>(query, params)
);
