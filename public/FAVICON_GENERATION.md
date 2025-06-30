# Favicon Generation Instructions

To generate the favicon files for AmpTrack, follow these steps:

## Step 1: Use Online Favicon Generator

1. Go to [RealFaviconGenerator.net](https://realfavicongenerator.net/) or [favicon.io](https://favicon.io/)
2. Upload the `logo.svg` file from this directory
3. Configure the favicon for different platforms:
   - **Desktop browsers**: Use the default settings
   - **iOS**: Make sure background is white or transparent
   - **Android**: Use the default settings
   - **Windows**: Choose a background color that matches the theme (#1976D2)

## Step 2: Download and Replace Files

After generation, replace these files in the `/public` directory:

### Required Files:
- `favicon.ico` - Classic favicon for browsers
- `logo192.png` - 192x192 PNG for PWA and mobile
- `logo512.png` - 512x512 PNG for PWA and social media

### Optional Additional Files:
- `apple-touch-icon.png` - 180x180 for iOS
- `favicon-32x32.png` - 32x32 PNG
- `favicon-16x16.png` - 16x16 PNG
- `android-chrome-192x192.png` - Android icon
- `android-chrome-512x512.png` - Android icon

## Step 3: Update HTML (Already Done)

The HTML file has already been updated with the proper favicon references:

```html
<link rel="icon" href="%PUBLIC_URL%/logo.svg" type="image/svg+xml" />
<link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
<link rel="apple-touch-icon" sizes="180x180" href="%PUBLIC_URL%/logo192.png" />
<link rel="icon" type="image/png" sizes="32x32" href="%PUBLIC_URL%/logo192.png" />
<link rel="icon" type="image/png" sizes="16x16" href="%PUBLIC_URL%/logo192.png" />
```

## Step 4: Verify

After replacing the files:

1. Clear browser cache
2. Check that the favicon appears in:
   - Browser tabs
   - Bookmarks
   - When sharing on social media
   - When installing as PWA

## Design Notes

The AmpTrack logo features:
- **Primary Color**: #1976D2 (Blue)
- **Secondary Color**: #42A5F5 (Light Blue) 
- **Accent Color**: #FB8C00 (Orange)
- **Shape**: Triangle with lightning bolt
- **Style**: Modern, professional, electrical theme

## Alternative: Quick Generation

If you need quick favicons right now, you can:

1. Take a screenshot of the logo from the login page
2. Use [favicon.io's image converter](https://favicon.io/favicon-converter/)
3. Upload the screenshot and generate the files

This will provide basic favicon support while you create the proper ones. 