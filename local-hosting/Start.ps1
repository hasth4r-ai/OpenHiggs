param(
    [string]$InstallRoot = (Join-Path $PSScriptRoot '..'),
    [switch]$NoBrowser
)
. (Join-Path $PSScriptRoot 'Common.ps1')
$context = Get-OpenHiggsContext $InstallRoot
if (-not (Test-Path -LiteralPath (Join-Path $context.Repo '.next\BUILD_ID'))) {
    throw 'No production build exists. Run Build OpenHiggs.cmd first.'
}
$existing = Get-ManagedServer $context
if ($existing) {
    if (-not (Test-StudioResponse $context.Url)) { throw 'OpenHiggs is running but is not responding. Check logs, then stop and start it.' }
    Write-Host ('OpenHiggs is already running at ' + $context.Url)
    if (-not $NoBrowser) { Start-Process $context.Url }
    exit 0
}
if (Test-LocalPort $context.Address $context.Port) {
    throw ('Port ' + $context.Port + ' is already occupied. No existing application was stopped. Choose another port in config\server.json.')
}
$stdout = Join-Path $context.Root 'logs\server.log'
$stderr = Join-Path $context.Root 'logs\server-error.log'
$arguments = '"' + $context.Entry + '" start --hostname 127.0.0.1 --port ' + $context.Port
$serverProcess = Start-Process -FilePath $context.Node -ArgumentList $arguments -WorkingDirectory $context.Repo -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
$serverProcess.Refresh()
@{
    ProcessId = $serverProcess.Id
    StartTimeTicks = $serverProcess.StartTime.ToUniversalTime().Ticks.ToString()
    NodePath = $context.Node
    Url = $context.Url
} | ConvertTo-Json | Set-Content -LiteralPath $context.State -Encoding UTF8
$ready = $false
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    $serverProcess.Refresh()
    if ($serverProcess.HasExited) { throw ('Server exited. See ' + $stderr) }
    if (Test-StudioResponse $context.Url) { $ready = $true; break }
    Start-Sleep -Milliseconds 500
}
if (-not $ready) { throw ('Server started but readiness could not be confirmed. See ' + $stderr) }
Write-Host ('OpenHiggs is running at ' + $context.Url)
Write-Host 'Use Stop OpenHiggs.cmd to stop it. Closing the browser does not stop the server.'
if (-not $NoBrowser) { Start-Process $context.Url }
