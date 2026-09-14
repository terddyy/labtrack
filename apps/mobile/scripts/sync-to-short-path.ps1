# Sync the LABTRACK monorepo into I:\labtrack\build without wiping node_modules or android outputs.
param(
    [string]$ShortRoot,
    [string]$SourceRoot
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "android-build-paths.ps1")

if (-not $ShortRoot) { $ShortRoot = $script:ShortBuildRoot }
if (-not $SourceRoot) { $SourceRoot = $script:RepoRoot }

Initialize-LabtrackAndroidCache

Write-AndroidStep "Syncing monorepo sources to $ShortRoot"
$robocopy = Start-Process -FilePath "robocopy" -ArgumentList @(
    $SourceRoot,
    $ShortRoot,
    "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS", "/NP",
    "/XD", ".git", ".expo", "dist", "artifacts", ".next", "node_modules", "android", "builds",
    "/XJ"
) -Wait -PassThru -NoNewWindow

if ($robocopy.ExitCode -gt 7) {
    throw "robocopy failed with exit code $($robocopy.ExitCode)"
}

$mobileEnv = Join-Path $script:MobileRoot ".env"
$shortMobileEnv = Join-Path $ShortRoot "apps/mobile/.env"
if ((Test-Path $mobileEnv) -and -not (Test-Path $shortMobileEnv)) {
    Copy-Item $mobileEnv $shortMobileEnv
}

Write-Host "Sync complete."
