<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import MapView from './components/MapView.vue';
import Sidebar from './components/Sidebar.vue';
import LoadingIndicator from './components/LoadingIndicator.vue';
import { useLocationStore } from './stores/location';
import { useFileStore } from './stores/files';
import { useFlipperStore } from './stores/flipper';

const locationStore = useLocationStore();
const fileStore = useFileStore();
const flipperStore = useFlipperStore();
const searchQuery = ref('');
const loadingMessage = ref('Loading...');
const selectedPin = ref(null);

// Set appropriate loading messages based on current operation
const updateLoadingMessage = () => {
  if (locationStore.isLoading) {
    loadingMessage.value = 'Getting your location...';
  } else if (fileStore.isLoading) {
    loadingMessage.value = 'Loading files...';
  } else {
    loadingMessage.value = 'Loading...';
  }
};

onMounted(async () => {
  // Watch for loading state changes
  watch(
    () => [locationStore.isLoading, fileStore.isLoading],
    () => updateLoadingMessage()
  );
  
  // Start loading process
  updateLoadingMessage();
  await locationStore.getUserLocation();
  updateLoadingMessage();
  await fileStore.loadFiles();
});

// Combine pins from file system and Flipper device
const allPins = computed(() => {
  // Get pins from file system
  const filePins = fileStore.sortedByDistance;
  
  // Get pins from Flipper device
  const flipperPins = flipperStore.fileList.map(file => {
    // Ensure we use the same coordinate property names as in fileStore
    // This addresses the inconsistency between lat/lng and latitude/longitude
    return {
      ...file,
      // If coordinates don't exist, use a default location near the user
      latitude: file.latitude || (locationStore.userLocation?.latitude || 0),
      longitude: file.longitude || (locationStore.userLocation?.longitude || 0),
      // Calculate distance from user location
      distance: locationStore.calculateDistance(
        locationStore.userLocation?.latitude || 0,
        locationStore.userLocation?.longitude || 0,
        file.latitude || locationStore.userLocation?.latitude || 0,
        file.longitude || locationStore.userLocation?.longitude || 0
      )
    };
  });
  
  // Combine and sort by distance
  return [...filePins, ...flipperPins].sort((a, b) => a.distance - b.distance);
});

const filteredPins = computed(() => {
  if (!searchQuery.value) return allPins.value;
  
  return allPins.value.filter(file => 
    file.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const handleSearch = (query) => {
  searchQuery.value = query;
};

const handlePinSelect = (pin) => {
  selectedPin.value = pin;
};
</script>

<template>
  <div class="d-flex vh-100 vw-100 overflow-hidden">
    <Sidebar 
      :pins="filteredPins" 
      @search="handleSearch" 
      :searchQuery="searchQuery"
      @select-pin="handlePinSelect"
    />
    <div class="flex-grow-1 position-relative h-100">
      <MapView 
        :pins="filteredPins" 
        :selectedPin="selectedPin"
      />
    </div>
    <LoadingIndicator 
      :isLoading="locationStore.isLoading || fileStore.isLoading" 
      :message="loadingMessage"
    />
  </div>
</template>

<style>
/* Custom styles can be added here if needed */
</style>
