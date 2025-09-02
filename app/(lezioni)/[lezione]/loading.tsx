// app/(lezioni)/[lezione]/loading.tsx
import LessonSkeleton from "@/components/LessonSkeleton";

export default function Loading() {
  return (
    <main className="min-h-screen px-0 py-6" role="status" aria-busy="true">
      <LessonSkeleton />
    </main>
  );
}
