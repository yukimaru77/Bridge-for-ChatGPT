$ErrorActionPreference = 'Stop'

$zipName = "release.zip"
if (Test-Path $zipName) { Remove-Item $zipName }

$include = @(
    "manifest.json",
    "background.js",
    "contentScript.js",
    "promptHook.js",
    "options.html",
    "options.js",
    "README.md",
    "LICENSE",
    "vendor",
    "icons"
)

$tmp = New-Item -ItemType Directory -Force -Path ".pack_tmp"
try {
    foreach ($item in $include) {
        Copy-Item $item -Destination $tmp -Recurse -Force -ErrorAction Stop
    }
    Compress-Archive -Path "$($tmp.FullName)\*" -DestinationPath $zipName -Force
    Write-Host "Created $zipName"
} finally {
    Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
