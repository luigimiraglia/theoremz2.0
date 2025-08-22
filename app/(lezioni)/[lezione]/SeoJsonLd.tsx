// Server Component che inietta JSON-LD Article + Breadcrumbs
export default function SeoJsonLd(props: {
  title: string;
  subtitle?: string;
  slug: string;
  thumbnailUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  breadcrumbs: { name: string; item: string }[];
}) {
  const base = "https://theoremz.com";
  const url = `${base}/lezione/${props.slug}`;
  const image = props.thumbnailUrl ?? `${base}/metadata.png`;

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: props.subtitle
      ? `${props.title}: ${props.subtitle}`
      : props.title,
    mainEntityOfPage: url,
    image: [image],
    author: { "@type": "Organization", name: "Theoremz", url: base },
    publisher: {
      "@type": "Organization",
      name: "Theoremz",
      logo: { "@type": "ImageObject", url: `${base}/metadata.png` },
    },
    datePublished: props.createdAt ?? undefined,
    dateModified: props.updatedAt ?? props.createdAt ?? undefined,
    inLanguage: "it-IT",
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: props.breadcrumbs.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: b.item,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
    </>
  );
}
