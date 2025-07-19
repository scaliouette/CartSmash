# fix-parsing-analytics.ps1

param(
    [string]$FilePath = "src/ParsingAnalyticsDashboard.js"
)

if (-Not (Test-Path $FilePath)) {
    Write-Error "File not found: $FilePath"
    exit 1
}

Write-Host "Patching guard in $FilePath..."

# Read entire file
$content = Get-Content $FilePath -Raw

# 1) Change `if (loading) {` to `if (loading || !analytics) {`
$content = $content -replace 'if\s*\(\s*loading\s*\)\s*{', 'if (loading || !analytics) {'

# Optionally: ensure your catch block always sets analytics (uncomment to enable)
# $content = $content -replace 'catch\s*\(\s*error\s*\)\s*{', 'catch (error) {`n    console.error("Failed to load analytics:", error);`n    setAnalytics(generateMockAnalytics());'

# Write it back
Set-Content $FilePath $content -Encoding UTF8

Write-Host "✅ Done. Don’t forget to restart your dev server."
