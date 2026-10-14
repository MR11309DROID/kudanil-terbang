$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}

# Run headless Edge and capture user data directory
$tempDir = Join-Path $env:TEMP "edge_debug_$(Get-Random)"
$proc = Start-Process -FilePath $edgePath -ArgumentList "--headless=new", "--remote-debugging-port=9333", "--user-data-dir=`"$tempDir`"", "http://localhost:8080/" -PassThru
Start-Sleep -Seconds 3

try {
    $list = Invoke-RestMethod -Uri "http://localhost:9333/json/list"
    $page = $list | Where-Object { $_.type -eq "page" } | Select-Object -First 1
    Write-Output "Found Page: $($page.title), WS: $($page.webSocketDebuggerUrl)"

    Add-Type -AssemblyName System.Net.WebSockets
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $cts = New-Object System.Threading.CancellationTokenSource
    $ws.ConnectAsync([Uri]$page.webSocketDebuggerUrl, $cts.Token).Wait()

    # Function to send and receive CDP
    function Send-CDP($cmd) {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($cmd)
        $ws.SendAsync((New-Object ArraySegment[byte] @($bytes, 0, $bytes.Length)), [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $cts.Token).Wait()
        $buf = New-Object byte[] 8192
        $res = $ws.ReceiveAsync((New-Object ArraySegment[byte] @($buf, 0, $buf.Length)), $cts.Token)
        $res.Wait()
        return [System.Text.Encoding]::UTF8.GetString($buf, 0, $res.Result.Count)
    }

    Write-Output (Send-CDP '{"id":1,"method":"Runtime.enable"}')
    Write-Output (Send-CDP '{"id":2,"method":"Runtime.evaluate","params":{"expression":"[document.readyState, typeof LoadingScreen, typeof Game, window.errors || []]"}}')
    
    $ws.Dispose()
} catch {
    Write-Output "CDP Exception: $($_.Exception.Message)"
} finally {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
