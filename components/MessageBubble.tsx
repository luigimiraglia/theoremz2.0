import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

type MessageBubbleProps = {
  role: "user" | "assistant"; // o string se è generico
  content: string;
  createdAt: Date | string | number;
};

export default function MessageBubble({
  role,
  content,
  createdAt,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const time = new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex items-end gap-2 max-w-[88%] ${isUser ? "flex-row-reverse" : "flex-row"}`}
      >
        <div
          className={`h-7 w-7 rounded-full ${isUser ? "bg-purple-600" : "bg-gray-200"} flex items-center justify-center text-[10px] text-white`}
        >
          {isUser ? "TU" : "AI"}
        </div>
        <div
          className={`relative rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words shadow ${
            isUser
              ? "bg-gradient-to-br from-purple-600 to-violet-600 text-white rounded-br-md"
              : "bg-gray-100 text-gray-900 rounded-bl-md"
          }`}
        >
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {content}
          </ReactMarkdown>
          <div
            className={`mt-1 text-[10px] ${isUser ? "text-white/80" : "text-gray-500"}`}
          >
            {time}
          </div>
        </div>
      </div>
    </div>
  );
}
