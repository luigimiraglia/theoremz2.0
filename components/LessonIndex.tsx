type IndexItem = {
  heading: string;
  shortTitle: string;
};

function toAnchorId(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function LessonIndex({ sections }: { sections: IndexItem[] }) {
  if (!sections?.length) return null;

  return (
    <nav aria-label="Indice della lezione" className="my-1">
      <ul
        className="
          flex flex-row flex-nowrap gap-2
          overflow-x-auto overscroll-x-contain scroll-smooth
           py-1
        "
      >
        {sections.map((section) => {
          const anchor = toAnchorId(section.heading);
          return (
            <li key={anchor} className="shrink-0">
              <a
                href={`#${anchor}`}
                className="
                  whitespace-nowrap
                  border-2 px-3 py-1 text-sm font-semibold rounded-lg
                  text-blue-950 [.dark_&]:text-white [.dark_&]:border-white
                "
              >
                {section.shortTitle}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
