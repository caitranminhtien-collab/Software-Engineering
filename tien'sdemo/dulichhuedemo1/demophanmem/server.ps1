# Lightweight HTTP Server in PowerShell for PWA Demo
param (
    [int]$Port = 8080
)

$listener = New-Object System.Net.HttpListener
$url = "http://localhost:$Port/"
$listener.Prefixes.Add($url)

try {
    $listener.Start()
    Write-Host "======================================================" -ForegroundColor Yellow
    Write-Host " HUẾ HERITAGE GPS AUDIO TOUR PWA SERVER RUNNING" -ForegroundColor Cyan
    Write-Host " URL: $url" -ForegroundColor Green
    Write-Host " Press Ctrl+C to stop." -ForegroundColor Yellow
    Write-Host "======================================================" -ForegroundColor Yellow
} catch {
    Write-Host "Port $Port is busy, trying 8085..." -ForegroundColor Yellow
    $Port = 8085
    $url = "http://localhost:$Port/"
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add($url)
    $listener.Start()
    Write-Host "URL: $url" -ForegroundColor Green
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".ico"  = "image/x-icon"
}

$baseDir = $PSScriptRoot
if (-not $baseDir) { $baseDir = Get-Location }

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($path)) {
            $path = "index.html"
        }

        $filePath = Join-Path $baseDir $path.Replace('/', [System.IO.Path]::DirectorySeparatorChar)

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $mime = $mimeTypes[$ext]
            }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $mime
            $response.ContentLength64 = $bytes.Length
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Cache-Control", "no-cache")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.OutputStream.Close()
    } catch {
        # Continue loop on error
    }
}
