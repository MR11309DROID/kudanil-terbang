Add-Type -AssemblyName System.Drawing

$imgPath = "C:\Users\ThinkPad\.gemini\antigravity\brain\fb1090b0-2e25-4667-b4bf-ed015aac9f33\.user_uploaded\media_1792307561505_cb8767de.jpg"
$bmp = New-Object System.Drawing.Bitmap($imgPath)

$rowRanges = @(
    @{ min=10; max=180 },
    @{ min=180; max=345 },
    @{ min=345; max=505 },
    @{ min=505; max=675 }
)

$colRanges = @(
    @{ min=10; max=180 },
    @{ min=180; max=345 },
    @{ min=345; max=515 },
    @{ min=515; max=680 },
    @{ min=680; max=850 },
    @{ min=850; max=1015 }
)

$outDir = "C:\Users\ThinkPad\.gemini\antigravity\scratch\capybara_go_game\assets\items\rare"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force
}

$tileInfo = @()

for ($r = 0; $r -lt 4; $r++) {
    for ($c = 0; $c -lt 6; $c++) {
        $idx = $r * 6 + $c
        
        $rmin = $rowRanges[$r].min
        $rmax = [Math]::Min($rowRanges[$r].max, $bmp.Height - 1)
        $cmin = $colRanges[$c].min
        $cmax = [Math]::Min($colRanges[$c].max, $bmp.Width - 1)
        
        # Find exact minX, maxX, minY, maxY where pixel belongs to the tile (blue border / card)
        # Background is dark navy: R<40, G<40, B<70
        # Tile has blue/cyan border or card: B >= 65 and (B > R + 15 or B > G + 15 or (B > 60 and G > 50))
        $minX = $cmax; $maxX = $cmin; $minY = $rmax; $maxY = $rmin
        
        for ($y = $rmin; $y -le $rmax; $y++) {
            for ($x = $cmin; $x -le $cmax; $x++) {
                $p = $bmp.GetPixel($x, $y)
                # Check if not the dark outer background
                # Dark background is approximately R < 25, G < 35, B < 65
                $isBg = ($p.R -lt 30 -and $p.G -lt 40 -and $p.B -lt 70)
                if (-not $isBg) {
                    if ($x -lt $minX) { $minX = $x }
                    if ($x -gt $maxX) { $maxX = $x }
                    if ($y -lt $minY) { $minY = $y }
                    if ($y -gt $maxY) { $maxY = $y }
                }
            }
        }
        
        # Add 1px padding if inside bounds to capture clean anti-aliased edge
        $w = $maxX - $minX + 1
        $h = $maxY - $minY + 1
        
        $tileInfo += [PSCustomObject]@{
            Index = $idx
            Row = $r
            Col = $c
            X = $minX
            Y = $minY
            W = $w
            H = $h
        }
        
        Write-Output "Tile $idx : ($minX, $minY) size ${w}x${h}"
        
        $rect = New-Object System.Drawing.Rectangle($minX, $minY, $w, $h)
        $cropped = $bmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        
        $cardPath = Join-Path $outDir ("card_rare_{0:D2}.png" -f $idx)
        $iconPath = Join-Path $outDir ("icon_rare_{0:D2}.png" -f $idx)
        
        $cropped.Save($cardPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $cropped.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $cropped.Dispose()
    }
}

$bmp.Dispose()
Write-Output "Done extracting all 24 rare tiles!"
