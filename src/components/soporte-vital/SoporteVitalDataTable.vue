<script setup>
defineProps({
  rows:{type:Array,default:()=>[]},
  columns:{type:Array,default:()=>[]},
  empty:{type:String,default:'No hay registros.'},
  grid:{type:Boolean,default:false},
  readonly:{type:Boolean,default:false},
})
const emit=defineEmits(['view','edit','delete'])
</script>

<template>
  <q-table flat class="sv-table" :rows="rows" :columns="columns" row-key="id" :grid="grid" :pagination="{rowsPerPage:20}">
    <template #body-cell-estado="p"><q-td :props="p"><slot name="estado" :row="p.row" :value="p.value"><q-badge outline color="primary">{{p.value}}</q-badge></slot></q-td></template>
    <template #body-cell-total="p"><q-td :props="p"><slot name="total" :row="p.row" :value="p.value">{{p.value}}</slot></q-td></template>
    <template #body-cell-fecha="p"><q-td :props="p"><slot name="fecha" :row="p.row" :value="p.value">{{p.value}}</slot></q-td></template>
    <template #body-cell-actions="p"><q-td :props="p"><q-btn flat round dense color="primary" icon="visibility" @click="emit('view',p.row)"/><q-btn v-if="!readonly" flat round dense icon="edit" @click="emit('edit',p.row)"/><q-btn v-if="!readonly" flat round dense color="negative" icon="delete" @click="emit('delete',p.row)"/></q-td></template>
    <template #no-data><div class="empty full-width">{{empty}}</div></template>
  </q-table>
</template>

<style scoped>
.sv-table{border:1px solid var(--viti-border);border-radius:20px;overflow:hidden}.empty{padding:34px;text-align:center;color:var(--viti-muted)}
</style>