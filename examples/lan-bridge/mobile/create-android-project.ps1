$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Join-Path $sourceRoot 'android_app'

if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
  throw 'Flutter SDK tidak ditemukan. Instal Flutter lalu jalankan script ini kembali.'
}

if (Test-Path $projectRoot) { Remove-Item $projectRoot -Recurse -Force }
flutter create --platforms=android --org com.halodeck --project-name halo_deck_mobile $projectRoot
Remove-Item (Join-Path $projectRoot 'lib') -Recurse -Force
Copy-Item (Join-Path $sourceRoot 'lib') (Join-Path $projectRoot 'lib') -Recurse -Force
Copy-Item (Join-Path $sourceRoot 'pubspec.yaml') (Join-Path $projectRoot 'pubspec.yaml') -Force

Push-Location $projectRoot
try {
  flutter pub get
  flutter build apk --debug
  Write-Host ''
  Write-Host 'APK berhasil dibuat:' -ForegroundColor Green
  Write-Host (Join-Path $projectRoot 'build\app\outputs\flutter-apk\app-debug.apk')
  Write-Host ''
  Write-Host 'Untuk memasang langsung ke HP yang tersambung USB: flutter install'
} finally { Pop-Location }
