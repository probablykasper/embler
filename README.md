# Pakager

Turn binaries into applications.

Pakager can be used with `pkg` turn a Node.js project into an app, without having to resort to Electron. Useful for making a web interface, or a basic menubar app.

Supports macOS `app`, `dmg`, `zip` and `tar.gz`. `dmg` requires macOS

<img src="./assets/cli-screencapture.gif">

## Installation
```
npm install pakager
```

## Usage
1. Specify options in your `package.json` like so:
    ```js
    {
        "name": "affinity-photo",
        "author": "Serif",
        "version": "1.7.0",
        "scripts": {
            "build": "pakager",
        },
        "pakager": {
            "realName": "Affinity Photo",
            "appId": "com.seriflabs.affinityphoto",
            "mac": {
                "binary": "dist/affinity-photo-mac-bin",
                "icon": "icon.png",
                "formats": ["app", "dmg", "zip", "tar.gz"],
            }
        }
    }
    ```
2. Run `npm run pakager`

### Usage with `pkg`
1. Run `npm install pkg`
2. Configure `pkg` and `pakager` to your liking (Usage example above)
2. Set the `scripts.build`, `bin` and `pakager.mac.binary` properties in your `package.json` like so:
```js
{
    "bin": "index.js",
    "scripts": {
        "build": "pkg . --target macos --output dist/test-bin-macos && pakager"
    },
    "pakager": {
        "mac": {
            "binary": "dist/test-bin-macos"
        }
    }
}
```
3. Run `npm run build`
4. `index.js` is now an app.


### API Usage

Supply options via `json` file:

```js
const pakager = require('pakager')
await pakager.build('pakager.json')
```

Supply options directly:
```js
const pakager = require('pakager')
await pakager.build({
    name: "my-app",
    author: "kasper.space",
    version: "2.4.1",
    pakager: {
        realName: "My App",
        // ...
    }
})
```

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

### Dev Instructions

### Get started
1. Install Node.js
2. Run `npm install`
3. Set up ESLint support for your code editor

To be able to run/test Pakager:
4. Go to `./test` (This is where you test Pakager)
5. Run `npm install`
6. Run `npm run compile` (Compiles `index.js` to binary)

To test Pakager:
```
cd ./test
npm run pack
```

### Publish new version
1. Bump the version number
2. Update CHANGELOG.md
3. Commit and create git tag
4. Create GitHub release with release notes
5. Publish to npm:
    ```
    npm publish
    ```
