# First-time Expo dev client install from I:\labtrack\build (avoids Windows MAX_PATH failures).
param(
    [string]$ShortRoot,
    [string]$SourceRoot,
    [string]$AvdName = "Labtrack_Test_API_36",
    [int]$MetroPort = 8081,
    [switch]$SkipEmulator,
    [switch]$PhysicalDevice
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "android-build-paths.ps1")

if (-not $ShortRoot) { $ShortRoot = $script:ShortBuildRoot }
if (-not $SourceRoot) { $SourceRoot = $script:RepoRoot }

function Wait-ForPhysicalDevice([string]$Adb) {
    Write-AndroidStep "Connect your phone via USB and accept the USB debugging prompt"
    while ($true) {
        $lines = & $Adb devices | Select-Object -Skip 1 | Where-Object { $_ -match '\tdevice$' }
        $physical = $lines | Where-Object { $_ -notmatch '^emulator-' }
        if ($physical) {
            $line = [string](@($physical)[0])
            $serial = ($line -split "`t")[0]
            Write-Host "Found device: $serial" -ForegroundColor Green
            return $serial
        }
        Start-Sleep -Seconds 3
    }
}

$arch = if ($PhysicalDevice) { "arm64-v8a" } else { "x86_64" }

$build = Set-LabtrackAndroidBuildEnvironment -ProjectRoot $ShortRoot -MetroPort $MetroPort

if ($PhysicalDevice) { $SkipEmulator = $true }

if (Test-Path $ShortRoot) {
    Write-Host "Removing prior short build root $ShortRoot"
    cmd /c "rmdir /s /q `"$ShortRoot`"" | Out-Null
}

Initialize-LabtrackAndroidCache
& (Join-Path $PSScriptRoot "sync-to-short-path.ps1") -ShortRoot $ShortRoot -SourceRoot $SourceRoot

Write-AndroidStep "Installing workspace dependencies at $ShortRoot"
Push-Location $ShortRoot
try {
    npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm install failed." }

    Write-AndroidStep "Building shared package"
    npm run build:shared
    if ($LASTEXITCODE -ne 0) { throw "shared build failed." }

    Push-Location $build.MobileRoot
    try {
        Write-AndroidStep "Generating Android native project"
        npx expo prebuild --clean --platform android --no-install
        if ($LASTEXITCODE -ne 0) { throw "expo prebuild failed." }

        $gradleProps = Join-Path $build.AndroidDir "gradle.properties"
        if (Test-Path $gradleProps) {
            $javaHomeEscaped = ($env:JAVA_HOME.TrimEnd('\')) -replace '\\', '/'
            (Get-Content $gradleProps) `
                -replace 'reactNativeArchitectures=.*', "reactNativeArchitectures=$arch" `
                -replace 'org.gradle.jvmargs=.*', 'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError' |
                Set-Content $gradleProps
            if ((Get-Content $gradleProps -Raw) -notmatch 'org.gradle.java.home=') {
                Add-Content $gradleProps "org.gradle.java.home=$javaHomeEscaped"
            }
        }

        if ($PhysicalDevice) {
            $deviceSerial = Wait-ForPhysicalDevice -Adb $build.Adb
            $env:ANDROID_SERIAL = $deviceSerial
        } elseif (-not $SkipEmulator) {
            $devices = & $build.Adb devices
            if ($devices -notmatch "emulator-\d+\s+device") {
                Write-AndroidStep "Starting Android emulator ($AvdName)"
                Start-Process -FilePath $build.Emulator -ArgumentList @("-avd", $AvdName) -WindowStyle Normal | Out-Null
                & $build.Adb wait-for-device | Out-Null
            }
        }

        $target = if ($PhysicalDevice) { "phone" } else { "emulator" }
        Write-AndroidStep "Installing debug dev client on $target"
        Push-Location $build.AndroidDir
        try {
            .\gradlew.bat app:installDebug -x lint -x test --no-daemon --no-build-cache -PreactNativeArchitectures=$arch -PreactNativeDevServerPort=$MetroPort
            if ($LASTEXITCODE -ne 0) { throw "Gradle installDebug failed." }
        } finally {
            Pop-Location
        }

        $installed = & $build.Adb shell pm list packages $build.PackageName 2>$null
        if (-not ($installed -match [regex]::Escape($build.PackageName))) {
            throw "Dev client package not detected after install."
        }

        Write-Host ""
        Write-Host "Dev client installed from $ShortRoot" -ForegroundColor Green
        Write-Host "Gradle cache: $($env:GRADLE_USER_HOME)"
        Write-Host "Start Metro with: npm run android:emulator -w @labtrack/mobile"
    } finally {
        Pop-Location
    }
} finally {
    Pop-Location
}
