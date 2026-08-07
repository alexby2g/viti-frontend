<script setup>defineProps({eyebrow:String,title:String,subtitle:String})</script>
<template><div class="row items-start justify-between q-col-gutter-md q-mb-lg"><div><div v-if="eyebrow" class="section-label">{{eyebrow}}</div><h1 class="page-title">{{title}}</h1><div v-if="subtitle" class="page-subtitle">{{subtitle}}</div></div><div><slot/></div></div></template>
