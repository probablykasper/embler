# Pakager

Turn a binary into an application.

## Installation

## Supported formats
- macOS: `app`

## Basic usage
1. Specify options in your `package.json` like so:
    ```json
    {
        "name": "firefox",
        "author": "Mozilla",
        "version": "79.0.0",
        "scripts": {
            "build": "",
        },
        "pakager": {
            "realName": "Firefox",
            "appId": "org.mozilla.firefox",
            "mac": {
                "binary": "dist/firefox-mac-bin",
                "icon": "icon.png",
                "formats": ["app"],
            }
        }
    }
    ```
