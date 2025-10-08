// Componente per caricare i CSS in modo asincrono
'use client';

import { useEffect } from 'react';

const DeferredStyles = () => {
  useEffect(() => {
    const loadStyles = () => {
      const stylesheets = [
        '/css/3864b451a61e4546.css',
        '/css/869857dd143df93c.css'
      ];

      stylesheets.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.type = 'text/css';
        document.head.appendChild(link);
      });
    };

    // Usa requestIdleCallback se disponibile, altrimenti setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadStyles);
    } else {
      setTimeout(loadStyles, 0);
    }
  }, []);

  return null;
};

export default DeferredStyles;