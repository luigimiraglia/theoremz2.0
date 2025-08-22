// app/(lezioni)/[lezione]/loading.tsx
export default function Loading() {
  return (
    <main className="min-h-screen px-6 py-8" role="status" aria-busy="true">
      <div className="max-w-6xl mx-auto animate-pulse">
        <div className="h-8 w-2/3 bg-gray-300 rounded mb-3" />
        <div className="h-5 w-1/2 bg-gray-200 rounded mb-6" />
        <div className="h-10 w-48 bg-gray-200 rounded mb-6 ml-auto" />
        <div className="h-40 bg-gray-200 rounded mb-8" />
        <div className="space-y-3">
          <div className="h-5 w-full bg-gray-200 rounded" />
          <div className="h-5 w-11/12 bg-gray-200 rounded" />
          <div className="h-5 w-10/12 bg-gray-200 rounded" />
          <div className="h-5 w-9/12 bg-gray-200 rounded" />
        </div>
      </div>
    </main>
  );
}
