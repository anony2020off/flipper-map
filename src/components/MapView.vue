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
  
  return {
    path: google.maps.SymbolPath.CIRCLE,
    scale: isSelected ? 10 : 8,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: isSelected ? '#4f46e5' : '#ffffff',
    strokeWeight: isSelected ? 3 : 2,
    animation: isSelected ? google.maps.Animation.BOUNCE : null
  };
};

// Create info window content for a pin
const createInfoWindowContent = (pin) => {
  const fileTypeIcon = {
    'subghz': 'broadcast-tower',
    'rfid': 'id-card',
    'nfc': 'wifi'
  }[pin.type] || 'question';
  
  const fileTypeColor = fileStore.getFileColor(pin.type);
  
  return `
    <div class="info-window">
      <div class="info-header" style="display: flex; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
        <div style="background-color: ${fileTypeColor}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 8px;">
          <i class="fas fa-${fileTypeIcon}" style="color: white; font-size: 12px;"></i>
        </div>
        <h3 style="margin: 0; font-weight: 600; font-size: 16px;">${pin.name}</h3>
      </div>
      <div style="font-size: 13px; color: #555;">
        <p style="margin: 4px 0;"><strong>Type:</strong> ${pin.type.toUpperCase()}</p>
        <p style="margin: 4px 0;"><strong>Directory:</strong> ${pin.directory}</p>
        <p style="margin: 4px 0;"><strong>Coordinates:</strong> ${pin.latitude.toFixed(6)}, ${pin.longitude.toFixed(6)}</p>
        ${pin.distance ? `<p style="margin: 4px 0;"><strong>Distance:</strong> ${pin.distance.toFixed(2)} km</p>` : ''}
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
