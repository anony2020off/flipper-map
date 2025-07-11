<template>
  <div id="map" class="map-container"></div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, toRaw, watch } from 'vue';
import { useLocationStore } from "@/stores/location.js";
import { useFlipperStore } from "@/stores/flipper.js";

const props = defineProps({
  pins: {
    type: Array,
    required: true
  },
  searchQuery: {
    type: String,
    default: ''
  },
  selectedPin: {
    type: Object,
    default: null
  }
});

const map = ref(null);
const clusters = ref(null);
const markers = ref({});
const userMarker = ref(null);
const defaultZoom = 15;

const location = useLocationStore()
const flipper = useFlipperStore()

onMounted(async () => {

  map.value = L.map('map', {
    center: window.localStorage.getItem('center')?.split(',') ?? [25, 0],
    zoom: window.localStorage.getItem('zoom') ?? 2,
    zoomControl: true,
    worldCopyJump: true
  });

  const flag = `
    <svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-ge" viewBox="0 0 640 480" width="12" height="8" class="leaflet-attribution-flag">
      <path fill="#fff" d="M0 0h640v480H0z"/><path fill="red" d="M272 0h96v480h-96z"/><path fill="red" d="M0 192h640v96H0z"/>
      <path fill="red" fill-rule="evenodd" d="M146.8 373.1c1-16.8 4-31.1 4-31.1s-9.8 1-14.8 1-14.8-1-14.8-1 3 14.3 4 31.2c-16.9-1-31.2-4-31.2-4s1 7.4 1 14.8-1 14.8-1 14.8 14.3-3 31.2-4c-1 16.9-4 31.2-4 31.2s7.4-1 14.8-1 14.8 1 14.8 1-3-14.3-4-31.2c16.9 1 31.2 4 31.2 4s-1-9.8-1-14.8 1-14.8 1-14.8-14.3 3-31.1 4zm368-288c1-16.8 4-31.1 4-31.1s-9.8 1-14.8 1-14.8-1-14.8-1 3 14.3 4 31.1c-16.9-1-31.2-3.9-31.2-3.9s1 7.4 1 14.8-1 14.8-1 14.8 14.3-3 31.2-4c-1 16.9-4 31.2-4 31.2s7.4-1 14.8-1 14.8 1 14.8 1-3-14.3-4-31.1c16.9 1 31.2 4 31.2 4s-1-10-1-14.9 1-14.8 1-14.8-14.3 3-31.2 4zm-368 0c1-16.8 4-31.1 4-31.1s-9.8 1-14.8 1-14.8-1-14.8-1 3 14.3 4 31.2c-16.9-1-31.2-4-31.2-4s1 7.4 1 14.8-1 14.8-1 14.8 14.3-3 31.2-4c-1 16.9-4 31.2-4 31.2s7.4-1 14.8-1 14.8 1 14.8 1-3-14.3-4-31.1c16.9 1 31.2 4 31.2 4s-1-9.8-1-14.8 1-14.8 1-14.8-14.3 3-31.1 4zm368 288c1-16.8 4-31.1 4-31.1s-9.8 1-14.8 1-14.8-1-14.8-1 3 14.3 4 31.2c-16.9-1-31.2-4-31.2-4s1 7.4 1 14.8-1 14.8-1 14.8 14.3-3 31.2-4c-1 16.9-4 31.2-4 31.2s7.4-1 14.8-1 14.8 1 14.8 1-3-14.3-4-31.2c16.9 1 31.2 4 31.2 4s-1-9.8-1-14.8 1-14.8 1-14.8-14.3 3-31.2 4z"/>
    </svg>`;

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '<span>Made in ' + flag + ' with <span class="text-danger">&hearts;</span> by <a href="https://stichoza.com">Stichoza</a></span>',
    maxZoom: 19
  }).addTo(toRaw(map.value));

  // Clusters
  clusters.value = L.markerClusterGroup({
    maxClusterRadius: zoom => zoom < 3 ? 40 : 30,
    animateAddingMarkers: true,
    disableClusteringAtZoom: 17
  }).addTo(toRaw(map.value));

  // Move to current location
  if (location.geolocationSupported()) {
    L.easyButton({
      position: 'topleft',
      states: [
        {
          stateName: 'geolocation-button',
          title: 'Center map to current location',
          icon: 'fa-location-crosshairs fa-lg',
          onClick: async () => {
            await location.getUserLocation();
            const { latitude, longitude } = location.userLocation;
            toRaw(map.value).flyTo([latitude, longitude], defaultZoom);
          },
        },
      ],
    }).addTo(toRaw(map.value))
  }

  L.easyButton({
    position: 'topleft',
    states: [
      {
        stateName: 'clustering-button',
        title: 'Toggle clustering',
        icon: 'fa-circle-nodes fa-lg',
        onClick: async () => {
          // TODO: Toggle clustering
        },
      },
    ],
  }).addTo(toRaw(map.value))

  let centerWasSet = false;

  // Center map to last known coordinates and zoom level
  if (window.localStorage.getItem('center')) {
    centerWasSet = true;
    map.value.setView(
      window.localStorage.getItem('center')?.split(',') ?? [25, 0],
      window.localStorage.getItem('zoom') ?? defaultZoom
    );
  }

  // Set user location marker
  if (location.geolocationSupported()) {

    await location.getUserLocation();
    const { latitude, longitude } = location.userLocation;

    if (!centerWasSet) {
      map.value.setView([latitude, longitude], defaultZoom);
    }

    const pulsingIcon = L.divIcon({
      className: 'user-location-marker',
      html: '<div class="pulse"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    userMarker.value = L.marker([latitude, longitude], { icon: pulsingIcon })
      .addTo(toRaw(map.value))
      .bindTooltip('Your Location', {opacity: .9});
  }

  // Save center locally
  map.value.on('moveend', () => {
    const center = map.value.getCenter()
    window.localStorage.setItem('center', [center.lat, center.lng].join(','))
  })

  // Save zoom level locally
  map.value.on('zoomend', () => {
    window.localStorage.setItem('zoom', map.value.getZoom())
  })

});

const clearMarkers = () => {
  markers.value.forEach(marker => {
    marker.remove();
  });
  markers.value = [];
};

const createMarker = file => {
  const color = flipper.getFileColor(file.type);
  const icon = flipper.getFileIcon(file.type);

  return L.marker([file.latitude, file.longitude], {
    title: file.name,
    riseOnHover: true,
    icon: L.divIcon({
      className: 'custom-map-marker',
      html: `<div style="background-color: ${color}"><i class="fas fa-${icon}"></i></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    }),
  });
}

const addMarkers = () => {
  const existingPins = Object.keys(markers.value);

  props.pins.forEach(file => {
    if (!existingPins.includes(file.hash) && file.latitude && file.longitude) {
      markers.value[file.hash] = createMarker(file).addTo(toRaw(clusters.value));
    }
  });
}

watch(() => props.pins, () => {
  if (map.value) {
    addMarkers();
  }
}, { deep: true });

onUnmounted(() => {
  if (map.value) {
    map.value.remove();
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

:deep(.custom-map-marker > div) {
  transition: .1s ease transform;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  text-align: center;
  color: #fff;
  border: 2px solid #fff;
  border-radius: 50%;
  box-sizing: border-box;
}

:deep(.custom-map-marker > div i) {
  font-size: 12px;
}

:deep(.custom-map-marker:hover > div) {
  transform: scale(1.25);
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
