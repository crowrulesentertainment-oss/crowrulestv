@echo off
setlocal
cd /d "%~dp0"
if not exist mediamtx.exe (
  echo MediaMTX is not installed in this folder.
  echo Run install-mediamtx.ps1 first.
  pause
  exit /b 1
)
echo Starting CrowRules MediaMTX...
echo RTMP: rtmp://localhost:1935/crowrules-main
echo HLS:  http://localhost:8888/crowrules-main/index.m3u8
echo Press Ctrl+C to stop.
mediamtx.exe mediamtx.yml
