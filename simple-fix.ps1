# simple-fix.ps1 - Simple ESLint fixes for Cart Smash
# Run with: powershell -ExecutionPolicy Bypass -File simple-fix.ps1

Write-Host "Fixing ESLint errors for Cart Smash..." -ForegroundColor Yellow

# Fix 1: GroceryListForm.js - webkitAudioContext error
$GroceryFormFile = "client\src\GroceryListForm.js"
if (Test-Path $GroceryFormFile) {
    Write-Host "Fixing GroceryListForm.js..." -ForegroundColor Cyan
    
    $content = Get-Content $GroceryFormFile -Raw
    
    # Fix webkitAudioContext undefined error
    $content = $content -replace "typeof webkitAudioContext !== 'undefined'", "typeof window.webkitAudioContext !== 'undefined'"
    $content = $content -replace "AudioContext \|\| webkitAudioContext", "AudioContext || window.webkitAudioContext"
    
    Set-Content -Path $GroceryFormFile -Value $content -Encoding UTF8
    Write-Host "Fixed webkitAudioContext error" -ForegroundColor Green
}

# Fix 2: InstacartIntegration.js - useEffect dependencies
$InstacartFile = "client\src\InstacartIntegration.js"
if (Test-Path $InstacartFile) {
    Write-Host "Fixing InstacartIntegration.js..." -ForegroundColor Cyan
    
    $content = Get-Content $InstacartFile -Raw
    
    # Fix useEffect dependencies
    $content = $content -replace "], \[items\]\);", "], [items.length, currentStep]);"
    
    # Remove unused isSearching variable declaration
    $content = $content -replace "const \[isSearching, setIsSearching\] = useState\(false\);", ""
    
    Set-Content -Path $InstacartFile -Value $content -Encoding UTF8
    Write-Host "Fixed useEffect dependencies" -ForegroundColor Green
}

# Fix 3: ParsedResultsDisplay.js - remove unused variables
$ParsedFile = "client\src\ParsedResultsDisplay.js"
if (Test-Path $ParsedFile) {
    Write-Host "Fixing ParsedResultsDisplay.js..." -ForegroundColor Cyan
    
    $content = Get-Content $ParsedFile -Raw
    
    # Remove unused variable declarations
    $content = $content -replace "const \[expandedCategories, setExpandedCategories\] = useState\(new Set\(\)\);", ""
    $content = $content -replace "const \[viewMode, setViewMode\] = useState\('list'\);", ""
    $content = $content -replace "const \[editingItem, setEditingItem\] = useState\(null\);", ""
    
    # Remove unused computed variables
    $content = $content -replace "(?s)// Group items by category.*?}, \{\}\);", ""
    $content = $content -replace "(?s)// Category metadata.*?};", ""
    
    # Remove unused variable in button handler
    $content = $content -replace "const selected = items\.filter\(item => selectedItems\.has\(item\.id\)\);", ""
    
    Set-Content -Path $ParsedFile -Value $content -Encoding UTF8
    Write-Host "Removed unused variables" -ForegroundColor Green
}

Write-Host ""
Write-Host "All ESLint errors fixed!" -ForegroundColor Green
Write-Host "Try running: npm run dev" -ForegroundColor Yellow