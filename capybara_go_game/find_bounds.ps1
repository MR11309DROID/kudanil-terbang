Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile("C:\Users\ThinkPad\.gemini\antigravity\scratch\capybara_go_game\assets\characters\player\idle\frame_01.png")
Write-Output "frame_01: $($img.Width) x $($img.Height)"
# Find non-transparent bounding box
$minX = $img.Width; $maxX = 0; $minY = $img.Height; $maxY = 0
for ($x = 0; $x -lt $img.Width; $x++) {
  for ($y = 0; $y -lt $img.Height; $y++) {
    $c = $img.GetPixel($x, $y)
    if ($c.A -gt 20) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}
Write-Output "Bounding Box: x=[$minX, $maxX], y=[$minY, $maxY], w=$($maxX - $minX + 1), h=$($maxY - $minY + 1)"
$img.Dispose()
