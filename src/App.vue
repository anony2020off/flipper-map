<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import TheSidebar from './components/TheSidebar.vue';
import TheMap from './components/TheMap.vue';
import { useLocationStore } from './stores/location.js';
import { useFlipperStore } from './stores/flipper';
import { notify } from '@/helpers/notification.js';

const location = useLocationStore();
const flipper = useFlipperStore();
const selectedPin = ref(null);
const searchQuery = ref('');

onMounted(async () => {
  await location.getUserLocation();
});

watch(() => flipper.generalError, (error) => {
  if (error) {
    notify(error, 'error');
  }
});

watch(() => flipper.connectionError, (error) => {
  if (error) {
    notify(error, 'error');
  }
});

watch(() => flipper.isConnected, (isConnected) => {
  if (isConnected) {
    notify('Connected to ' + (flipper.hardwareModel ?? 'device') + ': ' + (flipper.hardwareName ?? 'Unknown'), 'success');
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
      <div class="col sidebar-col">
        <TheSidebar
          v-model:selected-pin="selectedPin"
          :pins="pins"
          :search-query="searchQuery"
          @search="handleSearch"
          @select-pin="selectPin"
        />
      </div>
      <div class="col map-col">
        <TheMap
          v-model:selected-pin="selectedPin"
          :pins="pins"
          @select-pin="selectPin"
        />
      </div>
    </div>
  </div>
</template>
