// components/Footer.tsx
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 pt-10 pb-4 absolute b-0 min-w-full">
      <div className="mx-auto px-8 space-y-8 max-w-screen-xl ">
        <div className="">
          {/* Chi siamo */}
          <div className="">
            <h2 className="text-2xl font-semibold mb-4">Chi siamo</h2>
            <p className="">
              <em>Theoremz</em> è la piattaforma definitiva di matematica e
              fisica per superiori e medie. Ideata da studenti, per studenti.
            </p>
          </div>

          {/* Links e pulsante */}
          <div className="mt-4 flex">
            <div className="space-y-2 text-sm">
              <p className="copyright-text">
                P.iva: 17675281004 © 2025 Theoremz
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/privacy-policy-theoremz.pdf"
                  className="hover:text-blue-400"
                >
                  Privacy Policy
                </Link>
                <span>-</span>
                <Link
                  href="/cookie-policy-theoremz.pdf"
                  className="hover:text-blue-400"
                >
                  Cookie Policy
                </Link>
                <span>-</span>
                <Link href="/termini.html" className="hover:text-blue-400">
                  Termini e Condizioni
                </Link>
                <span>-</span>
                <Link href="/lezioni.html" className="hover:text-blue-400">
                  Lista delle lezioni
                </Link>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gray-700 opacity-50" />

        <div className="md:flex md:justify-between md:items-center">
          {/* Social Icons */}
          <ul className="flex flex-wrap items-center space-x-4">
            <li>
              <Link
                href="https://wa.me/+393519523641"
                className="w-10 h-10 flex items-center justify-center rounded-full"
                style={{
                  background: "linear-gradient(90deg, #02C36A, #17E9B6)",
                }}
                title="Whatsapp"
              >
                <Image
                  src="/images/wa.svg"
                  alt="Whatsapp"
                  width={20}
                  height={20}
                />
              </Link>
            </li>
            <li>
              <Link
                href="https://www.instagram.com/theoremz__/"
                className="w-10 h-10 flex items-center justify-center rounded-full"
                style={{
                  background: "linear-gradient(90deg, #a64dff, #f73888)",
                }}
                title="Instagram"
              >
                <Image
                  src="/images/insta.webp"
                  alt="Instagram"
                  width={20}
                  height={20}
                />
              </Link>
            </li>
            <li>
              <Link
                href="https://www.tiktok.com/@theoremz_"
                className="w-10 h-10 flex items-center justify-center rounded-full"
                style={{
                  background: "linear-gradient(90deg, #510ea9, #b90538)",
                }}
                title="Tiktok"
              >
                <Image
                  src="/images/tiktok.svg"
                  alt="Tiktok"
                  width={20}
                  height={20}
                />
              </Link>
            </li>
            <li>
              <Link
                href="mailto:theoremz.team@gmail.com"
                className="w-10 h-10 flex items-center justify-center rounded-full"
                style={{
                  background: "linear-gradient(90deg, #F1305D, #ED9448)",
                }}
                title="Email"
              >
                <Image
                  src="/images/mail.svg"
                  alt="Email"
                  width={20}
                  height={20}
                />
              </Link>
            </li>
          </ul>

          {/* App Store Button */}
          <Link
            href="https://apps.apple.com/it/app/theoremz/id6478509843"
            className="mt-6 md:mt-0 inline-flex items-center space-x-2 px-4 py-2 border-2 border-black rounded-full bg-white text-black hover:bg-gray-100"
          >
            <svg
              className="w-6 h-6"
              fill="currentColor"
              viewBox="-52.01 0 560.035 560.035"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M380.844 297.529c.787 84.752 74.349 112.955 75.164 113.314-.622 1.988-11.754 40.191-38.756 79.652-23.343 34.117-47.568 68.107-85.731 68.811-37.499.691-49.557-22.236-92.429-22.236-42.859 0-56.256 21.533-91.753 22.928-36.837 1.395-64.889-36.891-88.424-70.883-48.093-69.53-84.846-196.475-35.496-282.165 24.516-42.554 68.328-69.501 115.882-70.192 36.173-.69 70.315 24.336 92.429 24.336 22.1 0 63.59-30.096 107.208-25.676 18.26.76 69.517 7.376 102.429 55.552-2.652 1.644-61.159 35.704-60.523 106.559M310.369 89.418C329.926 65.745 343.089 32.79 339.498 0 311.308 1.133 277.22 18.785 257 42.445c-18.121 20.952-33.991 54.487-29.709 86.628 31.421 2.431 63.52-15.967 83.078-39.655" />
            </svg>
            <div className="flex flex-col text-left">
              <span className="text-xs">Scarica su</span>
              <span className="font-semibold">App Store</span>
            </div>
          </Link>
        </div>

        <p className="text-center text-sm mt-8">
          Sviluppato e scritto al 100% da matematici e fisici italiani e NON da
          algoritmi 🇮🇹❤️
        </p>
      </div>
    </footer>
  );
}
