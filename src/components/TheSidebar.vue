<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useFlipperStore } from '@/stores/flipper.js';
import { notify } from '@/helpers/notification.js';
import { openDB } from 'idb';

const props = defineProps({
  pins: Array,
  searchQuery: String,
  selectedPin: Object
});
const emit = defineEmits(['search', 'select-pin']);
const flipper = useFlipperStore();
const searchInput = ref(props.searchQuery);

const expandedImage = ref(null);
let db;

const imageMap = ref(new Map());

const availableTypes = ['subghz', 'wifi', 'nfc', 'lfrfid'];
const selectedTypes = ref(new Set());
const typeIcons = {
  subghz: ['fas', 'fa-wave-square'],
  wifi: ['fas', 'fa-wifi'],
  nfc: ['fab', 'fa-nfc-symbol'],
  lfrfid: ['fas', 'fa-microchip']
};

const toggleTypeFilter = (type) => {
  selectedTypes.value.has(type)
    ? selectedTypes.value.delete(type)
    : selectedTypes.value.add(type);
};

const isTypeSelected = (type) => selectedTypes.value.has(type);

const typeCounts = computed(() => {
  const counts = {};
  for (const type of availableTypes) counts[type] = 0;
  for (const pin of props.pins) {
    const type = pin.type?.toLowerCase();
    if (type && counts[type] !== undefined) counts[type]++;
  }
  return counts;
});

const availableSubghzFolders = computed(() => {
  const folders = new Set();
  for (const pin of props.pins) {
    if (pin.path?.startsWith('/ext/subghz/')) {
      const parts = pin.path.split('/');
      if (parts.length > 3) folders.add(parts[3]);
    }
  }
  return [...folders].sort();
});

const selectedFolder = ref(null);
const toggleFolderFilter = (folder) => {
  selectedFolder.value = selectedFolder.value === folder ? null : folder;
};

const filteredPins = computed(() => {
  return props.pins.filter(pin => {
    const matchesSearch = pin.name.toLowerCase().includes(searchInput.value.toLowerCase());
    const matchesType = selectedTypes.value.size === 0 || selectedTypes.value.has(pin.type?.toLowerCase());
    const matchesFolder = !selectedFolder.value || (pin.path?.startsWith('/ext/subghz/' + selectedFolder.value + '/'));
    return matchesSearch && matchesType && matchesFolder;
  });
});

const initDB = async () => {
  db = await openDB('flipper-images', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images');
      }
    }
  });
  await loadImagesFromIndexedDB();
};

const saveImageToDB = async (hash, dataUrl) => {
  await db.put('images', dataUrl, hash);
  imageMap.value.set(hash, dataUrl);
};

const loadImagesFromIndexedDB = async () => {
  const map = new Map();
  for (const pin of props.pins) {
    const dataUrl = await db.get('images', pin.hash);
    if (dataUrl) {
      map.set(pin.hash, dataUrl);
    }
  }
  imageMap.value = map;
};

const handleFlipperConnection = async () => {
  flipper.isConnected ? flipper.disconnect() : flipper.connect();
};

const handleSearch = () => emit('search', searchInput.value);
const handleSelectPin = (pin) => emit('select-pin', pin);

const selectImageForPin = (pin) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      await saveImageToDB(pin.hash, dataUrl);
    };
    reader.readAsDataURL(file);
  };
  input.click();
};
const deleteImageForPin = async (pin) => {
  await db.delete('images', pin.hash);
  imageMap.value.delete(pin.hash);
};
watch(() => flipper.isSyncing, async (syncing) => {
  if (!syncing) {
    notify(`${props.pins.length || 'No'} files discovered`, 'success');
    await loadImagesFromIndexedDB();
  }
});

onMounted(initDB);
</script>



<template>
  <div class="sidebar border-end d-flex flex-column">
    <div class="sidebar-header">
      <div class="bg-primary text-white p-3 d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center gap-2">
          <div class="d-flex align-items-center justify-content-center bg-white rounded-circle p-1 size-36">
            <i class="fas fa-location-dot text-primary fs-5" />
          </div>
          <h1 class="mb-0 h2 pixel-font">Flipper Map</h1>
        </div>
        <button
          :disabled="flipper.isConnecting"
          :class="['btn btn-sm d-flex align-items-center gap-1', flipper.isConnected ? 'btn-light' : 'btn-light']"
          @click="handleFlipperConnection"
        >
          <i :class="['fas', flipper.isSyncing ? 'fa-sync fa-spin' : (flipper.isConnected ? 'fa-check' : (flipper.isConnecting ? 'fa-spinner fa-spin' : 'fa-plug'))]" />
          <span>{{ flipper.isSyncing ? 'Syncing' : (flipper.isConnected ? 'Connected' : (flipper.isConnecting ? 'Connecting' : 'Connect')) }}</span>
        </button>
      </div>
    </div>

    <div :class="['p-3', { 'border-bottom': !selectedTypes.has('subghz') }]">
      <div class="dropdown">
        <button
          class="btn btn-outline-primary dropdown-toggle w-100"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          Filter by Type <span v-if="selectedTypes.size">({{ selectedTypes.size }})</span>
        </button>
        <ul class="dropdown-menu w-100 p-2" style="max-height: 300px; overflow-y: auto;margin:40px;">
          <li
            v-for="type in availableTypes"
            :key="type"
            class="form-check dropdown-item"
            style="cursor: pointer;"
            @click.stop
          >
            <input
              class="form-check-input me-2"
              type="checkbox" style="margin-left:-10px;"
              :id="'filter-' + type"
              :checked="isTypeSelected(type)"
              @change="toggleTypeFilter(type)"
            />
            <label class="form-check-label text-capitalize d-flex align-items-center gap-2" :for="'filter-' + type">
              <i :class="typeIcons[type]" />
              {{ type }} <span class="text-muted small">({{ typeCounts[type] || 0 }})</span>
            </label>
          </li>
        </ul>
      </div>
    </div>
    <div v-if="selectedTypes.has('subghz')" class="p-3 border-bottom">
      <div class="dropdown">
        <button
          class="btn btn-outline-secondary dropdown-toggle w-100"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          SubGhz Folder: {{ selectedFolder || 'All' }}
        </button>
        <ul class="dropdown-menu w-100 p-2" style="max-height: 300px; overflow-y: auto; margin:40px;">
          <li class="dropdown-item" @click="selectedFolder = null" style="cursor: pointer;">
            <strong>All</strong>
          </li>
          <li
            v-for="folder in availableSubghzFolders"
            :key="folder"
            class="dropdown-item"
            style="cursor: pointer;"
            :class="{ 'fw-bold': folder === selectedFolder }"
            @click="toggleFolderFilter(folder)"
          >
            {{ folder }}
          </li>
        </ul>
      </div>
    </div>
    <div class="sidebar-search p-3 border-bottom">
      <div class="position-relative">
        <span class="position-absolute top-50 start-0 translate-middle-y ms-3">
          <i class="fas fa-search text-muted" />
        </span>
        <input
          v-model="searchInput"
          type="text"
          class="form-control ps-5"
          :placeholder="`Search${flipper.fileList.length ? ' ' + flipper.fileList.length + ' pins' : ''}...`"
          @input="handleSearch"
        >
      </div>
    </div>

    <div class="sidebar-content flex-grow-1 overflow-auto">
      <div
        v-if="filteredPins.length === 0"
        class="d-flex flex-column align-items-center justify-content-center py-5"
      >
        <div v-if="!flipper.isConnected">
          <p class="text-muted small">Connect Flipper to see files.</p>
          <div class="mt-5 text-center">
            <a
              href="#"
              class="btn btn-sm btn-link text-decoration-none"
              data-bs-toggle="modal"
              data-bs-target="#helpModal"
            >
              <i class="fas fa-question-circle" /> Help
            </a>
          </div>
        </div>
        <p v-else-if="flipper.isSyncing">
          <span class="text-muted small">Syncing...</span>
        </p>
        <p v-else>
          <span class="text-muted small">No files found.</span>
        </p>
      </div>

      <div v-else>
        <div class="list-group list-group-flush">
          <a
            v-for="pin in filteredPins"
            :key="pin.hash + '-' + (pin._refreshKey || 0)"
            href="#"
            class="list-group-item list-group-item-action px-3 py-3 overflow-hidden"
            :class="{'bg-body-secondary': selectedPin && selectedPin.hash === pin.hash}"
            @click.prevent="handleSelectPin(pin)"
          >
            <div class="d-flex align-items-center">
              <div
                class="d-flex align-items-center justify-content-center rounded-circle shadow-sm flex-shrink-0 size-46"
                :class="'bg-' + pin.type"
              >
                <i :class="['fas', 'fa-' + flipper.getFileIcon(pin.type), 'text-white']" />
              </div>
              <div
                class="flex-grow-1 min-width-0 mx-3 overflow-hidden"
                :class="pin.distance ? '' : 'opacity-75'"
              >
                <span class="d-block fw-medium small text-truncate">{{ pin.name }}</span>
                <div v-if="imageMap.get(pin.hash)" class="mt-1">
                  <img
                    :src="imageMap.get(pin.hash)"
                    alt="Pin image"
                    class="img-thumbnail"
                    style="max-width: 100%; max-height: 60px; cursor: zoom-in;"
                    @click.stop="expandedImage = imageMap.get(pin.hash)"
                  />
                </div>
                <div class="text-muted small d-flex align-items-center text-truncate">
                  <div v-if="pin.distance">
                    <i class="fas fa-location-dot me-1 small flex-shrink-0" />
                    <span class="text-truncate">{{ pin.distanceText }} away</span>
                  </div>
                  <div v-else>
                    <i class="fas fa-location-pin-lock me-1 small flex-shrink-0" />
                    <span class="text-truncate">No location</span>
                  </div>
                </div>
              </div>
              <div class="flex-shrink-0">
                <i
                  class="fas fa-image text-muted ms-2"
                  title="Add/Replace image"
                  @click.stop="selectImageForPin(pin)"
                  style="cursor: pointer"
                />
                <i
                  v-if="imageMap.has(pin.hash)"
                  class="fas fa-trash text-danger ms-2"
                  title="Remove image"
                  @click.stop="deleteImageForPin(pin)"
                  style="cursor: pointer"
                />
                <i v-if="pin.distance" class="fas fa-chevron-right text-muted" style="margin-left:5px;"/>
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  </div>

  <!-- MODAL -->
  <div
    v-if="expandedImage"
    class="modal-backdrop show"
    @click="expandedImage = null"
    style="z-index: 1050; position: fixed; inset: 0; background: rgba(0,0,0,1); display: flex; align-items: center; justify-content: center;"
  >
    <img
      :src="expandedImage"
      class="img-fluid rounded shadow-lg"
      style="max-height: 90vh; max-width: 90vw; cursor: zoom-out;"
    />
  </div>
</template>