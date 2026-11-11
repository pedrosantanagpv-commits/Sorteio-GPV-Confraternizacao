import admin from 'firebase-admin';
import {randomInt,randomUUID} from 'node:crypto';

function firebaseAdmin(){
 if(!admin.apps.length){
  const json=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!json)throw Error('FIREBASE_SERVICE_ACCOUNT_JSON não configurado na Vercel.');
  const service=JSON.parse(json);
  admin.initializeApp({credential:admin.credential.cert(service)});
 }
 return admin;
}
const allowedActions=new Set(['init','setParticipants','setPrizes','select','announce','draw','reveal','reject','confirm','finish','resetTests']);
const empty=()=>({participants:[],prizes:[],winners:[],live:{phase:'idle',prizeId:'',candidateId:null,exclusions:[],attempt:0,startedAt:null},updatedAt:0});
const publicScreen=s=>{
 const p=s.prizes.find(p=>p.id===s.live.prizeId);
 const selected=s.live.phase==='candidate'||s.live.phase==='confirmed'?s.participants.find(p=>p.id===s.live.candidateId):null;
 return {phase:s.live.phase,startedAt:s.live.startedAt||null,prize:p?{name:p.name,description:p.description||'',emoji:p.emoji||'🎁',imageUrl:p.imageUrl||''}:null,candidate:selected?{name:selected.name,sector:selected.sector||'',visualProfile:selected.visualProfile||'neutro',artUrl:selected.artUrl||''}:null,attempt:s.live.attempt,updatedAt:s.updatedAt};
};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const fail=message=>{throw Error(message)};
function validateParticipants(incoming,old){
 if(!Array.isArray(incoming)||incoming.length>4000)fail('Limite de 4.000 participantes por evento.');
 const winnerIds=new Set(old.winners.map(w=>w.participantId)), seenId=new Set(), seenCodes=new Set(),seenNames=new Set();
 const oldMap=new Map(old.participants.map(p=>[p.id,p]));
 for(const p of incoming){
  if(p.artUrl!==undefined&&(typeof p.artUrl!=='string'||p.artUrl.length>600||Boolean(p.artUrl)&&!/^https:\/\/[^\s]+$/i.test(p.artUrl)))fail('URL da arte inválida. Utilize um link HTTPS público.');
  if(p.visualProfile!==undefined&&!['masculino','feminino','neutro'].includes(p.visualProfile))fail('Perfil visual inválido.');
  if(typeof p.id!=='string'||p.id.length>100||!p.id||typeof p.name!=='string'||!p.name.trim()||p.name.length>180||typeof p.code!=='string'||p.code.length>100||typeof p.sector!=='string'||p.sector.length>120||typeof p.active!=='boolean')fail('Dados de participantes inválidos.');
  if(seenId.has(p.id))fail('ID duplicado.');seenId.add(p.id);
  if(p.code.trim()){const code=norm(p.code);if(seenCodes.has(code))fail('Matrícula duplicada.');seenCodes.add(code)}
  const key=norm(p.name)+'|'+norm(p.sector);if(seenNames.has(key))fail('Nome e setor duplicados.');seenNames.add(key);
  if(winnerIds.has(p.id)){const prior=oldMap.get(p.id);if(!prior||prior.name!==p.name||prior.code!==p.code||prior.sector!==p.sector||prior.active!==p.active)fail('Não é permitido alterar participantes premiados.');}
 }
 for(const id of winnerIds)if(!seenId.has(id))fail('Não é permitido excluir ganhadores.');
 if(old.live.phase!=='idle'&&old.live.phase!=='confirmed')fail('Não edite participantes durante um sorteio.');
 if(old.live.candidateId&&!seenId.has(old.live.candidateId))fail('Participante relacionado ao sorteio atual.');
 return incoming.map(p=>({id:p.id,name:p.name.trim(),code:p.code.trim(),sector:p.sector.trim(),active:p.active,visualProfile:p.visualProfile||'neutro',artUrl:p.artUrl||''}));
}
function validatePrizes(incoming,old){
 if(!Array.isArray(incoming)||incoming.length>500)fail('Limite de 500 prêmios.');
 const ids=new Set();
 for(const p of incoming){
  if(p.imageUrl!==undefined&&(typeof p.imageUrl!=='string'||p.imageUrl.length>800||Boolean(p.imageUrl)&&!/^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/upload\//.test(p.imageUrl)))fail('Imagem do prêmio inválida. Faça o upload autorizado.');
  if(typeof p.id!=='string'||!p.id||p.id.length>100||typeof p.name!=='string'||!p.name.trim()||p.name.length>160||typeof p.description!=='string'||p.description.length>500||typeof p.emoji!=='string'||p.emoji.length>30||!Number.isInteger(p.quantity)||p.quantity<1||p.quantity>10000||typeof p.active!=='boolean')fail('Dados de prêmio inválidos.');
  if(ids.has(p.id))fail('ID de prêmio duplicado.');ids.add(p.id);
  const won=old.winners.filter(w=>w.prizeId===p.id).length;
  if(won>p.quantity)fail('Quantidade inferior aos ganhadores já registrados.');
 }
 for(const w of old.winners)if(!ids.has(w.prizeId))fail('Não exclua prêmios já sorteados.');
 if(old.live.phase!=='idle'&&old.live.phase!=='confirmed')fail('Não edite prêmios durante um sorteio.');
 return incoming.map(p=>({id:p.id,name:p.name.trim(),description:p.description.trim(),quantity:p.quantity,emoji:p.emoji,active:p.active,imageUrl:p.imageUrl||''}));
}
function apply(s,type,payload,uid){
 const phase=s.live.phase;
 if(type==='resetTests'){
  if(payload.confirmation!=='REINICIAR TESTES')fail('Digite REINICIAR TESTES para confirmar.');
  if(phase==='spinning'||phase==='candidate')fail('Conclua ou marque ausência antes de reiniciar os testes.');
  s.winners=[];
  s.live={phase:'idle',prizeId:'',candidateId:null,exclusions:[],attempt:0,startedAt:null};
  return s;
 }
 if(type==='setParticipants'){s.participants=validateParticipants(payload.participants,s);return s}
 if(type==='setPrizes'){s.prizes=validatePrizes(payload.prizes,s);if(!s.prizes.some(p=>p.id===s.live.prizeId)&&phase==='idle')s.live.prizeId='';return s}
 if(type==='select'){
  if(phase!=='idle')fail('Finalize o sorteio atual antes de trocar o prêmio.');
  if(payload.id&&!s.prizes.some(p=>p.id===payload.id&&p.active&&s.winners.filter(w=>w.prizeId===p.id).length<p.quantity))fail('Prêmio indisponível.');
  s.live={phase:'idle',prizeId:payload.id||'',candidateId:null,exclusions:[],attempt:0,startedAt:null};return s;
 }
 if(type==='announce'){
  if(phase!=='idle'&&phase!=='announced')fail('Finalize o sorteio atual antes de anunciar o prêmio.');
  const prize=s.prizes.find(p=>p.id===s.live.prizeId);
  if(!prize||!prize.active||s.winners.filter(w=>w.prizeId===prize.id).length>=prize.quantity)fail('Selecione um prêmio disponível.');
  s.live.phase='announced';return s;
 }
 if(type==='draw'){
  if(phase!=='announced')fail('Anuncie o prêmio no telão antes de iniciar o sorteio.');
  const prize=s.prizes.find(p=>p.id===s.live.prizeId);
  if(!prize||!prize.active||s.winners.filter(w=>w.prizeId===prize.id).length>=prize.quantity)fail('Selecione um prêmio disponível.');
  const won=new Set(s.winners.map(w=>w.participantId));const excluded=new Set(s.live.exclusions);
  const pool=s.participants.filter(p=>p.active&&!won.has(p.id)&&!excluded.has(p.id));
  if(!pool.length)fail('Não há participantes elegíveis nessa rodada.');
  const selected=pool[randomInt(pool.length)];
  s.live={...s.live,phase:'spinning',candidateId:selected.id,attempt:s.live.attempt+1,startedAt:Date.now()};return s;
 }
 if(type==='reveal'){
  if(phase!=='spinning')fail('Não há sorteio em animação.');
  if(Date.now()-(s.live.startedAt||0)<11800)fail('A animação ainda está em andamento.');
  s.live.phase='candidate';return s;
 }
 if(type==='reject'){
  if(phase!=='candidate')fail('Nenhum candidato aguardando presença.');
  s.live={...s.live,phase:'announced',candidateId:null,startedAt:null,exclusions:[...new Set([...s.live.exclusions,s.live.candidateId])]};return s;
 }
 if(type==='confirm'){
  if(phase!=='candidate')fail('Nenhum candidato aguardando presença.');
  const p=s.participants.find(p=>p.id===s.live.candidateId),pr=s.prizes.find(p=>p.id===s.live.prizeId);
  if(!p||!p.active||s.winners.some(w=>w.participantId===p.id)||!pr||!pr.active||s.winners.filter(w=>w.prizeId===pr.id).length>=pr.quantity)fail('Participante ou prêmio indisponível.');
  s.winners.push({id:randomUUID(),participantId:p.id,participantName:p.name,prizeId:pr.id,prizeName:pr.name,createdAt:Date.now(),operator:uid,attempt:s.live.attempt});s.live.phase='confirmed';return s;
 }
 if(type==='finish'){
  if(phase!=='confirmed')fail('Confirme o ganhador antes de encerrar.');
  const next=s.prizes.find(p=>p.active&&s.winners.filter(w=>w.prizeId===p.id).length<p.quantity);
  s.live={phase:'idle',prizeId:next?.id||'',candidateId:null,exclusions:[],attempt:0,startedAt:null};return s;
 }
 fail('Ação desconhecida.');
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'});
 try{
  const {type,payload={},eventId}=req.body||{};
  if(!allowedActions.has(type))return res.status(400).json({error:'Ação inválida.'});
  const event=process.env.EVENT_ID||'2026';
  if(eventId!==event)return res.status(400).json({error:'Evento não autorizado.'});
  const owner=(process.env.GPV_ADMIN_UID||'').trim();
  if(!owner)throw Error('GPV_ADMIN_UID não configurado na Vercel.');
  const match=/^Bearer (.+)$/.exec(req.headers.authorization||'');
  if(!match)return res.status(401).json({error:'Faça login novamente.'});
  const fb=firebaseAdmin(),decoded=await fb.auth().verifyIdToken(match[1],true);
  if(decoded.uid!==owner)return res.status(403).json({error:'Usuário sem permissão administrativa.'});
  const db=fb.firestore(),stateRef=db.doc(`events/${event}/state/current`),screenRef=db.doc(`events/${event}/screen/live`),adminRef=db.doc(`admins/${owner}`);
  await db.runTransaction(async tx=>{
   const previous=await tx.get(stateRef);
   let s=previous.exists?previous.data():empty();
   if(type==='init'){
    if(!previous.exists){s.updatedAt=Date.now();tx.set(stateRef,s);tx.set(screenRef,publicScreen(s));}
    tx.set(adminRef,{active:true,role:'admin',email:decoded.email||'',updatedAt:Date.now()},{merge:true});return;
   }
   if(!previous.exists)fail('Inicialize o evento antes de operar.');
   if(type==='resetTests'&&payload.confirmation==='REINICIAR TESTES'){
    if(s.live.phase==='spinning'||s.live.phase==='candidate')fail('Conclua ou marque ausência antes de reiniciar os testes.');
    const archiveRef=db.doc(`events/${event}/resetArchives/${randomUUID()}`);
    tx.set(archiveRef,{state:structuredClone(s),archivedAt:Date.now(),operator:decoded.uid,reason:'Reinicialização manual de testes'});
   }
   s=apply(structuredClone(s),type,payload,decoded.uid);
   s.updatedAt=Date.now();
   tx.set(stateRef,s);tx.set(screenRef,publicScreen(s));
  });
  return res.status(200).json({ok:true});
 }catch(err){console.error('GPV API:',err.message);const safe=/não |Nenhum |Nenhuma |Prêmio |Participante |Selecione |Já |Finalize |Dados |Limite |ID |Matrícula |Nome |Quantidade |A animação |Confirme |Evento |Ação |Usuário |Faça |Inicialize |Não há |Não edite |Digite |Conclua /.test(err.message);return res.status(safe?400:500).json({error:safe?err.message:'Falha na operação. Verifique as variáveis de ambiente e os logs da Vercel.'});}
}
