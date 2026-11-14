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
.viti-product-brand{color:inherit;min-width:0;gap:2px}
.viti-mark{display:grid;place-items:center;width:42px;height:42px;flex:0 0 42px;border-radius:11px;background:linear-gradient(140deg,#30291b,#171716);border:1px solid rgba(211,172,99,.45);color:#eccb84;font-size:23px;font-weight:900;letter-spacing:.01em;overflow:hidden}
.viti-mark img{width:100%;height:100%;object-fit:contain;padding:4px;background:#151515}
.brand-copy{min-width:0}
.product-line{font-size:25px;font-weight:900;letter-spacing:.16em;line-height:1.05;color:#f8f5ee}
.brand-meaning{font-size:9px;line-height:1.35;font-weight:650;opacity:.8;max-width:190px;margin-top:4px}
.brand-caption{font-size:9px;line-height:1.3;opacity:.66;max-width:192px;margin-top:3px}
.studio-line{font-size:8px;line-height:1.25;opacity:.55;max-width:195px;margin-top:5px}
.brand-version{font-size:8px;line-height:1.15;opacity:.42;max-width:186px;margin-top:3px;letter-spacing:.08em;text-transform:uppercase}
</style>
