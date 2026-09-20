# CrowRules Free Local HLS Server

This is a $0 local development/test setup for CrowRules TV and CrowRules+ using MediaMTX.

## Flow

Galaxy S24 Ultra / Streamlabs Mobile
-> RTMP
-> Windows PC / MediaMTX
-> HLS
-> CrowRules TV / CrowRules+ on GitHub Pages

## Install

Open PowerShell in this folder:

    Set-ExecutionPolicy -Scope Process Bypass
    .\install-mediamtx.ps1

Then run:

    .\start-mediamtx.bat

## Local HLS

Main:

    http://localhost:8888/crowrules-main/index.m3u8

Tacoma Nights:

    http://localhost:8888/tacoma-nights/index.m3u8

Events:

    http://localhost:8888/events/index.m3u8

## Galaxy S24 Ultra

Put the phone and PC on the same Wi-Fi.

Run:

    ipconfig

Find the PC IPv4 address, for example 192.168.1.50.

In Streamlabs Mobile, use Custom RTMP:

    rtmp://192.168.1.50:1935/crowrules-main

Do not use localhost on the phone.

Use H.264 video and AAC audio.

## GitHub Pages

GitHub Pages hosts the CrowRules player. It does not receive RTMP or generate HLS.

A public GitHub Pages site cannot reach your PC's localhost address. For a public stream, MediaMTX eventually needs a public server or secure public tunnel.

The production-style HLS URL can become:

    https://stream.crowrules.com/crowrules-main/index.m3u8

Never commit stream keys, passwords, or other secrets to GitHub.

## Production architecture

Galaxy S24 Ultra
-> Streamlabs Mobile
-> RTMP/SRT
-> MediaMTX
-> HTTPS HLS
-> CrowRules TV
-> CrowRules+

