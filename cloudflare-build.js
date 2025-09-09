const { execSync } = require('child_process');

console.log('Starting Cloudflare build with dependency conflict handling...');

try {
  // Use npm install with force flag instead of npm ci
  console.log('Installing dependencies with force flag...');
  execSync('npm install --force', { stdio: 'inherit' });
  
  console.log('Running build...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}