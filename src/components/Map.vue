<template>
  <div id="map" class="map-container"></div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useLocationStore } from "@/stores/location.js";
import { useFlipperStore } from "@/stores/flipper.js";

const mapInstance = ref(null);
const userMarker = ref(null);
const defaultZoom = 15;

const location = useLocationStore()
const flipper = useFlipperStore()

onMounted(async () => {

  mapInstance.value = L.map('map', {
    center: window.localStorage.getItem('center')?.split(',') ?? [25, 0],
    zoom: window.localStorage.getItem('zoom') ?? 2,
    zoomControl: true,
    worldCopyJump: true
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Made with <span class="text-danger">&hearts;</span> by <a href="https://stichoza.com">Stichoza</a>',
    maxZoom: 19
  }).addTo(mapInstance.value);

  // Clusters
  const markers = L.markerClusterGroup({
    maxClusterRadius: zoom => zoom < 3 ? 40 : 30,
  }).addTo(mapInstance.value);

  // Move to current location
  if (location.geolocationSupported()) {
    L.easyButton({
      position: 'topleft',
      states: [
        {
          stateName: 'geolocation-button',
          title: 'Center map to current location',
          icon: 'fa-location-crosshairs fa-lg',
          onClick: () => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const {latitude, longitude} = position.coords;
                  mapInstance.value.setView([latitude, longitude], defaultZoom);
                },
                (error) => {
                },
                {
                  enableHighAccuracy: true,
                  timeout: 5000,
                  maximumAge: 0
                }
              );
            }
          },
        },
      ],
    }).addTo(mapInstance.value)
  }

  let centerWasSet = false;

  // Center map to last known coordinates and zoom level
  if (window.localStorage.getItem('center')) {
    centerWasSet = true;
    mapInstance.value.setView(
      window.localStorage.getItem('center')?.split(',') ?? [25, 0],
      window.localStorage.getItem('zoom') ?? defaultZoom
    );
  }

  // Set user location marker
  if (location.geolocationSupported()) {

    await location.getUserLocation();

    const { latitude, longitude } = location.userLocation;

    console.log([latitude, longitude]);

    if (!centerWasSet) {
      mapInstance.value.setView([latitude, longitude], defaultZoom);
    }

    const pulsingIcon = L.divIcon({
      className: 'user-location-marker',
      html: '<div class="pulse"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    userMarker.value = L.marker([latitude, longitude], { icon: pulsingIcon })
      .addTo(mapInstance.value)
      .bindTooltip('Your Location', {opacity: .9});
  }

  // Save center locally
  mapInstance.value.on('moveend', () => {
    const center = mapInstance.value.getCenter()
    window.localStorage.setItem('center', [center.lat, center.lng].join(','))
  })

  // Save zoom level locally
  mapInstance.value.on('zoomend', () => {
    window.localStorage.setItem('zoom', mapInstance.value.getZoom())
  })

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
