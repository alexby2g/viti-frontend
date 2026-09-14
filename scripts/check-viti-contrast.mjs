import fs from 'node:fs'
const read=(p)=>fs.readFileSync(new URL(`../${p}`, import.meta.url),'utf8')
const app=read('src/css/app.scss'),agr=read('src/css/agr-viti.scss'),plans=read('src/components/public/PublicPlansCatalog.vue'),request=read('src/pages/PublicSolicitudStartPage.vue'),client=read('src/layouts/ClientHubLayout.vue')
const checks=[
 ['admin dark cards scoped to VITI shell',app.includes('.body--dark.viti-main-active .q-table,.body--dark.viti-main-active .q-card')],
 ['admin focused fields stay dark',app.includes('.body--dark.viti-main-active .q-field--focused .q-field__control')],
 ['auth fields use readable light text',app.includes('.agr-viti-auth .q-field__native')&&agr.includes('color:#f4f8fc!important')],
 ['public plans use dark surfaces',plans.includes('linear-gradient')&&plans.includes('#0a192a')],
 ['public request fields use dark surface',request.includes('background:#07192a!important')&&request.includes('border-color:#f28b30!important')],
 ['client portal uses dark shell',client.includes('background:#061425')&&client.includes('#081a2d')],
 ['admin shell has professional dark tokens',app.includes('--viti-bg:#061425')],
]
let ok=true;for(const [label,pass] of checks){console.log(`${pass?'PASS':'FAIL'} - ${label}`);if(!pass)ok=false}if(!ok)process.exit(1);console.log('VITI contrast regression: PASS')
