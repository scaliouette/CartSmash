# Strips Byte Order Mark (BOM) from JS/JSX files in src/
Get-ChildItem -Path ./client/src -Include *.js,*.jsx -Recurse | ForEach-Object {
  (Get-Content $_.FullName -Encoding UTF8) | Set-Content $_.FullName -Encoding UTF8
}
Write-Host "✅ BOM stripped from source files."
