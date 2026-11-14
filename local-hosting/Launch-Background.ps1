param([switch]$NoBrowser)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$lock=New-Object System.Threading.Mutex($false,'Local\OpenHiggsStartup')
$owned=$false
try {
    try {$owned=$lock.WaitOne(0)}catch [System.Threading.AbandonedMutexException]{$owned=$true}
    if(-not $owned){exit 0}
    Start-Transcript -Path (Join-Path $root 'logs\startup.log') -Force | Out-Null
    & (Join-Path $PSScriptRoot 'Start.ps1') -NoBrowser:$NoBrowser
}catch{
    $_ | Out-String | Add-Content (Join-Path $root 'logs\startup-error.log')
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message+"`nSee C:\openhiggs\logs\startup.log",'OpenHiggs startup failed') | Out-Null
    exit 1
}finally{
    try{Stop-Transcript | Out-Null}catch{}
    if($owned){$lock.ReleaseMutex()}
    $lock.Dispose()
}
