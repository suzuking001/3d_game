param([switch]$Install, [ValidateSet('dev','build','test','typecheck','none')][string]$Task = 'dev')
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$runtimePath = Join-Path $env:LOCALAPPDATA 'vector-mech-lab'
New-Item -ItemType Directory -Path $runtimePath -Force | Out-Null
foreach ($name in @('src', 'public', 'tests', 'scripts', 'index.html', 'package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.test.json', 'vite.config.ts')) {
    $sourcePath = Join-Path $projectPath $name
    if (Test-Path -LiteralPath $sourcePath) { Copy-Item -LiteralPath $sourcePath -Destination $runtimePath -Recurse -Force }
}
Push-Location $runtimePath
try {
    if ($Install -or !(Test-Path -LiteralPath (Join-Path $runtimePath 'node_modules/vite'))) {
        npm ci
        if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    }
    if ($Task -eq 'dev') {
        node (Join-Path $runtimePath 'scripts/watch-runtime.mjs') $projectPath
        if ($LASTEXITCODE -ne 0) { throw 'Development server failed.' }
    } elseif ($Task -ne 'none') {
        npm run $Task
        if ($LASTEXITCODE -ne 0) { throw "$Task failed." }
        if ($Task -eq 'build') {
            Copy-Item -LiteralPath (Join-Path $runtimePath 'dist') -Destination $projectPath -Recurse -Force
        }
    }
} finally { Pop-Location }
