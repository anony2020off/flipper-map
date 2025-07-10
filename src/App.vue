<script setup>
import {computed, onMounted, ref} from 'vue';
import Sidebar from './components/Sidebar.vue';
import Map from './components/Map.vue';
import {useLocationStore} from "@/stores/location.js";
import { useFlipperStore } from './stores/flipper';

const location = useLocationStore();
const flipper = useFlipperStore();

onMounted(async () => {
  await location.getUserLocation();
});

const pins = computed(() => {
  const {latitude, longitude} = location.userLocation || {};

  const flipperPins = flipper.fileList.map(file => {
    const hasCoordinates = file.latitude !== undefined && file.longitude !== undefined && file.latitude !== null && file.longitude !== null;
    const distance = hasCoordinates ? location.calculateDistance(latitude, longitude, file.latitude, file.longitude) : null;

    return {...file, distance}
  })

  return flipperPins.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))
});
</script>

<template>
  <div class="app-container">
    <div class="row g-0 h-100">
      <div class="col-md-2 sidebar-col">
        <Sidebar :pins="pins"/>
      </div>
      <div class="col-md-10 map-col">
        <Map />
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
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
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
