<script setup>
import {onMounted, ref} from 'vue';
import Sidebar from './components/Sidebar.vue';
import Map from './components/Map.vue';
import {useLocationStore} from "@/stores/location.js";

const location = useLocationStore();

onMounted(async () => {
  await location.getUserLocation();
});
</script>

<template>
  <div class="app-container">
    <div class="row g-0 h-100">
      <div class="col-md-2 sidebar-col">
        <Sidebar />
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
  font-family: Inter, Helvetica, Arial, sans-serif;
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
