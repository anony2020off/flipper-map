<template>
  <div class="sidebar fixed-width bg-white h-full overflow-y-auto flex flex-col shadow-lg">
    <!-- Header with logo and title -->
    <div class="sidebar-header bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="logo-container bg-white p-2 rounded-lg shadow-md">
            <i class="fas fa-map-marker-alt text-indigo-600 text-2xl"></i>
          </div>
          <h1 class="text-xl font-bold">SubGHz Map</h1>
        </div>
        <button @click="toggleTheme" class="theme-toggle p-2 rounded-full hover:bg-white/10 transition-colors">
          <i :class="['fas', isDarkTheme ? 'fa-sun' : 'fa-moon']"></i>
        </button>
      </div>
    </div>
    
    <!-- Search box -->
    <div class="p-4">
      <div class="relative">
        <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
        <input 
          type="text" 
          v-model="searchInput" 
          @input="handleSearch"
          placeholder="Search pins..." 
          class="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>
    </div>
    
    <!-- File type filters -->
    <div class="px-4 pb-4">
      <h2 class="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-2">Filter by type</h2>
      <div class="flex flex-wrap gap-2">
        <button 
          @click="toggleFilter('subghz')" 
          :class="['px-3 py-1.5 rounded-full text-sm font-medium transition-all', 
                  isFilterActive('subghz') ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']"
        >
          <i class="fas fa-broadcast-tower mr-1"></i> SubGHz
        </button>
        <button 
          @click="toggleFilter('rfid')" 
          :class="['px-3 py-1.5 rounded-full text-sm font-medium transition-all', 
                  isFilterActive('rfid') ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']"
        >
          <i class="fas fa-id-card mr-1"></i> RFID
        </button>
        <button 
          @click="toggleFilter('nfc')" 
          :class="['px-3 py-1.5 rounded-full text-sm font-medium transition-all', 
                  isFilterActive('nfc') ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200']"
        >
          <i class="fas fa-wifi mr-1"></i> NFC
        </button>
      </div>
    </div>
    
    <!-- User location info -->
    <div class="mx-4 mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
      <h2 class="text-sm uppercase tracking-wider text-blue-700 font-semibold mb-2 flex items-center">
        <i class="fas fa-location-dot mr-2"></i> Your Location
      </h2>
      <template v-if="locationStore.userLocation">
        <div class="grid grid-cols-2 gap-1">
          <div class="text-sm font-medium text-gray-500">Latitude:</div>
          <div class="text-sm font-mono">{{ locationStore.userLocation.lat.toFixed(6) }}</div>
          <div class="text-sm font-medium text-gray-500">Longitude:</div>
          <div class="text-sm font-mono">{{ locationStore.userLocation.lng.toFixed(6) }}</div>
        </div>
      </template>
      <p v-else-if="locationStore.locationError" class="text-red-500 text-sm">
        <i class="fas fa-exclamation-triangle mr-1"></i> {{ locationStore.locationError }}
      </p>
      <p v-else class="text-gray-500 text-sm flex items-center">
        <i class="fas fa-spinner fa-spin mr-2"></i> Getting your location...
      </p>
    </div>
    
    <!-- Pins list -->
    <div class="flex-grow overflow-y-auto px-4 pb-4">
      <h2 class="text-sm uppercase tracking-wider text-gray-500 font-semibold mb-2 flex items-center">
        <i class="fas fa-map-pin mr-2"></i> Nearby Pins
        <span class="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
          {{ filteredPins.length }}
        </span>
      </h2>
      
      <div v-if="filteredPins.length === 0" class="text-gray-500 text-center py-8">
        <i class="fas fa-search text-gray-300 text-4xl mb-2"></i>
        <p>No pins found</p>
      </div>
      
      <div v-else class="space-y-4">
        <!-- Group pins by directory -->
        <div 
          v-for="(group, directory) in groupedPins" 
          :key="directory"
          class="directory-group"
        >
          <div class="directory-header flex items-center gap-2 py-2 px-2 bg-gray-50 rounded-lg mb-2">
            <i class="fas fa-folder text-yellow-500"></i>
            <span class="text-sm font-medium text-gray-700 truncate">{{ formatDirectory(directory) }}</span>
            <span class="ml-auto bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">
              {{ group.length }}
            </span>
          </div>
          
          <div class="space-y-2">
            <div 
              v-for="pin in group" 
              :key="pin.path"
              class="pin-card p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
              :class="{'selected-pin': selectedPin && selectedPin.path === pin.path}"
              @click="selectPin(pin)"
            >
              <div class="flex items-center gap-3">
                <div 
                  class="pin-icon flex items-center justify-center rounded-full w-10 h-10 shadow-sm"
                  :style="{ backgroundColor: fileStore.getFileColor(pin.type) }"
                >
                  <i :class="['fas', `fa-${fileStore.getFileIcon(pin.type)}`, 'text-white']"></i>
                </div>
                <div class="flex-grow min-w-0">
                  <h3 class="font-medium text-gray-800 truncate">{{ pin.name }}</h3>
                  <p v-if="pin.distance" class="text-sm text-gray-500 flex items-center">
                    <i class="fas fa-route mr-1 text-xs"></i>
                    {{ pin.distance.toFixed(2) }} km away
                  </p>
                </div>
                <i class="fas fa-chevron-right text-gray-300"></i>
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

<style scoped>
/* Add Font Awesome for icons */
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css');

.sidebar {
  width: 320px; /* Fixed width */
  min-width: 320px; /* Prevent shrinking */
  max-width: 320px; /* Prevent expanding */
  border-right: 1px solid #e5e7eb;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.fixed-width {
  flex-shrink: 0; /* Prevent sidebar from shrinking */
}

.selected-pin {
  border-left: 3px solid #4f46e5;
  background-color: #f9fafb;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.15) !important;
  transform: translateY(-1px);
}

/* Smooth transitions */
.pin-card {
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.pin-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.pin-card::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 0;
  background: linear-gradient(to bottom, #4f46e5, #818cf8);
  transition: height 0.3s ease;
}

.pin-card:hover::after {
  height: 100%;
}

/* Custom scrollbar */
.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #c5c7d0;
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
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
