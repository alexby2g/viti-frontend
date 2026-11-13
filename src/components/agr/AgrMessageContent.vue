<script setup>
import { computed } from 'vue'
import { parseAgrMarkdown } from '../../utils/agrMarkdown.mjs'

const props = defineProps({ content: { type: String, required: true } })
const blocks = computed(() => parseAgrMarkdown(props.content))
</script>

<template>
  <div class="agr-markdown">
    <template v-for="(block, blockIndex) in blocks" :key="blockIndex">
      <component :is="'h' + block.level" v-if="block.type === 'heading'" class="agr-markdown-heading">
        <template v-for="(part, partIndex) in block.spans" :key="partIndex">
          <strong v-if="part.kind === 'strong'">{{ part.text }}</strong>
          <code v-else-if="part.kind === 'code'">{{ part.text }}</code>
          <span v-else>{{ part.text }}</span>
        </template>
      </component>
      <pre v-else-if="block.type === 'code'"><code>{{ block.content }}</code></pre>
      <ol v-else-if="block.type === 'list' && block.ordered">
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <template v-for="(part, partIndex) in item" :key="partIndex">
            <strong v-if="part.kind === 'strong'">{{ part.text }}</strong>
            <code v-else-if="part.kind === 'code'">{{ part.text }}</code>
            <span v-else>{{ part.text }}</span>
          </template>
        </li>
      </ol>
      <ul v-else-if="block.type === 'list'">
        <li v-for="(item, itemIndex) in block.items" :key="itemIndex">
          <template v-for="(part, partIndex) in item" :key="partIndex">
            <strong v-if="part.kind === 'strong'">{{ part.text }}</strong>
            <code v-else-if="part.kind === 'code'">{{ part.text }}</code>
            <span v-else>{{ part.text }}</span>
          </template>
        </li>
      </ul>
      <p v-else-if="block.type === 'paragraph'">
        <template v-for="(part, partIndex) in block.spans" :key="partIndex">
          <strong v-if="part.kind === 'strong'">{{ part.text }}</strong>
          <code v-else-if="part.kind === 'code'">{{ part.text }}</code>
          <span v-else>{{ part.text }}</span>
        </template>
      </p>
    </template>
  </div>
</template>

<style scoped>
.agr-markdown{overflow-wrap:anywhere;line-height:1.55}
.agr-markdown p{white-space:pre-line;margin:0 0 9px}
.agr-markdown p:last-child,.agr-markdown ol:last-child,.agr-markdown ul:last-child{margin-bottom:0}
.agr-markdown-heading{font-size:14px;font-weight:700;line-height:1.35;color:#ddf5ff;margin:13px 0 6px;letter-spacing:normal}
.agr-markdown-heading:first-child{margin-top:0}
.agr-markdown ul,.agr-markdown ol{margin:4px 0 11px;padding-left:22px}
.agr-markdown li{margin-bottom:5px}
.agr-markdown strong{font-weight:750;color:#fff}
.agr-markdown code{background:rgba(75,156,220,.15);color:#b6edff;border-radius:4px;padding:1px 4px;font-size:.9em}
.agr-markdown pre{white-space:pre;max-width:100%;overflow-x:auto;border-radius:9px;border:1px solid rgba(120,200,230,.13);background:rgba(3,12,27,.7);padding:10px 12px;margin:9px 0;color:#e3f3ff}
.agr-markdown pre code{background:none;padding:0;color:inherit}
</style>
