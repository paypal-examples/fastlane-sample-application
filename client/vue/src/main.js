import './assets/main.css'

import { createHead } from 'unhead'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const head = createHead()

app.use(head)
app.use(router)

app.mount('#app')
