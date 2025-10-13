#!/usr/bin/env node
/**
 * Network IP Detection Script
 * Run this to see all available network IPs on your machine
 */

const { displayNetworkInfo, getNetworkIPs, getPrimaryNetworkIP } = require('./utils/networkUtils');

console.log('\n🔍 Network IP Detection Tool');
console.log('═══════════════════════════════════════════════════════════════════════');

// Display detailed network information
displayNetworkInfo();

// Show specific recommendations
const primaryIP = getPrimaryNetworkIP();
const allIPs = getNetworkIPs();

if (primaryIP) {
  console.log('💡 Quick Setup Recommendations:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`1. Start your Frontend: npm run dev (in Frontend folder)`);
  console.log(`2. Start your Backend:  npm run dev (in Backend folder)`);
  console.log(`3. Access locally:      http://localhost:3000`);
  console.log(`4. Access on network:   http://${primaryIP}:3000`);
  console.log('');
  console.log('🔧 Other devices on your network can access:');
  allIPs.forEach(ip => {
    console.log(`   • http://${ip}:3000`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
} else {
  console.log('⚠️  No network IP detected. You might be offline or have no network interfaces.');
  console.log('   You can still use: http://localhost:3000\n');
}

console.log('📋 Environment Variable Option:');
console.log('   You can also set NEXT_PUBLIC_API_URL in your .env.local file:');
if (primaryIP) {
  console.log(`   NEXT_PUBLIC_API_URL=http://${primaryIP}:5000\n`);
}

console.log('═══════════════════════════════════════════════════════════════════════\n');