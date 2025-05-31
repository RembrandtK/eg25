#!/usr/bin/env node

/**
 * Test script to verify the mini app is loading correctly
 * This script tests the basic functionality and loading states
 */

// Use built-in fetch (Node.js 18+) or fallback
const fetch = globalThis.fetch || require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testAppLoading() {
  console.log('🧪 Testing Mini App Loading...\n');

  try {
    // Test 1: Basic page load
    console.log('1. Testing basic page load...');
    const response = await fetch(BASE_URL);
    
    if (response.ok) {
      console.log('✅ Page loads successfully');
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    } else {
      console.log('❌ Page failed to load');
      console.log(`   Status: ${response.status}`);
      return false;
    }

    // Test 2: Check if HTML contains expected elements
    const html = await response.text();
    
    console.log('\n2. Testing page content...');
    
    const checks = [
      { name: 'Title contains "Election"', test: html.includes('Election') },
      { name: 'React app root exists', test: html.includes('<div') },
      { name: 'CSS is loaded', test: html.includes('css') || html.includes('style') },
      { name: 'JavaScript is loaded', test: html.includes('script') },
    ];

    let allPassed = true;
    checks.forEach(check => {
      if (check.test) {
        console.log(`✅ ${check.name}`);
      } else {
        console.log(`❌ ${check.name}`);
        allPassed = false;
      }
    });

    // Test 3: API endpoints
    console.log('\n3. Testing API endpoints...');
    
    try {
      const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`);
      if (sessionResponse.ok) {
        console.log('✅ Session API is working');
        const sessionData = await sessionResponse.json();
        console.log(`   Session data: ${JSON.stringify(sessionData, null, 2)}`);
      } else {
        console.log('❌ Session API failed');
        allPassed = false;
      }
    } catch (error) {
      console.log('❌ Session API error:', error.message);
      allPassed = false;
    }

    // Test 4: Check for console errors (this would need browser automation)
    console.log('\n4. Manual checks needed:');
    console.log('   - Open browser to http://localhost:3000');
    console.log('   - Check browser console for errors');
    console.log('   - Verify MiniKit provider loads');
    console.log('   - Test wallet connection button');

    console.log('\n📊 Test Summary:');
    if (allPassed) {
      console.log('✅ All automated tests passed!');
      console.log('🔍 Please perform manual browser testing for complete verification.');
    } else {
      console.log('❌ Some tests failed. Check the issues above.');
    }

    return allPassed;

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testAppLoading().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testAppLoading };
