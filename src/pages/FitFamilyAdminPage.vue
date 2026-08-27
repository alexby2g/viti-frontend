<script setup>
import { computed, onMounted, ref } from 'vue'
import { Notify } from 'quasar'
import { useRoute } from 'vue-router'
import { api } from '../boot/axios'

const route = useRoute()
const routeApplicationId = Number(route.query.aplicacion_id || 0)
const applicationId = ref(Number.isInteger(routeApplicationId) && routeApplicationId > 0 ? routeApplicationId : (Number(localStorage.getItem('viti-fitfamily-app-id') || 0) || null))
const categories = ref([])
const products = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const categoryFilter = ref(null)
const categoryDialog = ref(false)
const productDialog = ref(false)
const categoryForm = ref({ nombre: '', descripcion: '', activo: true, orden: 0 })
const productForm = ref({ categoria_id: null, nombre: '', descripcion: '', imagen_url: '', precio: 0, stock: 0, disponible: true, visible_catalogo: true })

const hasApplication = computed(() => Number.isInteger(applicationId.value) && applicationId.value > 0)
const filteredProducts = computed(() => {
  const q = search.value.trim().toLowerCase()
  return products.value.filter((product) => {
    if (categoryFilter.value && Number(product.categoria_id) !== Number(categoryFilter.value)) return false
    if (!q) return true
    return `${product.nombre || ''} ${product.descripcion || ''} ${product.slug || ''}`.toLowerCase().includes(q)
  })
})

function notifyError(error, fallback) { Notify.create({ type: 'negative', message: error?.response?.data?.message || fallback, timeout: 6000 }) }
function setApplication(value) {
  const parsed = Number(value)
  applicationId.value = Number.isInteger(parsed) && parsed > 0 ? parsed : null
  if (applicationId.value) localStorage.setItem('viti-fitfamily-app-id', String(applicationId.value))
  else localStorage.removeItem('viti-fitfamily-app-id')
}
async function loadData() {
  if (!hasApplication.value) return
  loading.value = true
  try {
    const params = { aplicacion_id: applicationId.value }
    const [{ data: categoryResponse }, { data: productResponse }] = await Promise.all([
      api.get('/fitfamily/admin/categorias', { params }),
      api.get('/fitfamily/admin/productos', { params }),
    ])
    categories.value = Array.isArray(categoryResponse?.data) ? categoryResponse.data : []
    const payload = productResponse?.data
    products.value = Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : [])
  } catch (error) { categories.value = []; products.value = []; notifyError(error, 'No se pudo cargar la administración de FitFamily.') }
  finally { loading.value = false }
}
function openCategory() { categoryForm.value = { nombre: '', descripcion: '', activo: true, orden: 0 }; categoryDialog.value = true }
function openProduct() { productForm.value = { categoria_id: null, nombre: '', descripcion: '', imagen_url: '', precio: 0, stock: 0, disponible: true, visible_catalogo: true }; productDialog.value = true }
async function saveCategory() {
  if (!hasApplication.value || !categoryForm.value.nombre.trim()) return
  saving.value = true
  try { await api.post('/fitfamily/admin/categorias', categoryForm.value, { params: { aplicacion_id: applicationId.value } }); Notify.create({ type: 'positive', message: 'Categoría creada.' }); categoryDialog.value = false; await loadData() }
  catch (error) { notifyError(error, 'No se pudo crear la categoría.') }
  finally { saving.value = false }
}
async function saveProduct() {
  if (!hasApplication.value || !productForm.value.nombre.trim()) return
  saving.value = true
  try { await api.post('/fitfamily/admin/productos', productForm.value, { params: { aplicacion_id: applicationId.value } }); Notify.create({ type: 'positive', message: 'Producto creado.' }); productDialog.value = false; await loadData() }
  catch (error) { notifyError(error, 'No se pudo crear el producto.') }
  finally { saving.value = false }
}
function money(value) { return Number(value || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
onMounted(() => {
  if (hasApplication.value) localStorage.setItem('viti-fitfamily-app-id', String(applicationId.value))
  loadData()
})
</script>

<template>
  <q-page class="q-pa-lg fitfamily-page">
    <div class="page-shell">
      <div class="row items-center justify-between q-col-gutter-md q-mb-lg">
        <div class="col"><div class="text-overline fitfamily-accent">VITI · FITFAMILY</div><div class="text-h4 text-weight-bold fitfamily-title">Administración de catálogo</div><div class="text-subtitle2 fitfamily-muted">Gestiona categorías y productos de una aplicación FitFamily sin mezclar datos entre empresas.</div></div>
        <div class="row q-gutter-sm"><q-btn flat icon="arrow_back" label="Volver" no-caps to="/" class="fitfamily-outline" /><q-btn unelevated icon="refresh" label="Actualizar" no-caps :loading="loading" class="fitfamily-primary" @click="loadData" /></div>
      </div>

      <q-card flat bordered class="q-mb-lg fitfamily-card">
        <q-card-section><div class="row q-col-gutter-md items-end"><q-input :model-value="applicationId || ''" type="number" min="1" outlined dense label="ID de aplicación FitFamily" class="col-12 col-md-4 fitfamily-field" hint="ID de la aplicación administrada." @update:model-value="setApplication" /><div class="col-12 col-md-8 row items-center q-gutter-sm"><q-badge v-if="hasApplication" class="fitfamily-badge" label="Aplicación seleccionada" /><q-badge v-else color="warning" label="Falta seleccionar aplicación" /><q-btn outline no-caps label="Cargar catálogo" class="fitfamily-outline-btn" :disable="!hasApplication" :loading="loading" @click="loadData" /></div></div></q-card-section>
      </q-card>

      <div v-if="!hasApplication" class="empty-state fitfamily-empty"><q-icon name="storefront" size="56px" class="fitfamily-icon" /><div class="text-h6 text-weight-bold q-mt-md fitfamily-title">Selecciona una aplicación FitFamily</div><div class="text-body2 q-mt-sm fitfamily-muted">La administración requiere el contexto de empresa y aplicación para mantener el aislamiento multiempresa.</div></div>

      <template v-else>
        <div class="row q-col-gutter-lg">
          <div class="col-12 col-lg-4"><q-card flat bordered class="full-height fitfamily-card"><q-card-section class="row items-center justify-between"><div><div class="text-overline fitfamily-accent">CATÁLOGO</div><div class="text-h6 text-weight-bold fitfamily-title">Categorías</div></div><q-btn round icon="add" aria-label="Nueva categoría" class="fitfamily-primary" @click="openCategory" /></q-card-section><q-separator class="fitfamily-separator" /><q-list v-if="categories.length" separator><q-item v-for="category in categories" :key="category.id"><q-item-section avatar><q-icon name="category" class="fitfamily-icon" /></q-item-section><q-item-section><q-item-label>{{ category.nombre }}</q-item-label><q-item-label caption class="fitfamily-muted">{{ category.descripcion || 'Sin descripción' }}</q-item-label></q-item-section><q-item-section side><q-badge :class="category.activo ? 'fitfamily-badge' : ''" :color="category.activo ? undefined : 'grey'" :label="category.activo ? 'Activa' : 'Inactiva'" /></q-item-section></q-item></q-list><div v-else class="q-pa-xl text-center fitfamily-muted">Todavía no hay categorías.</div></q-card></div>

          <div class="col-12 col-lg-8"><q-card flat bordered class="fitfamily-card"><q-card-section class="row items-center q-col-gutter-md"><div class="col"><div class="text-overline fitfamily-accent">CATÁLOGO DE PRODUCTOS</div><div class="text-h6 text-weight-bold fitfamily-title">Productos</div></div><q-btn unelevated icon="add" label="Nuevo producto" no-caps class="fitfamily-primary" @click="openProduct" /></q-card-section><q-card-section class="q-pt-none"><div class="row q-col-gutter-sm"><q-input v-model="search" outlined dense clearable label="Buscar producto" class="col-12 col-md-6 fitfamily-field"><template #prepend><q-icon name="search" class="fitfamily-icon" /></template></q-input><q-select v-model="categoryFilter" outlined dense clearable label="Filtrar por categoría" class="col-12 col-md-6 fitfamily-field" :options="categories" option-label="nombre" option-value="id" emit-value map-options /></div></q-card-section><q-separator class="fitfamily-separator" /><q-table flat :rows="filteredProducts" row-key="id" :columns="[{ name:'producto', label:'Producto', field:'nombre', align:'left' }, { name:'categoria', label:'Categoría', field:row => row.categoria?.nombre || 'Sin categoría', align:'left' }, { name:'precio', label:'Precio', field:'precio', align:'right' }, { name:'stock', label:'Stock', field:'stock', align:'right' }, { name:'estado', label:'Estado', field:'disponible', align:'center' }]" :loading="loading" no-data-label="No hay productos para mostrar"><template #body-cell-producto="props"><q-td :props="props"><div class="text-weight-bold fitfamily-title">{{ props.row.nombre }}</div><div class="text-caption fitfamily-muted">{{ props.row.descripcion || 'Sin descripción' }}</div></q-td></template><template #body-cell-precio="props"><q-td :props="props">Bs {{ money(props.row.precio) }}</q-td></template><template #body-cell-estado="props"><q-td :props="props"><q-badge :class="props.row.disponible ? 'fitfamily-badge' : ''" :color="props.row.disponible ? undefined : 'grey'" :label="props.row.disponible ? 'Disponible' : 'No disponible'" /></q-td></template></q-table></q-card></div>
        </div>
      </template>

      <q-dialog v-model="categoryDialog"><q-card class="fitfamily-dialog" style="width:560px;max-width:95vw"><q-card-section><div class="text-h6 fitfamily-title">Nueva categoría</div></q-card-section><q-card-section class="q-gutter-md"><q-input v-model="categoryForm.nombre" outlined label="Nombre" autofocus class="fitfamily-field" /><q-input v-model="categoryForm.descripcion" outlined type="textarea" label="Descripción" class="fitfamily-field" /><div class="row items-center justify-between"><q-toggle v-model="categoryForm.activo" label="Categoría activa" class="fitfamily-toggle" /><q-input v-model.number="categoryForm.orden" outlined dense type="number" min="0" label="Orden" style="width:140px" class="fitfamily-field" /></div></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup class="fitfamily-outline" /><q-btn label="Crear" class="fitfamily-primary" :disable="!categoryForm.nombre.trim()" :loading="saving" @click="saveCategory" /></q-card-actions></q-card></q-dialog>
      <q-dialog v-model="productDialog"><q-card class="fitfamily-dialog" style="width:720px;max-width:95vw"><q-card-section><div class="text-h6 fitfamily-title">Nuevo producto FitFamily</div></q-card-section><q-card-section><div class="row q-col-gutter-md"><q-input v-model="productForm.nombre" outlined label="Nombre" class="col-12 col-md-8 fitfamily-field" /><q-select v-model="productForm.categoria_id" outlined label="Categoría" :options="categories" option-label="nombre" option-value="id" emit-value map-options class="col-12 col-md-4 fitfamily-field" /><q-input v-model="productForm.descripcion" outlined type="textarea" label="Descripción" class="col-12 fitfamily-field" /><q-input v-model="productForm.imagen_url" outlined label="URL de imagen" class="col-12 fitfamily-field" /><q-input v-model.number="productForm.precio" outlined type="number" min="0" step="0.01" label="Precio (Bs)" class="col-12 col-md-4 fitfamily-field" /><q-input v-model.number="productForm.stock" outlined type="number" min="0" step="1" label="Stock" class="col-12 col-md-4 fitfamily-field" /><div class="col-12 col-md-4 column justify-center"><q-toggle v-model="productForm.disponible" label="Disponible" class="fitfamily-toggle" /><q-toggle v-model="productForm.visible_catalogo" label="Visible en catálogo" class="fitfamily-toggle" /></div></div></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup class="fitfamily-outline" /><q-btn label="Crear producto" class="fitfamily-primary" :disable="!productForm.nombre.trim() || Number(productForm.precio) < 0" :loading="saving" @click="saveProduct" /></q-card-actions></q-card></q-dialog>
    </div>
  </q-page>
</template>

<style scoped>
.fitfamily-page {
  --fitfamily-green: #b8d8a8;
  --fitfamily-green-soft: #e9f3e3;
  --fitfamily-green-dark: #55765a;
  --fitfamily-cream: #f7faf3;
  --fitfamily-border: #dce8d7;
  background: linear-gradient(180deg, var(--fitfamily-cream) 0%, #ffffff 72%);
  color: #304536;
}
.page-shell { width: min(1280px, 100%); margin: 0 auto; }
.fitfamily-title { color: var(--fitfamily-green-dark); }
.fitfamily-accent { color: var(--fitfamily-green-dark); letter-spacing: .14em; font-weight: 700; }
.fitfamily-muted { color: #71806f !important; }
.fitfamily-card { background: rgba(255,255,255,.96); border-color: var(--fitfamily-border); box-shadow: 0 8px 28px rgba(74,103,77,.07); }
.fitfamily-dialog { background: #fffdf9; border: 1px solid var(--fitfamily-border); }
.fitfamily-primary { background: var(--fitfamily-green) !important; color: #29412f !important; box-shadow: none !important; }
.fitfamily-primary:hover { background: #a9ce97 !important; }
.fitfamily-outline { color: var(--fitfamily-green-dark) !important; }
.fitfamily-outline-btn { color: var(--fitfamily-green-dark) !important; border-color: var(--fitfamily-green) !important; }
.fitfamily-badge { background: var(--fitfamily-green-soft) !important; color: var(--fitfamily-green-dark) !important; }
.fitfamily-icon { color: #6f9b75 !important; }
.fitfamily-separator { background: var(--fitfamily-border) !important; }
.fitfamily-empty { background: rgba(255,255,255,.9); border-color: var(--fitfamily-border); }
.fitfamily-field :deep(.q-field__control) { background: #fffefb; }
.fitfamily-field :deep(.q-field__control:before) { border-color: #cfdccd; }
.fitfamily-field :deep(.q-field__control:hover:before) { border-color: #aac7a5; }
.fitfamily-field :deep(.q-field--focused .q-field__control:after) { border-color: #88ae83; }
.fitfamily-toggle :deep(.q-toggle__label) { color: #4f6753; }
</style>
