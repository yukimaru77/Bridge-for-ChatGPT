$ErrorActionPreference = "Stop"

# Output archive path
$dest = "release.zip"

# Files and directories to include
$paths = @(
  "manifest.json",
  "background.js",
  "contentScript.js",
  "promptHook.js",
  "options.html",
  "options.js",
  "vendor",
  "LICENSE"
)

# Filter out missing paths to avoid failures
$existing = $paths | Where-Object { Test-Path $_ }

if (-not $existing) {
  Write-Error "No files found to package."
}

if (Test-Path $dest) {
  Remove-Item $dest -Force
}

Compress-Archive -Path $existing -DestinationPath $dest -Force

Write-Host "Created $dest with the following entries:"
$existing | ForEach-Object { Write-Host " - $_" }
