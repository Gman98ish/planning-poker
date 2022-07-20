<script setup>
import Axios from 'axios';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { wsBroadcast, wsSubscribe, useWebSocket, wsId } from './websocket'
import Estimates from './Estimates.vue'
import { computed } from '@vue/reactivity';

const route = useRoute()
const sessionData = ref(null)
const error = ref('')
const name = ref('')
const joined = ref(false)
const estimate = ref(null)

useWebSocket(ws => {
  wsSubscribe(`sessions:${route.params.id}:joined`, e => {
    console.log('here')
    sessionData.value.participants.push(e.data)
  })

  wsSubscribe(`sessions:${route.params.id}:left`, e => {
    console.log("someone left cring")
    sessionData.value.participants = sessionData.value.participants.filter(
      participant => participant.id != e.data.id
    )
  })
  
  wsSubscribe(`sessions:${route.params.id}:reveal`, e => {
    sessionData.value.estimates = e.data.estimates
  })

  wsSubscribe(`sessions:${route.params.id}:reset`, e => {
    sessionData.value.estimates = {}
  })
})

onMounted(async () => {
  const res = await Axios.get('/api/sessions/' + route.params.id, {
    validateStatus: () => true
  })

  if (res.status == 404) {
    error.value = 'Session Not Found'
  }

  sessionData.value = res.data
})

const joinSession = async () => {
  await Axios.post(`/api/sessions/${route.params.id}/join`, { name: name.value, id: wsId })
  joined.value = true
}

const updateEstimate = value => {
  console.log({ value })
  estimate.value = value
  Axios.post(`/api/sessions/${route.params.id}/estimate`, { value, id: wsId })
}

const reveal = () => {
  Axios.post(`/api/sessions/${route.params.id}/reveal`)
}

const reset = () => {
  Axios.post(`/api/sessions/${route.params.id}/reset`)
}

const estimates = computed(() => Object.keys(sessionData.value.estimates).map(
  id => ({value: sessionData.value.estimates[id], id})
).filter(est => est.id != wsId))

</script>

<template>
  <div class="h-screen flex flex-col" v-if="sessionData">
    <div class="grow">
      <div class="mx-auto rounded p-4 shadow bg-white max-w-lg mt-20" v-if="!joined">
        <form @submit.prevent="joinSession">
          <label for="" class="font-bold block text-gray-800">Enter your name</label>
          <div class="flex mt-2">
            <input type="text" class="px-3 py-2 mr-2 w-full border border-gray-700 rounded shadow outline-none" v-model="name">
            <button class="px-4 py-2 border-2 border-blue-400 rounded text-blue-900">Join</button>
          </div>
        </form>

        <div class="mt-4 text-right">
        </div>
      </div>
      <div v-else class="h-full flex">
        <div class="m-auto w-full">
          <div class="flex justify-center">
            <div class="w-28 text-center mx-3 border-4 bg-white border-blue-500 rounded py-16 text-2xl relative">
              <div class="absolute top-0 text-center pt-3 w-full"> (You)</div>
              <div>{{ estimate || '?' }}</div>
            </div>
            <div class="w-28 text-center mx-3 border-4 border-blue-500 bg-blue-500 rounded py-16 text-2xl" v-for="participant in sessionData.participants" v-if="estimates.length == 0">
              <div class="text-white">{{ participant.name }}</div>
            </div>
            <div class="w-28 text-center mx-3 border-4 bg-white border-blue-500 rounded py-16 text-2xl" v-for="estimate in estimates" v-else>
              <div>{{ estimate.value }}</div>
            </div>
            
          </div>
          <div class="mt-10 justify-center flex">
            <button class="px-4 py-2 border-2 text-xl border-blue-400 rounded text-blue-900" @click="reveal" v-if="estimates.length == 0">Reveal</button>
            <button class="px-4 py-2 border-2 text-xl border-blue-400 rounded text-blue-900" @click="reset" v-else>Reset</button>
          </div>
        </div>
      </div>
    </div>
    <div class="flex-none mx-auto pb-3">
      <Estimates @click="updateEstimate" />
    </div>
  </div>
  <div v-else>
    <div class="text-red-500" v-if="error">Session not found</div>
  </div>
</template>