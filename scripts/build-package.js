const fs = require('fs');
const path = require('path');

// Ana package.json'u oku
const packagePath = path.join(__dirname, '..', 'package.json');
const distPackagePath = path.join(__dirname, '..', 'dist', 'package.json');

const originalPackage = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Yalnızca gerekli alanları al
const distPackage = {
  name: originalPackage.name,
  version: originalPackage.version,
  description: originalPackage.description,
  main: originalPackage.main.replace('dist/src/', './'),
  types: originalPackage.types.replace('dist/src/', './'),
  author: originalPackage.author,
  license: originalPackage.license,
  repository: originalPackage.repository,
  bugs: originalPackage.bugs,
  homepage: originalPackage.homepage,
  keywords: originalPackage.keywords,
  publishConfig: originalPackage.publishConfig,
  engines: originalPackage.engines,
  dependencies: originalPackage.dependencies,
  peerDependencies: originalPackage.peerDependencies,
  peerDependenciesMeta: originalPackage.peerDependenciesMeta
};

// Dist klasörünü oluştur (eğer yoksa)
const distDir = path.dirname(distPackagePath);
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Optimized package.json'u yaz
fs.writeFileSync(distPackagePath, JSON.stringify(distPackage, null, 2));

console.log('✅ Optimized package.json created in dist folder');
console.log('Excluded fields: devDependencies, scripts, files, lint-staged, etc.'); 