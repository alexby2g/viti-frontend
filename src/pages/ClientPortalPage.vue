<script setup>
import { mediaUrl } from '../utils/media.js'
import { computed, onMounted, reactive, ref } from 'vue'
import { useQuasar } from 'quasar'
import { api } from '../boot/axios'
import { downloadFile } from '../utils/download'
import PageHeader from '../components/PageHeader.vue'

const $q = useQuasar()
const loading = ref(true)
const starting = ref(false)
const profile = ref(null)
const request = ref(null)
const edit = ref(false)
const saving = ref(false)
const photo = ref(null)
const photoFailed = ref(false)
const form = reactive({ nombre:'', whatsapp:'', ci:'', ci_expedido:'', ciudad:'', direccion:'' })

const statusLabels = {
  borrador:'Borrador', en_revision:'En revisión', aprobada:'Aprobada', rechazada:'Requiere ajustes',
  convertida:'Convertida en proyecto', cerrada:'Cerrada'
}

const photoSrc = computed(() => {
  if (photoFailed.value || !profile.value) return ''
  return profile.value.foto_url || mediaUrl(profile.value.foto_path)
})

function requestStatus(){ return statusLabels[request.value?.estado] || request.value?.estado || 'Sin solicitud' }
function errorMessage(e, fallback){ const bag=e?.response?.data?.errors; if(bag) return Object.values(bag).flat()[0]; return e?.response?.data?.message||fallback }

async function load(){
  loading.value=true
  try{
    profile.value=(await api.get('/mi/perfil')).data.data
    request.value=(await api.get('/mi/solicitud')).data.data
    photoFailed.value=false
    Object.assign(form,{
      nombre:profile.value.nombre||'', whatsapp:profile.value.whatsapp||'', ci:profile.value.documento||'',
      ci_expedido:profile.value.ci_expedido||'', ciudad:profile.value.ciudad||'', direccion:profile.value.direccion||''
    })
  }catch(e){$q.notify({type:'negative',message:errorMessage(e,'No se pudo cargar tu cuenta.')})}
  finally{loading.value=false}
}

async function start(){
  starting.value=true
  try{request.value=(await api.post('/mi/solicitud')).data.data;$q.notify({type:'positive',message:'Tu formulario está listo.'})}
  catch(e){$q.notify({type:'negative',message:errorMessage(e,'No se pudo iniciar la solicitud.')})}
  finally{starting.value=false}
}

async function uploadPhoto(){
  if(!photo.value) return true
  const fd=new FormData();fd.append('foto',photo.value)
  try{
    const { data } = await api.post('/mi/perfil/foto',fd)
    profile.value = data.data || profile.value
    photo.value=null
    photoFailed.value=false
    return true
  }catch(e){
    $q.notify({type:'negative',message:errorMessage(e,'No se pudo subir la fotografía.')})
    return false
  }
}

async function save(){
  saving.value=true
  try{
    profile.value=(await api.put('/mi/perfil',form)).data.data
    const photoOk = await uploadPhoto()
    if (!photoOk) return
    edit.value=false
    await load()
    $q.notify({type:'positive',message:'Tus datos y fotografía fueron actualizados.'})
  }
  catch(e){$q.notify({type:'negative',message:errorMessage(e,'Revisa los datos ingresados.')})}
  finally{saving.value=false}
}

onMounted(load)
</script>

<template>
<q-page class="viti-page">
  <q-inner-loading :showing="loading" />
  <template v-if="profile">
    <PageHeader eyebrow="Mi espacio VITI" title="Mi cuenta" subtitle="Tu identificación, solicitud y seguimiento en un solo lugar." />

    <div class="row q-col-gutter-lg">
      <div class="col-12 col-lg-5">
        <q-card flat class="viti-card identity-card">
          <q-card-section class="identity-head">
            <div>
              <div class="section-label text-blue-2">Identificación VITI</div>
              <div class="text-h5 text-weight-bold text-white">Ficha del cliente</div>
            </div>
            <q-chip dense color="white" text-color="primary" icon="verified_user">{{ profile.estado }}</q-chip>
          </q-card-section>
          <q-card-section class="row q-col-gutter-lg items-center">
            <div class="col-auto">
              <q-avatar size="128px" class="id-photo">
                <img v-if="photoSrc" :src="photoSrc" alt="Fotografía del cliente" @error="photoFailed=true" />
                <q-icon v-else name="person" size="68px" color="grey-5" />
              </q-avatar>
            </div>
            <div class="col">
              <div class="text-h5 text-weight-bold">{{ profile.nombre }}</div>
              <div class="id-line"><span>Usuario para iniciar sesión</span><strong>@{{ profile.usuario?.usuario || 'Sin registrar' }}</strong></div>
              <div class="id-line"><span>CI</span><strong>{{ profile.documento || 'Sin registrar' }} {{ profile.ci_expedido || '' }}</strong></div>
              <div class="id-line"><span>Teléfono</span><strong>{{ profile.telefono }}</strong></div>
              <div class="id-line"><span>Ciudad</span><strong>{{ profile.ciudad || 'Sin registrar' }}</strong></div>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-6"><div class="text-caption text-grey-6">WhatsApp</div><div>{{profile.whatsapp||'No registrado'}}</div></div>
              <div class="col-12 col-sm-6"><div class="text-caption text-grey-6">Dirección / zona</div><div>{{profile.direccion||'No registrada'}}</div></div>
            </div>
          </q-card-section>
          <q-card-actions align="right"><q-btn flat color="primary" label="Editar mis datos" no-caps icon="edit" @click="edit=true" /></q-card-actions>
        </q-card>
        <q-card flat class="viti-card q-mt-lg">
          <q-card-section><div class="section-label">Mi empresa</div><div class="text-h6 text-weight-bold">Información detectada desde tu formulario</div><div class="text-caption text-grey-6">Nuestro equipo revisará estos datos antes de aprobarlos definitivamente.</div></q-card-section>
          <q-separator/>
          <q-list v-if="profile.empresas?.length" separator><q-item v-for="e in profile.empresas" :key="e.id"><q-item-section avatar><q-avatar color="blue-1" text-color="primary" icon="business"/></q-item-section><q-item-section><q-item-label class="text-weight-bold">{{e.nombre_comercial}}</q-item-label><q-item-label caption>{{e.actividad||'Actividad por definir'}} · {{e.ciudad||profile.ciudad}}</q-item-label></q-item-section><q-item-section side><q-badge outline color="primary">{{e.estado}}</q-badge></q-item-section></q-item></q-list>
          <q-card-section v-else class="text-grey-6">Todavía no se identificó una empresa. Al completar el formulario, VITI podrá crearla como borrador para revisión.</q-card-section>
        </q-card>
      </div>

      <div class="col-12 col-lg-7">
        <q-card flat class="viti-card">
          <q-card-section>
            <div class="section-label">Solicitud de sistema</div>
            <div v-if="request" class="text-h5 text-weight-bold q-mt-xs">{{request.titulo}}</div>
            <div v-else class="text-h5 text-weight-bold q-mt-xs">Cuéntanos qué sistema necesitas</div>
            <p class="text-grey-6 q-mb-none">{{request ? 'Estado: '+requestStatus() : 'Completa el cuestionario y nuestro equipo revisará tu negocio, proceso y necesidades.'}}</p>
          </q-card-section>
          <q-separator />
          <q-card-section v-if="request">
            <div class="row items-center q-gutter-sm"><q-chip color="primary" text-color="white">{{request.codigo}}</q-chip><q-chip outline color="primary">{{requestStatus()}}</q-chip></div>
            <div class="q-mt-lg row q-gutter-sm">
              <q-btn color="primary" unelevated no-caps icon="assignment" label="Completar mi formulario" :href="request.enlace_publico" />
              <q-btn outline color="primary" no-caps icon="picture_as_pdf" label="Descargar PDF" @click="downloadFile(`/mi/solicitudes/${request.id}.pdf`,`${request.codigo}-cuestionario.pdf`)" />
              <q-btn outline color="primary" no-caps icon="forum" label="Escribir al equipo" to="/mi-buzon" />
            </div>
          </q-card-section>
          <q-card-section v-else><q-btn color="primary" unelevated no-caps size="lg" icon="rocket_launch" label="Empezar mi solicitud" :loading="starting" @click="start" /></q-card-section>
        </q-card>

        <q-card flat class="viti-card q-mt-lg">
          <q-card-section><div class="text-h6 text-weight-bold">¿Qué pasará después?</div>
            <div class="q-mt-md client-flow">
              <div><b>1.</b> Completa el formulario de tu negocio.</div>
              <div><b>2.</b> Nuestro equipo revisa y organiza tus necesidades.</div>
              <div><b>3.</b> Definimos contigo el alcance y el proyecto.</div>
              <div><b>4.</b> Verás avances de análisis, frontend, backend, beta y pruebas.</div>
              <div><b>5.</b> La aplicación entregada queda registrada en VITI para soporte y mantenimiento.</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="edit">
      <q-card style="width:min(760px,94vw)">
        <q-card-section><div class="section-label">Mi perfil</div><div class="text-h5 text-weight-bold">Actualizar datos</div></q-card-section><q-separator />
        <q-card-section><div class="row q-col-gutter-md">
          <div class="col-12"><q-input v-model="form.nombre" outlined label="Nombre completo *" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.whatsapp" outlined label="WhatsApp" /></div>
          <div class="col-12 col-sm-4"><q-input v-model="form.ci" outlined label="Cédula de identidad *" inputmode="numeric" maxlength="15" hint="También sirve para iniciar sesión." @update:model-value="v=>form.ci=String(v??'').replace(/\D/g,'')" /></div>
          <div class="col-12 col-sm-2"><q-input v-model="form.ci_expedido" outlined label="Expedido" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.ciudad" outlined label="Ciudad o localidad *" /></div>
          <div class="col-12 col-sm-6"><q-input v-model="form.direccion" outlined label="Dirección o zona" /></div>
          <div class="col-12">
            <q-file v-model="photo" outlined accept="image/png,image/jpeg,image/webp" label="Nueva fotografía (opcional)" clearable />
            <div class="text-caption text-grey-6 q-mt-xs">Si eliges una foto, se subirá automáticamente cuando pulses “Guardar cambios”. Debe ser reciente, de frente y con el rostro visible.</div>
          </div>
        </div></q-card-section>
        <q-card-actions align="right"><q-btn flat label="Cancelar" no-caps v-close-popup /><q-btn color="primary" unelevated label="Guardar cambios" no-caps :loading="saving" @click="save" /></q-card-actions>
      </q-card>
    </q-dialog>
  </template>
</q-page>
</template>

<style scoped>
.identity-card{overflow:hidden}.identity-head{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(135deg,#0d47a1,#1565c0)}.id-photo{border:4px solid #fff;box-shadow:0 8px 24px rgba(0,0,0,.18);background:#eef3f8}.id-photo img{width:100%;height:100%;object-fit:cover;object-position:center}.id-line{display:flex;flex-direction:column;margin-top:9px}.id-line span{font-size:12px;color:#7b8794}.client-flow{display:grid;gap:12px}.client-flow>div{padding:13px 16px;border:1px solid var(--viti-border);border-radius:12px;background:var(--viti-surface-soft)}
</style>
