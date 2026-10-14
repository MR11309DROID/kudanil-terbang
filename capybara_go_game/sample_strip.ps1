Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile("C:\Users\ThinkPad\.gemini\antigravity\brain\fb1090b0-2e25-4667-b4bf-ed015aac9f33\.user_uploaded\media_1791897130707_dc89cd15.png")

$x = [int]($bmp.Width * 0.5)
for ($y = [int]($bmp.Height * 0.72); $y -lt [int]($bmp.Height * 0.82); $y += 2) {
  $c = $bmp.GetPixel($x, $y)
  Write-Output "y=${y} - #$($c.R.ToString('X2'))$($c.G.ToString('X2'))$($c.B.ToString('X2'))"
}

$bmp.Dispose()
