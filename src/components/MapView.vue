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

// Ensure Leaflet is available globally
const checkLeaflet = () => {
  if (typeof L === 'undefined') {
    console.error('Leaflet is not loaded. Make sure the script is included in index.html');
    return false;
  }
  return true;
};

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
const currentPopup = ref(null);

// Refs for tracking map layers and visibility state
const mapLayers = ref({
  standard: null,
  minimal: null
});
const mapFeaturesHidden = ref(false);

// Initialize Leaflet map
const initMap = () => {
  if (!checkLeaflet()) return;
  
  // Create map instance with default world view
  map.value = L.map('map', {
    center: [20, 0], // Default to center of world map
    zoom: 2, // Zoomed out to show most of the world
    zoomControl: true,
    attributionControl: true
  });
  
  // Try to get client's location and zoom to it
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Update location store
        locationStore.userLocation = {
          latitude: latitude,
          longitude: longitude
        };
        
        // Fly to user location with animation
        map.value.flyTo([latitude, longitude], 13, {
          animate: true,
          duration: 1.5
        });
        
        // Add a pulsing location marker for the user
        addUserLocationMarker(latitude, longitude);
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        // Fallback to stored location or add pins if available
        if (locationStore.latitude && locationStore.longitude) {
          map.value.setView([locationStore.latitude, locationStore.longitude], 13);
        } else if (props.pins.length > 0) {
          // Center on first pin if no user location
          const firstPin = props.pins[0];
          map.value.setView([firstPin.latitude, firstPin.longitude], 13);
        }
      },
      { 
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  }

  // Create tile layers
  mapLayers.value = {
    standard: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }),
    minimal: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19
    })
  };

  // Add standard layer by default
  mapLayers.value.standard.addTo(map.value);

  // Function to add user location marker with pulsing effect
  const addUserLocationMarker = (latitude, longitude) => {
    if (!map.value) return;
    
    // Remove existing marker if any
    if (userLocationMarker.value) {
      map.value.removeLayer(userLocationMarker.value);
    }
    
    // Create pulsing circle marker for user location
    userLocationMarker.value = L.circleMarker(
      [latitude, longitude],
      {
        radius: 8,
        fillColor: '#4285F4',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.7,
        className: 'user-location-marker' // For CSS animation
      }
    ).addTo(map.value);
    
    // Add tooltip to user location marker
    userLocationMarker.value.bindTooltip('Your Location', {
      permanent: false,
      direction: 'top'
    });
    
    // Store the location in the store
    locationStore.userLocation = {
      latitude: latitude,
      longitude: longitude
    };
  };

  // Add user location marker if available
  if (locationStore.userLocation) {
    const { latitude, longitude } = locationStore.userLocation;
    
    // Create user location marker
    addUserLocationMarker(latitude, longitude);
    
    // Center map on user location
    map.value.setView([latitude, longitude], 13);
  }

  // Add markers for pins
  addMarkers();
  
  // Create throttled function for zoom updates to improve performance
  let lastZoomUpdate = 0;
  const throttleDelay = 30; // milliseconds between updates
  
  // Add zoom event listener to update markers during zoom animation
  map.value.on('zoom', () => {
    const now = Date.now();
    // Throttle updates for better performance
    if (now - lastZoomUpdate > throttleDelay) {
      lastZoomUpdate = now;
      // Update all markers continuously during zoom
      markers.value.forEach(marker => {
        // Force update the marker's popup state if it has one open
        if (marker._popup && marker._popup.isOpen()) {
          marker.hasOpenPopup = true;
        }
        
        if (marker.updateMarkerOnZoom) {
          marker.updateMarkerOnZoom();
        }
      });
    }
  });
  
  // Also update on zoomend to ensure final state is correct
  map.value.on('zoomend', () => {
    markers.value.forEach(marker => {
      if (marker.updateMarkerOnZoom) {
        marker.updateMarkerOnZoom();
      }
    });
  });
};

// Toggle between standard and minimal map styles
const toggleMapFeatures = () => {
  if (!map.value || !checkLeaflet()) return;
  
  mapFeaturesHidden.value = !mapFeaturesHidden.value;
  
  // Remove current layer
  if (mapFeaturesHidden.value) {
    map.value.removeLayer(mapLayers.value.standard);
    mapLayers.value.minimal.addTo(map.value);
  } else {
    map.value.removeLayer(mapLayers.value.minimal);
    mapLayers.value.standard.addTo(map.value);
  }
};

// Clear all markers from the map
const clearMarkers = () => {
  // Remove each marker from the map
  markers.value.forEach(marker => {
    marker.remove();
  });
  markers.value = [];
};

// Create custom marker icon based on file type
const createMarkerIcon = (fileType, isSelected = false, isHovered = false) => {
  const color = fileStore.getFileColor(fileType);
  // Use the correct icon from fileStore, but override for SubGHz files
  let iconName = fileStore.getFileIcon(fileType);
  if (fileType === 'subghz') {
    iconName = 'broadcast-tower';
  }
  
  // Get current zoom level to adjust marker size
  const currentZoom = map.value ? map.value.getZoom() : 13; // Default to 13 if map not initialized
  const zoomFactor = Math.max(0.7, Math.min(1.3, currentZoom / 13)); // Scale factor based on zoom
  
  // Create small circles by default, larger with icons when selected or hovered
  // Base sizes adjusted by zoom level
  const baseNormalSize = 18;
  const baseSelectedSize = 33;
  
  // Apply zoom scaling to sizes
  const size = (isSelected || isHovered) ? Math.round(baseSelectedSize * zoomFactor) : Math.round(baseNormalSize * zoomFactor);
  const iconSize = (isSelected || isHovered) ? Math.round(14 * zoomFactor) : 0; // No icon when not selected/hovered
  const strokeWidth = (isSelected || isHovered) ? Math.max(1, Math.round(2 * zoomFactor)) : 1;
  
  // Font Awesome icon paths for consistent icons
  const iconPaths = {
    // SubGHz - using broadcast-tower icon to match sidebar
    'broadcast-tower': 'M576 0c17.7 0 32 14.3 32 32l0 448c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-448c0-17.7 14.3-32 32-32zM448 96c17.7 0 32 14.3 32 32l0 352c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-352c0-17.7 14.3-32 32-32zM352 224l0 256c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32s32 14.3 32 32zM192 288c17.7 0 32 14.3 32 32l0 160c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-160c0-17.7 14.3-32 32-32zM96 416l0 64c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32s32 14.3 32 32z',
    // RFID - using id-card icon
    'id-card': 'M528 32H48C21.5 32 0 53.5 0 80v16h576V80c0-26.5-21.5-48-48-48zM0 432c0 26.5 21.5 48 48 48h480c26.5 0 48-21.5 48-48V128H0v304zm352-232c0-4.4 3.6-8 8-8h144c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H360c-4.4 0-8-3.6-8-8v-16zm0 64c0-4.4 3.6-8 8-8h144c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H360c-4.4 0-8-3.6-8-8v-16zm0 64c0-4.4 3.6-8 8-8h144c4.4 0 8 3.6 8 8v16c0 4.4-3.6 8-8 8H360c-4.4 0-8-3.6-8-8v-16zM176 192c35.3 0 64 28.7 64 64s-28.7 64-64 64-64-28.7-64-64 28.7-64 64-64zM67.1 396.2C75.5 370.5 99.6 352 128 352h8.2c12.3 5.1 25.7 8 39.8 8s27.6-2.9 39.8-8h8.2c28.4 0 52.5 18.5 60.9 44.2 3.2 9.9-5.2 19.8-15.6 19.8H82.7c-10.4 0-18.8-10-15.6-19.8z',
    // NFC - using wifi icon
    'wifi': 'M634.91 154.88C457.74-8.99 182.19-8.93 5.09 154.88c-6.66 6.16-6.79 16.59-.35 22.98l34.24 33.97c6.14 6.1 16.02 6.23 22.4.38 145.92-133.68 371.3-133.71 517.25 0 6.38 5.85 16.26 5.71 22.4-.38l34.24-33.97c6.43-6.39 6.3-16.82-.36-22.98zM320 352c-35.35 0-64 28.65-64 64s28.65 64 64 64 64-28.65 64-64-28.65-64-64-64zm202.67-83.59c-115.26-101.93-290.21-101.82-405.34 0-6.9 6.1-7.12 16.69-.57 23.15l34.44 33.99c6 5.92 15.66 6.32 22.05.8 83.95-72.57 209.74-72.41 293.49 0 6.39 5.52 16.05 5.13 22.05-.8l34.44-33.99c6.56-6.46 6.33-17.06-.56-23.15z',
    // Default file icon
    'file': 'M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm160-14.1v6.1H256V0h6.1c6.4 0 12.5 2.5 17 7l97.9 98c4.5 4.5 7 10.6 7 16.9z'
  };
  
  // Create SVG for the icon
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${iconName === 'broadcast-tower' ? 640 : 576} 512" width="${iconSize}px" height="${iconSize}px" style="display:block;">
      <path fill="white" d="${iconPaths[iconName] || iconPaths['file']}"/>
    </svg>
  `;
  
  // Create HTML for the divIcon
  const html = `
    <div style="width:${size}px; height:${size}px; position:relative; box-sizing: border-box;">
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background-color: ${color};
        border: ${strokeWidth}px solid #ffffff;
        box-sizing: border-box;
      "></div>
      ${iconSize > 0 ? `
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: ${iconSize}px;
          height: ${iconSize}px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${svg}
        </div>
      ` : ''}
    </div>
  `;
  
  // Create Leaflet divIcon
  return L.divIcon({
    html: html,
    className: 'custom-map-marker',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2], // Center the icon on the marker position
    popupAnchor: [0, -size/2] // Position popup above the marker
  });
};

// Remove file extension from name (only from last dot)
const removeFileExtension = (filename) => {
  if (!filename) return '';
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex === -1 ? filename : filename.substring(0, lastDotIndex);
};

// Create popup content for a pin
const createPopupContent = (pin) => {
  const displayName = removeFileExtension(pin.name);
  const iconName = fileStore.getFileIcon(pin.type);
  const fileTypeColor = fileStore.getFileColor(pin.type);
  
  // Format distance if available
  let distanceText = '';
  if (pin.distance !== undefined && pin.distance !== null) {
    if (pin.distance < 1) {
      distanceText = `${Math.round(pin.distance * 1000)} m`;
    } else {
      distanceText = `${pin.distance.toFixed(2)} km`;
    }
  }
  
  // Create popup content
  return `
    <div class="popup-content">
      <div class="popup-body">
        <div class="popup-info">
          <div class="popup-info-item">
            <strong>Type:</strong> ${pin.type}
          </div>
          <div class="popup-info-item">
            <strong>Directory:</strong> ${pin.directory || 'N/A'}
          </div>
          <div class="popup-info-item">
            <strong>Coordinates:</strong> ${pin.latitude.toFixed(6)}, ${pin.longitude.toFixed(6)}
          </div>
          ${distanceText ? `
          <div class="popup-info-item">
            <strong>Distance:</strong> ${distanceText}
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
};

// Customize popup with title and icon
const customizePopup = (popup, pin) => {
  // Wait for the popup to be added to the DOM
  setTimeout(() => {
    // Find the popup container
    const container = popup.getElement();
    if (!container) return;
    
    const displayName = removeFileExtension(pin.name);
    const iconName = fileStore.getFileIcon(pin.type);
    const fileTypeColor = fileStore.getFileColor(pin.type);
    
    // Find the content container
    const content = container.querySelector('.leaflet-popup-content');
    if (!content) return;
    
    // Check if we already added a title
    if (container.querySelector('.custom-popup-title')) return;
    
    // Create title element
    const titleDiv = document.createElement('div');
    titleDiv.className = 'custom-popup-title';
    titleDiv.style.cssText = 'display: flex; align-items: center; margin-bottom: 8px;';
    
    // Add icon
    const iconDiv = document.createElement('div');
    iconDiv.style.cssText = `
      background-color: ${fileTypeColor}; 
      width: 24px; 
      height: 24px; 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      margin-right: 8px; 
      flex-shrink: 0;
    `;
    
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
    
    // Insert title at the beginning of the content
    content.insertBefore(titleDiv, content.firstChild);
  }, 0);
};

// Initialize map when component is mounted
onMounted(() => {
  initMap();
});

// Watch for changes in pins and update markers
watch(() => props.pins, () => {
  if (map.value) {
    addMarkers();
  }
}, { deep: true });

// Watch for changes in selected pin
watch(() => props.selectedPin, (newPin) => {
  if (map.value && newPin) {
    // Find the marker for the selected pin and open its popup
    const marker = markers.value.find(m => m.pinPath === newPin.path);
    if (marker) {
      openPopup(marker, newPin);
    }
  }
});

// Add markers for all pins
const addMarkers = () => {
  // Clear existing markers
  clearMarkers();
  
  if (!map.value || !checkLeaflet()) return;
  
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
      const position = [Number(pin.latitude), Number(pin.longitude)]; // Leaflet uses [lat, lng] format
      const isSelected = props.selectedPin && props.selectedPin.path === pin.path;
      
      // Create marker with custom icon based on file type
      const marker = L.marker(position, {
        title: pin.name,
        icon: createMarkerIcon(pin.type, isSelected),
        zIndexOffset: isSelected ? 1000 : 0, // Bring selected marker to front
        riseOnHover: true // Rise marker on hover
      }).addTo(map.value);
      
      // Update marker icon on zoom to ensure proper sizing
      const updateMarkerOnZoom = () => {
        // Get current state
        const isSelected = marker.isSelected;
        const isHovered = marker.isHovered;
        const hasOpenPopup = marker.hasOpenPopup;
        
        // Determine which icon state to use
        let useSelected = isSelected || hasOpenPopup;
        let useHovered = !useSelected && isHovered;
        
        // Update icon with smooth transition
        marker.setIcon(createMarkerIcon(pin.type, useSelected, useHovered));
      };
      
      // Store additional properties on the marker
      marker.pinPath = pin.path;
      marker.pinType = pin.type;
      marker.isSelected = isSelected;
      marker.isHovered = false;
      marker.hasOpenPopup = false;
      marker.updateMarkerOnZoom = updateMarkerOnZoom;
      
      // Create popup with custom content
      const popup = L.popup({
        maxWidth: 300,
        className: 'custom-popup',
        closeButton: true,
        autoClose: true,
        closeOnEscapeKey: true,
        closeOnClick: false,
        offset: L.point(0, -10), // Offset popup to align better with marker
        autoPanPadding: L.point(50, 50) // Better padding when auto-panning
      }).setContent(createPopupContent(pin));
      
      // Track popup open/close events
      popup.on('add', () => {
        marker.hasOpenPopup = true;
        updateMarkerOnZoom();
      });
      
      popup.on('remove', () => {
        marker.hasOpenPopup = false;
        
        // Only reset selected state if this pin is not the currently selected one in the store
        if (fileStore.selectedFile?.path !== pin.path) {
          marker.isSelected = false;
        }
        
        updateMarkerOnZoom();
      });
      
      // Add popup to marker
      marker.bindPopup(popup);
      
      // Add click handler to open popup
      marker.on('click', () => {
        // Update selected state
        marker.isSelected = true;
        marker.setIcon(createMarkerIcon(pin.type, true, false));
        marker.setZIndexOffset(1000);
        marker.openPopup();
      });
      
      // Add hover effect using mouseover and mouseout events
      marker.on('mouseover', () => {
        if (!marker.isSelected && !marker.hasOpenPopup) {
          marker.isHovered = true;
          marker.setIcon(createMarkerIcon(pin.type, false, true));
          marker.setZIndexOffset(500); // Bring hovered marker above normal markers but below selected
        }
      });
      
      marker.on('mouseout', () => {
        // Always reset hover state on mouseout
        marker.isHovered = false;
        
        // Only change the icon if not selected and no open popup
        if (!marker.isSelected && !marker.hasOpenPopup) {
          marker.setIcon(createMarkerIcon(pin.type, false, false));
          marker.setZIndexOffset(0); // Restore normal z-index
        } else if (marker.isSelected || marker.hasOpenPopup) {
          // Keep selected state icon
          marker.setIcon(createMarkerIcon(pin.type, true, false));
        }
      });
      
      // Handle popup open event
      marker.on('popupopen', () => {
        // Close any open popups and reset their markers
        markers.value.forEach(m => {
          if (m !== marker && m.hasOpenPopup) {
            m.hasOpenPopup = false;
            if (!m.isSelected && !m.isHovered) {
              m.setIcon(createMarkerIcon(m.pinType, false, false));
              m.setZIndexOffset(0);
            }
          }
        });
        
        // Update marker state
        marker.hasOpenPopup = true;
        marker.isHovered = false;
        marker.setIcon(createMarkerIcon(pin.type, true, false));
        marker.setZIndexOffset(1000);
        
        // Update selected pin in parent component
        emit('update:selectedPin', pin);
        
        // Store reference to current popup
        currentPopup.value = popup;
        
        // Apply custom styling to the popup
        customizePopup(popup, pin);
      });
      
      // Handle popup close event
      marker.on('popupclose', () => {
        // Reset marker states
        marker.hasOpenPopup = false;
        marker.isHovered = false;
        
        // Only reset icon if not selected
        if (!marker.isSelected) {
          marker.setIcon(createMarkerIcon(pin.type, false, false));
          marker.setZIndexOffset(0);
        }
        
        // Reset selected pin in parent component if this was the selected pin
        if (props.selectedPin && props.selectedPin.path === pin.path) {
          emit('update:selectedPin', null);
        }
        
        // Clear current popup reference
        if (currentPopup.value === popup) {
          currentPopup.value = null;
        }
      });
      
      // If this is the selected pin, open its popup
      if (isSelected) {
        setTimeout(() => {
          marker.openPopup();
        }, 100);
      }
      
      return marker;
    });
};

// Open popup for a marker
const openPopup = (marker, pin) => {
  if (marker && map.value) {
    // Pan to marker position first
    map.value.panTo(marker.getLatLng());
    
    // Update marker state
    marker.isSelected = true;
    marker.setIcon(createMarkerIcon(pin.type, true, false));
    marker.setZIndexOffset(1000);
    
    // Open popup after a short delay to allow panning
    setTimeout(() => {
      marker.openPopup();
    }, 100);
  }
};
</script>

<style scoped>
/* Map container styles */
#map {
  z-index: 1;
}

/* Custom popup styles */
:deep(.custom-popup) {
  padding: 0;
}

:deep(.custom-popup .leaflet-popup-content-wrapper) {
  border-radius: 4px;
  padding: 0;
  overflow: hidden;
}

:deep(.custom-popup .leaflet-popup-content) {
  margin: 0;
  padding: 12px;
  width: 100% !important;
}

:deep(.custom-popup .leaflet-popup-tip) {
  background-color: white;
}

:deep(.popup-content) {
  padding: 8px 0;
}

:deep(.popup-body) {
  margin-top: 8px;
}

:deep(.popup-info-item) {
  margin-bottom: 4px;
  font-size: 13px;
}

:deep(.custom-popup-title) {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

/* Hide default marker shadows */
:deep(.leaflet-marker-shadow) {
  display: none;
}

/* Custom marker class to ensure proper sizing */
:deep(.custom-map-marker) {
  background: transparent;
  border: none;
}

/* Pulsing animation for user location marker */
@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.9;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.7;
  }
}

:deep(.user-location-marker) {
  animation: pulse 2s infinite ease-in-out;
}

:deep(.user-location-marker circle) {
  transform-origin: center;
}
</style>
