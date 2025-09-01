// components/ExerciseTitle.tsx
import React from "react";
import MathText from "@/components/MathText";

export default function ExerciseTitle({ title }: { title: string }) {
  return (
    <h3 className="mt-4 mb-2 text-xl font-bold">
      <MathText text={title} /* allowBlock={false} */ />
    </h3>
  );
}
