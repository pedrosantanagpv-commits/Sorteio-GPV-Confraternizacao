import admin from 'firebase-admin';
import {createHash,randomUUID} from 'node:crypto';

function getAdmin(){
 if(!admin.apps.length){
  const credentials=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if(!credentials)throw Error('FIREBASE_SERVICE_ACCOUNT_JSON não configurado.');
  admin.initializeApp({credential:admin.credential.cert(JSON.parse(credentials))});
 }
 return admin;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Método não permitido.'});
 try{
  const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];
  if(!token)return res.status(401).json({error:'Autenticação necessária.'});
  const decoded=await getAdmin().auth().verifyIdToken(token,true);
  if(!process.env.GPV_ADMIN_UID||decoded.uid!==process.env.GPV_ADMIN_UID.trim())return res.status(403).json({error:'Sem permissão para upload.'});
  const cloudName=process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey=process.env.CLOUDINARY_API_KEY;
  const secret=process.env.CLOUDINARY_API_SECRET;
  if(!cloudName||!apiKey||!secret)return res.status(503).json({error:'Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET na Vercel.'});
  const event=process.env.EVENT_ID||'2026';
  const folder=`gpv-sorteios/${event}/premios`;
  const timestamp=Math.floor(Date.now()/1000);
  const public_id=`premio_${randomUUID().replace(/-/g,'')}`;
  const signature=createHash('sha1').update(`folder=${folder}&public_id=${public_id}&timestamp=${timestamp}${secret}`).digest('hex');
  return res.status(200).json({cloud_name:cloudName,api_key:apiKey,folder,public_id,timestamp,signature});
 }catch(err){console.error('Erro na assinatura do upload:',err.message);return res.status(500).json({error:'Não foi possível autorizar o upload.'});}
}
