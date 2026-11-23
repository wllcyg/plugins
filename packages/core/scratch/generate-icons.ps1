Add-Type -AssemblyName System.Drawing

$outputDir = "d:\self\plugins\apps\ext-table-export\public\icons"
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$sizes = @(16, 32, 48, 128)

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # 背景渐变色 (Emerald 渐变)
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $cTop = [System.Drawing.Color]::FromArgb(255, 16, 185, 129)
    $cBottom = [System.Drawing.Color]::FromArgb(255, 4, 120, 87)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $cTop, $cBottom, 45.0)

    # 圆角半径
    $radius = [Math]::Max(2, [int]($size * 0.22))
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pad = [Math]::Max(1, [int]($size * 0.05))
    $drawW = $size - 2 * $pad
    $drawH = $size - 2 * $pad

    $arcRect1 = New-Object System.Drawing.Rectangle($pad, $pad, $radius * 2, $radius * 2)
    $arcRect2 = New-Object System.Drawing.Rectangle($pad + $drawW - $radius * 2, $pad, $radius * 2, $radius * 2)
    $arcRect3 = New-Object System.Drawing.Rectangle($pad + $drawW - $radius * 2, $pad + $drawH - $radius * 2, $radius * 2, $radius * 2)
    $arcRect4 = New-Object System.Drawing.Rectangle($pad, $pad + $drawH - $radius * 2, $radius * 2, $radius * 2)

    $path.AddArc($arcRect1, 180, 90)
    $path.AddArc($arcRect2, 270, 90)
    $path.AddArc($arcRect3, 0, 90)
    $path.AddArc($arcRect4, 90, 90)
    $path.CloseFigure()

    $g.FillPath($brush, $path)

    # 绘制表格白色网格
    $penWhite = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 255, 255), [Math]::Max(1.0, $size * 0.06))
    $innerPad = [int]($size * 0.22)
    $innerW = $size - 2 * $innerPad
    $innerH = $size - 2 * $innerPad
    
    # 外部网格矩形
    $g.DrawRectangle($penWhite, $innerPad, $innerPad, $innerW, $innerH)
    
    # 横线（表头）
    $rowY = $innerPad + [int]($innerH * 0.38)
    $g.DrawLine($penWhite, $innerPad, $rowY, $innerPad + $innerW, $rowY)
    
    # 竖线（列分割）
    $colX = $innerPad + [int]($innerW * 0.45)
    $g.DrawLine($penWhite, $colX, $innerPad, $colX, $innerPad + $innerH)

    # 如果尺寸大于等于 32，绘制右下角下载箭头小方块
    if ($size -ge 32) {
        $miniPadX = $colX + [int]($innerW * 0.1)
        $miniPadY = $rowY + [int]($innerH * 0.1)
        $miniW = $innerPad + $innerW - $miniPadX
        $miniH = $innerPad + $innerH - $miniPadY
        
        $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $g.FillRectangle($whiteBrush, $miniPadX, $miniPadY, $miniW, $miniH)
        
        $greenPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 4, 120, 87), [Math]::Max(1.0, $size * 0.05))
        $arrowMidX = $miniPadX + [int]($miniW / 2)
        $arrowTopY = $miniPadY + [int]($miniH * 0.2)
        $arrowBottomY = $miniPadY + [int]($miniH * 0.75)
        $g.DrawLine($greenPen, $arrowMidX, $arrowTopY, $arrowMidX, $arrowBottomY)
        $g.DrawLine($greenPen, $arrowMidX - 2, $arrowBottomY - 3, $arrowMidX, $arrowBottomY)
        $g.DrawLine($greenPen, $arrowMidX + 2, $arrowBottomY - 3, $arrowMidX, $arrowBottomY)
        
        $whiteBrush.Dispose()
        $greenPen.Dispose()
    }

    $penWhite.Dispose()
    $brush.Dispose()
    $g.Dispose()

    $targetPath = Join-Path $outputDir "icon-$size.png"
    $bmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated $targetPath"
}

