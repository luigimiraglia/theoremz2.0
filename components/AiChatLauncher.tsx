"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const LazyAssistant = dynamic(() => import("./TheoremzAiAssistant"), {
  ssr: false,
  loading: () => null,
});

export default function AiChatLauncher({
  lessonId,
  lessonTitle,
}: {
  lessonId?: string;
  lessonTitle?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <>
      {ready && (
        <LazyAssistant
          lessonId={lessonId}
          lessonTitle={lessonTitle}
          initialOpen={false}
        />
      )}
    </>
  );
}
