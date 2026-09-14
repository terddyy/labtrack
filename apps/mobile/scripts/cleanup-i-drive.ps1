# Remove regeneratable LABTRACK Android workspace files from I: to free disk space.
param(
    [switch]$KeepBuild
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "android-build-paths.ps1")

$env:JAVA_HOME = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot" }
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

if (Test-Path (Join-Path $script:ShortBuildRoot "apps\mobile\android\gradlew.bat")) {
    Push-Location (Join-Path $script:ShortBuildRoot "apps\mobile\android")
    try { .\gradlew.bat --stop 2>$null | Out-Null } finally { Pop-Location }
}

$targets = @()
if (-not $KeepBuild) { $targets += $script:ShortBuildRoot }
$targets += Join-Path $script:LabtrackCacheRoot "gradle"

foreach ($target in $targets) {
    if (-not (Test-Path $target)) { continue }
    Write-Host "Deleting $target"
    cmd /c "rmdir /s /q `"$target`"" 2>$null | Out-Null
    if (Test-Path $target) {
        Write-Host "  Some files were locked; retry after closing Android Studio / emulators / Java." -ForegroundColor Yellow
    } else {
        Write-Host "  removed"
    }
}

Write-Host ""
Write-Host "Freed LABTRACK build workspace on I:. Rebuild later with: npm run android:install -w @labtrack/mobile" -ForegroundColor Green
