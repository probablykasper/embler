# Pakager

Turn a binary into an application.

## Installation

## Supported formats
- macOS: `app`

## Basic usage
1. Specify options in your `package.json` like so:
    ```js
    {
        "name": "firefox",
        "author": "Mozilla",
        "version": "79.0.0",
        "scripts": {
            "build": "pakager",
        },
        "pakager": {
            "realName": "Firefox",
            "appId": "org.mozilla.firefox",
            "mac": {
                "binary": "dist/firefox-mac-bin",
                "icon": "icon.png",
                "formats": ["app", "dmg", "zip", "tar.gz"],
            }
        }
    }
    ```
2. Run `npm run pakager`

## Options

### `name`
- **Required unless `pakager.name` is specified**
- The app's name. For example used for the app's process name
- Recommended to not use spaces or non-basic special characters

### `author`
- **Required unless `pakager.author` is specified**
- The app's author

### `version`
- **Required unless `pakager.version` is specified**
- The version of the app

### `pakager.realName` = `"${name}"`
- *Recommended*
- The app's name. This is the name users will see
- Spaces and special characters are allowed in this one

### `pakager.appId` = `"com.example.${name}"`
- *Recommended*
- The application id

### `pakager.copyright` = `"Copyright © year ${author}"`
- Human-readable copyright line

### `pakager.outputDir` = `"dist"`
- The output folder

### `pakager.backgroundApp` = `false`
- Whether the app will just run in the background app. On macOS, it won't show up in the Dock

### `pakager.name`
- Overrides `name`

### `pakager.author`
- Overrides `author`

### `pakager.version`
- Overrides `version`

### `pakager.mac`
- Object which contains macOS-specific options

#### `pakager.mac.binary`
- **Required**
- Path to the binary which will run when the app is opened

#### `pakager.mac.category`
- *Recommended*
- The app's category. Shown in `/Applications` in Finder when `View > Use Groups` is enabled using `View > Sort By > Application Category`
- Valid categories are listed in [Apple's documentation](https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/LaunchServicesKeys.html#//apple_ref/doc/uid/TP40009250-SW8)

#### `pakager.mac.icon`
- *Recommended*
- Path to your app's icon
- `.icns` or `.png`

#### `pakager.mac.formats` = `["app"]`
- Array of the formats Pakaer will output
- Supports `app`, `dmg`, `zip` and `tar.gz`. Creating `dmg` requires macOS

#### `pakager.mac.dmgBackground`
- Path to a custom background image for the `dmg`
- The resolution should be 660x400
- To support retina displays, have an extra image at double resolution that ends with `@2x`. For example, you could have `dmgbg.png` and `dmgbg@2x.png`

#### `pakager.mac.darkModeSupport` = `true`
- Turn this to false to disable dark mode support.

#### `pakager.mac.customInfo` = `{}`
- In this object, you may add or overwrite `Info.plist` entries. Example:
```js
"customInfo": {
    "CFBundleDevelopmentRegion": "en"
    }
```
