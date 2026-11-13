param([string]$InstallRoot = (Join-Path $PSScriptRoot '..'))
. (Join-Path $PSScriptRoot 'Common.ps1')
$context = Get-OpenHiggsContext $InstallRoot
if (Get-ManagedServer $context) { throw 'Stop OpenHiggs before rebuilding.' }
Push-Location $context.Repo
$previousErrorPreference = $ErrorActionPreference
try {
    # Windows PowerShell treats native stderr warnings as error records.
    # Preserve their text, and use npm's exit code to decide success.
    $ErrorActionPreference = 'Continue'
    & (Join-Path $context.Runtime 'npm.cmd') run build 2>&1 | ForEach-Object { $_.ToString() } | Tee-Object -FilePath (Join-Path $context.Root 'logs\build.log')
    $buildExitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorPreference
    if ($buildExitCode -ne 0) { throw ('Build failed with exit code ' + $buildExitCode) }
} finally {
    $ErrorActionPreference = $previousErrorPreference
    Pop-Location
}
Write-Host 'Build complete. Run Start OpenHiggs.cmd.'
