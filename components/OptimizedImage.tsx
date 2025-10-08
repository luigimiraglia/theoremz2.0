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
  sizes = '100vw',
  priority = false,
  loading,
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
    
    // Usa la dimensione originale per l'src principale
    const targetWidth = typeof width === 'number' ? width : parseInt(width || '0', 10);
    return `/images/${nameWithoutExt}-${targetWidth}.webp`;
  }, [src, width]);

  return (
    <Image
      {...props}
      src={optimizedSrc}
      width={width}
      height={height}
      quality={quality}
      sizes={sizes}
      priority={priority}
      loading={loading || (priority ? 'eager' : 'lazy')}
      fetchPriority={priority ? 'high' : 'auto'}
      alt={props.alt || ''}
    />
  );
}