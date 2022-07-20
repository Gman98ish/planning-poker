import 'vite/modulepreload-polyfill'
import { createApp } from 'vue'
import './index.css'
import App from './App.vue'
import Session from './Session.vue'
import Home from './Home.vue'
import './websocket'
import 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home},
    { path: '/session/:id', component: Session },
  ]
})

const vue = createApp(App)
vue.use(router)
vue.mount('#app')