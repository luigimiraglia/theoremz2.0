// Critical CSS inlineato per LCP ottimale
export default function LessonCriticalCSS() {
  return (
    <style jsx>{`
      /* Critical styles per above-the-fold content */
      .lesson-header {
        font-display: swap;
        contain: layout style paint;
      }
      
      /* Prevent layout shift per skeleton loaders */
      .button-skeleton {
        min-height: 34px;
        min-width: 80px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      
      /* Preload hint per immagini above-the-fold */
      .lesson-thumbnail {
        content-visibility: auto;
        contain-intrinsic-size: 400px 250px;
      }
      
      /* Ottimizzazione per CLS */
      .lesson-content {
        min-height: 300px;
        content-visibility: auto;
      }
      
      /* Prevent font flash */
      .math-content {
        font-display: swap;
      }
    `}</style>
  );
}