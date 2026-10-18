Add-Type -AssemblyName System.Drawing

$imgPath = "C:\Users\ThinkPad\.gemini\antigravity\brain\fb1090b0-2e25-4667-b4bf-ed015aac9f33\.user_uploaded\media_1792309803714_6e3f2d82.jpg"
$bmp = New-Object System.Drawing.Bitmap($imgPath)

$outDir = "C:\Users\ThinkPad\.gemini\antigravity\scratch\capybara_go_game\assets\items\mythic"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force
}

$tiles = @(
    # Row 0 (5 items)
    @{ x=13; y=15; w=184; h=154 },
    @{ x=217; y=15; w=183; h=154 },
    @{ x=420; y=15; w=186; h=154 },
    @{ x=626; y=15; w=184; h=154 },
    @{ x=830; y=15; w=182; h=154 },
    
    # Row 1 (5 items)
    @{ x=13; y=181; w=184; h=157 },
    @{ x=217; y=181; w=183; h=157 },
    @{ x=420; y=181; w=186; h=157 },
    @{ x=626; y=181; w=184; h=157 },
    @{ x=830; y=181; w=182; h=157 },

    # Row 2 (5 items)
    @{ x=13; y=350; w=184; h=145 },
    @{ x=217; y=350; w=183; h=145 },
    @{ x=420; y=350; w=186; h=145 },
    @{ x=626; y=350; w=184; h=145 },
    @{ x=830; y=350; w=182; h=145 },

    # Row 3 (6 items)
    @{ x=13; y=508; w=158; h=150 },
    @{ x=190; y=508; w=151; h=150 },
    @{ x=359; y=508; w=146; h=150 },
    @{ x=522; y=508; w=148; h=150 },
    @{ x=687; y=508; w=153; h=150 },
    @{ x=857; y=508; w=155; h=150 }
)

for ($i = 0; $i -lt $tiles.Count; $i++) {
    $t = $tiles[$i]
    $rect = New-Object System.Drawing.Rectangle($t.x, $t.y, $t.w, $t.h)
    $cropped = $bmp.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    $cardName = ("card_mythic_{0:D2}.png" -f $i)
    $iconName = ("icon_mythic_{0:D2}.png" -f $i)
    
    $cardPath = Join-Path $outDir $cardName
    $iconPath = Join-Path $outDir $iconName
    
    $cropped.Save($cardPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $cropped.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $cropped.Dispose()
    Write-Output ("Saved Mythic {0:D2}: {1} ({2}x{3})" -f $i, $cardName, $t.w, $t.h)
}

$bmp.Dispose()
Write-Output "Successfully extracted all 21 Mythic equipment tiles!"
