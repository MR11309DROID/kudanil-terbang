$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$outPng = "C:\Users\ThinkPad\.gemini\antigravity\brain\fb1090b0-2e25-4667-b4bf-ed015aac9f33\gear_mythic_screenshot.png"

$proc = Start-Process -FilePath $edge -ArgumentList "--headless", "--remote-debugging-port=9228", "--window-size=440,840", "http://localhost:8085/" -PassThru
Start-Sleep -Seconds 2

try {
    $pages = Invoke-RestMethod -Uri "http://localhost:9228/json"
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
    
    // Equip authentic mythic gears in paperdoll
    Character.equipped = {
        weapon: Character.createItemFromTemplate('myth_00', 80),
        armor: Character.createItemFromTemplate('myth_07', 80),
        helmet: Character.createItemFromTemplate('myth_10', 80),
        boots: Character.createItemFromTemplate('myth_19', 80),
        ring: Character.createItemFromTemplate('myth_12', 80),
        amulet: Character.createItemFromTemplate('myth_16', 80)
    };
    Character.equipped.weapon.refineRank = 3;
    Character.equipped.armor.refineRank = 2;
    Character.equipped.helmet.refineRank = 2;
    Character.equipped.boots.refineRank = 2;
    Character.equipped.ring.refineRank = 3;
    Character.equipped.amulet.refineRank = 2;

    // Fill inventory with all 21 authentic mythic items
    Character.inventory = [];
    for (let i = 0; i < 21; i++) {
        const id = 'myth_' + (i < 10 ? '0' + i : i);
        const item = Character.createItemFromTemplate(id, 75);
        if (item) Character.inventory.push(item);
    }
    
    Character.save();
    if (window.Game && window.Game.ui) {
        window.Game.ui.switchTab('equipment');
        window.Game.ui.renderEquipmentScreen();
    }
})();
"@

    $cmd = [PSCustomObject]@{
        id = 1
        method = "Runtime.evaluate"
        params = @{ expression = $js }
    } | ConvertTo-Json -Compress

    $bytes = [System.Text.Encoding]::UTF8.GetBytes($cmd)
    $segment = New-Object System.ArraySegment[byte] -ArgumentList @(,$bytes)
    $ws.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, $ct).Wait()
    
    Start-Sleep -Milliseconds 1000

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
        
        if ($jsonStr.Contains('"id":2')) {
            $obj = $jsonStr | ConvertFrom-Json
            if ($obj.result -and $obj.result.data) {
                $imgBytes = [System.Convert]::FromBase64String($obj.result.data)
                [System.IO.File]::WriteAllBytes($outPng, $imgBytes)
                Write-Host "SUCCESS: Mythic Screenshot saved to $outPng (size: $($imgBytes.Length) bytes)"
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
