<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import MapView from './components/MapView.vue';
import Sidebar from './components/Sidebar.vue';
import LoadingIndicator from './components/LoadingIndicator.vue';
import { useLocationStore } from './stores/location';
import { useFileStore } from './stores/files';

const locationStore = useLocationStore();
const fileStore = useFileStore();
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

const filteredPins = computed(() => {
  if (!searchQuery.value) return fileStore.sortedByDistance;
  
  return fileStore.sortedByDistance.filter(file => 
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
  <div class="app-container">
    <Sidebar 
      :pins="filteredPins" 
      @search="handleSearch" 
      :searchQuery="searchQuery"
      @select-pin="handlePinSelect"
    />
    <div class="map-container">
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
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.map-container {
  flex: 1;
  position: relative;
  height: 100%;
}
</style>
