<template>
  <div id="map" class="map-container"></div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const mapInstance = ref(null);
const userMarker = ref(null);
const defaultZoom = 13;

onMounted(() => {
  mapInstance.value = L.map('map').setView([0, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(mapInstance.value);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        mapInstance.value.setView([latitude, longitude], defaultZoom);
        
        const pulsingIcon = L.divIcon({
          className: 'user-location-marker',
          html: '<div class="pulse"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        
        userMarker.value = L.marker([latitude, longitude], { icon: pulsingIcon })
          .addTo(mapInstance.value)
          .bindPopup('Your location');
      },
      (error) => {
        console.error('Error getting user location:', error);
        mapInstance.value.setView([0, 0], 2);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  } else {
    console.log('Geolocation is not supported by this browser.');
  }
});

onUnmounted(() => {
  if (mapInstance.value) {
    mapInstance.value.remove();
  }
});
</script>

<style scoped>
.map-container {
  height: 100%;
  width: 100%;
}

:deep(.user-location-marker) {
  background: transparent;
}

:deep(.pulse) {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: rgba(38, 143, 255, 0.7);
  position: relative;
  animation: pulse 1.5s infinite;
}

:deep(.pulse)::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: rgba(38, 143, 255, 0.3);
  border-radius: 50%;
  z-index: -1;
  animation: pulse-outer 1.5s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
  }
  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(38, 143, 255, 0);
  }
  100% {
    transform: scale(0.8);
  }
}

@keyframes pulse-outer {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  70% {
    transform: scale(2);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}
</style>
