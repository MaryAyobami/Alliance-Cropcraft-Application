#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Alliance CropCraft Deployment Readiness Check\n');

const checks = [];

// Check Node.js version
function checkNodeVersion() {
  const nodeVersion = process.version;
  const minVersion = 'v16.0.0';
  const isValid = nodeVersion >= minVersion;
  
  checks.push({
    name: 'Node.js Version',
    status: isValid ? 'PASS' : 'FAIL',
    message: `${nodeVersion} ${isValid ? '✅' : '❌ (minimum v16.0.0 required)'}`
  });
}

// Check package dependencies
function checkDependencies() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {}).length;
    const devDependencies = Object.keys(packageJson.devDependencies || {}).length;
    
    checks.push({
      name: 'Frontend Dependencies',
      status: dependencies > 0 ? 'PASS' : 'FAIL',
      message: `${dependencies} production, ${devDependencies} development ${dependencies > 0 ? '✅' : '❌'}`
    });

    // Check server dependencies
    if (fs.existsSync('server/package.json')) {
      const serverPackage = JSON.parse(fs.readFileSync('server/package.json', 'utf8'));
      const serverDeps = Object.keys(serverPackage.dependencies || {}).length;
      
      checks.push({
        name: 'Backend Dependencies',
        status: serverDeps > 0 ? 'PASS' : 'FAIL',
        message: `${serverDeps} dependencies ${serverDeps > 0 ? '✅' : '❌'}`
      });
    }
  } catch (error) {
    checks.push({
      name: 'Dependencies Check',
      status: 'FAIL',
      message: `Error reading package.json: ${error.message} ❌`
    });
  }
}

// Check environment configuration
function checkEnvironmentConfig() {
  const envExample = 'server/.env.example';
  const envFile = 'server/.env';
  
  const hasExample = fs.existsSync(envExample);
  const hasEnv = fs.existsSync(envFile);
  
  checks.push({
    name: 'Environment Configuration',
    status: hasExample ? 'PASS' : 'WARN',
    message: `Example file: ${hasExample ? 'Found' : 'Missing'} ${hasExample ? '✅' : '⚠️'}`
  });

  if (hasEnv) {
    checks.push({
      name: 'Environment File',
      status: 'INFO',
      message: 'Local .env file found 📄'
    });
  }
}

// Check build configuration
function checkBuildConfig() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const hasVite = packageJson.devDependencies?.vite || packageJson.dependencies?.vite;
    const hasBuildScript = packageJson.scripts?.build;
    
    checks.push({
      name: 'Build Configuration',
      status: (hasVite && hasBuildScript) ? 'PASS' : 'FAIL',
      message: `Vite: ${hasVite ? 'Yes' : 'No'}, Build script: ${hasBuildScript ? 'Yes' : 'No'} ${(hasVite && hasBuildScript) ? '✅' : '❌'}`
    });
  } catch (error) {
    checks.push({
      name: 'Build Configuration',
      status: 'FAIL',
      message: `Error checking build config: ${error.message} ❌`
    });
  }
}

// Check deployment files
function checkDeploymentFiles() {
  const files = [
    'vercel.json',
    'README.md',
    'index.html',
    'src/main.jsx',
    'tailwind.config.js'
  ];
  
  const missingFiles = files.filter(file => !fs.existsSync(file));
  
  checks.push({
    name: 'Deployment Files',
    status: missingFiles.length === 0 ? 'PASS' : 'WARN',
    message: missingFiles.length === 0 
      ? 'All deployment files present ✅'
      : `Missing: ${missingFiles.join(', ')} ⚠️`
  });
}

// Check database schema
function checkDatabaseSchema() {
  const schemaInReadme = fs.existsSync('README.md') && 
    fs.readFileSync('README.md', 'utf8').includes('CREATE TABLE');
  
  checks.push({
    name: 'Database Schema',
    status: schemaInReadme ? 'PASS' : 'WARN',
    message: `Schema documentation: ${schemaInReadme ? 'Found in README' : 'Not found'} ${schemaInReadme ? '✅' : '⚠️'}`
  });
}

// Check security configurations
function checkSecurity() {
  const vercelConfig = fs.existsSync('vercel.json') && 
    fs.readFileSync('vercel.json', 'utf8').includes('X-Content-Type-Options');
  
  checks.push({
    name: 'Security Headers',
    status: vercelConfig ? 'PASS' : 'WARN',
    message: `Security headers configured: ${vercelConfig ? 'Yes' : 'No'} ${vercelConfig ? '✅' : '⚠️'}`
  });
}

// Run test build
function testBuild() {
  try {
    console.log('Running test build...');
    execSync('npm run build', { stdio: 'pipe' });
    
    const distExists = fs.existsSync('dist');
    const indexExists = fs.existsSync('dist/index.html');
    
    checks.push({
      name: 'Build Test',
      status: (distExists && indexExists) ? 'PASS' : 'FAIL',
      message: `Build output: ${distExists ? 'Created' : 'Missing'}, Index: ${indexExists ? 'Present' : 'Missing'} ${(distExists && indexExists) ? '✅' : '❌'}`
    });
  } catch (error) {
    checks.push({
      name: 'Build Test',
      status: 'FAIL',
      message: `Build failed: ${error.message.substring(0, 100)}... ❌`
    });
  }
}

// Run all checks
checkNodeVersion();
checkDependencies();
checkEnvironmentConfig();
checkBuildConfig();
checkDeploymentFiles();
checkDatabaseSchema();
checkSecurity();
testBuild();

// Display results
console.log('='.repeat(60));
console.log('DEPLOYMENT READINESS REPORT');
console.log('='.repeat(60));

const passed = checks.filter(c => c.status === 'PASS').length;
const failed = checks.filter(c => c.status === 'FAIL').length;
const warnings = checks.filter(c => c.status === 'WARN').length;
const info = checks.filter(c => c.status === 'INFO').length;

checks.forEach(check => {
  const icon = {
    'PASS': '✅',
    'FAIL': '❌',
    'WARN': '⚠️',
    'INFO': 'ℹ️'
  }[check.status];
  
  console.log(`${icon} ${check.name}: ${check.message}`);
});

console.log('\n' + '='.repeat(60));
console.log(`SUMMARY: ${passed} passed, ${failed} failed, ${warnings} warnings, ${info} info`);

if (failed > 0) {
  console.log('\n❌ DEPLOYMENT NOT READY - Please fix the failed checks above');
  process.exit(1);
} else if (warnings > 0) {
  console.log('\n⚠️  DEPLOYMENT READY WITH WARNINGS - Consider addressing warnings');
  process.exit(0);
} else {
  console.log('\n🚀 DEPLOYMENT READY - All checks passed!');
  console.log('\nNext steps:');
  console.log('1. Set up environment variables in your deployment platform');
  console.log('2. Configure database connection');
  console.log('3. Set up domain and SSL');
  console.log('4. Deploy backend and frontend');
  process.exit(0);
}