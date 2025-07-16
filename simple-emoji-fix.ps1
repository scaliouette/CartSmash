# simple-emoji-fix.ps1 - Simple fix for corrupted emojis
# Run with: powershell -ExecutionPolicy Bypass -File simple-emoji-fix.ps1

Write-Host "Fixing corrupted emojis in Cart Smash files..." -ForegroundColor Yellow

$files = @(
    "client\src\GroceryListForm.js",
    "client\src\App.js", 
    "client\src\ParsedResultsDisplay.js",
    "client\src\InstacartIntegration.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Fixing $file..." -ForegroundColor Cyan
        
        $content = Get-Content $file -Raw -Encoding UTF8
        
        # Fix specific corrupted emoji patterns
        $content = $content -replace "🛒", "🛒"
        $content = $content -replace "🔥", "🔥"
        $content = $content -replace "💥", "💥"
        $content = $content -replace "🚀", "🚀"
        $content = $content -replace "📋", "📋"
        $content = $content -replace "🗑️", "🗑️"
        $content = $content -replace "âŒ", "❌"
        $content = $content -replace "âœ…", "✅"
        
        # Fix specific text patterns
        $content = $content -replace "Paste Your Grocery List", "🛒 Paste Your Grocery List"
        $content = $content -replace "Use advanced SMASH parsing", "🔥 Use advanced SMASH parsing"
        $content = $content -replace "SMASH MY LIST", "🛒 SMASH MY LIST"
        $content = $content -replace "SMASHING\.\.\.", "💥 SMASHING..."
        $content = $content -replace "CART SMASH ACTIVATED!", "🚀 CART SMASH ACTIVATED!"
        $content = $content -replace "Clear", "🗑️ Clear"
        $content = $content -replace "Try Sample", "📋 Try Sample"
        
        # Save with UTF8 encoding
        $utf8 = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($file, $content, $utf8)
        
        Write-Host "  Fixed emojis in $file" -ForegroundColor Green
    } else {
        Write-Host "  Skipped $file (not found)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Emoji fix complete!" -ForegroundColor Green
Write-Host "Test with: npm run dev" -ForegroundColor Yellow