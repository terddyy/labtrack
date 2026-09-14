# Repeatable LABTRACK Android emulator launcher using I:\labtrack\build.
param(
    [string]$ShortRoot,
    [string]$SourceRoot,
    [string]$AvdName = "Labtrack_Test_API_36",
    [int]$MetroPort = 8081,
    [switch]$SkipBuild,
    [switch]$SkipEmulator,
    [switch]$SkipSync,
    [switch]$FreshSync
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "android-build-paths.ps1")

if (-not $ShortRoot) { $ShortRoot = $script:ShortBuildRoot }
if (-not $SourceRoot) { $SourceRoot = $script:RepoRoot }

function Wait-EmulatorBoot {
    param($Adb)

    & $Adb wait-for-device | Out-Null
    $deadline = (Get-Date).AddMinutes(5)
    do {
        $booted = (& $Adb shell getprop sys.boot_completed 2>$null).Trim()
        if ($booted -eq "1") { return }
        Start-Sleep -Seconds 2
    } while ((Get-Date) -lt $deadline)
    throw "Emulator did not finish booting within 5 minutes."
}

function Test-DevClientInstalled {
    param($Adb, $PackageName)

    $packages = & $Adb shell pm list packages $PackageName 2>$null
    return [bool]($packages -match [regex]::Escape($PackageName))
}

$build = Set-LabtrackAndroidBuildEnvironment -ProjectRoot $ShortRoot -MetroPort $MetroPort

if ($FreshSync -and (Test-Path $ShortRoot)) {
    Write-Host "Removing prior short build root $ShortRoot"
    cmd /c "rmdir /s /q `"$ShortRoot`"" | Out-Null
}

if (-not $SkipSync) {
    if (-not (Test-Path (Join-Path $ShortRoot "package.json"))) {
        Write-AndroidStep "Creating short build root at $ShortRoot"
        & (Join-Path $PSScriptRoot "sync-to-short-path.ps1") -ShortRoot $ShortRoot -SourceRoot $SourceRoot
        Push-Location $ShortRoot
        try {
            npm install --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
            npm run build:shared
            if ($LASTEXITCODE -ne 0) { throw "shared build failed." }
        } finally {
            Pop-Location
        }
    } else {
        Write-AndroidStep "Syncing latest sources to $ShortRoot"
        & (Join-Path $PSScriptRoot "sync-to-short-path.ps1") -ShortRoot $ShortRoot -SourceRoot $SourceRoot
        Push-Location $ShortRoot
        try {
            npm run build:shared
            if ($LASTEXITCODE -ne 0) { throw "shared build failed." }
        } finally {
            Pop-Location
        }
    }
}

if (-not $SkipEmulator) {
    Write-AndroidStep "Booting Android emulator ($AvdName)"
    $devices = & $build.Adb devices
    if ($devices -notmatch "emulator-\d+\s+device") {
        Start-Process -FilePath $build.Emulator -ArgumentList @("-avd", $AvdName) -WindowStyle Normal | Out-Null
    }
    Wait-EmulatorBoot -Adb $build.Adb
}

Write-Host (& $build.Adb devices)

Push-Location $build.MobileRoot
try {
    if (-not (Test-Path $build.AndroidDir)) {
        Write-AndroidStep "Generating Android native project"
        npx expo prebuild --clean --platform android --no-install
        if ($LASTEXITCODE -ne 0) { throw "expo prebuild failed." }
    }

    if (-not $SkipBuild -and -not (Test-DevClientInstalled -Adb $build.Adb -PackageName $build.PackageName)) {
        Write-AndroidStep "Installing Expo dev client on emulator"
        Push-Location $build.AndroidDir
        try {
            if (Test-Path (Join-Path $build.AndroidDir "app/.cxx")) {
                Remove-Item (Join-Path $build.AndroidDir "app/.cxx") -Recurse -Force
            }
            .\gradlew.bat app:installDebug -x lint -x test --no-daemon --no-build-cache -PreactNativeArchitectures=x86_64 -PreactNativeDevServerPort=$MetroPort
            if ($LASTEXITCODE -ne 0) { throw "Gradle installDebug failed." }
        } finally {
            Pop-Location
        }
    } elseif (Test-DevClientInstalled -Adb $build.Adb -PackageName $build.PackageName) {
        Write-Host "Dev client already installed ($($build.PackageName))."
    }

    Write-AndroidStep "Starting Expo dev server on port $MetroPort"
    Write-Host "Build root: $ShortRoot"
    Write-Host "Gradle cache: $($env:GRADLE_USER_HOME)"
    npx expo start --dev-client --port $MetroPort --host localhost --android
} finally {
    Pop-Location
}
