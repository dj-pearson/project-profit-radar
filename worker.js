// Cloudflare Worker to serve React SPA
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle static assets
    if (url.pathname.startsWith('/assets/') || 
        url.pathname.endsWith('.js') || 
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.ico')) {
      
      // Fetch from your build output
      try {
        const assetResponse = await fetch(`https://builddesk-xxx.pages.dev${url.pathname}`, {
          method: request.method,
          headers: request.headers,
        });
        
        if (assetResponse.ok) {
          return assetResponse;
        }
      } catch (error) {
        console.error('Asset fetch error:', error);
      }
    }
    
    // For all other routes, serve the React app
    try {
      const indexResponse = await fetch('https://builddesk-xxx.pages.dev/', {
        method: 'GET',
        headers: {
          'User-Agent': request.headers.get('User-Agent') || 'Cloudflare-Worker',
        },
      });
      
      if (indexResponse.ok) {
        const html = await indexResponse.text();
        return new Response(html, {
          headers: {
            'Content-Type': 'text/html;charset=UTF-8',
            'Cache-Control': 'public, max-age=300',
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
    } catch (error) {
      console.error('Pages fetch error:', error);
    }
    
    // Fallback response
    return new Response('Application temporarily unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  },
}; 