import { useEffect } from 'react';

// Ultra-minimal critical CSS for immediate paint
const criticalStyles = `
*,*::before,*::after{box-sizing:border-box}
html{line-height:1.15;-webkit-text-size-adjust:100%}
body{margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;color:#1a1a1a}
.critical-layout{min-height:100vh}
header{position:sticky;top:0;z-index:50;background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);border-bottom:1px solid #e5e7eb;height:64px;display:flex;align-items:center;padding:0 1rem}
.hero-section{min-height:60vh;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;display:flex;align-items:center;padding:2rem 1rem}
.container{max-width:1200px;margin:0 auto;padding:0 1rem}
.text-center{text-align:center}
.mb-4{margin-bottom:1rem}
.mb-8{margin-bottom:2rem}
.text-3xl{font-size:1.875rem;line-height:2.25rem}
.font-bold{font-weight:700}
.btn-primary{background:#f97316;color:white;padding:0.75rem 1.5rem;border-radius:0.5rem;font-weight:600;text-decoration:none;display:inline-block;border:none;cursor:pointer}
.btn-primary:hover{background:#ea580c}
.grid{display:grid}
.grid-cols-1{grid-template-columns:repeat(1,minmax(0,1fr))}
@media(min-width:768px){.md\\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(min-width:1024px){.lg\\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}}
.gap-8{gap:2rem}
.bg-card{background:#fff;border:1px solid #e5e7eb;border-radius:0.5rem}
.p-6{padding:1.5rem}
.h-96{height:24rem}
.bg-muted{background:#f9fafb}
.animate-pulse{animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
img{max-width:100%;height:auto;display:block}
`;

export function CriticalCSS() {
  useEffect(() => {
    // Skip if already injected
    if (document.querySelector('#critical-css')) return;

    // Inject critical CSS immediately for instant paint
    const style = document.createElement('style');
    style.id = 'critical-css';
    style.textContent = criticalStyles;
    document.head.insertBefore(style, document.head.firstChild);

    // Minimal font optimization - load system fonts first
    const fontOptimizer = () => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = 'https://fonts.googleapis.com';
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    };

    // Defer font loading to avoid blocking
    setTimeout(fontOptimizer, 100);
  }, []);

  return null;
}

export default CriticalCSS;