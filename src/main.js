import './assets/main.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { Modal } from 'bootstrap'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
