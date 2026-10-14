Add-Type -AssemblyName System.Drawing
$file = "C:\Users\ThinkPad\.gemini\antigravity\brain\fb1090b0-2e25-4667-b4bf-ed015aac9f33\anim_frames\full_001.png"
$bmp = [System.Drawing.Bitmap]::FromFile($file)
$minX = $bmp.Width
$maxX = 0
$minY = $bmp.Height
$maxY = 0
for ($y=0; $y -lt $bmp.Height; $y+=2) {
  for ($x=0; $x -lt $bmp.Width; $x+=2) {
    $col = $bmp.GetPixel($x, $y)
    if ($col.R -gt 25 -or $col.G -gt 25 -or $col.B -gt 25) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
$bmp.Dispose()
Write-Host "bbox: x=$minX y=$minY w=$($maxX-$minX) h=$($maxY-$minY)"
