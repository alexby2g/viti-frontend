<script setup>
const props=defineProps({
  rows:{type:Array,default:()=>[]},
  columns:{type:Array,default:()=>[]},
  empty:{type:String,default:'No hay registros.'},
  grid:{type:Boolean,default:false},
  readonly:{type:Boolean,default:false},
  viewable:{type:Boolean,default:true},
  editable:{type:Boolean,default:true},
  deletable:{type:Boolean,default:true},
})
const emit=defineEmits(['view','edit','delete'])
const locked=row=>props.readonly||['entregado','sin_reparacion'].includes(row?.estado)||Boolean(row?.garantia_fin)
const canEdit=row=>props.editable&&!locked(row)
const canDelete=row=>props.deletable&&!locked(row)
const dataCols=cols=>cols.filter(col=>col.name!=='actions')
</script>

<template>
  <q-table flat class="sv-table" :rows="rows" :columns="columns" row-key="id" :grid="grid" :pagination="{rowsPerPage:20}">
    <template #body-cell-estado="p"><q-td :props="p"><slot name="estado" :row="p.row" :value="p.value"><q-badge outline color="primary">{{p.value}}</q-badge></slot></q-td></template>
    <template #body-cell-total="p"><q-td :props="p"><slot name="total" :row="p.row" :value="p.value">{{p.value}}</slot></q-td></template>
    <template #body-cell-fecha="p"><q-td :props="p"><slot name="fecha" :row="p.row" :value="p.value">{{p.value}}</slot></q-td></template>
    <template #body-cell-actions="p"><q-td :props="p"><q-btn v-if="viewable" flat round dense color="primary" icon="visibility" @click="emit('view',p.row)"/><q-btn v-if="canEdit(p.row)" flat round dense icon="edit" @click="emit('edit',p.row)"/><q-btn v-if="canDelete(p.row)" flat round dense color="negative" icon="delete" @click="emit('delete',p.row)"/></q-td></template>

    <template #item="p">
      <div class="q-pa-xs col-12">
        <q-card flat class="mobile-row">
          <q-card-section>
            <div v-for="(col,index) in dataCols(p.cols)" :key="col.name" :class="index===0?'mobile-title':'mobile-field'">
              <template v-if="index===0"><span>{{col.value ?? '—'}}</span></template>
              <template v-else>
                <span class="mobile-label">{{col.label}}</span>
                <span v-if="col.name==='estado'"><slot name="estado" :row="p.row" :value="col.value"><q-badge outline color="primary">{{col.value}}</q-badge></slot></span>
                <span v-else-if="col.name==='total'"><slot name="total" :row="p.row" :value="col.value">{{col.value}}</slot></span>
                <span v-else-if="col.name==='fecha'"><slot name="fecha" :row="p.row" :value="col.value">{{col.value}}</slot></span>
                <span v-else>{{col.value ?? '—'}}</span>
              </template>
            </div>
          </q-card-section>
          <q-separator v-if="columns.some(col=>col.name==='actions')"/>
          <q-card-actions v-if="columns.some(col=>col.name==='actions')" align="right">
            <q-btn v-if="viewable" flat round color="primary" icon="visibility" @click="emit('view',p.row)"/>
            <q-btn v-if="canEdit(p.row)" flat round icon="edit" @click="emit('edit',p.row)"/>
            <q-btn v-if="canDelete(p.row)" flat round color="negative" icon="delete" @click="emit('delete',p.row)"/>
          </q-card-actions>
        </q-card>
      </div>
    </template>

    <template #no-data><div class="empty full-width">{{empty}}</div></template>
  </q-table>
</template>

<style scoped>
.sv-table{border:1px solid var(--viti-border);border-radius:20px;overflow:hidden}.empty{padding:34px;text-align:center;color:var(--viti-muted)}.mobile-row{border:1px solid var(--viti-border);border-radius:16px}.mobile-title{font-size:16px;font-weight:800;margin-bottom:10px}.mobile-field{display:flex;justify-content:space-between;gap:14px;padding:4px 0;font-size:13px}.mobile-label{color:var(--viti-muted);font-weight:600}
</style>
