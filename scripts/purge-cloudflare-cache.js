/**
 * Purge Cloudflare Pages Cache
 * 
 * This script helps clear Cloudflare's cache to prevent stale asset issues
 * Run: node scripts/purge-cloudflare-cache.js
 */

const https = require('https');

// Configuration
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const DOMAIN = 'build-desk.com';

if (!ZONE_ID || !API_TOKEN) {
  console.error('❌ Missing environment variables!');
  console.log('Please set:');
  console.log('  - CLOUDFLARE_ZONE_ID');
  console.log('  - CLOUDFLARE_API_TOKEN');
  console.log('\nYou can find these in your Cloudflare dashboard.');
  process.exit(1);
}

const purgeCache = () => {
  const data = JSON.stringify({
    purge_everything: true
  });

  const options = {
    hostname: 'api.cloudflare.com',
    port: 443,
    path: `/client/v4/zones/${ZONE_ID}/purge_cache`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  console.log('🔄 Purging Cloudflare cache...');

  const req = https.request(options, (res) => {
    let body = '';

    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      const response = JSON.parse(body);
      
      if (response.success) {
        console.log('✅ Cache purged successfully!');
        console.log(`🌐 Your site: https://${DOMAIN}`);
        console.log('\n💡 Tips:');
        console.log('   1. Wait 1-2 minutes for cache to clear globally');
        console.log('   2. Do a hard refresh in your browser (Ctrl+Shift+R)');
        console.log('   3. Clear your browser cache if issues persist');
      } else {
        console.error('❌ Failed to purge cache:');
        console.error(JSON.stringify(response.errors, null, 2));
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error:', error.message);
  });

  req.write(data);
  req.end();
};

purgeCache();

