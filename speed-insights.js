// Vercel Speed Insights initialization for vanilla JavaScript
// Based on @vercel/speed-insights package
(function() {
  'use strict';
  
  // Don't run in development mode
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return;
  }
  
  // Initialize queue for Speed Insights
  if (!window.si) {
    window.si = function() {
      (window.siq = window.siq || []).push(arguments);
    };
  }
  
  // Check if script is already loaded
  if (document.head.querySelector('script[src*="/_vercel/speed-insights/"]')) {
    return;
  }
  
  // Create and inject the Speed Insights script
  var script = document.createElement('script');
  script.src = '/_vercel/speed-insights/script.js';
  script.defer = true;
  
  script.onerror = function() {
    console.log('[Vercel Speed Insights] Failed to load script. Please check if any content blockers are enabled.');
  };
  
  document.head.appendChild(script);
})();
