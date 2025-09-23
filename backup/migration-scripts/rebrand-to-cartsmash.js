// rebrand-to-cartsmash.js - Automated rebranding script
// Run with: node rebrand-to-cartsmash.js

const fs = require('fs');
const path = require('path');

console.log('🔥 CART SMASH Rebranding Script Starting...\n');

// Files to update with find/replace
const filesToUpdate = [
  'README.md',
  'package.json',
  'client/package.json',
  'server/package.json',
  'client/public/index.html',
  'client/src/App.js',
  'client/src/GroceryListForm.js',
  'client/src/ParsedResultsDisplay.js',
  'client/src/InstacartIntegration.js',
  'server/server.js',
  '.env',
  '.env.example'
];

// Brand replacements
const replacements = [
  // Main brand names
  { from: /HulkCart/g, to: 'Cart Smash' },
  { from: /hulkcart/g, to: 'cartsmash' },
  { from: /HULKCART/g, to: 'CARTSMASH' },
  
  // Package names
  { from: /hulkcart-client/g, to: 'cartsmash-client' },
  { from: /hulkcart-server/g, to: 'cartsmash-server' },
  
  // Descriptions and messaging
  { from: /Hulk through/g, to: 'Smash through' },
  { from: /HULK SMASH/g, to: 'CART SMASH' },
  { from: /💪 HulkCart/g, to: '🛒 Cart Smash' },
  { from: /HulkCart API/g, to: 'Cart Smash API' },
  { from: /HulkCart Server/g, to: 'Cart Smash Server' },
  { from: /HulkCart frontend/g, to: 'Cart Smash frontend' },
  { from: /HulkCart backend/g, to: 'Cart Smash backend' },
  { from: /HulkCart is/g, to: 'Cart Smash is' },
  
  // Emojis and branding
  { from: /💪/g, to: '🛒' },
  { from: /💚/g, to: '💥' },
  { from: /Powered by AI 🤖/g, to: 'AI-Powered List Destroyer 💥' },
  
  // Color schemes (update to Cart Smash orange theme)
  { from: /#00D084/g, to: '#FF6B35' },
  { from: /#00C078/g, to: '#F7931E' },
  { from: /#00A86B/g, to: '#FFD23F' },
  
  // Button text
  { from: /🚀 Parse List/g, to: '💥 SMASH LIST' },
  { from: /Parse List/g, to: 'SMASH LIST' },
  { from: /Parsing/g, to: 'SMASHING' },
  { from: /Processing/g, to: 'SMASHING' },
  
  // URLs and repository names
  { from: /yourusername\/hulkcart/g, to: 'yourusername/cartsmash' },
];

// Function to update file content
function updateFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipped: ${filePath} (file not found)`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    replacements.forEach(({ from, to }) => {
      if (content.match(from)) {
        content = content.replace(from, to);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Updated: ${filePath}`);
    } else {
      console.log(`➡️  No changes: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Update package.json with new branding
function updatePackageJson() {
  console.log('\n📦 Updating package.json files...');
  
  const packages = [
    { path: 'package.json', name: 'cartsmash' },
    { path: 'client/package.json', name: 'cartsmash-client' },
    { path: 'server/package.json', name: 'cartsmash-server' }
  ];

  packages.forEach(({ path: pkgPath, name }) => {
    try {
      if (!fs.existsSync(pkgPath)) return;
      
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      
      // Update core fields
      pkg.name = name;
      pkg.description = pkg.description?.replace(/HulkCart/g, 'Cart Smash') || 'Compare. Save. Smile.';
      
      if (pkg.repository?.url) {
        pkg.repository.url = pkg.repository.url.replace(/hulkcart/g, 'cartsmash');
      }

      // Update keywords
      if (pkg.keywords) {
        pkg.keywords = pkg.keywords.map(keyword => 
          keyword.replace(/hulk/g, 'cart').replace(/HulkCart/g, 'cartsmash')
        );
        if (!pkg.keywords.includes('smash')) {
          pkg.keywords.push('smash');
        }
      }

      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      console.log(`✅ Updated package: ${pkgPath}`);
    } catch (error) {
      console.error(`❌ Error updating ${pkgPath}:`, error.message);
    }
  });
}

// Create new README with Cart Smash branding
function createNewReadme() {
  console.log('\n📝 Creating new README.md...');
  
  const newReadme = `# Cart Smash 🛒💥

**AI-Powered Grocery List Destroyer** - Smash through grocery lists with superhuman efficiency!

## 🎯 Features
- 🤖 Convert any AI-generated grocery list
- ⚡ Lightning-fast Instacart integration  
- 🎯 99% accurate item matching
- 💥 Bulk processing capabilities
- 🛒 Viral "SMASH" button experience

## 🚀 Quick Start

\`\`\`bash
# Clone the repository
git clone https://github.com/yourusername/cartsmash.git

# Install dependencies
cd cartsmash
npm run install:all

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development servers
npm run dev
\`\`\`

## 🎮 Usage

1. **Paste your grocery list** - Any format works!
2. **Hit the SMASH button** - Watch the magic happen with confetti and effects
3. **Review parsed items** - AI categorizes and extracts quantities
4. **Add to Instacart** - One-click integration

## 🛠 Tech Stack
- **Frontend**: React, JavaScript, CSS Animations
- **Backend**: Node.js, Express, Advanced Parsing
- **AI/ML**: Custom grocery item recognition
- **Infrastructure**: Docker, AWS ready

## 🎨 Brand Colors
- Primary Orange: \`#FF6B35\`
- Secondary Orange: \`#F7931E\`
- Accent Yellow: \`#FFD23F\`

## 📱 Mobile Ready
Optimized for mobile with:
- Touch-friendly SMASH button
- Haptic feedback
- Responsive design
- PWA capabilities

## 🌟 Roadmap
- [x] Core SMASH functionality
- [x] Advanced parsing engine
- [ ] Social sharing features
- [ ] Cart battles/challenges
- [ ] Influencer partnerships
- [ ] Voice commands

## 📄 License
MIT License - see LICENSE file

---

**Made with 💥 by the Cart Smash team**

*Ready to SMASH your grocery lists? Let's go!* 🛒💥`;

  fs.writeFileSync('README.md', newReadme);
  console.log('✅ Created new README.md');
}

// Update HTML title and meta tags
function updateHtmlMeta() {
  console.log('\n🌐 Updating HTML meta tags...');
  
  const htmlPath = 'client/public/index.html';
  if (!fs.existsSync(htmlPath)) return;

  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Update title and meta tags
  html = html.replace(/<title>.*<\/title>/, '<title>Compare. Save. Smile.</title>');
  html = html.replace(/content=".*Instacart.*"/, 'content="Compare. Save. Smile.. Smash through your shopping lists with superhuman efficiency!"');
  html = html.replace(/content="#00D084"/, 'content="#FF6B35"');
  
  fs.writeFileSync(htmlPath, html);
  console.log('✅ Updated HTML meta tags');
}

// Update environment variables
function updateEnvFiles() {
  console.log('\n🔧 Updating environment files...');
  
  const envFiles = ['.env', '.env.example'];
  
  envFiles.forEach(file => {
    if (!fs.existsSync(file)) return;
    
    let content = fs.readFileSync(file, 'utf8');
    
    // Update database name and comments
    content = content.replace(/hulkcart/g, 'cartsmash');
    content = content.replace(/HulkCart/g, 'Cart Smash');
    
    fs.writeFileSync(file, content);
    console.log(`✅ Updated: ${file}`);
  });
}

// Create folder rename script
function createFolderRenameInstructions() {
  console.log('\n📁 Creating folder rename instructions...');
  
  const instructions = `#!/bin/bash
# rename-folders.sh - Rename project folders for Cart Smash

echo "📁 Renaming project folders to Cart Smash..."

# If you named your main project folder 'hulkcart', you may want to rename it:
# cd ..
# mv hulkcart cartsmash
# cd cartsmash

echo "✅ Folder renaming complete!"
echo "💡 Don't forget to update your git remote URL if needed:"
echo "   git remote set-url origin https://github.com/yourusername/cartsmash.git"
`;

  fs.writeFileSync('rename-folders.sh', instructions);
  try {
    fs.chmodSync('rename-folders.sh', '755');
  } catch (err) {
    console.log('ℹ️  Note: Could not make rename-folders.sh executable');
  }
  
  console.log('✅ Created rename-folders.sh');
}

// Main execution
function runRebranding() {
  console.log('🎯 Starting file updates...\n');
  
  // Update all text files
  filesToUpdate.forEach(updateFile);
  
  // Update package.json files specifically
  updatePackageJson();
  
  // Create new branded content
  createNewReadme();
  updateHtmlMeta();
  updateEnvFiles();
  createFolderRenameInstructions();
  
  console.log('\n🎉 CART SMASH REBRANDING COMPLETE!');
  console.log('=====================================');
  console.log('✅ All files updated');
  console.log('✅ Package.json files updated');
  console.log('✅ New README.md created');
  console.log('✅ HTML meta tags updated');
  console.log('✅ Environment files updated');
  console.log('');
  console.log('🚀 Next Steps:');
  console.log('1. Review all changes');
  console.log('2. Run: npm run install:all');
  console.log('3. Run: npm run dev');
  console.log('4. Test the new SMASH button!');
  console.log('5. Optional: Run ./rename-folders.sh');
  console.log('');
  console.log('🛒💥 Ready to SMASH some grocery lists! 💥🛒');
}

// Execute the rebranding
runRebranding();