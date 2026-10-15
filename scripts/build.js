const fs = require('fs');
const path = require('path');

console.log('🚀 Sparklyn Infotech - Preparing static build for Netlify...');

const rootData = path.join(__dirname, '..', 'data', 'db.json');
const publicDataDir = path.join(__dirname, '..', 'public', 'data');
const publicDataFile = path.join(publicDataDir, 'db.json');

// Ensure public/data directory exists
if (!fs.existsSync(publicDataDir)) {
  fs.mkdirSync(publicDataDir, { recursive: true });
}

// Copy db.json to public/data/db.json
if (fs.existsSync(rootData)) {
  fs.copyFileSync(rootData, publicDataFile);
  console.log('✅ Successfully copied db.json to public/data/db.json');
} else {
  console.warn('⚠️ Warning: data/db.json not found in root.');
}

// Ensure public/uploads directory exists and copy uploaded assets
const rootUploads = path.join(__dirname, '..', 'uploads');
const publicUploads = path.join(__dirname, '..', 'public', 'uploads');

if (!fs.existsSync(publicUploads)) {
  fs.mkdirSync(publicUploads, { recursive: true });
}

if (fs.existsSync(rootUploads)) {
  const files = fs.readdirSync(rootUploads);
  for (const file of files) {
    const src = path.join(rootUploads, file);
    const dest = path.join(publicUploads, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
    }
  }
  console.log(`✅ Synced ${files.length} uploaded image(s) to public/uploads/`);
}

console.log('🎉 Build completed successfully! Public directory is ready for Netlify.');
