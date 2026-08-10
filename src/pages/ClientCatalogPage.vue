<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router=useRouter()
onMounted(()=>router.replace('/mi-aplicaciones'))
</script>

<template><q-page class="viti-page"><q-inner-loading showing label="Abriendo tus aplicaciones..."/></q-page></template>
