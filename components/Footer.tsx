/* eslint-disable @next/next/no-img-element */
// components/Footer.tsx  (SERVER)
import Link from "next/link";
import ConsentManagerLink from "./ConsentManagerLink";
export default function Footer() {
  return (
    <footer
      className="bg-gray-900 text-gray-300 pt-10 pb-4 w-full"
      style={{ contentVisibility: "auto", containIntrinsicSize: "420px" }}
    >
      <div className="mx-auto px-8 space-y-8 max-w-screen-xl">
        {/* Chi siamo */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Chi siamo</h2>
          <p>
            <em>Theoremz</em> è la piattaforma definitiva di matematica e fisica
            per superiori e medie. Ideata da studenti, per studenti.
          </p>
        </div>

        <hr className="border border-gray-700 opacity-50 mt-2" />

        {/* Links e pulsante */}
        <div className="mt-4 flex">
          <div className="space-y-2 text-sm">
            <p className="copyright-text">
              P.iva: 17675281004 © 2025 Theoremz
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/privacy-policy" className="hover:text-blue-400">
                Privacy Policy
              </Link>
              <span>-</span>
              <Link href="/cookie-policy" className="hover:text-blue-400">
                Cookie Policy
              </Link>
              <span>-</span>
              <Link href="/termini-di-servizio" className="hover:text-blue-400">
                Termini e Condizioni
              </Link>
              <span>-</span>
              <a href="/lezioni.html" className="hover:text-blue-400">
                Lista delle lezioni
              </a>
              <span>-</span>
              {/* Client link to open cookie preferences */}
              <ConsentManagerLink className="hover:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="md:flex md:justify-between md:items-center">
          {/* Social Icons */}
          <ul className="flex flex-wrap items-center space-x-4">
            <li>
              <a
                href="https://wa.me/+393519523641"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded-full"
                style={{
                  background: "linear-gradient(90deg, #02C36A, #17E9B6)",
                }}
                title="Whatsapp"
              >
                <img
                  src="/images/wa.svg"
                  alt="Whatsapp"
                  width={20}
                  height={20}
                  loading="lazy"
                />
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/theoremz__/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded-full"
                style={{
                  background: "linear-gradient(90deg, #a64dff, #f73888)",
                }}
                title="Instagram"
              >
                <img
                  src="/images/insta.webp"
                  alt="Instagram"
                  width={20}
                  height={20}
                  loading="lazy"
                />
              </a>
            </li>
            <li>
              <a
                href="https://www.tiktok.com/@theoremz_"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 flex items-center justify-center rounded-full"
                style={{
                  background: "linear-gradient(90deg, #510ea9, #b90538)",
                }}
                title="Tiktok"
              >
                <img
                  src="/images/tiktok.svg"
                  alt="Tiktok"
                  width={20}
                  height={20}
                  loading="lazy"
                />
              </a>
            </li>
            <li>
              <a
                href="mailto:theoremz.team@gmail.com"
                className="w-10 h-10 flex items-center justify-center rounded-full"
                style={{
                  background: "linear-gradient(90deg, #F1305D, #ED9448)",
                }}
                title="Email"
              >
                <img
                  src="/images/mail.svg"
                  alt="Email"
                  width={20}
                  height={20}
                  loading="lazy"
                />
              </a>
            </li>
          </ul>

        </div>

        <p className="text-center text-sm mt-8">
          Sviluppato e scritto al 100% da matematici e fisici italiani e NON da
          algoritmi 🇮🇹❤️
        </p>
      </div>
    </footer>
  );
}
