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
  // SEO relations
  hasPart?: { name: string; slug?: string | null }[];
  isPartOf?: { name: string; slug?: string | null }[];
}) {
  const base = "https://theoremz.com";
  const url = `${base}/${props.slug}`;
  const image = props.thumbnailUrl ?? `${base}/metadata.png`;

  // Utility to keep strings within Google's recommended limits
  const clamp = (s: string | undefined, max = 110) => {
    if (!s) return undefined;
    const t = s.trim();
    return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
  };

  // Article (primary)
  const article: any = {
    "@type": "Article",
    // Google recommends headline <= 110 chars
    headline: clamp(
      props.subtitle ? `${props.title}: ${props.subtitle}` : props.title,
      110
    ),
    mainEntityOfPage: url,
    image: [image],
    author: { "@type": "Organization", name: "Theoremz", url: base },
    publisher: {
      "@type": "Organization",
      name: "Theoremz",
      logo: { "@type": "ImageObject", url: `${base}/images/logo.webp` },
    },
    isAccessibleForFree: true,
    datePublished: props.createdAt ?? undefined,
    dateModified: props.updatedAt ?? props.createdAt ?? undefined,
    inLanguage: "it-IT",
    url,
  };

  // LearningResource (didattico)
  const learningResource: any = {
    "@type": "LearningResource",
    name: clamp(
      props.subtitle ? `${props.title}: ${props.subtitle}` : props.title,
      110
    ),
    url,
    image,
    inLanguage: "it-IT",
    isAccessibleForFree: true,
    provider: { "@type": "Organization", name: "Theoremz", url: base },
  };

  // Relations (hasPart / isPartOf)
  const mapCW = (arr?: { name: string; slug?: string | null }[]) =>
    (arr || [])
      .filter((x) => x && x.name && x.slug)
      .map((x) => ({
        "@type": "CreativeWork",
        name: x.name,
        url: `${base}/${x.slug}`,
      }));
  const hasPart = mapCW(props.hasPart);
  const isPartOf = mapCW(props.isPartOf);
  if (hasPart.length) {
    article.hasPart = hasPart;
    learningResource.hasPart = hasPart;
  }
  if (isPartOf.length) {
    // Schema.org consente array o singolo oggetto
    article.isPartOf = isPartOf.length === 1 ? isPartOf[0] : isPartOf;
    learningResource.isPartOf =
      isPartOf.length === 1 ? isPartOf[0] : isPartOf;
  }

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
      name: clamp(props.title, 110),
      description: clamp(props.subtitle || props.title, 160),
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
