"use client";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
export default function AccountButton() {
  const { user } = useAuth();
  return (
    <Link
      href={user ? "/account" : "/register"}
      className="rounded-xl border-2 border-blue-500 px-6 py-2 font-bold text-blue-500 hover:bg-blue-500 hover:text-white transition-colors duration-250 ease-in-out delay-50"
    >
      {user ? "Il mio account" : "Unisciti"}
    </Link>
  );
}
