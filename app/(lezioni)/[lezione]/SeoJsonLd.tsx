// Server Component che inietta JSON-LD Article + Breadcrumbs
export default function SeoJsonLd(props: {
  title: string;
  subtitle?: string;
  slug: string;
  thumbnailUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  breadcrumbs: { name: string; item: string }[];
  videoUrl?: string | null;
}) {
  const base = "https://theoremz.com";
  const url = `${base}/${props.slug}`;
  const image = props.thumbnailUrl ?? `${base}/metadata.png`;

  // Article (primary)
  const article = {
    "@type": "Article",
    headline: props.subtitle
      ? `${props.title}: ${props.subtitle}`
      : props.title,
    mainEntityOfPage: url,
    image: [image],
    author: { "@type": "Organization", name: "Theoremz", url: base },
    reviewedBy: { "@type": "Organization", name: "Theoremz", url: base },
    publisher: {
      "@type": "Organization",
      name: "Theoremz",
      logo: { "@type": "ImageObject", url: `${base}/metadata.png` },
    },
    isAccessibleForFree: true,
    datePublished: props.createdAt ?? undefined,
    dateModified: props.updatedAt ?? props.createdAt ?? undefined,
    inLanguage: "it-IT",
    url,
  } as const;

  // LearningResource (didattico)
  const learningResource = {
    "@type": "LearningResource",
    name: props.subtitle
      ? `${props.title}: ${props.subtitle}`
      : props.title,
    url,
    image,
    inLanguage: "it-IT",
    isAccessibleForFree: true,
    provider: { "@type": "Organization", name: "Theoremz", url: base },
  } as const;

  // Breadcrumbs
  const breadcrumbs = {
    "@type": "BreadcrumbList",
    itemListElement: props.breadcrumbs.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: b.item,
    })),
  } as const;

  // VideoObject (se presente)
  let video: any | null = null;
  const videoUrl = props.videoUrl ?? null;
  if (videoUrl) {
    // prova a distinguere YouTube vs file
    let embedUrl: string | undefined;
    try {
      const u = new URL(videoUrl);
      if (u.hostname.includes("youtu.be")) {
        embedUrl = `https://www.youtube.com/embed/${u.pathname.replace("/", "")}`;
      } else if (u.hostname.includes("youtube.com")) {
        const v = u.searchParams.get("v");
        embedUrl = v ? `https://www.youtube.com/embed/${v}` : undefined;
      }
    } catch {}

    video = {
      "@type": "VideoObject",
      name: props.title,
      description: props.subtitle || props.title,
      thumbnailUrl: [image],
      uploadDate: props.createdAt ?? undefined,
      publisher: { "@type": "Organization", name: "Theoremz", url: base },
      contentUrl: videoUrl,
      embedUrl: embedUrl ?? undefined,
      inLanguage: "it-IT",
      isFamilyFriendly: true,
    };
  }

  const graph = [article, learningResource, breadcrumbs, video].filter(Boolean);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
