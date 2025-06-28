<template>
  <div class="position-fixed top-0 start-0 end-0 bottom-0 bg-dark bg-opacity-75 d-flex justify-content-center align-items-center" style="z-index: 9999;" v-if="isLoading">
    <div class="text-center">
      <div class="spinner-border text-light" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p class="mt-3 text-white fw-medium">{{ message || 'Loading...' }}</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isLoading: {
    type: Boolean,
    default: false
  },
  message: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
/* Bootstrap provides all the necessary styles */
</style>
