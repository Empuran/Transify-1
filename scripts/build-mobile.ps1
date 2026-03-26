# build-mobile.ps1
# This script renames app/api to app/_api to hide it from Next.js static export,
# runs the build, and then renames it back.

$apiPath = "app/api"
$tempPath = "app/_api"

# Ensure we are in the right directory (check for package.json)
if (-not (Test-Path "package.json")) {
    Write-Error "Please run this script from the project root."
    exit 1
}

function Rename-WithRetry {
    param($Path, $NewPath)
    $maxRetries = 5
    $retryCount = 0
    $success = $false

    # Normalize paths for Windows
    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $fullNewPath = [System.IO.Path]::GetFullPath($NewPath)

    while (-not $success -and $retryCount -lt $maxRetries) {
        try {
            # Try Move-Item first (standard)
            Move-Item -Path $fullPath -Destination $fullNewPath -ErrorAction Stop
            $success = $true
        } catch {
            try {
                # Fallback to Robocopy /MOVE (robust)
                robocopy $fullPath $fullNewPath /MOVE /E /NFL /NDL /NJH /NJS /R:3 /W:1 > $null
                if ($LASTEXITCODE -lt 8) {
                    $success = $true
                } else {
                    throw "Robocopy failed with exit code $LASTEXITCODE"
                }
            } catch {
                $retryCount++
                if ($retryCount -lt $maxRetries) {
                    Write-Host "Rename/Move failed, retrying in 2s ($retryCount/$maxRetries)..."
                    Start-Sleep -Seconds 2
                } else {
                    throw $_
                }
            }
        }
    }
}

try {
    # 1. Rename app/api to app/_api if it exists
    if (Test-Path $apiPath) {
        Write-Host "Temporarily renaming $apiPath to $tempPath..."
        Rename-WithRetry -Path $apiPath -NewPath $tempPath
    }

    # 2. Run the Next.js build
    Write-Host "Starting Next.js static build..."
    npm run next-build

    if ($LASTEXITCODE -ne 0) {
        throw "Next.js build failed."
    }

    # 3. Restore app/api
    Write-Host "Restoring $tempPath to $apiPath..."
    Rename-WithRetry -Path $tempPath -NewPath $apiPath

    # 4. Sync Capacitor
    Write-Host "Syncing Capacitor with new assets..."
    npx cap sync

    # 5. Re-apply Java 17 Patches (because sync overwrites them)
    Write-Host "Re-applying Java 17 compatibility patches..."
    
    $patchFiles = @(
        "android/app/capacitor.build.gradle",
        "android/capacitor-cordova-android-plugins/build.gradle",
        "node_modules/@capacitor/android/capacitor/build.gradle"
    )

    foreach ($file in $patchFiles) {
        if (Test-Path $file) {
            $content = Get-Content $file -Raw
            $newContent = $content -replace "JavaVersion.VERSION_21", "JavaVersion.toVersion(rootProject.ext.javaVersion)"
            $newContent = $newContent -replace "targetCompatibility rootProject.ext.javaVersion", "targetCompatibility JavaVersion.toVersion(rootProject.ext.javaVersion)"
            $newContent = $newContent -replace "sourceCompatibility rootProject.ext.javaVersion", "sourceCompatibility JavaVersion.toVersion(rootProject.ext.javaVersion)"
            Set-Content -Path $file -Value $newContent
        }
    }

    # 6. Run Gradle build
    Write-Host "Generating APK..."
    cd android
    ./gradlew.bat assembleDebug
    cd ..

    if ($LASTEXITCODE -ne 0) {
        throw "Gradle build failed."
    }

    Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
    Write-Host "SUCCESS! APK generated at:" -ForegroundColor Green
    Write-Host "android/app/build/outputs/apk/debug/app-debug.apk" -ForegroundColor Green
    Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    # Ensure api is restored if it was renamed but build failed before restoration
    if (Test-Path $tempPath) {
        Write-Host "Attempting emergency restoration of app/api..."
        Move-Item -Path $tempPath -Destination $apiPath -ErrorAction SilentlyContinue
    }
}
