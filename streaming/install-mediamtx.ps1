$ErrorActionPreference = "Stop"

$Version = "v1.21.0"
$Base = Split-Path -Parent $MyInvocation.MyCommand.Path
$Zip = Join-Path $Base "mediamtx.zip"
$ReleaseVersion = $Version.TrimStart("v")
$Url = "https://github.com/bluenviron/mediamtx/releases/download/$Version/mediamtx_" + $ReleaseVersion + "_windows_amd64.zip"

Write-Host "CrowRules MediaMTX installer"
Invoke-WebRequest -Uri $Url -OutFile $Zip
Expand-Archive -Path $Zip -DestinationPath $Base -Force
Remove-Item $Zip -Force
Write-Host "MediaMTX is ready. Run start-mediamtx.bat."
