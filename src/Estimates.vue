<script setup>
const debug = i => $emi
</script>

<template>
  <div class="flex px-auto">
    <div @click.stop="$emit('click', i)" v-for="i in [1,2,3,5,8,13,21]" class="w-28 text-center mx-4 border-4 bg-white border-blue-500 rounded py-16 text-2xl">
      {{ i }}
    </div>
  </div>
</template>
