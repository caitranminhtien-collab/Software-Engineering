# M3.0 - Read-only release-preflight. Does not create visitor sessions, change DB, or upload media.
[CmdletBinding()]
param(
    [string]$Project = (Get-Location).Path,
    [string]$ApiBase = 'http://localhost:3000/api/v1',
    [string]$WebUrl = 'http://localhost:8000/',
    [switch]$SkipApi,
    [switch]$SkipFrontend,
    [switch]$SkipAutomatedTests
)
$ErrorActionPreference = 'Stop'
$start = Get-Date
$checks = New-Object System.Collections.Generic.List[object]
$reportDirectory = Join-Path $env:TEMP 'Hue_M30_Acceptance'
New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$jsonPath = Join-Path $reportDirectory ("M30_report_{0}.json" -f $timestamp)
$markdownPath = Join-Path $reportDirectory ("M30_report_{0}.md" -f $timestamp)

function Record([string]$name, [string]$status, [string]$note='') {
    $script:checks.Add([pscustomobject]@{ name=$name; status=$status; note=$note })
    $color = if ($status -eq 'PASS') { 'Green' } elseif ($status -eq 'FAIL') { 'Red' } else { 'Yellow' }
    Write-Host ("{0}: {1}{2}" -f $status, $name, $(if($note){" - $note"}else{''})) -ForegroundColor $color
}
function Test-Step([string]$name, [scriptblock]$work) {
    try { & $work; Record $name 'PASS' }
    catch { Record $name 'FAIL' $_.Exception.Message }
}
function Assert-Exit([string]$label) {
    if ($LASTEXITCODE -ne 0) { throw "$label returned exit code $LASTEXITCODE" }
}
function Get-Items($payload) {
    if ($null -eq $payload -or $null -eq $payload.data) { throw 'API response lacks data' }
    if ($payload.data -is [array]) { return $payload.data }
    if ($null -ne $payload.data.items) { return $payload.data.items }
    if ($null -ne $payload.data.routes) { return $payload.data.routes }
    return $payload.data
}

Write-Host '=== M3.0 / Hue Tourism MVP release preflight ===' -ForegroundColor Cyan
Write-Host 'Read-only HTTP GET checks only; no database changes or account logins.'
$projectValid = (Test-Path -LiteralPath (Join-Path $Project 'package.json') -PathType Leaf) -and
                (Test-Path -LiteralPath (Join-Path $Project 'frontend\app.js') -PathType Leaf) -and
                (Test-Path -LiteralPath (Join-Path $Project '.git') )
if (-not $projectValid) { Record 'Project source layout' 'FAIL' 'Missing package.json, frontend/app.js or .git' }
else {
    $Project = (Resolve-Path -LiteralPath $Project).Path
    Set-Location -LiteralPath $Project
    Record 'Project source layout' 'PASS'
}

if ($projectValid) {
    Test-Step 'Git branch and synchronization' {
        & git rev-parse --is-inside-work-tree *> $null
        Assert-Exit 'git rev-parse'
        $branch = (& git branch --show-current).Trim()
        Assert-Exit 'git branch'
        $head = (& git rev-parse HEAD).Trim()
        Assert-Exit 'git rev-parse HEAD'
        $upstream = (& git rev-parse origin/main).Trim()
        Assert-Exit 'git rev-parse origin/main'
        if ($branch -ne 'main') { throw "Current branch is '$branch', expected 'main'" }
        if ($head -ne $upstream) { throw 'Local main and locally recorded origin/main differ; run git status and verify the push' }
    }
    Test-Step 'Git working tree clean' {
        $dirty = @(& git status --porcelain)
        Assert-Exit 'git status'
        if ($dirty.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace(($dirty -join ''))) {
            throw "Git shows $($dirty.Count) changed/untracked entries. See git status --short."
        }
    }
    Test-Step 'No environment file tracked by Git' {
        $tracked = @(& git ls-files -- '.env' '.env.local' '.env.production')
        Assert-Exit 'git ls-files'
        if ($tracked.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace(($tracked -join ''))) {
            throw 'One or more environment secret files are tracked; do not push before review.'
        }
    }
    Test-Step 'Frontend JavaScript syntax' {
        & node --check '.\frontend\app.js'
        Assert-Exit 'node --check'
    }
    Test-Step 'Backend TypeScript build' {
        & npm.cmd run build
        Assert-Exit 'npm.cmd run build'
    }
    if ($SkipAutomatedTests) { Record 'Full backend automated tests (npm test)' 'SKIP' 'Explicitly skipped' }
    else {
        Test-Step 'Full backend automated tests (npm test)' {
            & npm.cmd test
            Assert-Exit 'npm.cmd test'
        }
    }
    Test-Step 'Node.js M2.8 contract tests' {
        $path = '.\tests\M28_mvp_contract.node.cjs'
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing $path" }
        & node --test $path
        Assert-Exit 'node --test'
    }
}

if ($SkipApi) { Record 'Backend HTTP checks' 'SKIP' 'Explicitly skipped; must test before acceptance' }
else {
    $api = $ApiBase.TrimEnd('/')
    Test-Step 'Backend /health/live' {
        $live = Invoke-RestMethod -Method Get -Uri "$api/health/live" -TimeoutSec 10
        if ($live.status -ne 'ok') { throw 'Expected status=ok' }
    }
    Test-Step 'PostgreSQL and Redis /health/ready' {
        $ready = Invoke-RestMethod -Method Get -Uri "$api/health/ready" -TimeoutSec 10
        if ($ready.status -ne 'ready' -or $ready.database -ne 'connected' -or $ready.redis -ne 'connected') {
            throw 'Expected ready/connected/connected'
        }
    }
    Test-Step 'Published attractions API (10+)' {
        $payload = Invoke-RestMethod -Method Get -Uri "$api/attractions?language=vi&page=1&page_size=100" -TimeoutSec 10
        $items = @(Get-Items $payload)
        if ($items.Count -lt 10) { throw "Returned $($items.Count) attractions, expected at least 10" }
    }
    Test-Step 'Published routes API (>=1)' {
        $payload = Invoke-RestMethod -Method Get -Uri "$api/routes?language=vi&page=1&page_size=100" -TimeoutSec 10
        $items = @(Get-Items $payload)
        if ($items.Count -lt 1) { throw 'No published routes returned' }
    }
    # Intentionally no POST /visitor-sessions, GPS suggestion, audio, AI, or staff calls.
}
if ($SkipFrontend) { Record 'Frontend HTTP GET' 'SKIP' 'Explicitly skipped; browser demo still required' }
else {
    Test-Step 'Frontend HTTP GET /' {
        $res = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $WebUrl -TimeoutSec 10
        if ([int]$res.StatusCode -ne 200) { throw "HTTP $($res.StatusCode)" }
        if ([string]::IsNullOrWhiteSpace([string]$res.Content)) { throw 'Empty HTML response' }
    }
    Test-Step 'Frontend admin.html GET' {
        $adminUri = ([uri]::new([uri]$WebUrl, 'admin.html')).AbsoluteUri
        $res = Invoke-WebRequest -UseBasicParsing -Method Get -Uri $adminUri -TimeoutSec 10
        if ([int]$res.StatusCode -ne 200) { throw "HTTP $($res.StatusCode)" }
    }
}
# Windows PowerShell 5.1: do not wrap a generic List in @($checks).
# Its array binder can throw "Argument types do not match" after all checks have passed.
# Snapshot the collection using its native .ToArray() method instead.
$checkSnapshot = $checks.ToArray()
[int]$failed = 0
[int]$skipped = 0
[int]$passed = 0
foreach ($entry in $checkSnapshot) {
    switch ([string]$entry.status) {
        'PASS' { $passed++; break }
        'FAIL' { $failed++; break }
        'SKIP' { $skipped++; break }
        default { throw "Unexpected check status for '$($entry.name)': $($entry.status)" }
    }
}
$report = [ordered]@{
    project = $Project
    generated_at = (Get-Date).ToString('o')
    elapsed_seconds = [math]::Round(((Get-Date) - $start).TotalSeconds,1)
    passed=$passed; failed=$failed; skipped=$skipped
    checks=$checkSnapshot
    release_status = 'Local technical preflight only. Not a certification of field GPS, history sources, chatbot quality, data retention, backups, staging or production.'
}
($report | ConvertTo-Json -Depth 8) | Set-Content -LiteralPath $jsonPath -Encoding UTF8
$md = New-Object System.Collections.Generic.List[string]
$md.Add('# M3.0 - Local technical preflight')
$md.Add('')
$md.Add(("Generated: {0}; PASS {1}; FAIL {2}; SKIP {3}" -f $report.generated_at,$passed,$failed,$skipped))
$md.Add('')
$md.Add('| Check | Result | Note |')
$md.Add('|---|---|---|')
foreach ($c in $checkSnapshot) {
    $safeNote = ([string]$c.note).Replace('|','/').Replace("`r",' ').Replace("`n",' ')
    $safeName = ([string]$c.name).Replace('|','/')
    $md.Add(("| {0} | {1} | {2} |" -f $safeName,$c.status,$safeNote))
}
$md.Add('')
$md.Add('**Not production sign-off.** Review field GPS, historical citations, accessibility, backup/restore, staging, retention and staff end-to-end workflows separately.')
$md.ToArray() | Set-Content -LiteralPath $markdownPath -Encoding UTF8
Write-Host "`nReport: $markdownPath" -ForegroundColor Cyan
Write-Host "JSON:   $jsonPath" -ForegroundColor Cyan
Write-Host ("PASS={0}  FAIL={1}  SKIP={2}" -f $passed,$failed,$skipped)
if ($failed -gt 0) {
    Write-Host 'M3.0 PREFLIGHT HAS FAILURES - do not mark acceptance PASS.' -ForegroundColor Red
    exit 1
}
if ($skipped -gt 0) {
    Write-Host 'M3.0 PREFLIGHT PARTIAL (SKIPPED CHECKS) - manual/remaining checks pending.' -ForegroundColor Yellow
    exit 0
}
Write-Host 'ALL M3.0 LOCAL TECHNICAL PREFLIGHT CHECKS PASSED' -ForegroundColor Green
Write-Host 'Manual MVP acceptance and production readiness remain separate.'
