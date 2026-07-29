import api from '@/lib/api/client'
export interface Projeto { id:string; codigo:string; nome:string; patrocinador:string; capacidadeAlunas:number; dataInicio:string; dataTermino:string; descricao?:string; ativo:boolean }
export const getProjetos=()=>api.get<Projeto[]>('/api/projetos')
export const criarProjeto=(data:Partial<Projeto>)=>api.post<Projeto>('/api/projetos',data)
