import {api} from '../boot/axios'
export function mediaUrl(path){
  if(typeof path!=='string'||!/^\/api\/v1\/sensaciones\/media\/\d+\/file$/.test(path))return undefined
  const root=String(api.defaults.baseURL||'/api/v1').replace(/\/api\/v1\/?$/,'')
  return root+path
}
