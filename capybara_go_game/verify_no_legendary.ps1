$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$outPng = "C:\Users\ThinkPad\.gemini\antigravity\brain\fb1090b0-2e25-4667-b4bf-ed015aac9f33\gear_no_legendary.png"

$proc = Start-Process -FilePath $edge -ArgumentList "--headless", "--remote-debugging-port=9234", "--window-size=440,840", "http://localhost:8085/" -PassThru
Start-Sleep -Seconds 2

try {
    $pages = Invoke-RestMethod -Uri "http://localhost:9234/json"
    $page = $pages | Where-Object { $_.type -eq "page" } | Select-Object -First 1
    $wsUrl = $page.webSocketDebuggerUrl
    
    $ws = New-Object System.Net.WebSockets.ClientWebSocket
    $ct = New-Object System.Threading.CancellationToken
    $uri = New-Object System.Uri($wsUrl)
    $ws.ConnectAsync($uri, $ct).Wait()
    
    $js = @"
(() => {
    const ls = document.getElementById('loading-screen'); if (ls) ls.style.display = 'none';
    const dl = document.getElementById('daily-login-modal'); if (dl) dl.remove();
    Character.dailyLogin = { lastLoginDate: new Date().toISOString().slice(0, 10), streak: 1 };
    
    // Purge any legendary or epic items
    Character.load();
    Character.save();
    
    if (window.Game && window.Game.ui) {
        window.Game.ui.switchTab('equipment');
        window.Game.ui.renderEquipmentScreen();
    }
    
    return JSON.stringify({
        equipped: Object.keys(Character.equipped).map(k => ({ slot: k, id: Character.equipped[k]?.templateId, rarity: Character.equipped[k]?.rarity })),
        legendaryCount: Character.inventory.filter(i => i && i.rarity === 'legendary').length,
        epicCount: Character.inventory.filter(i => i && i.rarity === 'epic').length,
        allRarities: [...new Set(Character.inventory.map(i => i.rarity))]
    });
})();
"@

    $cmd = [PSCustomObject]@{
        id = 1
        method = "Runtime.evaluate"
        params = @{ expression = $js; returnByValue = $true }
    } | ConvertTo-Json -Compress

    $bytes = [System.Text.Encoding]::UTF8.GetBytes($cmd)
    $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes)
    $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait()
    
    Start-Sleep -Milliseconds 1200

    # Capture screenshot
    $cmd2 = '{"id":2,"method":"Page.captureScreenshot","params":{"format":"png"}}'
    $bytes2 = [System.Text.Encoding]::UTF8.GetBytes($cmd2)
    $segment2 = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes2)
    $ws.SendAsync($segment2, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait()
    
    for ($i = 0; $i -lt 15; $i++) {
        $buffer = New-Object byte[] 4000000
        $recvSegment = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
        $res = $ws.ReceiveAsync($recvSegment, $ct).Result
        $jsonStr = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $res.Count)
        while (!$res.EndOfMessage) {
            $recvSegment = New-Object System.ArraySegment[byte] -ArgumentList @(,$buffer)
            $res = $ws.ReceiveAsync($recvSegment, $ct).Result
            $jsonStr += [System.Text.Encoding]::UTF8.GetString($buffer, 0, $res.Count)
        }
        
        if ($jsonStr.Contains('"id":1')) {
            Write-Host "EVAL RESULT: $jsonStr"
        }
        
        if ($jsonStr.Contains('"id":2')) {
            $obj = $jsonStr | ConvertFrom-Json
            if ($obj.result -and $obj.result.data) {
                $imgBytes = [System.Convert]::FromBase64String($obj.result.data)
                [System.IO.File]::WriteAllBytes($outPng, $imgBytes)
                Write-Host "SUCCESS: Screenshot saved to $outPng (size: $($imgBytes.Length) bytes)"
                break
            }
        }
    }
    
    $ws.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", $ct).Wait()
} catch {
    Write-Host "Error: $_"
} finally {
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}
