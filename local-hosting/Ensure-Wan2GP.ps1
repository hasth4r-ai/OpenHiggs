param([Parameter(Mandatory=$true)]$Context)
$ErrorActionPreference='Stop'

$enginePath = Join-Path $Context.Root 'config\wan-engine.json'
$engine = Get-Content $enginePath -Raw | ConvertFrom-Json
$url = if ($engine.baseUrl) { $engine.baseUrl.TrimEnd('/') } else { 'http://127.0.0.1:42003' }

function Test-WanReady {
    try {
        $resp = Invoke-RestMethod ($url + '/deepy/deepy_api/state') -TimeoutSec 3 -ErrorAction SilentlyContinue
        return ($null -ne $resp)
    } catch {
        return $false
    }
}

if (Test-WanReady) {
    Write-Host ("Wan2GP ready at " + $url + " (standalone background engine)")
    exit 0
}

Write-Host "Starting Wan2GP standalone in background (no Pinokio needed)..."
$standaloneBat = Join-Path $Context.Root 'scripts\start-wan-standalone.bat'
if (-not (Test-Path -LiteralPath $standaloneBat)) {
    $miniforge = 'C:\pinokio\bin\miniforge'
    $appDir = $engine.wanRoot
    $batContent = @"
@echo off
set "MINIFORGE_ROOT=$miniforge"
set "APP_DIR=$appDir"
set "PATH=%MINIFORGE_ROOT%;%MINIFORGE_ROOT%\Scripts;%MINIFORGE_ROOT%\condabin;%MINIFORGE_ROOT%\Library\bin;%APP_DIR%\venv\Scripts;%PATH%"
set "SERVER_NAME=127.0.0.1"
set "SERVER_PORT=42003"
cd /d "%APP_DIR%"
call "%MINIFORGE_ROOT%\condabin\conda_hook.bat"
call "%APP_DIR%\venv\Scripts\activate.bat"
python wgp.py --multiple-images --advanced
"@
    Set-Content -LiteralPath $standaloneBat -Value $batContent -Encoding UTF8
}

$stdout = Join-Path $Context.Root 'logs\wan-start.log'
$stderr = Join-Path $Context.Root 'logs\wan-start-error.log'
Start-Process -FilePath 'cmd.exe' -ArgumentList ('/c "' + $standaloneBat + '"') -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr | Out-Null

$deadline = (Get-Date).AddSeconds(120)
while (-not (Test-WanReady) -and (Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
}

if (-not (Test-WanReady)) {
    throw "Wan2GP background startup timed out. Check logs\wan-start.log."
}

Write-Host ("Wan2GP standalone is ready at " + $url)
