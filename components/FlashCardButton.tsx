import Link from 'next/link';

interface FlashCardButtonProps {
  lessonId: string;
}

export default function FlashCardButton({ lessonId }: FlashCardButtonProps) {
  return (
    <Link
      href={`/flashcards?lesson=${lessonId}`}
      className="inline-flex items-center px-4 py-2 bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 transition-colors"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5 mr-2"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2-1a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V4a1 1 0 00-1-1H6z"
          clipRule="evenodd"
        />
        <path
          fillRule="evenodd"
          d="M10 8a1 1 0 011 1v4a1 1 0 11-2 0V9a1 1 0 011-1z"
          clipRule="evenodd"
        />
      </svg>
      Esercitati con le Flashcard
    </Link>
  );
}