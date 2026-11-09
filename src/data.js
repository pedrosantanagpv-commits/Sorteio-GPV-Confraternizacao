export const STORAGE_KEY = 'gpv-sorteios-v010';
const people = [
  ['Ana Carolina','Comercial'],['Bruno Henrique','Administrativo'],['Camila Oliveira','Marketing'],['Daniel Ferreira','Tecnologia'],
  ['Eduarda Lima','Financeiro'],['Felipe Santos','Comercial'],['Gabriela Rocha','Operacional'],['Henrique Moura','Rastreio'],
  ['Isabela Costa','Atendimento'],['João Victor','Comercial'],['Karina Almeida','RH'],['Lucas Barbosa','Marketing'],
  ['Mariana Ribeiro','Administrativo'],['Nicolas Souza','Tecnologia'],['Olívia Martins','Cobrança'],['Paulo César','Operacional'],
  ['Rafaela Gomes','Financeiro'],['Samuel Araújo','Comercial'],['Tatiane Nunes','Atendimento'],['Vinícius Carvalho','Rastreio'],
  ['Wesley Pereira','Comercial'],['Yasmin Melo','RH'],['Beatriz Correia','Regulação'],['Arthur Monteiro','Comercial']
];
export const demoState = () => ({
  participants: people.map(([name, sector],i)=>({id:`demo-${i+1}`, name, sector, code:`GPV-${String(i+1).padStart(3,'0')}`, active:true})),
  prizes: [
    {id:'p1',name:'Smart TV 50 polegadas',description:'Uma noite ainda mais especial',quantity:1,active:true,emoji:'📺'},
    {id:'p2',name:'Air Fryer Digital',description:'Praticidade para o dia a dia',quantity:2,active:true,emoji:'🎁'},
    {id:'p3',name:'Vale-compras R$ 500',description:'Um presente para escolher',quantity:3,active:true,emoji:'🎫'},
    {id:'p4',name:'Caixa de Som Bluetooth',description:'A trilha sonora da próxima festa',quantity:2,active:true,emoji:'🔊'},
    {id:'p5',name:'Kit Premium GPV',description:'Um presente especial da nossa equipe',quantity:4,active:true,emoji:'🏆'}
  ],
  winners:[],
  live:{phase:'idle', prizeId:'p1', candidateId:null, exclusions:[], attempt:0,startedAt:null},
  updatedAt:Date.now()
});
export function normalize(v){return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g,' ')}
export function randomIndex(length){
  if (!Number.isSafeInteger(length)||length<=0) throw Error('Lista vazia');
  const limit = Math.floor(4294967296/length)*length;
  const array = new Uint32Array(1); let n;
  do {crypto.getRandomValues(array);n=array[0]}while(n>=limit);
  return n%length;
}
export function formatTime(value){return new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}
export function toCSV(rows){return '\uFEFF'+rows.map(row=>row.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(';')).join('\r\n')}
export function downloadText(filename,contents,type='text/csv;charset=utf-8'){const blob=new Blob([contents],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200)}
