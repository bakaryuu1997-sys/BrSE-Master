param(
    [Parameter(Mandatory=$true)]
    [string]$InputPath,
    [Parameter(Mandatory=$true)]
    [string]$OutputPath
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$InputPath = [System.IO.Path]::GetFullPath($InputPath)
$OutputPath = [System.IO.Path]::GetFullPath($OutputPath)

if (-not (Test-Path $InputPath)) {
    Write-Error "Input file does not exist: $InputPath"
    exit 2
}

$parentDir = [System.IO.Path]::GetDirectoryName($OutputPath)
if (-not (Test-Path $parentDir)) {
    New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
}

$success = $false

# 1. Try Microsoft Word via COM (Exact 1:1 fidelity)
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $doc = $word.Documents.Open($InputPath, $false, $true) # ReadOnly
    # 17 = wdFormatPDF
    $doc.SaveAs([ref]$OutputPath, [ref]17)
    $doc.Close([ref]0)
    $word.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    $success = $true
    Write-Output "SUCCESS: Word.Application"
} catch {
    Write-Warning "Word.Application failed: $($_.Exception.Message)"
}

# 2. Try WPS Office (KWps.Application) if Word is not active
if (-not $success) {
    try {
        $kwps = New-Object -ComObject KWps.Application
        $kwps.Visible = $false
        $doc = $kwps.Documents.Open($InputPath, $false, $true)
        # Try SaveAs or ExportAsFixedFormat
        try {
            $doc.SaveAs([ref]$OutputPath, [ref]17)
        } catch {
            $doc.ExportAsFixedFormat($OutputPath, 17)
        }
        $doc.Close([ref]0)
        $kwps.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($kwps) | Out-Null
        $success = $true
        Write-Output "SUCCESS: KWps.Application"
    } catch {
        Write-Warning "KWps.Application failed: $($_.Exception.Message)"
    }
}

if ($success -and (Test-Path $OutputPath) -and ((Get-Item $OutputPath).Length -gt 0)) {
    exit 0
} else {
    Write-Error "Failed to convert using Word or WPS COM automation."
    exit 1
}
