import Image, { ImageProps } from 'next/image';
import { useMemo } from 'react';

type OptimizedImageProps = Omit<ImageProps, 'src'> & {
  src: string;
  quality?: number;
  alt: string; // Rendiamo alt obbligatorio
};

/**
 * Un componente che usa le immagini pre-ottimizzate dal nostro script invece
 * del servizio di ottimizzazione di Vercel
 */
export default function OptimizedImage({
  src,
  width,
  height,
  quality = 80,
  ...props
}: OptimizedImageProps) {
  const optimizedSrc = useMemo(() => {
    // Se è un URL esterno o un'immagine da Sanity, usa l'originale
    if (src.startsWith('http') || src.includes('cdn.sanity.io')) {
      return src;
    }

    // Rimuovi /images/ iniziale se presente
    const basePath = src.replace(/^\/images\//, '');
    // Rimuovi l'estensione
    const nameWithoutExt = basePath.replace(/\.(jpg|jpeg|png|gif|webp)$/, '');
    
    // Determina la dimensione più appropriata
    const sizes = [360, 480, 640, 768, 960, 1200, 1600, 2000];
    const targetWidth = typeof width === 'number' ? width : parseInt(width || '0', 10);
    const optimalSize = sizes.find(size => size >= targetWidth) || sizes[sizes.length - 1];

    // Usa l'immagine WebP pre-ottimizzata
    return `/images/${nameWithoutExt}-${optimalSize}.webp`;
  }, [src, width]);

  return (
    <Image
      {...props}
      src={optimizedSrc}
      width={width}
      height={height}
      quality={quality}
    />
  );
}