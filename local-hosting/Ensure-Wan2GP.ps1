param([Parameter(Mandatory=$true)]$Context)
$ErrorActionPreference='Stop'
$pinConfig=Get-Content (Join-Path $env:USERPROFILE '.pinokio\config.json') -Raw | ConvertFrom-Json
$pterm=Join-Path $pinConfig.home 'bin\npm\pterm.cmd'
if(-not(Test-Path -LiteralPath $pterm)){throw 'Pinokio pterm was not found.'}
$enginePath=Join-Path $Context.Root 'config\wan-engine.json'
$engine=Get-Content $enginePath -Raw | ConvertFrom-Json
$appPath=Split-Path $engine.wanRoot -Parent
$appId=Split-Path $appPath -Leaf
function Get-WanStatus {
    $savedPreference=$ErrorActionPreference
    try {$ErrorActionPreference='Continue';$raw=& $pterm status $appId 2>$null}finally{$ErrorActionPreference=$savedPreference}
    if($LASTEXITCODE -ne 0){return $null}
    try {return ($raw -join "`n" | ConvertFrom-Json)}catch{return $null}
}
$status=Get-WanStatus
if(-not $status){
    $exe=Join-Path $env:LOCALAPPDATA 'Programs\Pinokio\Pinokio.exe'
    if(-not(Test-Path -LiteralPath $exe)){throw 'Pinokio.exe was not found.'}
    $existingPinokio=Get-Process Pinokio -ErrorAction SilentlyContinue
    if(-not $existingPinokio){Write-Host 'Starting Pinokio...';Start-Process -FilePath $exe -WindowStyle Hidden}
    $deadline=(Get-Date).AddSeconds(90)
    do {Start-Sleep -Seconds 2;$status=Get-WanStatus}while(-not $status -and (Get-Date) -lt $deadline)
    if(-not $status){throw 'Pinokio did not become ready. Check Pinokio startup.'}
}
if(-not $status.running -and -not $status.ready){
    Write-Host 'Starting Wan2GP in the background...'
    $entry=Join-Path $pinConfig.home 'bin\npm\node_modules\pterm\index.js'
    $args='"'+$entry+'" run "'+$appPath+'" --default start.js'
    Start-Process -FilePath $Context.Node -ArgumentList $args -WindowStyle Hidden -RedirectStandardOutput (Join-Path $Context.Root 'logs\wan-start.log') -RedirectStandardError (Join-Path $Context.Root 'logs\wan-start-error.log') | Out-Null
}
$deadline=(Get-Date).AddSeconds(180)
while(($null -eq $status -or -not $status.ready) -and (Get-Date) -lt $deadline){Start-Sleep -Seconds 2;$status=Get-WanStatus;if(-not $status){continue}}
if(-not $status -or -not $status.ready){throw 'Wan2GP startup timed out. See logs\wan-start.log.'}
$verified=& $pterm status $appId --probe 2>$null
if($LASTEXITCODE -ne 0){throw 'Wan2GP readiness probe failed.'}
$status=$verified -join "`n" | ConvertFrom-Json
if(-not $status.ready -or -not $status.ready_url){throw 'Wan2GP is not ready yet.'}
$url=[uri]$status.ready_url
if(-not $url.IsLoopback){throw 'Expected a local Wan2GP address.'}
Invoke-RestMethod ($status.ready_url.TrimEnd('/')+'/deepy/deepy_api/state') -TimeoutSec 10 | Out-Null
if($engine.baseUrl -ne $status.ready_url){
    $engine.baseUrl=$status.ready_url
    $engine | ConvertTo-Json | Set-Content -LiteralPath $enginePath -Encoding UTF8
}
Write-Host ('Wan2GP ready at '+$status.ready_url)

