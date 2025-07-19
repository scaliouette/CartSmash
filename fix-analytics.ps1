<#
.SYNOPSIS
  Patch ParsingAnalyticsDashboard.js to avoid null‐overview runtime errors.

.DESCRIPTION
  - Finds your ParsingAnalyticsDashboard.js under the given root  
  - Makes a backup to ParsingAnalyticsDashboard.js.bak  
  - Changes initial state from useState(null) → useState(generateMockAnalytics())  
  - Inserts a guard at start of renderOverviewCards so it returns early if analytics.overview is missing  
#>

param(
    [string]$ProjectRoot = "."
)

# 1. Locate the file
$target = Get-ChildItem -Path $ProjectRoot -Filter "ParsingAnalyticsDashboard.js" -Recurse -File | Select-Object -First 1
if (-not $target) {
    Write-Error "ParsingAnalyticsDashboard.js not found under $ProjectRoot"
    exit 1
}
$path = $target.FullName
Write-Host "Found: $path"

# 2. Back it up
Copy-Item -Path $path -Destination "$path.bak" -Force
Write-Host "Backed up to $($path).bak"

# 3. Load content
$content = Get-Content -Path $path -Raw

# 4. Seed analytics state
$content = [regex]::Replace(
    $content,
    'useState\(\s*null\s*\)',
    'useState(generateMockAnalytics())'
)

# 5. Inject overview guard
$lines      = $content -split "`r?`n"
$output     = New-Object System.Collections.Generic.List[string]
$guardAdded = $false

foreach ($line in $lines) {
    $output.Add($line)
    if (-not $guardAdded -and $line -match '^\s*const\s+renderOverviewCards\s*=\s*\(\)\s*=>\s*\{') {
        $output.Add('    if (!analytics?.overview) { return null }')
        $guardAdded = $true
    }
}

# 6. Write patched file
$patched = $output -join "`r`n"
Set-Content -Path $path -Value $patched

Write-Host "Updated ParsingAnalyticsDashboard.js: seeded state and added overview guard."
