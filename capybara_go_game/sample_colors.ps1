Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile("C:\Users\ThinkPad\.gemini\antigravity\brain\fb1090b0-2e25-4667-b4bf-ed015aac9f33\.user_uploaded\media_1791897130707_dc89cd15.png")

$cCard = $bmp.GetPixel([int]($bmp.Width * 0.5), [int]($bmp.Height * 0.65))
$cBevel = $bmp.GetPixel([int]($bmp.Width * 0.5), [int]($bmp.Height * 0.77))
$cBorder = $bmp.GetPixel([int]($bmp.Width * 0.5), [int]($bmp.Height * 0.79))
$cBg = $bmp.GetPixel([int]($bmp.Width * 0.1), [int]($bmp.Height * 0.4))

Write-Output "Card Face: #$($cCard.R.ToString('X2'))$($cCard.G.ToString('X2'))$($cCard.B.ToString('X2'))"
Write-Output "Card Bevel: #$($cBevel.R.ToString('X2'))$($cBevel.G.ToString('X2'))$($cBevel.B.ToString('X2'))"
Write-Output "Outer Border: #$($cBorder.R.ToString('X2'))$($cBorder.G.ToString('X2'))$($cBorder.B.ToString('X2'))"
Write-Output "Background: #$($cBg.R.ToString('X2'))$($cBg.G.ToString('X2'))$($cBg.B.ToString('X2'))"

$bmp.Dispose()
