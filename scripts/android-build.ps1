param(
  [ValidateSet("debug", "bundle")]
  [string]$Target = "debug"
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$JdkRoot = Join-Path $Root ".tools\jdk"
$SdkRoot = Join-Path $Root ".tools\android-sdk"
$AndroidRoot = Join-Path $Root "android"

$Jdk = Get-ChildItem -Path $JdkRoot -Directory -Filter "jdk-*" | Select-Object -First 1
if (-not $Jdk) {
  throw "JDK local nao encontrado em $JdkRoot. Baixe ou reinstale o JDK antes de compilar."
}

if (-not (Test-Path $SdkRoot)) {
  throw "Android SDK local nao encontrado em $SdkRoot. Instale o SDK antes de compilar."
}

$env:JAVA_HOME = $Jdk.FullName
$env:ANDROID_HOME = $SdkRoot
$env:ANDROID_SDK_ROOT = $SdkRoot
$env:GRADLE_USER_HOME = Join-Path $Root ".gradle-home"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

Push-Location $AndroidRoot
try {
  if ($Target -eq "debug") {
    & ".\gradlew.bat" "--no-daemon" "assembleDebug"
  } else {
    & ".\gradlew.bat" "--no-daemon" "bundleRelease"
  }
  if ($LASTEXITCODE -ne 0) {
    throw "Gradle terminou com erro $LASTEXITCODE."
  }
} finally {
  Pop-Location
}
