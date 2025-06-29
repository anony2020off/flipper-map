<template>
  <div class="sidebar overflow-auto d-flex flex-column shadow h-100" style="width: 360px; min-width: 360px; max-width: 360px;">
    <!-- Header with logo and title -->
    <div class="custom-primary-bg text-white p-3 d-flex justify-content-between align-items-center">
      <div class="d-flex align-items-center gap-2">
        <div class="d-flex align-items-center justify-content-center bg-white rounded p-2" style="width: 40px; height: 40px;">
          <i class="fas fa-map-marker-alt custom-primary-text fs-5"></i>
        </div>
        <h1 class="fs-5 fw-bold mb-0">Flipper Map</h1>
      </div>
      <!-- Theme toggle button (temporarily removed)
      <button @click="toggleTheme" class="btn btn-sm btn-outline-light rounded-circle">
        <i :class="['fas', isDarkTheme ? 'fa-sun' : 'fa-moon']"></i>
      </button>
      -->
      <button 
        @click="handleFlipperConnection" 
        :disabled="flipperStore.isConnecting"
        :class="['btn btn-sm d-flex align-items-center gap-1', 
                flipperStore.isConnected ? 'btn-success' : 'btn-light']">
        <i :class="['fas', flipperStore.isConnected ? 'fa-check' : 'fa-plug', flipperStore.isConnecting ? 'fa-spin' : '']"></i>
        <span>{{ flipperStore.isConnected ? 'Connected' : (flipperStore.isConnecting ? 'Connecting...' : 'Connect') }}</span>
      </button>
    </div>
    
    <!-- Search box -->
    <div class="p-3 border-bottom">
      <div class="position-relative">
        <span class="position-absolute top-50 start-0 translate-middle-y ms-3">
          <i class="fas fa-search text-muted"></i>
        </span>
        <input 
          type="text" 
          v-model="searchInput" 
          @input="handleSearch"
          placeholder="Search pins..." 
          class="form-control ps-5"
        />
      </div>
    </div>
    
    <!-- File type filters -->
    <div class="p-3 border-bottom">
      <h6 class="text-uppercase fw-semibold text-muted small mb-3">Filter by type</h6>
      <div class="d-flex flex-wrap gap-2">
        <button 
          @click="toggleFilter('subghz')" 
          :class="['btn btn-sm d-flex align-items-center gap-1', 
                  activeFilters.includes('subghz') ? 'custom-primary-btn' : 'btn-outline-secondary']">
          <i class="fas fa-broadcast-tower"></i>
          <span>RF</span>
          <span class="ms-1 badge bg-secondary rounded-pill">
            {{ getFilterCount('subghz') }}
          </span>
        </button>
        
        <button 
          @click="toggleFilter('rfid')" 
          :class="['btn btn-sm d-flex align-items-center gap-1', 
                  activeFilters.includes('rfid') ? 'custom-primary-btn' : 'btn-outline-secondary']">
          <i class="fas fa-id-card"></i>
          <span>RFID</span>
          <span class="ms-1 badge bg-secondary rounded-pill">
            {{ getFilterCount('rfid') }}
          </span>
        </button>
        
        <button 
          @click="toggleFilter('nfc')" 
          :class="['btn btn-sm d-flex align-items-center gap-1', 
                  activeFilters.includes('nfc') ? 'custom-primary-btn' : 'btn-outline-secondary']">
          <i class="fas fa-wifi"></i>
          <span>NFC</span>
          <span class="ms-1 badge bg-secondary rounded-pill">
            {{ getFilterCount('nfc') }}
          </span>
        </button>
      </div>
    </div>
    
    <!-- User location info -->
    <div class="p-3 border-bottom">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h6 class="text-uppercase fw-semibold text-muted small mb-0">Your Location</h6>
        <span class="d-flex align-items-center justify-content-center custom-primary-bg-light rounded-circle" style="width: 24px; height: 24px;">
          <i class="fas fa-location-dot custom-primary-text small"></i>
        </span>
      </div>
      
      <template v-if="locationStore.userLocation">
        <div class="mt-2 p-3 bg-light border rounded shadow-sm">
          <div class="row g-2">
            <div class="col-5 text-muted small fw-medium">Latitude:</div>
            <div class="col-7 small font-monospace">{{ locationStore.userLocation.latitude.toFixed(6) }}</div>
            <div class="col-5 text-muted small fw-medium">Longitude:</div>
            <div class="col-7 small font-monospace">{{ locationStore.userLocation.longitude.toFixed(6) }}</div>
          </div>
        </div>
      </template>
      <div v-else-if="locationStore.locationError" class="mt-2 p-3 bg-danger bg-opacity-10 border border-danger border-opacity-25 rounded text-danger small">
        <i class="fas fa-exclamation-triangle me-1"></i> {{ locationStore.locationError }}
      </div>
      <div v-else class="mt-2 p-3 custom-primary-bg-light border custom-primary-border rounded custom-primary-text small d-flex align-items-center">
        <i class="fas fa-spinner fa-spin me-2"></i> Getting your location...
      </div>
    </div>
    
    <!-- Pins list -->
    <div class="flex-grow-1 overflow-auto">
      <!-- No pins found message -->
      <div v-if="filteredPins.length === 0" class="d-flex flex-column align-items-center justify-content-center py-5">
        <div class="d-flex align-items-center justify-content-center bg-light rounded-circle mb-3" style="width: 48px; height: 48px;">
          <i class="fas fa-search text-muted"></i>
        </div>
        <p class="text-muted small">No pins found</p>
      </div>
      
      <div v-else>
        <!-- Geolocated pins section -->
        <div class="p-3 border-bottom">
          <div class="d-flex justify-content-between align-items-center">
            <h6 class="text-uppercase fw-semibold text-muted small mb-0">Nearby Pins</h6>
            <span class="badge bg-secondary rounded-pill">
              {{ geolocatedPins.length }}
            </span>
          </div>
        </div>
        
        <div v-if="geolocatedPins.length === 0" class="px-3 py-2">
          <p class="text-muted small fst-italic">No geolocated pins found</p>
        </div>
        
        <div class="list-group list-group-flush">
          <!-- Geolocated pins -->
          <a 
            v-for="pin in geolocatedPins" 
            :key="pin.path"
            href="#"
            class="list-group-item list-group-item-action px-3 py-3 overflow-hidden"
            :class="{'active': selectedPin && selectedPin.path === pin.path}"
            @click.prevent="selectPin(pin)"
          >
          <div class="d-flex align-items-center">
            <div 
              class="d-flex align-items-center justify-content-center rounded-circle shadow-sm flex-shrink-0" 
              style="width: 40px; height: 40px; min-width: 40px;"
              :style="{ backgroundColor: fileStore.getFileColor(pin.type) }"
            >
              <i :class="['fas', `fa-${fileStore.getFileIcon(pin.type)}`, 'text-white']"></i>
            </div>
            <div class="flex-grow-1 min-width-0 mx-3 overflow-hidden">
              <p class="mb-0 small fw-medium text-truncate">{{ removeFileExtension(pin.name) }}</p>
              <p v-if="pin.distance" class="mb-0 text-muted smaller d-flex align-items-center mt-1 text-truncate">
                <i class="fas fa-route me-1 smaller flex-shrink-0"></i>
                <span class="text-truncate">{{ pin.distance < 1 ? `${(pin.distance * 1000).toFixed(0)} m` : `${pin.distance.toFixed(2)} km` }} away</span>
              </p>
            </div>
            <div class="flex-shrink-0">
              <i class="fas fa-chevron-right text-muted"></i>
            </div>
          </div>
        </a>
        </div>
        
        <!-- Non-geolocated pins section -->
        <div class="p-3 border-bottom">
          <div class="d-flex justify-content-between align-items-center">
            <h6 class="text-uppercase fw-semibold text-muted small mb-0">Other Pins</h6>
            <span class="badge bg-secondary rounded-pill">
              {{ nonGeolocatedPins.length }}
            </span>
          </div>
        </div>
        
        <div v-if="nonGeolocatedPins.length === 0" class="px-3 py-2">
          <p class="text-muted small fst-italic">No other pins found</p>
        </div>
        
        <div class="list-group list-group-flush">
          <!-- Non-geolocated pins -->
          <a 
            v-for="pin in nonGeolocatedPins" 
            :key="pin.path"
            href="#"
            class="list-group-item list-group-item-action px-3 py-3 overflow-hidden"
            :class="{'active': selectedPin && selectedPin.path === pin.path}"
            @click.prevent="selectPin(pin)"
          >
            <div class="d-flex align-items-center">
              <div 
                class="d-flex align-items-center justify-content-center rounded-circle shadow-sm flex-shrink-0" 
                style="width: 40px; height: 40px; min-width: 40px;"
                :style="{ backgroundColor: fileStore.getFileColor(pin.type) }"
              >
                <i :class="['fas', `fa-${fileStore.getFileIcon(pin.type)}`, 'text-white']"></i>
              </div>
              <div class="flex-grow-1 min-width-0 mx-3 overflow-hidden">
                <p class="mb-0 small fw-medium text-truncate">{{ removeFileExtension(pin.name) }}</p>
                <p class="mb-0 text-muted smaller d-flex align-items-center mt-1 text-truncate">
                  <i class="fas fa-file me-1 smaller flex-shrink-0"></i>
                  <span class="text-truncate">{{ pin.source || 'local' }} file</span>
                </p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useLocationStore } from '../stores/location';
import { useFlipperStore } from '../stores/flipper';
import { useFileStore } from '../stores/files';

const props = defineProps({
  pins: {
    type: Array,
    required: true
  },
  searchQuery: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['search', 'select-pin']);

const locationStore = useLocationStore();
const flipperStore = useFlipperStore();
const fileStore = useFileStore();
const searchInput = ref(props.searchQuery);
const activeFilters = ref([]);
const selectedPin = ref(null);
const isDarkTheme = ref(false);

// Handle search input
const handleSearch = () => {
  emit('search', searchInput.value);
};

// Toggle filter for file type
const toggleFilter = (fileType) => {
  if (isFilterActive(fileType)) {
    activeFilters.value = activeFilters.value.filter(f => f !== fileType);
  } else {
    activeFilters.value.push(fileType);
  }
};

// Check if filter is active
const isFilterActive = (fileType) => {
  return activeFilters.value.includes(fileType);
};

// Filter pins by active filters
const filteredPins = computed(() => {
  if (activeFilters.value.length === 0) {
    return props.pins;
  }
  return props.pins.filter(pin => activeFilters.value.includes(pin.type));
});

// Separate pins into geolocated and non-geolocated
const geolocatedPins = computed(() => {
  return filteredPins.value.filter(pin => {
    // Check if pin has original latitude and longitude coordinates (not default values)
    // We need to check if the coordinates were in the original file
    return pin.hasOwnProperty('latitude') && 
           pin.hasOwnProperty('longitude') && 
           pin.latitude !== null && 
           pin.longitude !== null &&
           // Check that we're not using default coordinates
           !(pin.source === 'flipper' && pin.latitude === 0 && pin.longitude === 0) &&
           !(pin.source === 'flipper' && 
              pin.latitude === locationStore.userLocation?.latitude && 
              pin.longitude === locationStore.userLocation?.longitude);
  }).sort((a, b) => a.distance - b.distance); // Sort by distance
});

const nonGeolocatedPins = computed(() => {
  return filteredPins.value.filter(pin => {
    // Check if pin is missing original coordinates or has default values
    return !pin.hasOwnProperty('latitude') || 
           !pin.hasOwnProperty('longitude') || 
           pin.latitude === null || 
           pin.longitude === null ||
           // Check for default coordinates
           (pin.source === 'flipper' && pin.latitude === 0 && pin.longitude === 0) ||
           (pin.source === 'flipper' && 
            pin.latitude === locationStore.userLocation?.latitude && 
            pin.longitude === locationStore.userLocation?.longitude);
  });
});

// Count pins for each file type
const getFilterCount = (fileType) => {
  return props.pins.filter(pin => pin.type === fileType).length;
};

// Remove file extension from name (only from last dot)
const removeFileExtension = (filename) => {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1) return filename; // No extension
  return filename.substring(0, lastDotIndex);
};

// Select a pin
const selectPin = (pin) => {
  selectedPin.value = pin;
  emit('select-pin', pin);
};

// Toggle between light and dark theme
const toggleTheme = () => {
  isDarkTheme.value = !isDarkTheme.value;
  document.documentElement.setAttribute('data-bs-theme', isDarkTheme.value ? 'dark' : 'light');
  localStorage.setItem('subghz-map-theme', isDarkTheme.value ? 'dark' : 'light');
};

// Handle Flipper connection
const handleFlipperConnection = async () => {
  if (flipperStore.isConnected) {
    // Disconnect if already connected
    await flipperStore.disconnectFlipper();
  } else {
    // Connect to Flipper
    try {
      const success = await flipperStore.connectFlipper();
      if (success) {
        // Merge Flipper files with existing pins
        console.log('Connected to Flipper, found files:', flipperStore.fileList);
      }
    } catch (error) {
      console.error('Failed to connect to Flipper:', error);
    }
  }
};

// Initialize theme from localStorage on component mount
onMounted(() => {
  const savedTheme = localStorage.getItem('subghz-map-theme');
  if (savedTheme === 'dark') {
    isDarkTheme.value = true;
    document.documentElement.setAttribute('data-bs-theme', 'dark');
  }
});

// Watch for changes in searchQuery prop
watch(() => props.searchQuery, (newValue) => {
  searchInput.value = newValue;
});
</script>

<style>
/* Custom primary color styles */
.custom-primary-bg {
  background-color: #ff8200;
}

.custom-primary-bg-light {
  background-color: rgba(255, 130, 0, 0.1);
}

.custom-primary-text {
  color: #ff8200;
}

.custom-primary-border {
  border-color: rgba(255, 130, 0, 0.25);
}

.custom-primary-btn {
  color: #fff;
  background-color: #ff8200;
  border-color: #ff8200;
}

.custom-primary-btn:hover {
  color: #fff;
  background-color: #e67600;
  border-color: #d96e00;
}

.custom-primary-btn:focus {
  box-shadow: 0 0 0 0.25rem rgba(255, 130, 0, 0.5);
}

/* Add Font Awesome for icons */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css');

.sidebar {
width: 320px; /* Fixed width */
min-width: 320px; /* Prevent shrinking */
max-width: 320px; /* Prevent expanding */
border-right: 1px solid #e5e7eb;
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
z-index: 10;
background-color: #ffffff;
  z-index: 10;
  background-color: #ffffff;
}

.fixed-width {
  width: 360px;
}

.selected-pin {
  border-left: 3px solid #4f46e5;
  background-color: #f9fafb !important;
}

/* Meraki UI style pin card */
.pin-card {
  transition: all 0.2s ease;
  position: relative;
}

.pin-card:hover {
  background-color: #f9fafb;
}

.pin-card.selected-pin::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 3px;
  height: 100%;
  background: #4f46e5;
}

/* Custom scrollbar */
.sidebar::-webkit-scrollbar {
  width: 4px;
}

.sidebar::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Dark theme styles */
.dark-theme .sidebar {
  background-color: #1e293b;
  border-right-color: #334155;
}

.dark-theme .border-gray-100 {
  border-color: #334155;
}

.dark-theme .bg-white {
  background-color: #1e293b;
}

.dark-theme .text-gray-600,
.dark-theme .text-gray-700,
.dark-theme .text-gray-800 {
  color: #e2e8f0;
}

.dark-theme .text-gray-500 {
  color: #94a3b8;
}

.dark-theme .text-gray-400 {
  color: #64748b;
}

.dark-theme .bg-gray-50,
.dark-theme .bg-gray-100 {
  background-color: #334155;
}

.dark-theme .text-gray-300 {
  color: #475569;
}

.dark-theme .border {
  border-color: #334155;
}

.dark-theme .pin-card:hover {
  background-color: #334155;
}

.dark-theme .selected-pin {
  background-color: #334155 !important;
}

.dark-theme input {
  background-color: #1e293b;
  border-color: #334155;
  color: #e2e8f0;
}

.dark-theme .sidebar::-webkit-scrollbar-track {
  background: #1e293b;
}

.dark-theme .sidebar::-webkit-scrollbar-thumb {
  background: #475569;
}

.dark-theme .sidebar::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

/* Animation for loading spinner */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.fa-spinner {
  animation: spin 1s linear infinite;
}
</style>
