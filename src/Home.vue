<script setup>
import Axios from 'axios'
import { useRouter } from 'vue-router';

const router = useRouter()

const startNewSession = async () => {
  const res = await Axios.post('/api/new-session')

  router.replace('/session/' + res.data.id)
}

</script>

<template>
  <div class="flex h-screen bg-gray-200">
    <div class="m-auto">
      <button @click="startNewSession" class="rounded bg-blue-700 text-xl font-medium text-white px-5 py-3">Start New Session</button>
    </div>
  </div> 
</template>
