param(
    [string]$Project = 'C:\Users\ASUS\Software-Engineering',
    [string]$ApiBase = 'http://localhost:3000/api/v1'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $Project -PathType Container)) {
    throw "Project folder not found: $Project"
}
Set-Location -LiteralPath $Project

function Pass([string]$msg) {
    Write-Host "PASS: $msg" -ForegroundColor Green
}
function Check([bool]$condition, [string]$msg) {
    if (-not $condition) { throw "FAIL: $msg" }
    Pass $msg
}

function ConvertTo-FiniteCoordinate($raw, [double]$min, [double]$max) {
    if ($null -eq $raw -or $raw -is [bool]) { return $null }
    try {
        $number = [System.Convert]::ToDouble($raw, [System.Globalization.CultureInfo]::InvariantCulture)
        if ([double]::IsNaN($number) -or [double]::IsInfinity($number) -or $number -lt $min -or $number -gt $max) {
            return $null
        }
        return $number
    } catch {
        return $null
    }
}

function Get-PublicAttractionItems($payload) {
    if ($null -eq $payload -or $null -eq $payload.data) {
        throw 'FAIL: GET /attractions response lacks data'
    }
    $raw = $payload.data
    if ($raw -is [array]) { return $raw }
    if ($null -ne $raw.items) { return $raw.items }
    return $raw
}

Write-Host '=== M2.8 MVP one-pass check (V2: coordinate-only fixture) ==='
& node --check '.\frontend\app.js'
Check ($LASTEXITCODE -eq 0) 'Frontend JavaScript syntax'
& npm.cmd run build
Check ($LASTEXITCODE -eq 0) 'Backend TypeScript build'
& node --test '.\tests\M28_mvp_contract.node.cjs'
Check ($LASTEXITCODE -eq 0) 'Frontend GPS / backend route contract checks'

$health = Invoke-RestMethod -Uri "$ApiBase/health/ready" -ErrorAction Stop
Check ($health.status -eq 'ready') 'PostgreSQL + Redis readiness'

$payload = Invoke-RestMethod -Uri "$ApiBase/attractions?language=vi&page=1&page_size=100" -ErrorAction Stop
$items = @(Get-PublicAttractionItems $payload)
Check ($items.Count -ge 10) 'At least 10 published attractions'

$fixture = $null
foreach ($item in $items) {
    if ($null -eq $item) { continue }
    $latRaw = $item.latitude
    $lonRaw = $item.longitude
    if ($null -eq $latRaw -and $null -ne $item.coordinates) {
        $latRaw = $item.coordinates.latitude
    }
    if ($null -eq $lonRaw -and $null -ne $item.coordinates) {
        $lonRaw = $item.coordinates.longitude
    }
    $lat = ConvertTo-FiniteCoordinate $latRaw -90 90
    $lon = ConvertTo-FiniteCoordinate $lonRaw -180 180
    if ($null -ne $lat -and $null -ne $lon) {
        $fixture = [pscustomobject]@{
            latitude = [double]$lat
            longitude = [double]$lon
            slug = [string]$item.slug
            id = [string]$item.id
        }
        break
    }
}

if ($null -eq $fixture) {
    $sample = $items | Select-Object -First 1
    Write-Host 'DIAGNOSTIC: the first published attraction returned by your running API:' -ForegroundColor Yellow
    $sample | ConvertTo-Json -Depth 6 | Write-Host
    throw 'FAIL: No valid latitude/longitude in GET /attractions response. Do not invent test GPS coordinates. Send the DIAGNOSTIC above so we can fix the API/response mismatch.'
}
Pass "GPS test fixture from public API (slug='$($fixture.slug)'; coordinates valid; numeric ID not required)"

$session = Invoke-RestMethod -Uri "$ApiBase/visitor-sessions" -Method POST -ContentType 'application/json' -Body '{"language_code":"vi"}' -ErrorAction Stop
$token = [string]$session.data.token
Check (-not [string]::IsNullOrWhiteSpace($token)) 'Create anonymous visitor session'
$headers = @{ Authorization = "Bearer $token" }

$body = @{
    latitude = $fixture.latitude
    longitude = $fixture.longitude
    accuracy_m = 1
    sampled_at = [DateTime]::UtcNow.ToString('o')
} | ConvertTo-Json
$near = Invoke-RestMethod -Uri "$ApiBase/location-suggestions" -Method POST -ContentType 'application/json' -Headers $headers -Body $body -ErrorAction Stop
Check ($null -ne $near.data) 'GPS nearby API returned response'
$nearItems = @($near.data)
Check ($nearItems.Count -ge 1) 'Nearby published attraction returned for public coordinates'

# Verify low-accuracy readings ask for manual selection without inventing GPS data.
$lowAccuracyBody = @{
    latitude = $fixture.latitude
    longitude = $fixture.longitude
    accuracy_m = 1000000
    sampled_at = [DateTime]::UtcNow.ToString('o')
} | ConvertTo-Json
$lowAccuracy = Invoke-RestMethod -Uri "$ApiBase/location-suggestions" -Method POST -ContentType 'application/json' -Headers $headers -Body $lowAccuracyBody -ErrorAction Stop
Check ($lowAccuracy.meta.manual_selection_recommended -eq $true) 'Low GPS accuracy recommends manual selection'

Write-Host 'ALL AUTOMATED M2.8 CHECKS PASSED' -ForegroundColor Green
Write-Host 'NOTE: A disposable visitor session was created and GPS coordinates came from public API.'
Write-Host 'NOTE: Field GPS, data provenance, AI quality and production deployment still need separate acceptance testing.'
