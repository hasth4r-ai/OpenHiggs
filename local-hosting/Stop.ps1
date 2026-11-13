param([string]$InstallRoot = (Join-Path $PSScriptRoot '..'))
. (Join-Path $PSScriptRoot 'Common.ps1')
$context = Get-OpenHiggsContext $InstallRoot
$serverProcess = Get-ManagedServer $context
if ($serverProcess) {
    Stop-Process -Id $serverProcess.Id -ErrorAction Stop
    $serverProcess.WaitForExit(10000) | Out-Null
    if (Test-LocalPort $context.Address $context.Port) {
        throw 'The managed process stopped, but the port is still in use. No additional process was stopped.'
    }
    Write-Host 'OpenHiggs stopped.'
} else {
    Write-Host 'OpenHiggs is not running.'
}
if (Test-Path -LiteralPath $context.State) { Remove-Item -LiteralPath $context.State }
