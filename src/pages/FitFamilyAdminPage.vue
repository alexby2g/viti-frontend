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
        <div class="col"><div class="text-overline text-primary">VITI · FITFAMILY</div><div class="text-h4 text-weight-bold">Administración de catálogo</div><div class="text-subtitle2 text-grey-6">Gestiona categorías y productos de una aplicación FitFamily sin mezclar datos entre empresas.</div></div>
        <div class="row q-gutter-sm"><q-btn flat icon="arrow_back" label="Volver" no-caps to="/" /><q-btn color="primary" unelevated icon="refresh" label="Actualizar" no-caps :loading="loading" @click="loadData" /></div>
      </div>

      <q-card flat bordered class="q-mb-lg"><q-card-section><div class="row q-col-gutter-md items-end"><q-input :model-value="applicationId || ''" type="number" min="1" outlined dense label="ID de aplicación FitFamily" class="col-12 col-md-4" hint="ID de la aplicación administrada." @update:model-value="setApplication" /><div class="col-12 col-md-8 row items-center q-gutter-sm"><q-badge v-if="hasApplication" color="positive" label="Aplicación seleccionada" /><q-badge v-else color="warning" label="Falta seleccionar aplicación" /><q-btn color="primary" outline no-caps label="Cargar catálogo" :disable="!hasApplication" :loading="loading" @click="loadData" /></div></div></q-card-section></q-card>

      <div v-if="!hasApplication" class="empty-state"><q-icon name="storefront" size="56px" color="primary" /><div class="text-h6 text-weight-bold q-mt-md">Selecciona una aplicación FitFamily</div><div class="text-body2 text-grey-6 q-mt-sm">La administración requiere el contexto de empresa y aplicación para mantener el aislamiento multiempresa.</div></div>

      <template v-else>
        <div class="row q-col-gutter-lg">
          <div class="col-12 col-lg-4"><q-card flat bordered class="full-height"><q-card-section class="row items-center justify-between"><div><div class="text-overline text-primary">CATÁLOGO</div><div class="text-h6 text-weight-bold">Categorías</div></div><q-btn round color="primary" icon="add" aria-label="Nueva categoría" @click="openCategory" /></q-card-section><q-separator /><q-list v-if="categories.length" separator><q-item v-for="category in categories" :key="category.id"><q-item-section avatar><q-icon name="category" color="primary" /></q-item-section><q-item-section><q-item-label>{{ category.nombre }}</q-item-label><q-item-label caption>{{ category.descripcion || 'Sin descripción' }}</q-item-label></q-item-section><q-item-section side><q-badge :color="category.activo ? 'positive' : 'grey'" :label="category.activo ? 'Activa' : 'Inactiva'" /></q-item-section></q-item></q-list><div v-else class="q-pa-xl text-center text-grey-6">Todavía no hay categorías.</div></q-card></div>

          <div class="col-12 col-lg-8"><q-card flat bordered><q-card-section class="row items-center q-col-gutter-md"><div class="col"><div class="text-overline text-primary">CATÁLOGO DE PRODUCTOS</div><div class="text-h6 text-weight-bold">Productos</div></div><q-btn color="primary" unelevated icon="add" label="Nuevo producto" no-caps @click="openProduct" /></q-card-section><q-card-section class="q-pt-none"><div class="row q-col-gutter-sm"><q-input v-model="search" outlined dense clearable label="Buscar producto" class="col-12 col-md-6"><template #prepend><q-icon name="search" /></template></q-input><q-select v-model="categoryFilter" outlined dense clearable label="Filtrar por categoría" class="col-12 col-md-6" :options="categories" option-label="nombre" option-value="id" emit-value map-options /></div></q-card-section><q-separator /><q-table flat :rows="filteredProducts" row-key="id" :columns="[{ name:'producto', label:'Producto', field:'nombre', align:'left' }, { name:'categoria', label:'Categoría', field:row => row.categoria?.nombre || 'Sin categoría', align:'left' }, { name:'precio', label:'Precio', field:'precio', align:'right' }, { name:'stock', label:'Stock', field:'stock', align:'right' }, { name:'estado', label:'Estado', field:'disponible', align:'center' }]" :loading="loading" no-data-label="No hay productos para mostrar"><template #body-cell-producto="props"><q-td :props="props"><div class="text-weight-bold">{{ props.row.nombre }}</div><div class="text-caption text-grey-6">{{ props.row.descripcion || 'Sin descripción' }}</div></q-td></template><template #body-cell-precio="props"><q-td :props="props">Bs {{ money(props.row.precio) }}</q-td></template><template #body-cell-estado="props"><q-td :props="props"><q-badge :color="props.row.disponible ? 'positive' : 'grey'" :label="props.row.disponible ? 'Disponible' : 'No disponible'" /></q-td></template></q-table></q-card></div>
        </div>
      </template>

      <q-dialog v-model="categoryDialog"><q-card style="width:560px;max-width:95vw"><q-card-section><div class="text-h6">Nueva categoría</div></q-card-section><q-card-section class="q-gutter-md"><q-input v-model="categoryForm.nombre" outlined label="Nombre" autofocus /><q-input v-model="categoryForm.descripcion" outlined type="textarea" label="Descripción" /><div class="row items-center justify-between"><q-toggle v-model="categoryForm.activo" label="Categoría activa" /><q-input v-model.number="categoryForm.orden" outlined dense type="number" min="0" label="Orden" style="width:140px" /></div></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup /><q-btn color="primary" label="Crear" :disable="!categoryForm.nombre.trim()" :loading="saving" @click="saveCategory" /></q-card-actions></q-card></q-dialog>
      <q-dialog v-model="productDialog"><q-card style="width:720px;max-width:95vw"><q-card-section><div class="text-h6">Nuevo producto FitFamily</div></q-card-section><q-card-section><div class="row q-col-gutter-md"><q-input v-model="productForm.nombre" outlined label="Nombre" class="col-12 col-md-8" /><q-select v-model="productForm.categoria_id" outlined label="Categoría" :options="categories" option-label="nombre" option-value="id" emit-value map-options class="col-12 col-md-4" /><q-input v-model="productForm.descripcion" outlined type="textarea" label="Descripción" class="col-12" /><q-input v-model="productForm.imagen_url" outlined label="URL de imagen" class="col-12" /><q-input v-model.number="productForm.precio" outlined type="number" min="0" step="0.01" label="Precio (Bs)" class="col-12 col-md-4" /><q-input v-model.number="productForm.stock" outlined type="number" min="0" step="1" label="Stock" class="col-12 col-md-4" /><div class="col-12 col-md-4 column justify-center"><q-toggle v-model="productForm.disponible" label="Disponible" /><q-toggle v-model="productForm.visible_catalogo" label="Visible en catálogo" /></div></div></q-card-section><q-card-actions align="right"><q-btn flat label="Cancelar" v-close-popup /><q-btn color="primary" label="Crear producto" :disable="!productForm.nombre.trim() || Number(productForm.precio) < 0" :loading="saving" @click="saveProduct" /></q-card-actions></q-card></q-dialog>
    </div>
  </q-page>
</template>

<style scoped>
.fitfamily-page{background:var(--viti-bg,#f7fafc)}
.page-shell{width:min(1280px,100%);margin:0 auto}
.empty-state{padding:70px 30px;text-align:center;border:1px dashed rgba(16,42,67,.16);border-radius:24px;background:#fff}
</style>
