<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'

const $q=useQuasar(),base='/mi/apps/peluqueria'
const tab=ref('productos'),loading=ref(false),productos=ref([]),movimientos=ref([]),dialog=ref(false),editing=ref(null),movementDialog=ref(false)
const form=reactive({nombre:'',categoria:'',tipo:'mixto',unidad:'unidad',stock:0,stock_minimo:0,costo:null,precio_venta:null,descripcion:'',activo:true})
const move=reactive({producto_id:null,tipo:'entrada',cantidad:1,costo_unitario:null,precio_unitario:null,motivo:''})
const productOptions=computed(()=>productos.value.filter(x=>x.activo).map(x=>({label:x.nombre,value:x.id})))
const money=v=>v===null||v===undefined?'—':`${Number(v||0).toFixed(2)} Bs`
const pretty=v=>String(v||'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase())
const stockLow=p=>Number(p.stock||0)<=Number(p.stock_minimo||0)
const error=(e,m='No se pudo completar la operación.')=>$q.notify({type:'negative',message:e.response?.data?.message||m})
async function load(){loading.value=true;try{const [p,m]=await Promise.all([api.get(`${base}/productos`),api.get(`${base}/productos-movimientos`)]);productos.value=p.data.data||[];movimientos.value=m.data.data||[]}catch(e){error(e,'No se pudo cargar Productos.')}finally{loading.value=false}}
function open(row=null){editing.value=row;Object.assign(form,{nombre:'',categoria:'',tipo:'mixto',unidad:'unidad',stock:0,stock_minimo:0,costo:null,precio_venta:null,descripcion:'',activo:true},row||{});dialog.value=true}
async function save(){try{editing.value?await api.put(`${base}/productos/${editing.value.id}`,form):await api.post(`${base}/productos`,form);dialog.value=false;$q.notify({type:'positive',message:'Producto guardado.'});await load()}catch(e){error(e)}}
function remove(row){$q.dialog({title:'Confirmar',message:'¿Eliminar este producto?',cancel:true,persistent:true}).onOk(async()=>{try{await api.delete(`${base}/productos/${row.id}`);await load()}catch(e){error(e)}})}
function openMove(row=null){Object.assign(move,{producto_id:row?.id||null,tipo:'entrada',cantidad:1,costo_unitario:row?.costo??null,precio_unitario:row?.precio_venta??null,motivo:''});movementDialog.value=true}
async function saveMove(){try{await api.post(`${base}/productos-movimientos`,move);movementDialog.value=false;$q.notify({type:'positive',message:'Movimiento registrado.'});await load()}catch(e){error(e)}}
onMounted(load)
</script>

<template>
<q-page class="hair-page q-pa-md q-pa-lg-xl"><q-inner-loading :showing="loading"/>
  <div class="row items-center q-col-gutter-md q-mb-lg"><div class="col"><div class="text-overline text-primary">Peluquería</div><div class="text-h4 text-weight-bold">Productos</div><div class="text-body2 text-grey-7">Controla productos de uso interno, venta y stock. Se queda vacío hasta cargar datos reales.</div></div></div>
  <q-tabs v-model="tab" dense align="left" active-color="primary" indicator-color="primary" class="tabs q-mb-lg"><q-tab name="productos" icon="inventory_2" label="Productos" no-caps/><q-tab name="movimientos" icon="swap_horiz" label="Movimientos" no-caps/></q-tabs>

  <template v-if="tab==='productos'">
    <div class="toolbar"><div><div class="text-h6 text-weight-bold">Inventario</div><div class="text-caption text-grey-6">Stock, costo y precio de venta.</div></div><div class="row q-gutter-sm"><q-btn outline color="primary" no-caps icon="swap_horiz" label="Registrar movimiento" @click="openMove()"/><q-btn color="primary" unelevated no-caps icon="add" label="Nuevo producto" @click="open()"/></div></div>
    <q-table flat class="hair-card" :rows="productos" row-key="id" :columns="[{name:'nombre',label:'Producto',field:'nombre',align:'left'},{name:'categoria',label:'Categoría',field:'categoria',align:'left'},{name:'tipo',label:'Tipo',field:r=>pretty(r.tipo),align:'left'},{name:'stock',label:'Stock',field:r=>`${r.stock} ${r.unidad}`,align:'left'},{name:'precio',label:'Precio venta',field:r=>money(r.precio_venta),align:'left'},{name:'acciones',label:'',field:'id',align:'right'}]">
      <template #body-cell-stock="p"><q-td :props="p"><q-badge :color="stockLow(p.row)?'orange':'positive'" outline>{{p.row.stock}} {{p.row.unidad}}</q-badge></q-td></template>
      <template #body-cell-acciones="p"><q-td :props="p"><q-btn flat round dense icon="more_vert"><q-menu><q-list style="min-width:170px"><q-item clickable v-close-popup @click="openMove(p.row)"><q-item-section avatar><q-icon name="swap_horiz"/></q-item-section><q-item-section>Movimiento</q-item-section></q-item><q-item clickable v-close-popup @click="open(p.row)"><q-item-section avatar><q-icon name="edit"/></q-item-section><q-item-section>Editar</q-item-section></q-item><q-item clickable v-close-popup class="text-negative" @click="remove(p.row)"><q-item-section avatar><q-icon name="delete"/></q-item-section><q-item-section>Eliminar</q-item-section></q-item></q-list></q-menu></q-btn></q-td></template>
      <template #no-data><div class="empty full-width"><q-icon name="inventory_2" size="42px" class="q-mb-sm"/><div class="text-weight-bold">Aún no hay productos</div><div class="text-caption">Cuando tengas nombres, costos y precios, los cargas aquí.</div></div></template>
    </q-table>
  </template>

  <template v-else>
    <div class="toolbar"><div><div class="text-h6 text-weight-bold">Movimientos</div><div class="text-caption text-grey-6">Entradas, uso interno, ventas y ajustes de stock.</div></div><q-btn color="primary" unelevated no-caps icon="add" label="Nuevo movimiento" @click="openMove()"/></div>
    <q-table flat class="hair-card" :rows="movimientos" row-key="id" :columns="[{name:'fecha',label:'Fecha',field:r=>new Date(r.registrado_at).toLocaleString(),align:'left'},{name:'producto',label:'Producto',field:r=>r.producto?.nombre,align:'left'},{name:'tipo',label:'Tipo',field:r=>pretty(r.tipo),align:'left'},{name:'cantidad',label:'Cantidad',field:r=>`${r.cantidad} ${r.producto?.unidad||''}`,align:'left'},{name:'motivo',label:'Detalle',field:'motivo',align:'left'}]">
      <template #no-data><div class="empty full-width">Todavía no hay movimientos de productos.</div></template>
    </q-table>
  </template>

  <q-dialog v-model="dialog"><q-card style="width:720px;max-width:94vw"><q-card-section><div class="text-overline text-primary">Inventario</div><div class="text-h5 text-weight-bold">{{editing?'Editar':'Nuevo'}} producto</div></q-card-section><q-card-section><div class="row q-col-gutter-md"><div class="col-12 col-sm-8"><q-input v-model="form.nombre" outlined label="Nombre *"/></div><div class="col-12 col-sm-4"><q-input v-model="form.categoria" outlined label="Categoría"/></div><div class="col-12 col-sm-6"><q-select v-model="form.tipo" outlined :options="[{label:'Uso interno',value:'uso_interno'},{label:'Venta',value:'venta'},{label:'Mixto',value:'mixto'}]" emit-value map-options label="Tipo *"/></div><div class="col-12 col-sm-6"><q-input v-model="form.unidad" outlined label="Unidad *" hint="Ej. unidad, ml, g"/></div><div class="col-12 col-sm-4"><q-input v-model.number="form.stock" outlined type="number" min="0" label="Stock"/></div><div class="col-12 col-sm-4"><q-input v-model.number="form.stock_minimo" outlined type="number" min="0" label="Stock mínimo"/></div><div class="col-12 col-sm-4"><q-input v-model.number="form.costo" outlined type="number" min="0" label="Costo (Bs)"/></div><div class="col-12 col-sm-4"><q-input v-model.number="form.precio_venta" outlined type="number" min="0" label="Precio venta (Bs)"/></div><div class="col-12"><q-input v-model="form.descripcion" outlined type="textarea" label="Descripción"/></div></div></q-card-section><q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps label="Guardar" @click="save"/></q-card-actions></q-card></q-dialog>

  <q-dialog v-model="movementDialog"><q-card style="width:560px;max-width:94vw"><q-card-section><div class="text-overline text-primary">Inventario</div><div class="text-h5 text-weight-bold">Registrar movimiento</div></q-card-section><q-card-section><div class="row q-col-gutter-md"><div class="col-12"><q-select v-model="move.producto_id" outlined emit-value map-options :options="productOptions" label="Producto *"/></div><div class="col-12 col-sm-6"><q-select v-model="move.tipo" outlined emit-value map-options :options="[{label:'Entrada',value:'entrada'},{label:'Uso interno',value:'uso'},{label:'Venta',value:'venta'},{label:'Ajuste',value:'ajuste'}]" label="Tipo *"/></div><div class="col-12 col-sm-6"><q-input v-model.number="move.cantidad" outlined type="number" label="Cantidad *"/></div><div class="col-12 col-sm-6"><q-input v-model.number="move.costo_unitario" outlined type="number" min="0" label="Costo unitario"/></div><div class="col-12 col-sm-6"><q-input v-model.number="move.precio_unitario" outlined type="number" min="0" label="Precio unitario"/></div><div class="col-12"><q-input v-model="move.motivo" outlined label="Detalle / motivo"/></div></div></q-card-section><q-card-actions align="right"><q-btn flat no-caps label="Cancelar" v-close-popup/><q-btn color="primary" unelevated no-caps label="Registrar" @click="saveMove"/></q-card-actions></q-card></q-dialog>
</q-page>
</template>

<style scoped>
.hair-page{max-width:1500px;margin:auto}.hair-card{background:#fff;border:1px solid #e4e7ec;border-radius:16px;overflow:hidden}.toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}.tabs{background:#fff;border:1px solid #e4e7ec;border-radius:12px}.empty{text-align:center;padding:44px 20px;color:#667085}@media(max-width:700px){.toolbar{align-items:flex-start;flex-direction:column}.toolbar>.row,.toolbar .q-btn{width:100%}.toolbar>.row .q-btn{flex:1}}
</style>
