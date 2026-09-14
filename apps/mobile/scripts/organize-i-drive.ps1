# Organize I: into project folders so LABTRACK Android builds do not inherit Inventala node_modules.
# Before: I:\package.json, I:\node_modules, I:\labtrack\build (broken autolinking)
# After:  I:\inventala\... and I:\labtrack\build + I:\labtrack\gradle
param(
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"

$driveRoot = "I:\"
$inventalaRoot = "I:\inventala"
$labtrackRoot = "I:\labtrack"
$keepAtRoot = @("inventala", "labtrack", "README.md", "System Volume Information", "`$RECYCLE.BIN")

if (-not (Test-Path $driveRoot)) {
    Write-Host "Drive I: is not available; skipping I: layout (LABTRACK builds use C:\lt by default)." -ForegroundColor Yellow
    exit 0
}

function Write-Step([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

Write-Step "Creating folder layout on I:"
foreach ($path in @($inventalaRoot, "$labtrackRoot\build")) {
    if (-not (Test-Path $path)) {
        if ($WhatIf) {
            Write-Host "[whatif] mkdir $path"
        } else {
            New-Item -ItemType Directory -Path $path -Force | Out-Null
        }
    }
}

$readme = @"
# I: development drive layout

Keep each project in its own top-level folder. Do not put app node_modules at I:\ root.

## Folders

- inventala/  Inventala mobile app (Expo / Android)
- labtrack/   LABTRACK Android build workspace
  - build/    Short-path monorepo copy used for native Android builds (safe to delete when not building)
- Gradle cache stays in your user profile (.gradle), not on I:, to save space.

## LABTRACK commands (from repo on C:)

npm run android:install -w @labtrack/mobile
npm run android:emulator -w @labtrack/mobile
npm run android:cleanup-i-drive -w @labtrack/mobile
"@

$readmePath = Join-Path $driveRoot "README.md"
if ($WhatIf) {
    Write-Host "[whatif] write $readmePath"
} else {
    Set-Content -Path $readmePath -Value $readme -Encoding UTF8
}

$inventalaMarkers = @("package.json", "app.json", "node_modules")
$needsMove = (Test-Path (Join-Path $driveRoot "package.json")) -and -not (Test-Path (Join-Path $inventalaRoot "package.json"))

if (-not $needsMove) {
    Write-Host "Inventala already appears organized under $inventalaRoot (or drive root is empty)."
} else {
    Write-Step "Moving Inventala project from I:\ root to $inventalaRoot"
    $entries = Get-ChildItem $driveRoot -Force | Where-Object { $keepAtRoot -notcontains $_.Name }

    foreach ($entry in $entries) {
        $target = Join-Path $inventalaRoot $entry.Name
        if ($WhatIf) {
            Write-Host "[whatif] move $($entry.FullName) -> $target"
            continue
        }

        if (Test-Path $target) {
            Write-Host "Skipping $($entry.Name); already exists at destination."
            continue
        }

        Write-Host "Moving $($entry.Name)"
        Move-Item -LiteralPath $entry.FullName -Destination $target
    }
}

Write-Step "Cleaning stale LABTRACK autolinking cache paths"
$stalePaths = @(
    "C:\Users\Terddy.LAPTOP-CVSRCLGL\Desktop\Projects\inventala\inventala-mobile-app\labtrack",
    "I:\labtrack\build\apps\mobile\android"
)
foreach ($stale in $stalePaths) {
    if (Test-Path $stale) {
        if ($WhatIf) {
            Write-Host "[whatif] remove $stale"
        } else {
            Write-Host "Removing $stale"
            Remove-Item $stale -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host ""
Write-Host "I: drive layout ready." -ForegroundColor Green
Write-Host "  $inventalaRoot"
Write-Host "  $labtrackRoot\build"
if ($needsMove) {
    Write-Host ""
    Write-Host "Open Inventala from $inventalaRoot from now on (not I:\ root)." -ForegroundColor Yellow
}
