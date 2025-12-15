# Extension Icons

You need to add icon files to this directory for the extension to work properly.

## Required Files

- `icon16.png` - 16x16 pixels (toolbar icon)
- `icon48.png` - 48x48 pixels (extension management)
- `icon128.png` - 128x128 pixels (Chrome Web Store)

## Design Recommendations

### Style
- **Symbol**: ⚡ Lightning bolt (matches ClearSeller branding)
- **Background**: Dark blue/slate (#0f172a)
- **Accent**: White or orange (#f97316)
- **Shape**: Rounded square with 20% border radius

### Quick Creation Methods

#### Option 1: Use Figma/Canva
1. Create 128x128 canvas
2. Add dark blue (#0f172a) rounded square background
3. Add white lightning bolt icon in center
4. Export as PNG at 128x128, 48x48, and 16x16

#### Option 2: Use Online Icon Generator
- Visit: https://www.favicon-generator.org/
- Upload a 512x512 design
- Download and resize to required dimensions

#### Option 3: Temporary Placeholder
Create simple colored squares as placeholders:
- Use any image editor
- Create solid color squares
- Export at required sizes

## Current Status

⚠️ **Icons are currently missing**

The extension will still work, but may show a default Chrome icon until you add proper icons.

## Installation Without Icons

If you want to test the extension without icons:
1. Remove the `icons` section from manifest.json
2. Remove the `default_icon` section from the `action` object
3. The extension will use Chrome's default placeholder icon
