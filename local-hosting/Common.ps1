Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-OpenHiggsContext {
    param([string]$InstallRoot)
    $rootPath = [IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
    $runtime = Get-Content -LiteralPath (Join-Path $rootPath 'config\runtime.json') -Raw | ConvertFrom-Json
    $server = Get-Content -LiteralPath (Join-Path $rootPath 'config\server.json') -Raw | ConvertFrom-Json
    if ($server.BindAddress -ne '127.0.0.1') { throw 'This installation is configured for this PC only. BindAddress must be 127.0.0.1.' }
    if ([int]$server.Port -lt 1024 -or [int]$server.Port -gt 65535) { throw 'Invalid local server port.' }
    $nodePath = Join-Path $runtime.Directory 'node.exe'
    $repoPath = if (Test-Path -LiteralPath (Join-Path $rootPath 'openhiggs')) {
        Join-Path $rootPath 'openhiggs'
    } else {
        Join-Path $rootPath 'repo'
    }
    if (-not (Test-Path -LiteralPath $nodePath)) { throw 'The portable Node.js runtime is missing.' }
    $env:PATH = $runtime.Directory + ';' + $env:PATH
    $env:NEXT_TELEMETRY_DISABLED = '1'
    $env:npm_config_cache = Join-Path $rootPath 'temp\npm-cache'
    $env:TEMP = Join-Path $rootPath 'temp'
    $env:TMP = $env:TEMP
    [pscustomobject]@{
        Root = $rootPath
        Repo = $repoPath
        Runtime = $runtime.Directory
        Node = $nodePath
        Entry = Join-Path $repoPath 'node_modules\next\dist\bin\next'
        Port = [int]$server.Port
        Address = $server.BindAddress
        Url = 'http://127.0.0.1:' + $server.Port
        State = Join-Path $rootPath 'config\server-state.json'
    }
}

function Get-ManagedServer {
    param($Context)
    if (-not (Test-Path -LiteralPath $Context.State)) { return $null }
    $saved = Get-Content -LiteralPath $Context.State -Raw | ConvertFrom-Json
    $serverProcess = Get-Process -Id ([int]$saved.ProcessId) -ErrorAction SilentlyContinue
    if (-not $serverProcess) { return $null }
    if ($serverProcess.Path -ne $Context.Node -or
        $serverProcess.StartTime.ToUniversalTime().Ticks.ToString() -ne [string]$saved.StartTimeTicks) {
        throw 'The saved process ID belongs to a different process. It will not be stopped or reused.'
    }
    return $serverProcess
}

function Test-LocalPort {
    param([string]$Address, [int]$Port)
    $client = New-Object Net.Sockets.TcpClient
    try {
        $attempt = $client.BeginConnect($Address, $Port, $null, $null)
        if (-not $attempt.AsyncWaitHandle.WaitOne(350)) { return $false }
        try { $client.EndConnect($attempt); return $true } catch { return $false }
    } finally { $client.Dispose() }
}

function Test-StudioResponse {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -Uri ($Url + '/studio') -UseBasicParsing -TimeoutSec 3
        return ($response.StatusCode -eq 200 -and ($response.Content.Contains('OpenHiggs') -or $response.Content.Contains('Open Higgsfield') -or $response.Content.Contains('Local AI Studio')))
    } catch { return $false }
}
