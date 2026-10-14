Add-Type -AssemblyName System.Drawing
$ref = 'C:\Users\ThinkPad\.gemini\antigravity\brain\fb1090b0-2e25-4667-b4bf-ed015aac9f33\.user_uploaded\media_1791937682433_5527a40e.jpg'
$src = [System.Drawing.Bitmap]::FromFile($ref)

# Crop bounds for the entire graphic:
$cropX = 35
$cropY = 190
$cropW = 954
$cropH = 635

$out = New-Object System.Drawing.Bitmap($cropW, $cropH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Center of aura glow in global coords: (512, 440)
$cx = 512.0
$cy = 440.0

# Mascot center: (515, 460)
# Radius of mascot roughly 240px wide, 200px high
# Sword runs from (515, 460) up-left to (220, 230)

for ($y = 0; $y -lt $cropH; $y++) {
    $gy = $y + $cropY
    for ($x = 0; $x -lt $cropW; $x++) {
        $gx = $x + $cropX
        $c = $src.GetPixel($gx, $gy)
        $r = [int]$c.R
        $g = [int]$c.G
        $b = [int]$c.B
        $brightness = ($r + $g + $b) / 3.0
        
        # 1. Check if inside Banner:
        # Yellow plaque: gx from 105 to 918, gy from 660 to 760
        # Ribbon wings: gx from 42 to 140, gy from 680 to 815
        # Right ribbon: gx from 880 to 980, gy from 680 to 815
        $inPlaque = ($gx -ge 105 -and $gx -le 918 -and $gy -ge 658 -and $gy -le 762)
        $inLeftRibbon = ($gx -ge 42 -and $gx -le 145 -and $gy -ge 682 -and $gy -le 816)
        $inRightRibbon = ($gx -ge 875 -and $gx -le 980 -and $gy -ge 682 -and $gy -le 816)
        $isBanner = ($inPlaque -or $inLeftRibbon -or $inRightRibbon)
        
        # Refine banner boundaries (exclude dark background above/below ribbons):
        if ($isBanner) {
            # Outside angled ribbon tips:
            if ($gx -lt 105 -and $gy -lt 690) { $isBanner = $false }
            if ($gx -gt 918 -and $gy -lt 690) { $isBanner = $false }
            # Below bottom ribbon edge:
            if ($gy -gt 762 -and ($gx -ge 145 -and $gx -le 875)) {
                # Below center plaque
                if ($gy -gt 772) { $isBanner = $false }
            }
            if ($gy -gt 812) { $isBanner = $false }
        }
        
        # 2. Check if inside Mascot (Capybara body + head):
        $dx = ($gx - 515.0) / 195.0
        $dy = ($gy - 505.0) / 175.0
        $inBody = (($dx * $dx) + ($dy * $dy) -le 1.05 -and $gy -le 760)
        
        # 3. Check if inside Wooden Sword:
        # Sword axis from (530, 480) to (220, 240)
        $swDx = 220.0 - 530.0
        $swDy = 240.0 - 480.0
        $swLen = [Math]::Sqrt($swDx * $swDx + $swDy * $swDy)
        $proj = (($gx - 530.0) * $swDx + ($gy - 480.0) * $swDy) / ($swLen * $swLen)
        $perp = [Math]::Abs(($gx - 530.0) * $swDy - ($gy - 480.0) * $swDx) / $swLen
        $inSword = ($proj -ge -0.05 -and $proj -le 1.15 -and $perp -le 68.0)
        
        # 4. Check if Sparkle:
        # Sparkle 1: around (210, 390)
        # Sparkle 2: around (100, 560)
        # Sparkle 3: around (790, 460)
        # Sparkle 4: around (845, 540)
        $isSparkle = (($gx -ge 185 -and $gx -le 240 -and $gy -ge 365 -and $gy -le 420) -or
                      ($gx -ge 75 -and $gx -le 130 -and $gy -ge 535 -and $gy -le 590) -or
                      ($gx -ge 765 -and $gx -le 820 -and $gy -ge 435 -and $gy -le 490) -or
                      ($gx -ge 820 -and $gx -le 875 -and $gy -ge 515 -and $gy -le 570))
        
        if ($isBanner -or $inBody -or $inSword) {
            $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $r, $g, $b))
        } elseif ($isSparkle) {
            $alpha = [int][Math]::Min(255, [Math]::Max(0, ($brightness - 45) * 2.6))
            $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $r, $g, $b))
        } else {
            # Soft spotlight aura glow:
            $distAura = [Math]::Sqrt(($gx - $cx)*($gx - $cx) + ($gy - $cy)*($gy - $cy))
            if ($distAura -lt 340.0 -and $brightness -gt 55 -and $gy -lt 670) {
                $falloff = 1.0 - ($distAura / 340.0)
                $alpha = [int][Math]::Min(230, [Math]::Max(0, ($brightness - 45) * 1.8 * $falloff))
                if ($alpha -gt 4) {
                    $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $r, $g, $b))
                } else {
                    $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
                }
            } else {
                $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            }
        }
    }
}

$outPath = Join-Path (Get-Location) 'assets\ui\choose_skill_header_master.png'
$out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$out.Dispose()
$src.Dispose()
Write-Output "Master transparent header saved to assets\ui\choose_skill_header_master.png"
