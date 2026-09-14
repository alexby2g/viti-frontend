import fs from 'node:fs'
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),'utf8')
const page=read('src/pages/FormulariosVitiPage.vue')
const menu=read('src/navigation/mainMenu.js')
const routes=read('src/router/routes.js')
const api=fs.readFileSync(new URL('../../backend/routes/api.php',import.meta.url),'utf8')
const controller=fs.readFileSync(new URL('../../backend/app/Http/Controllers/CuestionarioController.php',import.meta.url),'utf8')
const migration=fs.readFileSync(new URL('../../backend/database/migrations/2026_09_11_120000_add_active_flags_to_questionnaire_content.php',import.meta.url),'utf8')
const checks=[
  ['page exists',page.includes('Formularios VITI')],
  ['menu entry',menu.includes("to: '/formularios-viti'")],
  ['protected route',routes.includes("name: 'formularios-viti'")&&routes.includes('superAdminOnly:true')],
  ['question CRUD',api.includes("cuestionario-preguntas/{pregunta}")&&api.includes("/duplicar")],
  ['section CRUD',api.includes("cuestionario-secciones/{seccion}")],
  ['history protection',controller.includes('Esta pregunta ya tiene respuestas')&&controller.includes('Desactívala en lugar de eliminarla')],
  ['single active form',controller.includes("update(['activo'=>false])")],
  ['active flags migration',migration.includes("cuestionario_preguntas")&&migration.includes("'activo'")],
  ['blank questions disabled',migration.includes("TRIM(pregunta) = ''")],
  ['preview present',page.includes('Vista previa')],
]
const failed=checks.filter(([,ok])=>!ok)
for(const [name,ok] of checks)console.log(`${ok?'PASS':'FAIL'} - ${name}`)
if(failed.length){process.exitCode=1}else console.log('VITI Forms Admin audit: PASS')
