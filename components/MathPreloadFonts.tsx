import Head from 'next/head';

export default function MathPreloadFonts() {
  return (
    <Head>
      {/* Preload KaTeX fonts */}
      <link
        rel="preload"
        href="/media/KaTeX_Main-Regular.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <link
        rel="preload"
        href="/media/KaTeX_Math-Italic.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      {/* Preconnect to essential third-party domains */}
      <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://cdn.sanity.io" />
    </Head>
  );
}