<template>
  <div class="position-relative h-100 w-100">
    <div id="map" class="h-100 w-100"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useLocationStore } from '../stores/location';
import { useFileStore } from '../stores/files';

// Define emits
const emit = defineEmits(['update:selectedPin']);

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

  // Map styles to hide all features
  const hideMapStyles = [
    {
      featureType: "poi",
      elementType: "all",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "transit",
      elementType: "all",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "road",
      elementType: "all",
      stylers: [{ visibility: "simplified" }]
    },
    {
      featureType: "landscape",
      elementType: "all",
      stylers: [{ visibility: "simplified" }]
    }
  ];

  const mapOptions = {
    center: { lat: 41.72533845455064, lng: 44.77959291404671 }, // Default center (Google Maps API requires lat/lng format)
    zoom: 12,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
    styles: hideMapStyles // Apply the styles to hide map features
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
  
  // Add new markers only for pins with valid coordinates
  markers.value = props.pins
    .filter(pin => {
      // Check if pin has valid coordinates
      return pin.latitude !== undefined && 
             pin.longitude !== undefined && 
             pin.latitude !== null && 
             pin.longitude !== null &&
             !isNaN(pin.latitude) && 
             !isNaN(pin.longitude);
    })
    .map(pin => {
      const position = { 
        lat: Number(pin.latitude), // Ensure numeric values
        lng: Number(pin.longitude)
      };
      const isSelected = props.selectedPin && props.selectedPin.path === pin.path;
      
      // Store marker properties for reference
      const markerProps = {
        isSelected,
        pinType: pin.type,
        hasOpenInfoWindow: false
      };
      
      // Create marker with custom icon based on file type
      const marker = new google.maps.Marker({
        position,
        map: map.value,
        title: pin.name,
        icon: getMarkerIcon(pin.type, isSelected),
        // Remove bounce animation for all markers
        animation: null,
        zIndex: isSelected ? 1000 : 1 // Bring selected marker to front
    });
    
    // Add click event to marker
    const displayName = removeFileExtension(pin.name);
    const iconName = fileStore.getFileIcon(pin.type);
    const fileTypeColor = fileStore.getFileColor(pin.type);
    
    // Create info window with custom content
    const infoWindow = new google.maps.InfoWindow({
      content: createInfoWindowContent(pin),
      maxWidth: 300,
      pixelOffset: new google.maps.Size(0, isSelected ? -5 : 0),
      ariaLabel: displayName
    });
    
    // Track hover and open info window states
    let isHovered = false;
    let hasOpenInfoWindow = false;
    
    // Store these properties on the marker object for reference
    marker.isHovered = false;
    marker.hasOpenInfoWindow = false;
    marker.pinType = pin.type;
    marker.isSelected = isSelected;
    
    // Add hover effect using mouseover and mouseout events
    marker.addListener('mouseover', () => {
      if (!marker.isSelected && !marker.hasOpenInfoWindow) {
        marker.isHovered = true;
        marker.setIcon(getMarkerIcon(pin.type, true)); // Use the selected icon style for hover
        marker.setZIndex(500); // Bring hovered marker above normal markers but below selected
      }
    });
    
    marker.addListener('mouseout', () => {
      // Always reset hover state on mouseout, regardless of info window state
      if (!marker.isSelected) {
        marker.isHovered = false;
        // Only change the icon if this marker doesn't have an open info window
        if (!marker.hasOpenInfoWindow) {
          marker.setIcon(getMarkerIcon(pin.type, false)); // Restore normal icon
          marker.setZIndex(1); // Restore normal z-index
        }
      }
    });
    
    marker.addListener('click', () => {
      // Close any open info windows and reset their markers
      if (currentInfoWindow) {
        // Find the marker with open info window and reset its icon if it exists
        markers.value.forEach(m => {
          if (m.hasOpenInfoWindow) {
            m.hasOpenInfoWindow = false;
            if (!m.isSelected && !m.isHovered) {
              m.setIcon(getMarkerIcon(m.pinType, false));
              m.setZIndex(1);
            }
          }
        });
        currentInfoWindow.close();
      }
      
      // Open this info window and store reference
      infoWindow.open(map.value, marker);
      currentInfoWindow = infoWindow;
      
      // Add close listener to the info window
      google.maps.event.addListenerOnce(infoWindow, 'closeclick', () => {
        // Reset marker states
        marker.hasOpenInfoWindow = false;
        marker.isHovered = false;
        marker.setIcon(getMarkerIcon(pin.type, false));
        marker.setZIndex(1);
        
        // Reset selected pin in parent component
        emit('update:selectedPin', null);
        
        // Clear current info window reference
        currentInfoWindow = null;
      });
      
      // Mark this marker as having an open info window
      marker.hasOpenInfoWindow = true;
      // Reset hover state when info window is opened
      marker.isHovered = false;
      
      // Apply custom styling to the InfoWindow header after it's opened
      setTimeout(() => {
        const infoWindows = document.querySelectorAll('.gm-style-iw');
        if (infoWindows.length > 0) {
          const lastInfoWindow = infoWindows[infoWindows.length - 1];
          
          // Add custom title to the InfoWindow
          // No need to find a specific container, we'll position it absolutely within the InfoWindow
          {
            // Check if we already added a title
            const existingTitle = lastInfoWindow.querySelector('.custom-iw-title');
            if (!existingTitle) {
              const titleDiv = document.createElement('div');
              titleDiv.className = 'custom-iw-title';
              titleDiv.style.cssText = 'position: absolute; top: 4px; left: 15px; display: flex; align-items: center; margin-top: 8px; z-index: 10;';
              
              // Add icon
              const iconDiv = document.createElement('div');
              iconDiv.style.cssText = `background-color: ${fileTypeColor}; width: 24px; height: 24px; border-radius: 50%; 
                                      display: flex; align-items: center; justify-content: center; margin-right: 8px; flex-shrink: 0;`;
              
              const icon = document.createElement('i');
              icon.className = `fas fa-${iconName}`;
              icon.style.cssText = 'color: white; font-size: 12px;';
              
              iconDiv.appendChild(icon);
              titleDiv.appendChild(iconDiv);
              
              // Add title text
              const titleText = document.createElement('span');
              titleText.textContent = displayName;
              titleText.style.cssText = 'font-weight: 600; font-size: 14px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;';
              
              titleDiv.appendChild(titleText);
              lastInfoWindow.appendChild(titleDiv);
            }
          }
          
          // Find the content container and adjust its padding
          const contentContainer = lastInfoWindow.querySelector('.gm-style-iw-d');
          if (contentContainer) {
            contentContainer.style.paddingTop = '0';
          }
          
          // Adjust the close button height
          const closeButton = lastInfoWindow.querySelector('button.gm-ui-hover-effect');
          if (closeButton) {
            closeButton.style.height = '36px';
          }
        }
      }, 100);
    });
    
    // If this is the selected pin, open its info window
    if (isSelected) {
      setTimeout(() => {
        infoWindow.open(map.value, marker);
        currentInfoWindow = infoWindow;
        
        // Apply the same custom styling for the selected pin's InfoWindow
        setTimeout(() => {
          const infoWindows = document.querySelectorAll('.gm-style-iw');
          if (infoWindows.length > 0) {
            const lastInfoWindow = infoWindows[infoWindows.length - 1];
            
            // Add custom title to the InfoWindow
            // No need to find a specific container, we'll position it absolutely within the InfoWindow
            {
              // Check if we already added a title
              const existingTitle = lastInfoWindow.querySelector('.custom-iw-title');
              if (!existingTitle) {
                const titleDiv = document.createElement('div');
                titleDiv.className = 'custom-iw-title';
                titleDiv.style.cssText = 'position: absolute; top: 0; left: 15px; display: flex; align-items: center; height: 40px; z-index: 10;';
                
                // Add icon
                const iconDiv = document.createElement('div');
                iconDiv.style.cssText = `background-color: ${fileTypeColor}; width: 24px; height: 24px; border-radius: 50%; 
                                        display: flex; align-items: center; justify-content: center; margin-right: 8px; flex-shrink: 0;`;
                
                const icon = document.createElement('i');
                icon.className = `fas fa-${iconName}`;
                icon.style.cssText = 'color: white; font-size: 12px;';
                
                iconDiv.appendChild(icon);
                titleDiv.appendChild(iconDiv);
                
                // Add title text
                const titleText = document.createElement('span');
                titleText.textContent = displayName;
                titleText.style.cssText = 'font-weight: 600; font-size: 14px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;';
                
                titleDiv.appendChild(titleText);
                lastInfoWindow.appendChild(titleDiv);
              }
            }
            
            // Find the content container and adjust its padding
            const contentContainer = lastInfoWindow.querySelector('.gm-style-iw-d');
            if (contentContainer) {
              contentContainer.style.paddingTop = '0';
            }
            
            // Adjust the close button height
            const closeButton = lastInfoWindow.querySelector('button.gm-ui-hover-effect');
            if (closeButton) {
              closeButton.style.height = '36px';
            }
          }
        }, 100);
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
  // Normal size reduced by half, hovered size increased by 50% from reduced size
  const size = isSelected ? 33 : 12; // Hovered size increased by 50% (22 * 1.5 = 33)
  const iconSize = isSelected ? 14 : 0; // Hovered icon size increased by ~50% (9 * 1.5 ≈ 14)
  const strokeWidth = isSelected ? 2 : 0.75; // Increased stroke width for hovered state
  
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
  
  // Format coordinates safely
  const formatCoordinates = () => {
    if (pin.latitude !== undefined && 
        pin.longitude !== undefined && 
        pin.latitude !== null && 
        pin.longitude !== null &&
        !isNaN(pin.latitude) && 
        !isNaN(pin.longitude)) {
      return `${Number(pin.latitude).toFixed(6)}, ${Number(pin.longitude).toFixed(6)}`;
    }
    return 'Not available';
  };
  
  // Format distance safely
  const formatDistance = () => {
    if (pin.distance !== undefined && pin.distance !== null && !isNaN(pin.distance)) {
      return pin.distance < 1 ? 
        `${(pin.distance * 1000).toFixed(0)} m` : 
        `${pin.distance.toFixed(2)} km`;
    }
    return 'Unknown';
  };
  
  return `
    <div class="info-window">
      <div style="margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 8px;"></div>
      <div style="font-size: 13px; color: #555;">
        <p style="margin: 4px 0;"><strong>Type:</strong> ${pin.type.toUpperCase()}</p>
        <p style="margin: 4px 0;"><strong>Directory:</strong> ${pin.directory || pin.path.split('/').slice(0, -1).pop() || 'Root'}</p>
        <p style="margin: 4px 0;"><strong>Coordinates:</strong> ${formatCoordinates()}</p>
        ${pin.distance ? `<p style="margin: 4px 0;"><strong>Distance:</strong> ${formatDistance()}</p>` : ''}
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
      const marker = markers.value[markerIndex];
      
      // Close any open info windows
      if (currentInfoWindow) {
        // Reset markers with open info windows
        markers.value.forEach(m => {
          if (m.hasOpenInfoWindow) {
            m.hasOpenInfoWindow = false;
            if (!m.isSelected && !m.isHovered) {
              m.setIcon(getMarkerIcon(m.pinType, false));
              m.setZIndex(1);
            }
          }
        });
        currentInfoWindow.close();
      }
      
      // Find the info window for this marker
      // We need to manually open the info window without triggering the click event
      // which would cause the marker to bounce
      const infoWindow = new google.maps.InfoWindow({
        content: createInfoWindowContent(newPin),
        maxWidth: 300,
        pixelOffset: new google.maps.Size(0, -5),
        ariaLabel: removeFileExtension(newPin.name)
      });
      
      // Open the info window
      infoWindow.open(map.value, marker);
      currentInfoWindow = infoWindow;
      
      // Add close listener to the info window
      google.maps.event.addListenerOnce(infoWindow, 'closeclick', () => {
        // Reset marker states
        marker.hasOpenInfoWindow = false;
        marker.isHovered = false;
        marker.setIcon(getMarkerIcon(newPin.type, false));
        marker.setZIndex(1);
        
        // Reset selected pin in parent component
        emit('update:selectedPin', null);
        
        // Clear current info window reference
        currentInfoWindow = null;
      });
      
      // Mark this marker as having an open info window
      marker.hasOpenInfoWindow = true;
      marker.pinType = newPin.type;
      
      // Set the marker as selected
      marker.setIcon(getMarkerIcon(newPin.type, true));
      marker.setZIndex(1000);
      
      // Apply custom styling to the InfoWindow header after it's opened
      setTimeout(() => {
        const infoWindows = document.querySelectorAll('.gm-style-iw');
        if (infoWindows.length > 0) {
          const lastInfoWindow = infoWindows[infoWindows.length - 1];
          
          // Add custom title to the InfoWindow
          const existingTitle = lastInfoWindow.querySelector('.custom-iw-title');
          if (!existingTitle) {
            const titleDiv = document.createElement('div');
            titleDiv.className = 'custom-iw-title';
            titleDiv.style.cssText = 'position: absolute; top: 4px; left: 15px; display: flex; align-items: center; margin-top: 8px; z-index: 10;';
            
            // Add icon
            const iconDiv = document.createElement('div');
            const fileTypeColor = fileStore.getFileColor(newPin.type);
            iconDiv.style.cssText = `background-color: ${fileTypeColor}; width: 24px; height: 24px; border-radius: 50%; 
                                    display: flex; align-items: center; justify-content: center; margin-right: 8px; flex-shrink: 0;`;
            
            const icon = document.createElement('i');
            const iconName = fileStore.getFileIcon(newPin.type);
            icon.className = `fas fa-${iconName}`;
            icon.style.cssText = 'color: white; font-size: 12px;';
            
            iconDiv.appendChild(icon);
            titleDiv.appendChild(iconDiv);
            
            // Add title text
            const titleText = document.createElement('span');
            titleText.textContent = removeFileExtension(newPin.name);
            titleText.style.cssText = 'font-weight: 600; font-size: 14px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;';
            
            titleDiv.appendChild(titleText);
            lastInfoWindow.appendChild(titleDiv);
          }
        }
      }, 100);
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
