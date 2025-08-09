// /lib/getLessonContent.ts
import { client } from "@/sanity/lib/client";

export async function getLessonContent(lessonId: string) {
  const query = `*[_id == $id][0]{ title, content }`;
  const lesson = await client.fetch(query, { id: lessonId });

  if (!lesson) return { title: "", content: "" };

  // Portable Text parser minimale → unisce solo testo dei blocchi
  let text = "";
  if (Array.isArray(lesson.content)) {
    text = lesson.content
      .map((block: any) => {
        if (block._type === "block") {
          return (
            block.children?.map((child: any) => child.text).join(" ") || ""
          );
        }
        if (block._type === "latex") {
          return `Formula LaTeX: ${block.code || ""}`;
        }
        if (block._type === "section") {
          return `Sezione: ${block.heading}`;
        }
        return "";
      })
      .join("\n\n");
  }

  return {
    title: lesson.title || "",
    content: text.trim(),
  };
}
