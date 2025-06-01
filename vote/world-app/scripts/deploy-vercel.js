#!/usr/bin/env node

/**
 * Deployment helper script for Vercel
 * This script helps prepare and deploy the World Mini App to Vercel
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 World Mini App Deployment Helper\n');

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: package.json not found. Please run this script from the world-app directory.');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
if (packageJson.name !== 'world-app') {
  console.error('❌ Error: This script should be run from the world-app directory.');
  process.exit(1);
}

console.log('✅ Found World Mini App project');

// Step 1: Sync contracts
console.log('\n📋 Step 1: Syncing contract addresses...');
try {
  execSync('pnpm run sync-contracts', { stdio: 'inherit' });
  console.log('✅ Contract addresses synced successfully');
} catch (error) {
  console.error('❌ Failed to sync contracts:', error.message);
  process.exit(1);
}

// Step 2: Type check
console.log('\n🔍 Step 2: Running type check...');
try {
  execSync('pnpm run type-check', { stdio: 'inherit' });
  console.log('✅ Type check passed');
} catch (error) {
  console.error('❌ Type check failed:', error.message);
  console.log('\n💡 Please fix TypeScript errors before deploying');
  process.exit(1);
}

// Step 3: Test build
console.log('\n🔨 Step 3: Testing build...');
try {
  execSync('pnpm run build', { stdio: 'inherit' });
  console.log('✅ Build successful');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  console.log('\n💡 Please fix build errors before deploying');
  process.exit(1);
}

// Step 4: Check for Vercel CLI
console.log('\n🔧 Step 4: Checking Vercel CLI...');
try {
  execSync('vercel --version', { stdio: 'pipe' });
  console.log('✅ Vercel CLI found');
} catch (error) {
  console.log('⚠️  Vercel CLI not found. Installing...');
  try {
    execSync('npm install -g vercel', { stdio: 'inherit' });
    console.log('✅ Vercel CLI installed');
  } catch (installError) {
    console.error('❌ Failed to install Vercel CLI:', installError.message);
    console.log('\n💡 Please install Vercel CLI manually: npm install -g vercel');
    process.exit(1);
  }
}

// Step 5: Deploy
console.log('\n🚀 Step 5: Deploying to Vercel...');
console.log('📝 Note: You may need to configure environment variables after deployment');

const deployCommand = process.argv.includes('--prod') ? 'vercel --prod' : 'vercel';
console.log(`Running: ${deployCommand}`);

try {
  execSync(deployCommand, { stdio: 'inherit' });
  console.log('\n🎉 Deployment completed!');
  
  console.log('\n📋 Post-deployment checklist:');
  console.log('1. ✅ Update environment variables in Vercel dashboard');
  console.log('2. ✅ Set NEXT_PUBLIC_APP_URL to your Vercel domain');
  console.log('3. ✅ Set NEXTAUTH_URL to your Vercel domain');
  console.log('4. ✅ Generate and set NEXTAUTH_SECRET');
  console.log('5. ✅ Update World ID app configuration with new domain');
  console.log('6. ✅ Test the deployed app');
  
  console.log('\n📖 See DEPLOYMENT.md for detailed instructions');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  console.log('\n💡 You can also deploy manually via the Vercel dashboard');
  process.exit(1);
}
