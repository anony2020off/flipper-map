<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import Sidebar from './components/Sidebar.vue';
import Map from './components/Map.vue';
import { useLocationStore } from './stores/location.js';
import { useFlipperStore } from './stores/flipper';
import Toastify from 'toastify-js';

const location = useLocationStore();
const flipper = useFlipperStore();
const selectedPin = ref(null);
const searchQuery = ref('');

onMounted(async () => {
  await location.getUserLocation();
});

watch(() => flipper.generalError, (error) => {
  if (error) {
    Toastify({
      text: error,
      duration: 5000,
      close: true,
      gravity: "bottom",
      position: "center",
      backgroundColor: "#dc3545",
    }).showToast();
  }
});

watch(() => flipper.connectionError, (error) => {
  if (error) {
    Toastify({
      text: error,
      duration: 8000,
      close: true,
      gravity: "bottom",
      position: "center",
      backgroundColor: "#dc3545",
    }).showToast();
  }
});

watch(() => flipper.isConnected, (isConnected) => {
  if (isConnected) {
    Toastify({
      text: `Connected to ${flipper.hardwareModel ?? 'device'}: ${flipper.hardwareName ?? 'Unknown'}`,
      duration: 8000,
      close: true,
      gravity: "bottom",
      position: "center",
      backgroundColor: "#28a745",
    }).showToast();
  }
});

const pins = computed(() => {
  const {latitude, longitude} = location.userLocation || {};

  const flipperPins = flipper.fileList.map(file => {
    const hasCoordinates = file.latitude !== undefined && file.longitude !== undefined && file.latitude !== null && file.longitude !== null;
    const distance = hasCoordinates ? location.calculateDistance(latitude, longitude, file.latitude, file.longitude) : null;
    const visible = file.name.toLowerCase().includes(searchQuery.value.toLowerCase());

    return {...file, distance, visible}
  })

  return flipperPins.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
});

const selectPin = (pin) => {
  selectedPin.value = pin;
};

const handleSearch = (query) => {
  searchQuery.value = query;
};
</script>

<template>
  <div class="app-container">
    <div class="row g-0 h-100">
      <div class="col sidebar-col" style="max-width: 320px;">
        <Sidebar :pins="pins" @search="handleSearch" :searchQuery="searchQuery" @select-pin="selectPin" v-model:selectedPin="selectedPin"/>
      </div>
      <div class="col map-col">
        <Map :pins="pins" @select-pin="selectPin" v-model:selectedPin="selectedPin"/>
      </div>
    </div>
  </div>
</template>
