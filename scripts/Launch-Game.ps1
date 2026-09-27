param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
try {
    $projectPath = Split-Path -Parent $PSScriptRoot
    if (!(Get-Command node.exe -ErrorAction SilentlyContinue)) {
        throw 'Node.js 22.12 or newer is required. Install it from https://nodejs.org and double-click Start-Game.bat again.'
    }
    $nodeVersion = [version]((& node.exe --version).TrimStart('v'))
    if ($nodeVersion -lt [version]'22.12') { throw 'Please update Node.js to version 22.12 or newer.' }
    $buildIndex = Join-Path $projectPath 'dist/index.html'
    $needsBuild = !(Test-Path -LiteralPath $buildIndex)
    if (!$needsBuild) {
        $builtAt = (Get-Item -LiteralPath $buildIndex).LastWriteTimeUtc
        foreach ($directory in @('src', 'public')) {
            if (Get-ChildItem -LiteralPath (Join-Path $projectPath $directory) -Recurse -File | Where-Object { $_.LastWriteTimeUtc -gt $builtAt } | Select-Object -First 1) {
                $needsBuild = $true
            }
        }
        foreach ($file in @('index.html', 'package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts')) {
            if ((Get-Item -LiteralPath (Join-Path $projectPath $file)).LastWriteTimeUtc -gt $builtAt) { $needsBuild = $true }
        }
    }
    if ($needsBuild) {
        Write-Host 'Building the latest game. The first launch may take a few minutes...'
        & (Join-Path $PSScriptRoot 'Sync-Runtime.ps1') -Task build
    }
    Write-Host 'ASHFALL - Keep this window open while playing. Close it to stop the server.'
    $launcherArguments = @((Join-Path $PSScriptRoot 'launch-game.mjs'), $projectPath)
    if ($NoBrowser) { $launcherArguments += '--no-browser' }
    & node.exe @launcherArguments
    exit $LASTEXITCODE
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
