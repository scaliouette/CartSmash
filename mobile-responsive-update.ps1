# mobile-responsive-update.ps1 - Mobile optimization for Cart Smash
# Run with: powershell -ExecutionPolicy Bypass -File mobile-responsive-update.ps1

Write-Host "Making Cart Smash mobile-responsive..." -ForegroundColor Yellow

# 1. Update App.js with mobile-responsive header
$AppFile = "client\src\App.js"
if (Test-Path $AppFile) {
    Write-Host "Updating App.js for mobile..." -ForegroundColor Cyan
    
    $AppContent = @'
import React from 'react';
import GroceryListForm from './GroceryListForm';

function App() {
  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>
          🛒 Cart Smash
        </h1>
        <p style={styles.subtitle}>
          AI-Powered List Destroyer 💥
        </p>
      </header>
      
      <main style={styles.main}>
        <GroceryListForm />
      </main>
      
      <footer style={styles.footer}>
        <p>Made with 💥 by Cart Smash</p>
      </footer>
    </div>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
    color: 'white',
    padding: 'clamp(20px, 5vw, 40px) 20px',
    textAlign: 'center',
    boxShadow: '0 4px 20px rgba(255,107,53,0.3)',
  },
  title: {
    margin: '0',
    fontSize: 'clamp(32px, 8vw, 64px)',
    fontWeight: '900',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    letterSpacing: '2px',
  },
  subtitle: {
    margin: '8px 0 0 0',
    fontSize: 'clamp(14px, 4vw, 22px)',
    opacity: '0.95',
    fontWeight: '600',
  },
  main: {
    flex: '1',
    padding: 'clamp(16px, 4vw, 40px) clamp(16px, 4vw, 20px)',
  },
  footer: {
    backgroundColor: '#2c3e50',
    color: 'white',
    textAlign: 'center',
    padding: 'clamp(16px, 4vw, 20px)',
    marginTop: 'auto',
    fontSize: 'clamp(12px, 3vw, 16px)',
  },
};

export default App;
'@
    
    Set-Content -Path $AppFile -Value $AppContent -Encoding UTF8
    Write-Host "Updated App.js with mobile-responsive design" -ForegroundColor Green
}

# 2. Update index.css with mobile-first CSS
$IndexCssFile = "client\src\index.css"
if (Test-Path $IndexCssFile) {
    Write-Host "Updating index.css for mobile..." -ForegroundColor Cyan
    
    $IndexCssContent = @'
/* Mobile-First CSS for Cart Smash */
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
  font-size: 16px;
  line-height: 1.5;
  
  /* Mobile viewport optimization */
  -webkit-text-size-adjust: 100%;
  -ms-text-size-adjust: 100%;
  
  /* Touch scrolling */
  -webkit-overflow-scrolling: touch;
  overflow-x: hidden;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

/* Mobile-optimized interactions */
button {
  /* Touch-friendly minimum size */
  min-height: 44px;
  min-width: 44px;
  
  /* Remove iOS button styling */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  
  /* Touch feedback */
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  
  /* Prevent zoom on focus (iOS) */
  font-size: 16px;
}

button:hover {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button:active {
  transform: scale(0.98);
}

/* Touch-friendly form inputs */
input, textarea, select {
  /* Prevent zoom on focus (iOS) */
  font-size: 16px;
  
  /* Touch-friendly minimum size */
  min-height: 44px;
  
  /* Remove iOS styling */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  
  /* Better touch targets */
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid #e0e0e0;
  
  /* Touch scrolling for textareas */
  -webkit-overflow-scrolling: touch;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: #FF6B35;
  box-shadow: 0 0 0 3px rgba(255,107,53,0.1);
}

/* Responsive typography */
h1 { font-size: clamp(24px, 6vw, 48px); }
h2 { font-size: clamp(20px, 5vw, 32px); }
h3 { font-size: clamp(18px, 4vw, 24px); }
p { font-size: clamp(14px, 3.5vw, 18px); }

/* Box sizing for all elements */
*, *::before, *::after {
  box-sizing: border-box;
}

/* Animations */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes cartSmashShake {
  0%, 100% { transform: translateX(0) translateY(0); }
  10% { transform: translateX(-2px) translateY(-1px); }
  20% { transform: translateX(2px) translateY(1px); }
  30% { transform: translateX(-2px) translateY(-1px); }
  40% { transform: translateX(2px) translateY(1px); }
  50% { transform: translateX(-1px) translateY(0px); }
  60% { transform: translateX(1px) translateY(0px); }
  70% { transform: translateX(-1px) translateY(0px); }
  80% { transform: translateX(1px) translateY(0px); }
  90% { transform: translateX(0px) translateY(0px); }
}

/* Mobile-specific utilities */
.mobile-hidden {
  display: none;
}

.mobile-only {
  display: block;
}

/* Tablet and up */
@media (min-width: 768px) {
  .mobile-hidden {
    display: block;
  }
  
  .mobile-only {
    display: none;
  }
  
  body {
    font-size: 18px;
  }
  
  @keyframes cartSmashShake {
    0%, 100% { transform: translateX(0) translateY(0); }
    10% { transform: translateX(-4px) translateY(-2px); }
    20% { transform: translateX(4px) translateY(2px); }
    30% { transform: translateX(-3px) translateY(-1px); }
    40% { transform: translateX(3px) translateY(1px); }
    50% { transform: translateX(-2px) translateY(-1px); }
    60% { transform: translateX(2px) translateY(1px); }
    70% { transform: translateX(-1px) translateY(0px); }
    80% { transform: translateX(1px) translateY(0px); }
    90% { transform: translateX(0px) translateY(0px); }
  }
}

/* Desktop */
@media (min-width: 1024px) {
  body {
    font-size: 16px;
  }
}

/* High DPI displays */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  /* Sharper text rendering */
  body {
    -webkit-font-smoothing: subpixel-antialiased;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a1a1a;
    color: #ffffff;
  }
}

/* Reduced motion accessibility */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Focus management for accessibility */
:focus-visible {
  outline: 2px solid #FF6B35;
  outline-offset: 2px;
}

/* Print styles */
@media print {
  body {
    background: white;
    color: black;
  }
  
  button {
    display: none;
  }
}
'@
    
    Set-Content -Path $IndexCssFile -Value $IndexCssContent -Encoding UTF8
    Write-Host "Updated index.css with mobile-first styles" -ForegroundColor Green
}

# 3. Update HTML meta tags for mobile
$HtmlFile = "client\public\index.html"
if (Test-Path $HtmlFile) {
    Write-Host "Updating index.html for mobile..." -ForegroundColor Cyan
    
    $HtmlContent = @'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
    <title>Compare. Save. Smile.</title>
    <meta name="description" content="Compare. Save. Smile.. Smash through your shopping lists with superhuman efficiency!">
    
    <!-- Theme colors -->
    <meta name="theme-color" content="#FF6B35">
    <meta name="msapplication-TileColor" content="#FF6B35">
    
    <!-- iOS specific -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="Cart Smash">
    <meta name="format-detection" content="telephone=no">
    
    <!-- Android specific -->
    <meta name="mobile-web-app-capable" content="yes">
    
    <!-- Prevent zoom on input focus (iOS) -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    
    <!-- Preload critical resources -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    
    <!-- Social sharing -->
    <meta property="og:title" content="Compare. Save. Smile.">
    <meta property="og:description" content="Smash through your grocery lists with AI power! 🛒💥">
    <meta property="og:type" content="website">
    <meta property="og:image" content="%PUBLIC_URL%/cart-smash-social.png">
    
    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Compare. Save. Smile.">
    <meta name="twitter:description" content="Smash through your grocery lists with AI power! 🛒💥">
    
    <!-- Favicon -->
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <link rel="apple-touch-icon" href="%PUBLIC_URL%/logo192.png" />
    <link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
</head>
<body>
    <noscript>You need to enable JavaScript to run Cart Smash.</noscript>
    <div id="root"></div>
</body>
</html>
'@
    
    Set-Content -Path $HtmlFile -Value $HtmlContent -Encoding UTF8
    Write-Host "Updated index.html with mobile optimization" -ForegroundColor Green
}

# 4. Create PWA manifest.json
$ManifestFile = "client\public\manifest.json"
Write-Host "Creating PWA manifest..." -ForegroundColor Cyan

$ManifestContent = @'
{
  "short_name": "Cart Smash",
  "name": "Compare. Save. Smile.",
  "description": "Smash through your grocery lists with AI power!",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    },
    {
      "src": "logo192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "any maskable"
    },
    {
      "src": "logo512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#FF6B35",
  "background_color": "#ffffff",
  "orientation": "portrait-primary",
  "categories": ["productivity", "lifestyle", "food"],
  "screenshots": [
    {
      "src": "screenshot-mobile.png",
      "sizes": "640x1136",
      "type": "image/png"
    }
  ]
}
'@

Set-Content -Path $ManifestFile -Value $ManifestContent -Encoding UTF8
Write-Host "Created PWA manifest.json" -ForegroundColor Green

# 5. Update GroceryListForm.js with mobile-responsive styles
$GroceryFormFile = "client\src\GroceryListForm.js"
if (Test-Path $GroceryFormFile) {
    Write-Host "Adding mobile styles to GroceryListForm.js..." -ForegroundColor Cyan
    
    $content = Get-Content $GroceryFormFile -Raw
    
    # Update the styles object for mobile responsiveness
    $newStyles = @"
const styles = {
  container: {
    maxWidth: '100%',
    margin: '0 auto',
    padding: 'clamp(16px, 4vw, 20px)',
    width: '100%',
  },
  formSection: {
    backgroundColor: '#ffffff',
    padding: 'clamp(20px, 5vw, 40px)',
    borderRadius: 'clamp(12px, 3vw, 20px)',
    boxShadow: '0 8px 32px rgba(255,107,53,0.1), 0 2px 16px rgba(0,0,0,0.05)',
    border: '2px solid rgba(255,107,53,0.1)',
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
  },
  title: {
    color: '#2c3e50',
    marginBottom: 'clamp(12px, 3vw, 16px)',
    fontSize: 'clamp(24px, 6vw, 32px)',
    fontWeight: '800',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: '#666',
    marginBottom: 'clamp(20px, 5vw, 30px)',
    fontSize: 'clamp(14px, 4vw, 18px)',
    textAlign: 'center',
    lineHeight: '1.5',
    padding: '0 clamp(8px, 2vw, 16px)',
  },
  textarea: {
    width: '100%',
    padding: 'clamp(16px, 4vw, 20px)',
    fontSize: 'clamp(14px, 4vw, 16px)',
    border: '3px solid #f0f0f0',
    borderRadius: 'clamp(12px, 3vw, 16px)',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: 'clamp(200px, 40vh, 240px)',
    transition: 'border-color 0.3s, box-shadow 0.3s',
    boxSizing: 'border-box',
    backgroundColor: '#fafafa',
    lineHeight: '1.5',
    touchAction: 'manipulation',
  },
  buttonGroup: {
    marginTop: 'clamp(20px, 5vw, 24px)',
  },
  secondaryButtons: {
    display: 'flex',
    gap: 'clamp(8px, 2vw, 12px)',
    marginTop: 'clamp(12px, 3vw, 16px)',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  button: {
    padding: 'clamp(10px, 3vw, 12px) clamp(16px, 4vw, 24px)',
    fontSize: 'clamp(14px, 3.5vw, 16px)',
    border: 'none',
    borderRadius: 'clamp(8px, 2vw, 12px)',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(6px, 1.5vw, 8px)',
    minHeight: '44px',
    touchAction: 'manipulation',
    userSelect: 'none',
  },
  clearButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    flex: '1',
    maxWidth: '140px',
  },
  sampleButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    flex: '1',
    maxWidth: '140px',
  },
  error: {
    marginTop: 'clamp(16px, 4vw, 20px)',
    padding: 'clamp(12px, 3vw, 16px)',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: 'clamp(8px, 2vw, 12px)',
    border: '2px solid #fcc',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 'clamp(14px, 3.5vw, 16px)',
  },
  apiStatus: {
    position: 'fixed',
    top: 'clamp(12px, 3vw, 16px)',
    right: 'clamp(12px, 3vw, 16px)',
    padding: 'clamp(6px, 2vw, 8px) clamp(12px, 3vw, 16px)',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(6px, 2vw, 8px)',
    fontSize: 'clamp(12px, 3vw, 14px)',
    zIndex: 1000,
    border: '1px solid rgba(255,107,53,0.2)',
  },
  statusDot: {
    width: 'clamp(8px, 2vw, 10px)',
    height: 'clamp(8px, 2vw, 10px)',
    borderRadius: '50%',
    display: 'inline-block',
  },
  options: {
    marginTop: 'clamp(12px, 3vw, 16px)',
    marginBottom: 'clamp(12px, 3vw, 16px)',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(8px, 2vw, 12px)',
    fontSize: 'clamp(14px, 3.5vw, 16px)',
    cursor: 'pointer',
    fontWeight: '600',
    color: '#333',
    padding: 'clamp(8px, 2vw, 12px)',
    touchAction: 'manipulation',
  },
};
"@
    
    # Replace the styles object
    $content = $content -replace "(?s)const styles = \{.*?\};", $newStyles
    
    Set-Content -Path $GroceryFormFile -Value $content -Encoding UTF8
    Write-Host "Added mobile-responsive styles to GroceryListForm.js" -ForegroundColor Green
}

Write-Host ""
Write-Host "Mobile optimization complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Mobile features added:" -ForegroundColor Cyan
Write-Host "  - Touch-friendly button sizes (44px minimum)" -ForegroundColor Green
Write-Host "  - Responsive typography with clamp()" -ForegroundColor Green
Write-Host "  - Mobile-first CSS approach" -ForegroundColor Green
Write-Host "  - iOS/Android specific optimizations" -ForegroundColor Green
Write-Host "  - PWA manifest for app-like experience" -ForegroundColor Green
Write-Host "  - Touch scrolling and gesture support" -ForegroundColor Green
Write-Host "  - Viewport optimization" -ForegroundColor Green
Write-Host "  - Accessibility improvements" -ForegroundColor Green
Write-Host ""
Write-Host "Test on mobile:" -ForegroundColor Yellow
Write-Host "  1. npm run dev" -ForegroundColor White
Write-Host "  2. Open Chrome DevTools" -ForegroundColor White
Write-Host "  3. Toggle device toolbar (mobile view)" -ForegroundColor White
Write-Host "  4. Test on iPhone/Android simulators" -ForegroundColor White
Write-Host ""
Write-Host "Cart Smash is now mobile-ready!" -ForegroundColor Magenta