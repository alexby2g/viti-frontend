<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
const auth=useAuthStore(),router=useRouter(),name=computed(()=>auth.user?.nombre||'Cliente')
async function logout(){await auth.logout();router.replace('/electrofrio/acceso')}
</script>
<template><q-layout view="hHh lpR fFf" class="customer-shell"><q-header class="customer-header"><q-toolbar><q-avatar color="white" text-color="primary" icon="ac_unit"/><div class="q-ml-md"><div class="text-weight-bold">Electrofrío</div><div class="text-caption">Portal del cliente</div></div><q-space/><div class="gt-xs q-mr-md">{{name}}</div><q-btn flat round icon="logout" @click="logout"/></q-toolbar></q-header><q-footer bordered class="customer-tabs"><q-tabs dense no-caps active-color="primary" indicator-color="primary"><q-route-tab icon="home" label="Inicio" to="/portal/electrofrio/inicio"/><q-route-tab icon="forum" label="Mensajes" to="/portal/electrofrio/mensajes"/></q-tabs></q-footer><q-page-container><router-view/></q-page-container></q-layout></template>
<style scoped>.customer-shell{background:#eef5fb;color:#123047}.customer-header{background:linear-gradient(135deg,#0b3d68,#0f6fa4 60%,#00a6b6)}.customer-tabs{background:#fff;color:#607d8b}.customer-header :deep(.q-toolbar){min-height:64px}@media(min-width:900px){.customer-tabs{left:50%;transform:translateX(-50%);width:420px;border-radius:18px 18px 0 0;box-shadow:0 -8px 24px rgba(11,95,122,.1)}}</style>
