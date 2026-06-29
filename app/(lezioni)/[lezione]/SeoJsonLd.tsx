// Server Component che inietta JSON-LD Article + Breadcrumbs + FAQPage + LearningResource + ItemList formule
export default function SeoJsonLd(props: {
  title: string;
  subtitle?: string;
  slug: string;
  thumbnailUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  breadcrumbs: { name: string; item: string }[];
  videoUrl?: string | null;
  abstract?: string;
  faqItems?: { question: string; answer: string }[];
  formule?: { title: string; explanation: string }[];
  categoria?: string[];
  classe?: string[];
  // SEO relations
  hasPart?: { name: string; slug?: string | null }[];
  isPartOf?: { name: string; slug?: string | null }[];
}) {
  const base = "https://theoremz.com";
  const url = `${base}/${props.slug}`;
  const image = props.thumbnailUrl ?? `${base}/metadata.png`;

  const clamp = (s: string | undefined, max = 110) => {
    if (!s) return undefined;
    const t = s.trim();
    return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
  };

  const headline = clamp(
    props.subtitle ? `${props.title}: ${props.subtitle}` : props.title,
    110
  );

  // Article (primary)
  const article: any = {
    "@type": "Article",
    headline,
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
    // speakable: suggerisce a Google AI/Assistant quali sezioni leggere ad alta voce
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", "h2", "[id='concetto-chiave'] p"],
    },
  };
  if (props.abstract) article.abstract = clamp(props.abstract, 250);

  // LearningResource (didattico, arricchito)
  const learningResource: any = {
    "@type": "LearningResource",
    name: headline,
    url,
    image,
    inLanguage: "it-IT",
    isAccessibleForFree: true,
    provider: { "@type": "Organization", name: "Theoremz", url: base },
    learningResourceType: "LearningResource",
  };
  if (props.abstract) learningResource.abstract = clamp(props.abstract, 250);
  // teaches: il titolo specifico è ciò che la lezione insegna
  learningResource.teaches = props.title;
  // about: le categorie tematiche
  if (props.categoria?.length) {
    learningResource.about = props.categoria.map((c) => ({
      "@type": "Thing",
      name: c,
    }));
  }
  // educationalLevel: derivato dalle classi
  if (props.classe?.length) {
    learningResource.educationalLevel = props.classe.join(", ");
  }

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
    article.isPartOf = isPartOf.length === 1 ? isPartOf[0] : isPartOf;
    learningResource.isPartOf = isPartOf.length === 1 ? isPartOf[0] : isPartOf;
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

  // ItemList formule (flashcard) — DefinedTerm per ogni formula/concetto
  let formulaList: any = null;
  if (props.formule?.length) {
    formulaList = {
      "@type": "ItemList",
      "name": `Formule e concetti — ${props.title}`,
      "url": `${url}#formule`,
      "itemListElement": props.formule.map(({ title, explanation }, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "item": {
          "@type": "DefinedTerm",
          "name": title,
          "description": explanation,
          "inDefinedTermSet": url,
        },
      })),
    };
  }

  // FAQPage (abilita rich results su Google)
  let faqPage: any = null;
  if (props.faqItems?.length) {
    faqPage = {
      "@type": "FAQPage",
      url,
      mainEntity: props.faqItems.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer,
        },
      })),
    };
  }

  // VideoObject (se presente)
  let video: any = null;
  const videoUrl = props.videoUrl ?? null;
  if (videoUrl) {
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
      description: clamp(props.abstract || props.subtitle || props.title, 160),
      thumbnailUrl: [image],
      uploadDate: props.createdAt ?? undefined,
      publisher: { "@type": "Organization", name: "Theoremz", url: base },
      contentUrl: videoUrl,
      embedUrl: embedUrl ?? undefined,
      inLanguage: "it-IT",
      isFamilyFriendly: true,
    };
  }

  const graph = [article, learningResource, breadcrumbs, faqPage, formulaList, video].filter(Boolean);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
