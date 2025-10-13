const os = require('os');

/**
 * Get all network interface IPs
 * @returns {Array<string>} Array of IP addresses
 */
function getNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        ips.push(interface.address);
      }
    }
  }
  
  return ips;
}

/**
 * Get the primary network IP (usually the first non-internal IPv4)
 * @returns {string|null} Primary IP address or null if not found
 */
function getPrimaryNetworkIP() {
  const ips = getNetworkIPs();
  return ips.length > 0 ? ips[0] : null;
}

/**
 * Generate allowed origins for CORS based on detected IPs
 * @param {number} port - Frontend port (default: 3000)
 * @returns {Array<string>} Array of allowed origin URLs
 */
function generateAllowedOrigins(port = 3000) {
  const baseIPs = ['localhost', '127.0.0.1', ...getNetworkIPs()];
  const origins = [];
  
  baseIPs.forEach(ip => {
    origins.push(`http://${ip}:${port}`);
    origins.push(`https://${ip}:${port}`);
  });
  
  return origins;
}

/**
 * Display network information
 */
function displayNetworkInfo() {
  const networkIPs = getNetworkIPs();
  const primaryIP = getPrimaryNetworkIP();
  
  console.log('\n🌐 Network Information:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Primary Network IP: ${primaryIP || 'Not detected'}`);
  
  if (networkIPs.length > 0) {
    console.log('📡 All Network IPs:');
    networkIPs.forEach((ip, index) => {
      console.log(`   ${index + 1}. ${ip}`);
    });
    
    console.log('\n🔗 Access your application:');
    console.log(`   • Local:   http://localhost:3000`);
    networkIPs.forEach(ip => {
      console.log(`   • Network: http://${ip}:3000`);
    });
  } else {
    console.log('⚠️  No network interfaces detected');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

module.exports = {
  getNetworkIPs,
  getPrimaryNetworkIP,
  generateAllowedOrigins,
  displayNetworkInfo
};