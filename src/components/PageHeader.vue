<script setup>
defineProps({ eyebrow:String, title:String, subtitle:String })
</script>

<template>
  <div class="page-header row items-start justify-between q-col-gutter-md q-mb-lg">
    <div class="page-header__copy">
      <div v-if="eyebrow" class="section-label">{{ eyebrow }}</div>
      <h1 class="page-title">{{ title }}</h1>
      <div v-if="subtitle" class="page-subtitle">{{ subtitle }}</div>
    </div>
    <div class="page-header__actions"><slot/></div>
  </div>
</template>

<style scoped>
.page-header{padding:4px 0 2px}.page-header__copy{min-width:0;max-width:820px}.page-header__actions{display:flex;gap:9px;flex-wrap:wrap;justify-content:flex-end;min-width:0}.page-header__actions :deep(.q-btn){transition:transform .18s ease,background .18s ease,border-color .18s ease,box-shadow .18s ease}.page-header__actions :deep(.q-btn:hover){transform:translateY(-1px)}
@media(max-width:600px){.page-header{display:block}.page-header__copy{width:100%}.page-header__actions{width:100%;margin-top:16px;display:grid;grid-template-columns:1fr}.page-header__actions:empty{display:none}.page-header__actions :deep(.q-btn){width:100%;min-height:46px}.page-subtitle{overflow-wrap:anywhere}}
</style>
