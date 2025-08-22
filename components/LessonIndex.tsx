type SectionItem = {
  _type: "section";
  heading: string; // titolo visibile
  shortTitle: string; // titolo breve per l’indice
};

export default function LessonIndex({ sections }: { sections: SectionItem[] }) {
  return (
    <>
      {sections.length > 0 && (
        <ul className="flex flex-wrap gap-2 my-3">
          {sections.map((section: SectionItem) => {
            const anchor = section.shortTitle
              .toLowerCase()
              .replace(/[^\w]+/g, "-")
              .replace(/^-+|–+$|_+$/g, "");

            return (
              <li key={anchor}>
                <a
                  href={`#${anchor}`}
                  className="text-nowrap border-2 text-sm py-1 [.dark_&]:text-white [.dark_&]:border-white text-blue-950 px-3 font-semibold rounded-lg"
                >
                  {section.shortTitle}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
