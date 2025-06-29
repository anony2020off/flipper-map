# Flipper Map

A Vue.js application that displays Flipper Zero signal files on a Google Map. The application shows pins for different types of files (SubGHz, RFID, NFC) with their GPS coordinates.

## Features

- Interactive Google Map with pins for different file types
- Different icons and colors for SubGHz, RFID, and NFC files
- Search functionality to find specific files
- Location-based sorting of pins by proximity to user
- Responsive sidebar with file list
- Support for subdirectories in file structure

## File Types Supported

- `.sub` - SubGHz signal files (orange pins)
- `.rfid` - RFID key files (blue pins)
- `.nfc` - NFC device files (green pins)

## Project Structure

```
/public
  /files
    /subghz     # SubGHz signal files (.sub)
    /lfrfid     # RFID key files (.rfid)
    /nfc        # NFC device files (.nfc)
/src
  /assets       # CSS and other assets
  /components   # Vue components
  /services     # Services for file operations
  /stores       # Pinia stores for state management
```

## File Format

All three types of files are text files that should contain GPS coordinates in the following format:

```
Latitude: 41.234567
Longitude: 44.123456
```

## Setup

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

```sh
# Install dependencies
npm install

# Add your Google Maps API key
# Edit src/components/MapView.vue and replace YOUR_API_KEY with your actual API key

# Start development server
npm run dev
```

### Google Maps API Key

You need to obtain a Google Maps API key and replace `YOUR_API_KEY` in the `src/components/MapView.vue` file.

### Adding Your Own Files

Place your `.sub`, `.rfid`, and `.nfc` files in the corresponding directories under `/public/files/`. Make sure each file contains the required GPS coordinates in the format shown above.

## Building for Production

```sh
npm run build
```

## Technologies Used

- Vue.js 3 with Composition API
- Pinia for state management
- Tailwind CSS for styling
- Google Maps JavaScript API
- Font Awesome for icons
