Add-Type -AssemblyName presentationCore
Add-Type -AssemblyName presentationFramework
Add-Type -AssemblyName windowsBase

$videoPath = 'c:\capybara 2.0\video zip\video_project_2\Video Project 2 (1).mp4'
$outDir = 'c:\capybara 2.0\video zip\frames_vp2'
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$player = New-Object System.Windows.Media.MediaPlayer
$player.ScrubbingEnabled = $true
$player.Open((New-Object System.Uri($videoPath)))
Start-Sleep -Milliseconds 2000

for ($sec = 0; $sec -le 10; $sec += 1) {
  $player.Position = [System.TimeSpan]::FromSeconds($sec)
  Start-Sleep -Milliseconds 600
  
  $drawingVisual = New-Object System.Windows.Media.DrawingVisual
  $drawingContext = $drawingVisual.RenderOpen()
  $videoDrawing = New-Object System.Windows.Media.VideoDrawing
  $videoDrawing.Rect = New-Object System.Windows.Rect(0, 0, 480, 854)
  $videoDrawing.Player = $player
  $drawingContext.DrawDrawing($videoDrawing)
  $drawingContext.Close()

  $bmp = New-Object System.Windows.Media.Imaging.RenderTargetBitmap(480, 854, 96, 96, [System.Windows.Media.PixelFormats]::Pbgra32)
  $bmp.Render($drawingVisual)

  $encoder = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
  $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bmp))
  $frameFile = Join-Path $outDir ("frame_{0:D2}.png" -f $sec)
  $fs = [System.IO.File]::OpenWrite($frameFile)
  $encoder.Save($fs)
  $fs.Close()
  Write-Output ("Saved " + $frameFile)
}
$player.Close()
