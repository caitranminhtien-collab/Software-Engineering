# Run once in Windows PowerShell from the Software-Engineering project root.
# Precondition: Backend is running at http://localhost:3000 in another terminal.
param(
    [int]$AttractionId = 1,
    [int]$RouteId = 6
)
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000/api/v1'
function Require($ok, $message) { if (-not $ok) { throw $message } }
Write-Host '=== M2.6 One-pass smoke test ===' -ForegroundColor Cyan
node --check .\frontend\app.js
Require ($LASTEXITCODE -eq 0) 'FAIL: frontend JavaScript syntax'
Write-Host 'PASS: frontend JS syntax'

npm.cmd run build
Require ($LASTEXITCODE -eq 0) 'FAIL: backend TypeScript build'
Write-Host 'PASS: backend build'

$health = Invoke-RestMethod -Uri "$base/health/live" -ErrorAction Stop
Require ($health.status -eq 'ok') 'FAIL: health/live'
Write-Host 'PASS: health/live'

# Staff aggregation must not be publicly readable.
try {
    $null = Invoke-RestMethod -Uri "$base/staff/analytics?days=7" -ErrorAction Stop
    throw 'FAIL: unauthenticated analytics report was exposed'
} catch {
    if ($_.Exception.Message -like 'FAIL:*') { throw }
    $response = $_.Exception.Response
    Require ($null -ne $response) 'FAIL: staff analytics response unavailable'
    Require ([int]$response.StatusCode -eq 401) "FAIL: staff report returned $([int]$response.StatusCode), expected 401"
    Write-Host 'PASS: staff analytics requires login (401)'
}

# These intentionally create 3 analytics test rows in the local PostgreSQL database.
$session = Invoke-RestMethod -Uri "$base/visitor-sessions" -Method POST -ContentType 'application/json' -Body '{"language_code":"vi"}' -ErrorAction Stop
$token = $session.data.token
Require (-not [string]::IsNullOrEmpty($token)) 'FAIL: visitor token missing'
$headers = @{ Authorization = "Bearer $token" }
$events = @(
    @{event_type='attraction_view'; attraction_id=$AttractionId},
    @{event_type='tts_started'; attraction_id=$AttractionId; language_code='vi'},
    @{event_type='route_started'; route_id=$RouteId}
)
foreach ($event in $events) {
    $body = $event | ConvertTo-Json -Compress
    $result = Invoke-RestMethod -Uri "$base/visitor-events" -Method POST -Headers $headers -ContentType 'application/json' -Body $body -ErrorAction Stop
    Require ($result.data.event_type -eq $event.event_type) "FAIL: $($event.event_type)"
    Write-Host "PASS: $($event.event_type) / ID $($result.data.id)"
}
Write-Host 'ALL AUTOMATED M2.6 TESTS PASSED' -ForegroundColor Green
Write-Host 'Next: open http://localhost:8000/admin.html as Staff Admin, choose PostgreSQL real data, refresh, and verify three event counters.'
Write-Host 'Note: the three test events were inserted into PostgreSQL, and will be included in the dashboard.'
