<template>
  <div class="sidebar fixed-width h-full overflow-y-auto flex flex-col shadow-lg">
    <!-- Header with logo and title -->
    <div class="relative">
      <div class="flex flex-col sm:flex-row sm:justify-around">
        <div class="w-full">
          <div class="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-indigo-700">
            <div class="flex items-center gap-3">
              <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-white">
                <i class="fas fa-map-marker-alt text-indigo-600 text-xl"></i>
              </div>
              <h1 class="text-xl font-bold text-white">SubGHz Map</h1>
            </div>
            <button @click="toggleTheme" class="p-2 text-white rounded-full hover:bg-white/10 transition-colors">
              <i :class="['fas', isDarkTheme ? 'fa-sun' : 'fa-moon']"></i>
            </button>
          </div>
          
          <!-- Search box -->
          <div class="px-4 py-3 border-b border-gray-100">
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                <i class="fas fa-search text-gray-400"></i>
              </span>
              <input 
                type="text" 
                v-model="searchInput" 
                @input="handleSearch"
                placeholder="Search pins..." 
                class="w-full py-2 pl-10 pr-4 text-gray-700 bg-white border rounded-md focus:border-indigo-400 focus:outline-none focus:ring focus:ring-indigo-300 focus:ring-opacity-40"
              />
            </div>
          </div>
          
          <!-- File type filters -->
          <div class="px-4 py-3 border-b border-gray-100">
            <h2 class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Filter by type</h2>
            <div class="flex flex-wrap gap-2">
              <button 
                @click="toggleFilter('subghz')" 
                :class="['flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors', 
                        activeFilters.includes('subghz') ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">
                <i class="fas fa-broadcast-tower"></i>
                <span>SubGHz</span>
                <span class="ml-1 bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-xs">
                  {{ getFilterCount('subghz') }}
                </span>
              </button>
              
              <button 
                @click="toggleFilter('rfid')" 
                :class="['flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors', 
                        activeFilters.includes('rfid') ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">
                <i class="fas fa-id-card"></i>
                <span>RFID</span>
                <span class="ml-1 bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-xs">
                  {{ getFilterCount('rfid') }}
                </span>
              </button>
              
              <button 
                @click="toggleFilter('nfc')" 
                :class="['flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors', 
                        activeFilters.includes('nfc') ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']">
                <i class="fas fa-wifi"></i>
                <span>NFC</span>
                <span class="ml-1 bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-xs">
                  {{ getFilterCount('nfc') }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- User location info -->
    <div class="px-4 py-3 border-b border-gray-100">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Your Location</h2>
        <span class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600">
          <i class="fas fa-location-dot text-xs"></i>
        </span>
      </div>
      
      <template v-if="locationStore.userLocation">
        <div class="mt-2 p-3 bg-white border border-gray-200 rounded-md shadow-sm">
          <div class="grid grid-cols-2 gap-2">
            <div class="text-xs font-medium text-gray-500">Latitude:</div>
            <div class="text-xs font-mono text-gray-800">{{ locationStore.userLocation.latitude.toFixed(6) }}</div>
            <div class="text-xs font-medium text-gray-500">Longitude:</div>
            <div class="text-xs font-mono text-gray-800">{{ locationStore.userLocation.longitude.toFixed(6) }}</div>
          </div>
        </div>
      </template>
      <p v-else-if="locationStore.locationError" class="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-xs">
        <i class="fas fa-exclamation-triangle mr-1"></i> {{ locationStore.locationError }}
      </p>
      <p v-else class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-600 text-xs flex items-center">
        <i class="fas fa-spinner fa-spin mr-2"></i> Getting your location...
      </p>
    </div>
    
    <!-- Pins list -->
    <div class="flex-grow overflow-y-auto">
      <div class="px-4 py-3 border-b border-gray-100">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nearby Pins</h2>
          <span class="flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
            {{ filteredPins.length }}
          </span>
        </div>
      </div>
      
      <div v-if="filteredPins.length === 0" class="flex flex-col items-center justify-center py-8 px-4">
        <div class="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
          <i class="fas fa-search text-gray-400"></i>
        </div>
        <p class="text-sm text-gray-500">No pins found</p>
      </div>
      
      <div v-else class="divide-y divide-gray-100">
        <!-- Group pins by directory -->
        <div 
          v-for="(group, directory) in groupedPins" 
          :key="directory"
          class="directory-group py-2"
        >
          <div class="px-4 py-2 flex items-center justify-between">
            <div class="flex items-center">
              <span class="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-500 mr-2">
                <i class="fas fa-folder text-xs"></i>
              </span>
              <h3 class="text-sm font-medium text-gray-700 truncate">{{ formatDirectory(directory) }}</h3>
            </div>
            <span class="flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
              {{ group.length }}
            </span>
          </div>
          
          <div class="space-y-0 divide-y divide-gray-50">
            <div 
              v-for="pin in group" 
              :key="pin.path"
              class="pin-card px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
              :class="{'selected-pin': selectedPin && selectedPin.path === pin.path}"
              @click="selectPin(pin)"
            >
              <div class="flex items-center space-x-3">
                <div 
                  class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full shadow-sm"
                  :style="{ backgroundColor: fileStore.getFileColor(pin.type) }"
                >
                  <i :class="['fas', `fa-${fileStore.getFileIcon(pin.type)}`, 'text-white']"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800 truncate">{{ pin.name }}</p>
                  <p v-if="pin.distance" class="text-xs text-gray-500 flex items-center mt-1">
                    <i class="fas fa-route mr-1 text-xs"></i>
                    {{ pin.distance.toFixed(2) }} km away
                  </p>
                </div>
                <div class="flex-shrink-0">
                  <i class="fas fa-chevron-right text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useLocationStore } from '../stores/location';
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

// Group pins by directory
const groupedPins = computed(() => {
  const groups = {};
  
  filteredPins.value.forEach(pin => {
    const directory = pin.directory || '/';
    if (!groups[directory]) {
      groups[directory] = [];
    }
    groups[directory].push(pin);
  });
  
  return groups;
});

// Format directory name for display
const formatDirectory = (directory) => {
  if (directory === '/') return 'Root';
  
  // Remove leading slash and replace remaining slashes with ' > '
  const formatted = directory.startsWith('/') ? directory.substring(1) : directory;
  return formatted.replace(/\//g, ' > ');
};

// Count pins for each file type
const getFilterCount = (fileType) => {
  return props.pins.filter(pin => pin.type === fileType).length;
};

// Select a pin
const selectPin = (pin) => {
  selectedPin.value = pin;
  emit('select-pin', pin);
};

// Toggle between light and dark theme
const toggleTheme = () => {
  isDarkTheme.value = !isDarkTheme.value;
  document.documentElement.classList.toggle('dark-theme', isDarkTheme.value);
  
  // Save theme preference to localStorage
  localStorage.setItem('subghz-map-theme', isDarkTheme.value ? 'dark' : 'light');
};

// Initialize theme from localStorage on component mount
onMounted(() => {
  const savedTheme = localStorage.getItem('subghz-map-theme');
  if (savedTheme === 'dark') {
    isDarkTheme.value = true;
    document.documentElement.classList.add('dark-theme');
  }
});

// Watch for changes in searchQuery prop
watch(() => props.searchQuery, (newValue) => {
searchInput.value = newValue;
});
</script>

<style>
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
  width: 320px;
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
