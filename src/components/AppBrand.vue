<script setup>
import { useBrandingStore } from '../stores/branding'

const branding = useBrandingStore()
</script>

<template>
  <div class="agr-product-brand row items-center no-wrap">
    <div class="agr-mark" aria-hidden="true">
      <img v-if="branding.logoUrl" :src="branding.logoUrl" alt="" />
      <span v-else>AGR</span>
    </div>
    <div class="q-ml-sm brand-copy">
      <div class="studio-line">{{ branding.studio_name }}</div>
      <div class="product-line">{{ branding.product_name }}</div>
      <div class="brand-meaning">{{ branding.product_meaning }}</div>
      <div class="brand-caption">{{ branding.tagline }}</div>
    </div>
  </div>
</template>

<style scoped>
.agr-product-brand{color:inherit;min-width:0}.agr-mark{position:relative;display:grid;place-items:center;width:46px;height:46px;flex:0 0 46px;border-radius:12px;background:#111115;border:1px solid #303038;color:#f7f7f8;font-size:13px;font-weight:900;letter-spacing:.12em;overflow:hidden}.agr-mark:after{content:'';position:absolute;left:8px;right:8px;bottom:5px;height:2px;border-radius:99px;background:linear-gradient(90deg,var(--q-primary),var(--q-accent));opacity:.9}.agr-mark img{width:100%;height:100%;object-fit:contain;padding:4px;background:#fff}.brand-copy{min-width:0}.studio-line{font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;opacity:.62}.product-line{font-size:24px;font-weight:850;letter-spacing:.16em;line-height:1.08}.brand-meaning{font-size:9.5px;line-height:1.22;font-weight:700;opacity:.82;max-width:186px;margin-top:3px}.brand-caption{font-size:9px;line-height:1.2;opacity:.56;max-width:186px;margin-top:2px}
</style>
