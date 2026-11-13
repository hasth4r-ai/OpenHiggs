param([switch]$NoBrowser)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$history=Invoke-RestMethod 'http://127.0.0.1:3000/api/history' -TimeoutSec 10
if(@($history.items | Where-Object status -eq 'generating').Count -gt 0){
    Write-Host 'A generation is still running. Nothing was stopped or rebuilt. Run this again after it finishes.'
    exit 2
}
$config=Get-Content (Join-Path $root 'config\wan-engine.json') -Raw | ConvertFrom-Json
$state=Invoke-RestMethod ($config.baseUrl.TrimEnd('/')+'/deepy/deepy_api/state') -TimeoutSec 10
if($state.busy -or $null -ne $state.progress){
    Write-Host 'Wan2GP is still busy. Nothing was stopped or rebuilt.'
    exit 2
}
& (Join-Path $PSScriptRoot 'Stop.ps1')
& (Join-Path $PSScriptRoot 'Build.ps1')
& (Join-Path $PSScriptRoot 'Start.ps1') -NoBrowser:$NoBrowser
