Add-Type -AssemblyName System.Drawing

$imgPath = "C:\Users\ThinkPad\.gemini\antigravity\brain\fb1090b0-2e25-4667-b4bf-ed015aac9f33\.user_uploaded\media_1792309803714_6e3f2d82.jpg"
$bmp = New-Object System.Drawing.Bitmap($imgPath)

$w = $bmp.Width
$h = $bmp.Height

# We have 4 row segments:
# Row 0: Y ~ 15 to 168 (height ~ 154)
# Row 1: Y ~ 181 to 337 (height ~ 157)
# Row 2: Y ~ 350 to 494 (height ~ 145)
# Row 3: Y ~ 508 to 657 (height ~ 150)

# For Rows 0, 1, 2: 5 columns
# Let's find vertical cuts for row 0
function FindColsInRow($ymin, $ymax, $expectedCols) {
    # Check vertical sum of pixels in this row range
    $colProfile = New-Object int[] $w
    for ($x = 0; $x -lt $w; $x++) {
        $count = 0
        for ($y = $ymin; $y -le $ymax; $y++) {
            $p = $bmp.GetPixel($x, $y)
            # Check if tile (not dark gap background)
            # Dark gap is R < 35, G < 20, B < 30
            if ($p.R -gt 50 -or $p.G -gt 40 -or $p.B -gt 50) {
                $count++
            }
        }
        $colProfile[$x] = $count
    }
    
    # Find segments where count > 20
    $segments = @()
    $inSeg = $false
    $s = 0
    for ($x = 0; $x -lt $w; $x++) {
        if ($colProfile[$x] -gt 25 -and -not $inSeg) {
            $inSeg = $true
            $s = $x
        } elseif ($colProfile[$x] -le 25 -and $inSeg) {
            $inSeg = $false
            if (($x - $s) -gt 50) {
                $segments += @{ left = $s; right = ($x - 1); width = ($x - $s) }
            }
        }
    }
    if ($inSeg -and ($w - $s) -gt 50) {
        $segments += @{ left = $s; right = ($w - 1); width = ($w - $s) }
    }
    return $segments
}

Write-Output "--- ROW 0 (5 cols) ---"
$r0 = FindColsInRow 15 168 5
$r0 | ForEach-Object { Write-Output "Col: $($_.left) to $($_.right) (w: $($_.width))" }

Write-Output "--- ROW 1 (5 cols) ---"
$r1 = FindColsInRow 181 337 5
$r1 | ForEach-Object { Write-Output "Col: $($_.left) to $($_.right) (w: $($_.width))" }

Write-Output "--- ROW 2 (5 cols) ---"
$r2 = FindColsInRow 350 494 5
$r2 | ForEach-Object { Write-Output "Col: $($_.left) to $($_.right) (w: $($_.width))" }

Write-Output "--- ROW 3 (6 cols) ---"
$r3 = FindColsInRow 508 657 6
$r3 | ForEach-Object { Write-Output "Col: $($_.left) to $($_.right) (w: $($_.width))" }

$bmp.Dispose()
