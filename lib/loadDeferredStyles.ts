export function loadDeferredStyles() {
  const stylesheets = [
    '/css/3864b451a61e4546.css',  // KaTeX styles
    '/css/869857dd143df93c.css'   // Non-critical styles
  ];

  stylesheets.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.type = 'text/css';
    document.head.appendChild(link);
  });
}