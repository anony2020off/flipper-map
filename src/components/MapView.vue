<template>
  <div class="position-relative h-100 w-100">
    <div id="map" class="h-100 w-100"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useLocationStore } from '../stores/location';
import { useFileStore } from '../stores/files';

const props = defineProps({
  pins: {
    type: Array,
    required: true
  },
  selectedPin: {
    type: Object,
    default: null
  }
});

const locationStore = useLocationStore();
const fileStore = useFileStore();
const map = ref(null);
const markers = ref([]);

// Initialize Google Maps
const initMap = () => {
  if (!window.google) {
    console.error('Google Maps API not loaded');
    return;
  }

  const mapOptions = {
    center: { lat: 41.72533845455064, lng: 44.77959291404671 }, // Default center (Google Maps API requires lat/lng format)
    zoom: 12,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true
  };

  map.value = new google.maps.Map(document.getElementById('map'), mapOptions);

  // If user location is available, center the map on it
  if (locationStore.userLocation) {
    const userPosition = {
      lat: locationStore.userLocation.latitude,
      lng: locationStore.userLocation.longitude
    };
    map.value.setCenter(userPosition);
    
    // Add a marker for user's location
    new google.maps.Marker({
      position: userPosition,
      map: map.value,
      title: 'Your Location',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });
  }

  // Add markers for pins
  addMarkers();
};

// Add markers for all pins
const addMarkers = () => {
  // Clear existing markers
  clearMarkers();
  
  if (!map.value) return;
  
  // Add new markers
  markers.value = props.pins.map(pin => {
    const position = { lat: pin.latitude, lng: pin.longitude };
    const isSelected = props.selectedPin && props.selectedPin.path === pin.path;
    
    // Create marker with custom icon based on file type
    const marker = new google.maps.Marker({
      position,
      map: map.value,
      title: pin.name,
      icon: getMarkerIcon(pin.type, isSelected),
      animation: isSelected ? google.maps.Animation.BOUNCE : null,
      zIndex: isSelected ? 1000 : 1 // Bring selected marker to front
    });
    
    // Add click event to marker
    const infoWindow = new google.maps.InfoWindow({
      content: createInfoWindowContent(pin),
      maxWidth: 300,
      pixelOffset: new google.maps.Size(0, isSelected ? -5 : 0)
    });
    
    // Track hover state
    let isHovered = false;
    
    // Add hover effect using mouseover and mouseout events
    marker.addListener('mouseover', () => {
      if (!isSelected) {
        isHovered = true;
        marker.setIcon(getMarkerIcon(pin.type, true)); // Use the selected icon style for hover
        marker.setZIndex(500); // Bring hovered marker above normal markers but below selected
      }
    });
    
    marker.addListener('mouseout', () => {
      if (!isSelected && isHovered) {
        isHovered = false;
        marker.setIcon(getMarkerIcon(pin.type, false)); // Restore normal icon
        marker.setZIndex(1); // Restore normal z-index
      }
    });
    
    marker.addListener('click', () => {
      // Close any open info windows
      if (currentInfoWindow) {
        currentInfoWindow.close();
      }
      
      // Open this info window and store reference
      infoWindow.open(map.value, marker);
      currentInfoWindow = infoWindow;
    });
    
    // If this is the selected pin, open its info window
    if (isSelected) {
      setTimeout(() => {
        infoWindow.open(map.value, marker);
        currentInfoWindow = infoWindow;
      }, 100);
    }
    
    return marker;
  });
};

// Track the currently open info window
let currentInfoWindow = null;

// Clear all markers from the map
const clearMarkers = () => {
  markers.value.forEach(marker => marker.setMap(null));
  markers.value = [];
};

// Create custom marker icon based on file type
const getMarkerIcon = (fileType, isSelected = false) => {
  const color = fileStore.getFileColor(fileType);
  // Use the correct icon from fileStore, but override for SubGHz files
  let iconName = fileStore.getFileIcon(fileType);
  if (fileType === 'subghz') {
    iconName = 'broadcast-tower';
  }
  
  // Create small circles by default, larger with icons when selected (hover)
  const size = isSelected ? 44 : 24; // Small circle when not selected
  const iconSize = isSelected ? 18 : 0; // No icon when not selected
  const strokeWidth = isSelected ? 3 : 1.5;
  
  // Font Awesome icon paths for consistent icons
  const iconPaths = {
    // SubGHz - using broadcast-tower icon to match sidebar
    'broadcast-tower': 'M576 0c17.7 0 32 14.3 32 32l0 448c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-448c0-17.7 14.3-32 32-32zM448 96c17.7 0 32 14.3 32 32l0 352c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-352c0-17.7 14.3-32 32-32zM352 224l0 256c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32s32 14.3 32 32zM192 288c17.7 0 32 14.3 32 32l0 160c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-160c0-17.7 14.3-32 32-32zM96 416l0 64c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32s32 14.3 32 32z',
    // Signal icon (original from fileStore but not used for SubGHz pins)
    'signal': 'M216 160c0 8.84-7.16 16-16 16s-16-7.16-16-16 7.16-16 16-16 16 7.16 16 16zm80 0c0 8.84-7.16 16-16 16s-16-7.16-16-16 7.16-16 16-16 16 7.16 16 16zm80 0c0 8.84-7.16 16-16 16s-16-7.16-16-16 7.16-16 16-16 16 7.16 16 16zM248 288c-13.25 0-24-10.75-24-24 0-13.26 10.75-24 24-24s24 10.74 24 24c0 13.25-10.75 24-24 24zm-96 0c-13.25 0-24-10.75-24-24 0-13.26 10.75-24 24-24s24 10.74 24 24c0 13.25-10.75 24-24 24zm-96 0c-13.25 0-24-10.75-24-24 0-13.26 10.75-24 24-24s24 10.74 24 24c0 13.25-10.75 24-24 24zm304-48v192c0 26.51-21.49 48-48 48H48c-26.51 0-48-21.49-48-48V80c0-26.51 21.49-48 48-48h416c26.51 0 48 21.49 48 48v160zm-32 0V80c0-8.82-7.18-16-16-16H48c-8.82 0-16 7.18-16 16v352c0 8.82 7.18 16 16 16h416c8.82 0 16-7.18 16-16V240z',
    // RFID - using id-card icon
    'id-card': 'M528 32H48C21.5 32 0 53.5 0 80v16h576V80c0-26.5-21.5-48-48-48zM0 432c0 26.5 21.5 48 48 48h480c26.5 0 48-21.5 48-48V128H0v304zm352-232c0-4.4 3.6-8 8-8h144c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H360c-4.4 0-8-3.6-8-8v-16zm0 64c0-4.4 3.6-8 8-8h144c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H360c-4.4 0-8-3.6-8-8v-16zm0 64c0-4.4 3.6-8 8-8h144c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H360c-4.4 0-8-3.6-8-8v-16zM176 192c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zM67.1 396.2C75.5 370.5 99.6 352 128 352h8.2c12.3 5.1 25.7 8 39.8 8s27.6-2.9 39.8-8h8.2c28.4 0 52.5 18.5 60.9 44.2 3.2 9.9-5.2 19.8-15.6 19.8H82.7c-10.4 0-18.8-10-15.6-19.8z',
    // NFC - using wifi icon
    'wifi': 'M634.91 154.88C457.74-8.99 182.19-8.93 5.09 154.88c-6.66 6.16-6.79 16.59-.35 22.98l34.24 33.97c6.14 6.1 16.02 6.23 22.4.38 145.92-133.68 371.3-133.71 517.25 0 6.38 5.85 16.26 5.71 22.4-.38l34.24-33.97c6.43-6.39 6.3-16.82-.36-22.98zM320 352c-35.35 0-64 28.65-64 64s28.65 64 64 64 64-28.65 64-64-28.65-64-64-64zm202.67-83.59c-115.26-101.93-290.21-101.82-405.34 0-6.9 6.1-7.12 16.69-.57 23.15l34.44 33.99c6 5.92 15.66 6.32 22.05.8 83.95-72.57 209.74-72.41 293.49 0 6.39 5.52 16.05 5.13 22.05-.8l34.44-33.99c6.56-6.46 6.33-17.06-.56-23.15z',
    // Default file icon
    'file': 'M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm160-14.1v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z'
  };
  
  // Create SVG icon (only used when selected/hovered)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${iconName === 'broadcast-tower' ? 640 : 576} 512" width="${iconSize}px" height="${iconSize}px">
      <path fill="white" d="${iconPaths[iconName] || iconPaths['file']}"/>
    </svg>
  `;
  
  // Create data URL from SVG
  const svgUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  
  // Create marker with circle background and icon (only when selected)
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - strokeWidth/2}" fill="${color}" stroke="#ffffff" stroke-width="${strokeWidth}" />
        ${isSelected ? `<image href="${svgUrl}" x="${size/2 - iconSize/2}" y="${size/2 - iconSize/2}" width="${iconSize}" height="${iconSize}" />` : ''}
      </svg>
    `)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size/2, size/2),
    animation: isSelected ? google.maps.Animation.BOUNCE : null
  };
};

// Remove file extension from name (only from last dot)
const removeFileExtension = (filename) => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return filename; // No extension
  return filename.substring(0, lastDotIndex);
};

// Create info window content for a pin
const createInfoWindowContent = (pin) => {
  // Use the same icon function as the sidebar for consistency
  const iconName = fileStore.getFileIcon(pin.type);
  const fileTypeColor = fileStore.getFileColor(pin.type);
  const displayName = removeFileExtension(pin.name);
  
  return `
    <div class="info-window">
      <div class="info-header" style="display: flex; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
        <div style="background-color: ${fileTypeColor}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
          <i class="fas fa-${iconName}" style="color: white; font-size: 14px;"></i>
        </div>
        <h3 style="margin: 0; font-weight: 600; font-size: 16px;">${displayName}</h3>
      </div>
      <div style="font-size: 13px; color: #555;">
        <p style="margin: 4px 0;"><strong>Type:</strong> ${pin.type.toUpperCase()}</p>
        <p style="margin: 4px 0;"><strong>Directory:</strong> ${pin.directory || pin.path.split('/').slice(0, -1).pop() || 'Root'}</p>
        <p style="margin: 4px 0;"><strong>Coordinates:</strong> ${pin.latitude.toFixed(6)}, ${pin.longitude.toFixed(6)}</p>
        ${pin.distance ? `<p style="margin: 4px 0;"><strong>Distance:</strong> ${pin.distance < 1 ? `${(pin.distance * 1000).toFixed(0)} m` : `${pin.distance.toFixed(2)} km`}</p>` : ''}
      </div>
    </div>
  `;
};

// Load Google Maps API
const loadGoogleMapsAPI = () => {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    // For development purposes, we'll use Google Maps without an API key
    // In production, you should use a proper API key
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBmJ6OjAUIj43DDk8PiQHg0nGXrczD8RT8&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    
    // Define callback function
    window.initGoogleMaps = () => {
      resolve();
    };
    
    // Handle errors
    script.onerror = () => {
      reject(new Error('Failed to load Google Maps API'));
    };
    
    // Append script to document
    document.head.appendChild(script);
  });
};

// Watch for changes in pins and update markers
watch(() => props.pins, () => {
  if (map.value) {
    addMarkers();
  }
}, { deep: true });

// Watch for changes in user location
watch(() => locationStore.userLocation, () => {
  if (map.value && locationStore.userLocation) {
    map.value.setCenter({
      lat: locationStore.userLocation.lat,
      lng: locationStore.userLocation.lng
    });
  }
});

// Watch for changes in selected pin
watch(() => props.selectedPin, (newPin) => {
  if (map.value && newPin && newPin.latitude && newPin.longitude) {
    // Center map on selected pin
    map.value.setCenter({
      lat: newPin.latitude,
      lng: newPin.longitude
    });
    map.value.setZoom(16); // Zoom in closer to the selected pin
    
    // Find and activate the marker for this pin
    const markerIndex = props.pins.findIndex(pin => pin.path === newPin.path);
    if (markerIndex >= 0 && markers.value[markerIndex]) {
      // Trigger the click event on the marker
      google.maps.event.trigger(markers.value[markerIndex], 'click');
    }
  }
});

onMounted(async () => {
  try {
    await loadGoogleMapsAPI();
    initMap();
  } catch (error) {
    console.error('Error initializing map:', error);
  }
});
</script>

<style scoped>
.info-window {
  padding: 12px;
  max-width: 280px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.map-container {
  position: relative;
}

/* Add Font Awesome for icons in info windows */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css');
</style>
