param(
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Prefixes.Add("http://127.0.0.1:$Port/")

try {
    $listener.Start()
} catch {
    Write-Host "Port $Port is in use, trying 8081..."
    $Port = 8081
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$Port/")
    $listener.Prefixes.Add("http://127.0.0.1:$Port/")
    $listener.Start()
}

Write-Host "Capybara Go! Game Server is active at http://localhost:$Port/"
Write-Host "Serving files from: $root"

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".wav"  = "audio/wav"
    ".mp4"  = "video/mp4"
    ".m4a"  = "audio/mp4"
    ".webm" = "video/webm"
    ".ico"  = "image/x-icon"
    ".svg"  = "image/svg+xml"
    ".txt"  = "text/plain; charset=utf-8"
}

# Start default browser
Start-Process "http://localhost:$Port/"

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/" -or [string]::IsNullOrWhiteSpace($urlPath)) {
            $urlPath = "/index.html"
        }

        # Handle POST save audio
        if ($request.HttpMethod -eq "POST" -and $urlPath -eq "/save-audio") {
            $saveRel = $request.QueryString["path"]
            if (-not [string]::IsNullOrWhiteSpace($saveRel)) {
                $targetFile = [System.IO.Path]::Combine($root, $saveRel.Replace('/', [System.IO.Path]::DirectorySeparatorChar))
                $targetDir = [System.IO.Path]::GetDirectoryName($targetFile)
                if (-not [System.IO.Directory]::Exists($targetDir)) {
                    [System.IO.Directory]::CreateDirectory($targetDir) | Out-Null
                }
                $fileStream = [System.IO.File]::Create($targetFile)
                $request.InputStream.CopyTo($fileStream)
                $fileStream.Close()

                $response.StatusCode = 200
                $response.AddHeader("Access-Control-Allow-Origin", "*")
                $msg = [System.Text.Encoding]::UTF8.GetBytes("Saved $saveRel")
                $response.ContentLength64 = $msg.Length
                $response.OutputStream.Write($msg, 0, $msg.Length)
                $response.OutputStream.Close()
                continue
            }
        }

        # URL decode and map to local path
        $decoded = [System.Uri]::UnescapeDataString($urlPath).TrimStart('/')
        $localPath = [System.IO.Path]::Combine($root, $decoded.Replace('/', [System.IO.Path]::DirectorySeparatorChar))

        if ([System.IO.File]::Exists($localPath)) {
            $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
            $mime = "application/octet-stream"
            if ($mimeTypes.ContainsKey($ext)) {
                $mime = $mimeTypes[$ext]
            }

            $response.ContentType = $mime
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Cache-Control", "no-cache")

            $bytes = [System.IO.File]::ReadAllBytes($localPath)
            $response.ContentLength64 = $bytes.Length
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            }
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
            $response.ContentLength64 = $msg.Length
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
        }
    } catch {
        # continue loop
    } finally {
        try { $response.OutputStream.Close() } catch {}
    }
}
