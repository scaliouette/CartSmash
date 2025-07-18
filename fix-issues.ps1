# fix-issues.ps1
[CmdletBinding()]
param(
    [string]$ProjectRoot = "."
)

function Backup-File {
    param([string]$Path)
    Copy-Item -Path $Path -Destination "$Path.bak" -Force
    Write-Host "Backed up $(Split-Path $Path -Leaf) → $(Split-Path $Path -Leaf).bak"
}

function Fix-Cart {
    $file = Join-Path $ProjectRoot "cart.js"
    if (Test-Path $file) {
        Write-Host "Fixing spread syntax in cart.js..."
        Backup-File $file
        $text = Get-Content -Path $file -Raw
        $text = $text -replace '\[\s*\.cart\s*,\s*\.newItems\s*\]', '[...cart, ...newItems]'
        $text = $text -replace '\[\s*\.newItems\s*,\s*\.cart\s*\]', '[...newItems, ...cart]'
        Set-Content -Path $file -Value $text
    }
}

function Fix-Settings {
    $file = Join-Path $ProjectRoot "settings.js"
    if (Test-Path $file) {
        Write-Host "Fixing object spread syntax in settings.js..."
        Backup-File $file
        $text = Get-Content -Path $file -Raw
        $text = $text -replace '\{\s*\.DEFAULT_SETTINGS', '{ ...DEFAULT_SETTINGS'
        $text = $text -replace '\{\s*\.currentSettings', '{ ...currentSettings'
        Set-Content -Path $file -Value $text
    }
}

function Polyfill-Process {
    $file = Join-Path $ProjectRoot "AdminDashboard.js"
    if (Test-Path $file) {
        Write-Host "Injecting process.env stub into AdminDashboard.js..."
        Backup-File $file
        $lines = Get-Content -Path $file
        # Find last import line
        $lastImportIndex = -1
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match '^\s*import ') { $lastImportIndex = $i }
        }
        if ($lastImportIndex -ge 0) {
            $before = $lines[0..$lastImportIndex]
            $after = if ($lastImportIndex + 1 -lt $lines.Count) {
                $lines[($lastImportIndex+1)..($lines.Count-1)]
            } else { @() }
            $newLines = $before + 'const process = { env: {} };' + $after
            $newLines | Set-Content -Path $file
        }
    }
}

function Add-StylesStub {
    param([string]$RelPath)
    $file = Join-Path $ProjectRoot $RelPath
    if (Test-Path $file) {
        $raw = Get-Content -Path $file -Raw
        if ($raw -notmatch 'const\s+styles\s*=') {
            Write-Host "Adding styles stub to $RelPath..."
            Backup-File $file
            $lines = Get-Content -Path $file
            $lastImportIndex = -1
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match '^\s*import ') { $lastImportIndex = $i }
            }
            if ($lastImportIndex -ge 0) {
                $before = $lines[0..$lastImportIndex]
                $after = if ($lastImportIndex + 1 -lt $lines.Count) {
                    $lines[($lastImportIndex+1)..($lines.Count-1)]
                } else { @() }
                $new = $before + 'const styles = {};' + $after
                $new | Set-Content -Path $file
            }
        }
    }
}

Write-Host ">>> Running automated fixes in $ProjectRoot <<<"
Fix-Cart
Fix-Settings
Polyfill-Process
Add-StylesStub "ParsedResultsDisplay.js"
Add-StylesStub "AIParsingSettings.js"
Write-Host "✅ Done. Check the .bak files if you need to roll back any changes."
