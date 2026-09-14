# Shared paths for MAX_PATH-safe LABTRACK Android builds on I:\labtrack\build only.
# Keep Gradle cache on the default user profile (.gradle) to avoid duplicating ~3 GB on I:.
# I: layout (see organize-i-drive.ps1):
#   I:\inventala\          Inventala mobile app
#   I:\labtrack\build\     Short-path monorepo copy for native Android builds (delete when not building)
$script:LabtrackCacheRoot = if ($env:LABTRACK_ANDROID_CACHE_ROOT) {
    $env:LABTRACK_ANDROID_CACHE_ROOT
} elseif (Test-Path "I:\") {
    "I:\labtrack"
} else {
    "C:\lt"
}
$script:ShortBuildRoot = if ($env:LABTRACK_ANDROID_BUILD_ROOT) { $env:LABTRACK_ANDROID_BUILD_ROOT } else { Join-Path $script:LabtrackCacheRoot "build" }
$script:RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "../../..")
$script:MobileRoot = Join-Path $script:RepoRoot "apps/mobile"
$script:PackageName = "edu.psu.ccs.labtrack"

function Initialize-LabtrackAndroidCache {
    foreach ($path in @($script:LabtrackCacheRoot, $script:ShortBuildRoot)) {
        if (-not (Test-Path $path)) {
            New-Item -ItemType Directory -Path $path -Force | Out-Null
        }
    }
}

function Set-LabtrackAndroidBuildEnvironment {
    param(
        [string]$ProjectRoot = $script:ShortBuildRoot,
        [int]$MetroPort = 8081
    )

    Initialize-LabtrackAndroidCache

    $sdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
    $javaHome = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { "C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot" }

    $env:ANDROID_HOME = $sdkRoot
    $env:ANDROID_SDK_ROOT = $sdkRoot
    $env:JAVA_HOME = $javaHome
    $env:GRADLE_USER_HOME = if ($env:LABTRACK_GRADLE_HOME) { $env:LABTRACK_GRADLE_HOME } else { Join-Path $env:USERPROFILE ".gradle" }
    $env:GRADLE_OPTS = "-Xmx4096m -XX:MaxMetaspaceSize=1024m"
    $env:PATH = "$javaHome\bin;$sdkRoot\platform-tools;$sdkRoot\emulator;$env:PATH"

    return [pscustomobject]@{
        ProjectRoot = $ProjectRoot
        MobileRoot = Join-Path $ProjectRoot "apps/mobile"
        AndroidDir = Join-Path $ProjectRoot "apps/mobile/android"
        Adb = Join-Path $sdkRoot "platform-tools\adb.exe"
        Emulator = Join-Path $sdkRoot "emulator\emulator.exe"
        MetroPort = $MetroPort
        PackageName = $script:PackageName
    }
}

function Write-AndroidStep([string]$Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}
