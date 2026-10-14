Add-Type -AssemblyName System.Drawing

$src = "C:\Users\ThinkPad\.gemini\antigravity\scratch\capybara_go_game\assets\characters\player\idle\frame_01.png"
$orig = [System.Drawing.Bitmap]::FromFile($src)

$capyW = 50
$capyH = 44
$capySprite = New-Object System.Drawing.Bitmap($capyW, $capyH)

for ($x = 0; $x -lt $capyW; $x++) {
  for ($y = 0; $y -lt $capyH; $y++) {
    $srcX = $x + 7
    $srcY = $y + 20
    if ($srcX -lt $orig.Width -and $srcY -lt $orig.Height) {
      $c = $orig.GetPixel($srcX, $srcY)
      # Skip green leaf on head
      if ($c.G -gt 135 -and $c.R -lt 120) {
        continue
      }
      if ($c.A -gt 25) {
        $isOutline = ($c.R -lt 55 -and $c.G -lt 55 -and $c.B -lt 55)
        $isSnout = ($c.R -gt 70 -and $c.R -lt 155 -and $c.G -lt 110)
        
        if ($isOutline) {
          # Subtle dark outline / watermark line (slightly visible, elegant)
          $capySprite.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(38, 0, 0, 0))
        } elseif ($isSnout) {
          # Subtle dark snout contour
          $capySprite.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(26, 0, 0, 0))
        } else {
          # Subtle lighter body fill
          $capySprite.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(20, 255, 255, 255))
        }
      }
    }
  }
}

# Seamless tile: 112 x 88
$tileW = 112
$tileH = 88
$tile = New-Object System.Drawing.Bitmap($tileW, $tileH)
$g = [System.Drawing.Graphics]::FromImage($tile)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

# Background dark tone matching user screenshot (#1a1d26)
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 26, 29, 38))
$g.FillRectangle($bgBrush, 0, 0, $tileW, $tileH)

# Helper function to draw rotated sprite
function DrawCapy($gx, $cx, $cy, $angle) {
  $state = $gx.Save()
  $gx.TranslateTransform($cx, $cy)
  $gx.RotateTransform($angle)
  $gx.DrawImage($capySprite, -$capyW / 2, -$capyH / 2, $capyW, $capyH)
  $gx.Restore($state)
}

# Staggered arrangement (brick pattern)
# Instance 1: top-left
DrawCapy $g 28 22 -6

# Instance 2: bottom-right (offset half width and half height)
DrawCapy $g 84 66 -6

$outPath = "C:\Users\ThinkPad\.gemini\antigravity\scratch\capybara_go_game\assets\ui\capybara_watermark_tile.png"
$tile.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)

$orig.Dispose()
$capySprite.Dispose()
$tile.Dispose()
$g.Dispose()
Write-Output "Seamless tile updated at $outPath"
