<script setup>
import {computed, onMounted, ref} from 'vue';
import Sidebar from './components/Sidebar.vue';
import Map from './components/Map.vue';
import {useLocationStore} from "./stores/location.js";
import { useFlipperStore } from './stores/flipper';

const location = useLocationStore();
const flipper = useFlipperStore();
const selectedPin = ref(null);
const searchQuery = ref('');

onMounted(async () => {
  await location.getUserLocation();
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
        <Map :pins="pins" v-model:selectedPin="selectedPin"/>
      </div>
    </div>
  </div>
</template>

<style>
/* Import Bootstrap CSS */
@import 'bootstrap/dist/css/bootstrap.min.css';

/* Global styles */
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
}

#app {
  font-family: Roboto, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.app-container {
  height: 100%;
  width: 100%;
}

.sidebar-col, .map-col {
  height: 100%;
  overflow: hidden;
}
</style>
