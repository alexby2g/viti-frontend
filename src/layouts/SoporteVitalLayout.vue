<script setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'

const $q=useQuasar(),router=useRouter(),drawer=ref($q.screen.gt.sm)
const menu=[
  {label:'Inicio',icon:'dashboard',to:'/apps/servicio-tecnico/inicio'},
  {label:'Clientes',icon:'people',to:'/apps/servicio-tecnico/clientes'},
  {label:'Computadoras',icon:'computer',to:'/apps/servicio-tecnico/equipos'},
  {label:'Técnicos',icon:'engineering',to:'/apps/servicio-tecnico/tecnicos'},
  {label:'Órdenes de servicio',icon:'fact_check',to:'/apps/servicio-tecnico/ordenes'},
  {label:'Agenda',icon:'calendar_month',to:'/apps/servicio-tecnico/agenda'},
]
const pending=[
  {label:'Fotografías por orden',icon:'photo_camera'},
  {label:'Pagos y saldos',icon:'payments'},
  {label:'Reportes finales',icon:'analytics'},
]
function back(){router.push('/aplicaciones')}
</script>

<template>
<q-layout view="lHh Lpr lFf" class="support-shell">
  <q-header bordered class="support-header">
    <q-toolbar class="q-px-md">
      <q-btn flat round dense icon="menu" @click="drawer=!drawer"/>
      <div class="q-ml-md">
        <div class="row items-center q-gutter-sm"><strong>Soporte Vital PC</strong><q-badge color="orange" label="V0.5 · 50%"/></div>
        <div class="text-caption">Sistema de gestión de reparación y mantenimiento de computadoras</div>
      </div>
      <q-space/>
      <q-btn flat no-caps icon="arrow_back" label="Volver a VITI" @click="back"/>
    </q-toolbar>
  </q-header>

  <q-drawer v-model="drawer" show-if-above :breakpoint="900" :width="270" class="support-drawer">
    <div class="column fit no-wrap">
      <div class="q-pa-lg">
        <div class="row items-center q-gutter-md"><q-avatar color="primary" text-color="white" icon="computer"/><div><div class="text-weight-bold">Soporte Vital PC</div><div class="text-caption">En desarrollo</div></div></div>
        <q-linear-progress :value=".5" rounded size="8px" color="orange" class="q-mt-md"/>
        <div class="text-caption q-mt-xs">Avance actual: 50%</div>
      </div>
      <q-separator/>
      <q-scroll-area class="col">
        <q-list padding>
          <q-item v-for="item in menu" :key="item.to" clickable v-ripple :to="item.to" exact>
            <q-item-section avatar><q-icon :name="item.icon"/></q-item-section><q-item-section>{{item.label}}</q-item-section>
          </q-item>
          <q-separator class="q-my-md"/>
          <div class="text-overline q-px-md text-grey-6">Siguiente etapa</div>
          <q-item v-for="item in pending" :key="item.label" disable>
            <q-item-section avatar><q-icon :name="item.icon"/></q-item-section><q-item-section>{{item.label}}</q-item-section><q-item-section side><q-badge outline color="grey" label="Pendiente"/></q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </div>
  </q-drawer>

  <q-page-container><router-view/></q-page-container>
</q-layout>
</template>

<style scoped>
.support-shell{background:var(--viti-bg)}
.support-header{background:#0d315b;color:#fff}
.support-drawer{background:#102f54;color:#fff}
.support-drawer :deep(.q-item.q-router-link--active){background:rgba(255,255,255,.12);color:#fff}
</style>
