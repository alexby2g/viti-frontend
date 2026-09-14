<script setup>
import { useBrandingStore } from '../stores/branding'
import packageMeta from '../../package.json'

const branding = useBrandingStore()
const vitiVersion = packageMeta.version
</script>

<template>
  <div class="viti-product-brand row items-center no-wrap">
    <div class="viti-mark" aria-hidden="true">
      <img v-if="branding.logoUrl" :src="branding.logoUrl" alt="" />
      <span v-else>V</span>
    </div>
    <div class="q-ml-sm brand-copy">
      <div class="product-line">{{ branding.product_name }}</div>
      <div class="brand-meaning">{{ branding.product_meaning }}</div>
      <div class="brand-caption">{{ branding.tagline }}</div>
      <div class="studio-line">Tecnología desarrollada por {{ branding.studio_name }}</div>
      <div class="brand-version">v{{ vitiVersion }}</div>
    </div>
  </div>
</template>

<style scoped>
.viti-product-brand{color:inherit;min-width:0}.viti-mark{position:relative;display:grid;place-items:center;width:46px;height:46px;flex:0 0 46px;border-radius:12px;background:linear-gradient(145deg,#0c2340,#1457b8);border:1px solid #315171;color:#f7faff;font-size:21px;font-weight:950;letter-spacing:.02em;overflow:hidden}.viti-mark:after{content:'';position:absolute;left:8px;right:8px;bottom:5px;height:2px;border-radius:99px;background:#f28b30;opacity:.95}.viti-mark img{width:100%;height:100%;object-fit:contain;padding:4px;background:#fff}.brand-copy{min-width:0}.product-line{font-size:24px;font-weight:900;letter-spacing:.15em;line-height:1.02}.brand-meaning{font-size:9.5px;line-height:1.2;font-weight:700;opacity:.84;max-width:200px;margin-top:3px}.brand-caption{font-size:9px;line-height:1.2;opacity:.58;max-width:200px;margin-top:2px}.studio-line{font-size:8px;line-height:1.2;opacity:.48;max-width:205px;margin-top:4px}.brand-version{font-size:7.5px;line-height:1.1;opacity:.38;max-width:186px;margin-top:2px;letter-spacing:.08em;text-transform:uppercase}
</style>
