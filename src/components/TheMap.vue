<script setup>
import { onMounted, onUnmounted, ref, toRaw, watch } from 'vue';
import { useLocationStore } from '@/stores/location.js';
import { useFlipperStore } from '@/stores/flipper.js';
import { notify } from '@/helpers/notification';
import L from 'leaflet';
import 'leaflet-easybutton';
import 'leaflet.marker.slideto';
import 'leaflet.markercluster';

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

const emit = defineEmits(['select-pin']);

const map = ref(null);
const clusters = ref(null);
const markers = ref({});
const userMarker = ref(null);
const defaultZoom = 17;

const location = useLocationStore()
const flipper = useFlipperStore()

onMounted(async () => {
  
  const flag = `
    <svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-ge" viewBox="0 0 640 480" width="12" height="8" class="leaflet-attribution-flag">
      <path fill="#fff" d="M0 0h640v480H0z"/><path fill="red" d="M272 0h96v480h-96z"/><path fill="red" d="M0 192h640v96H0z"/>
      <path fill="red" fill-rule="evenodd" d="M146.8 373.1c1-16.8 4-31.1 4-31.1s-9.8 1-14.8 1-14.8-1-14.8-1 3 14.3 4 31.2c-16.9-1-31.2-4-31.2-4s1 7.4 1 14.8-1 14.8-1 14.8 14.3-3 31.2-4c-1 16.9-4 31.2-4 31.2s7.4-1 14.8-1 14.8 1 14.8 1-3-14.3-4-31.2c16.9 1 31.2 4 31.2 4s-1-9.8-1-14.8 1-14.8 1-14.8-14.3 3-31.1 4zm368-288c1-16.8 4-31.1 4-31.1s-9.8 1-14.8 1-14.8-1-14.8-1 3 14.3 4 31.1c-16.9-1-31.2-3.9-31.2-3.9s1 7.4 1 14.8-1 14.8-1 14.8 14.3-3 31.2-4c-1 16.9-4 31.2-4 31.2s7.4-1 14.8-1 14.8 1 14.8 1-3-14.3-4-31.1c16.9 1 31.2 4 31.2 4s-1-10-1-14.9 1-14.8 1-14.8-14.3 3-31.2 4zm-368 0c1-16.8 4-31.1 4-31.1s-9.8 1-14.8 1-14.8-1-14.8-1 3 14.3 4 31.2c-16.9-1-31.2-4-31.2-4s1 7.4 1 14.8-1 14.8-1 14.8 14.3-3 31.2-4c-1 16.9-4 31.2-4 31.2s7.4-1 14.8-1 14.8 1 14.8 1-3-14.3-4-31.1c16.9 1 31.2 4 31.2 4s-1-9.8-1-14.8 1-14.8 1-14.8-14.3 3-31.1 4zm368 288c1-16.8 4-31.1 4-31.1s-9.8 1-14.8 1-14.8-1-14.8-1 3 14.3 4 31.2c-16.9-1-31.2-4-31.2-4s1 7.4 1 14.8-1 14.8-1 14.8 14.3-3 31.2-4c-1 16.9-4 31.2-4 31.2s7.4-1 14.8-1 14.8 1 14.8 1-3-14.3-4-31.2c16.9 1 31.2 4 31.2 4s-1-9.8-1-14.8 1-14.8 1-14.8-14.3 3-31.2 4z"/>
    </svg>`;
  
  const attribution = '<span>Made in ' + flag + ' by <a href="https://stichoza.com">Stichoza</a></span>';
  
  const layers = {
    'Normal': L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a> | ' + attribution,
      subdomains: 'abcd',
      maxZoom: 20
    }),
    'Light': L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a> | ' + attribution,
      subdomains: 'abcd',
      maxZoom: 20
    }),
    'Dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a> | ' + attribution,
      subdomains: 'abcd',
      maxZoom: 20
    }),
    'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; <a href="https://www.esri.com/en-us/arcgis/products/arcgis-online/basemaps" target="_blank" rel="noopener">ESRI</a> | ' + attribution,
      maxZoom: 19
    }),
  };
  
  const baseLayer = window.localStorage.getItem('baseLayer') ?? 'Normal';
  
  map.value = L.map('map', {
    center: window.localStorage.getItem('center')?.split(',') ?? [25, 0],
    zoom: window.localStorage.getItem('zoom') ?? 2,
    zoomControl: true,
    worldCopyJump: true,
    layers: layers[baseLayer] ?? layers['Normal'], // In case old naming is stuck in local storage
  });
  
  // Clusters
  clusters.value = L.markerClusterGroup({
    maxClusterRadius: zoom => zoom < 3 ? 40 : 30,
    animateAddingMarkers: true,
    disableClusteringAtZoom: 17
  }).addTo(toRaw(map.value));
  
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
          toRaw(map.value).flyTo([latitude, longitude], Math.max(defaultZoom, map.value.getZoom()));
        },
      },
      ],
    }).addTo(toRaw(map.value))
    
    await location.getUserLocation();
    const { latitude, longitude } = location.userLocation;
    
    if (!centerWasSet) {
      map.value.setView([latitude, longitude], defaultZoom);
    }
    
    const pulsingIcon = L.divIcon({
      className: 'user-location-marker',
      html: '<div class="pulse"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      tooltipAnchor: [0, -12],
    });
    
    userMarker.value = L.marker([latitude, longitude], { icon: pulsingIcon })
    .addTo(toRaw(map.value))
    .bindTooltip('Your Location', { direction: 'top' });
    
    // Update user marker location over time
    setInterval(async () => {
      try {
        await location.getUserLocation();
        const { latitude, longitude } = location.userLocation;
        toRaw(userMarker.value).slideTo([latitude, longitude], {duration: 3000});
      } catch (error) {
        console.error('Error getting user location update');
      }
    }, 3000);
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
  
  map.value.on('baselayerchange', (e) => {
    window.localStorage.setItem('baseLayer', e.name);
    document.body.setAttribute('data-bs-theme', e.name.toLowerCase().includes('dark') ? 'dark' : 'light');
  })
  
  // Initial selection
  document.body.setAttribute('data-bs-theme', baseLayer.toLowerCase().includes('dark') ? 'dark' : 'light');
  
  map.value.on('popupclose', () => {
    emit('select-pin', null);
  });
  
  // L.easyButton({
  //   position: 'topleft',
  //   states: [
  //   {
  //     stateName: 'clustering-button',
  //     title: 'Toggle clustering',
  //     icon: 'fa-circle-nodes fa-lg',
  //     onClick: async () => {
  //       // TODO: Toggle clustering
  //     },
  //   },
  //   ],
  // }).addTo(toRaw(map.value))
  
  L.control.layers(layers).addTo(toRaw(map.value));
  
  watch(() => props.selectedPin, () => {
    if (props.selectedPin) {
      toRaw(map.value).flyTo([props.selectedPin.latitude, props.selectedPin.longitude], defaultZoom, {duration: 0.5}); // Limit duration to make sure popup is able to open
      setTimeout(() => {
        toRaw(markers.value[props.selectedPin.hash]).openPopup();
      }, 1000);
    }
  });
  
});

const clearMarkers = () => {
  markers.value.forEach(marker => {
    marker.remove();
  });
  markers.value = [];
};

const createMarker = file => {
  const icon = flipper.getFileIcon(file.type);
  const cleanContent = file.content.replace(/^(>|size:).*$/gmi, '').trim();
  const key = file.key.replace(/00\s/g, '');
  const frequency = file.content.match(/frequency:\s*(\d+)/i)?.[1];
  const protocol = file.content.match(/protocol:\s*(.+)/i)?.[1];
  const bit = file.content.match(/bit:\s*(.+)/i)?.[1];
  const uid = file.content.match(/uid:\s*(.+)/i)?.[1];
  const keyType = file.content.match(/key type:\s*(.+)/i)?.[1];
  const data = file.content.match(/data:\s*(.+)/i)?.[1]; // Show only with keyType (RFID), otherwise it will display RAW SubGHz data
  const type = {subghz: 'Sub-GHz', nfc: 'NFC', rfid: 'RFID'}[file.type] ?? file.type;
  const isUnknown = file.name.startsWith('_') || file.name.startsWith('UNK '); // For my personal use case ¯\_(ツ)_/¯
  
  return L.marker([file.latitude, file.longitude], {
    title: file.name,
    riseOnHover: true,
    icon: L.divIcon({
      className: 'custom-map-marker',
      html: `<div class="bg-${file.type}${isUnknown ? ' opacity-75' : ''}"><i class="fas fa-${icon}"></i></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    }),
  })
  .bindPopup(`<div class="custom-popup">
      <div class="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom">
        <div class="flex-shrink-0 rounded-circle d-flex justify-content-center align-items-center bg-${file.type} size-24">
          <i class="fas fa-${icon} text-white"></i>
        </div>
        <h6 class="m-0 flex-grow-1 text-truncate">${file.name}</h6>
      </div>

      ${file.image ? `<div class="mb-2"><img src="${file.image}" alt="Signal Image" class="img-fluid rounded shadow-sm" style="max-height: 180px; max-width: 100%;" /></div>` : ''}

      <div>
        <div class="mb-1"><strong>Type:</strong> ${type}</div>
        ${frequency ? `<div class="mb-1"><strong>Frequency:</strong> ${frequency/1000000} MHz</div>` : ''}
        ${protocol ? `<div class="mb-1"><strong>Protocol:</strong> ${protocol} ${bit ? `(${bit} bit)` : ''}</div>` : ''}
        ${key ? `<div class="mb-1"><strong>Key:</strong> ${key}</div>` : ''}
        ${uid ? `<div class="mb-1"><strong>UID:</strong> ${uid}</div>` : ''}
        ${keyType ? `<div class="mb-1"><strong>Key Type:</strong> ${keyType}</div>` : ''}
        ${keyType && data ? `<div class="mb-1"><strong>Data:</strong> ${data}</div>` : ''}
        <div class="mb-1"><strong>Distance:</strong> <span class="popup-distance-text">${file.distanceText}</span></div>
        <div class="mb-1"><strong>Path:</strong> ${file.path}</div>
      </div>

      <details>
        <summary><strong>File content</strong></summary>
        <pre class="mt-2 card p-2 bg-body-secondary" style="max-height: 210px">${cleanContent}</pre>
      </details>

      <div class="mt-2">
        <button class="btn btn-sm btn-secondary w-100 d-flex align-items-center" onclick="jsLaunchFile('${file.hash}')" title="Flipper must be unlocked and apps should not be running">
          <span class="flex-grow-1 ps-3">Open on Flipper</span>
          <i class="fas fa-square-arrow-up-right pull-right"></i>
        </button>
      </div>
    </div>`, {
    closeButton: false,
    autoPanPadding: [60, 20],
    customHash: file.hash // Used for dynamically updating distance in popup content
  }).on('popupopen', (e) => {
    const popup = e.popup;
    const file = props.pins.find(file => file.hash === popup.options.customHash);

    if (file) {
      const distanceText = file.distanceText;
      popup.getElement().querySelector('.popup-distance-text').textContent = distanceText;
    }
  })
}

const addMarkers = () => {
  const existingPins = Object.keys(markers.value);
  
  props.pins.forEach(file => {
    if (!existingPins.includes(file.hash) && file.latitude && file.longitude) {
      markers.value[file.hash] = createMarker(file).addTo(toRaw(clusters.value));
    }
  });
}

window.jsLaunchFile = (hash) => {
  if (flipper.isSyncing) {
    notify('Please wait until sync is complete', 'warning');
  } else if (!flipper.isConnected) {
    notify('Please connect your Flipper', 'error');
  } else {
    const file = flipper.fileByHash(hash);
    flipper.launchFile(file);
  }
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

<template>
  <div
    id="map"
    class="map-container w-100 h-100"
  />
</template>
