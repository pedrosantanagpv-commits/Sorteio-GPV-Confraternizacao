import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';

// Identificadores públicos do SDK Web; não são credenciais administrativas.
const firebaseConfig={
 apiKey:import.meta.env.VITE_FIREBASE_API_KEY,
 authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
 projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,
 storageBucket:import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
 messagingSenderId:import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
 appId:import.meta.env.VITE_FIREBASE_APP_ID,
};
export const configured=Boolean(firebaseConfig.apiKey&&firebaseConfig.projectId&&firebaseConfig.appId);
export const app=configured?initializeApp(firebaseConfig):null;
export const auth=app?getAuth(app):null;
export const db=app?getFirestore(app):null;
export const eventId=import.meta.env.VITE_EVENT_ID||'2026';
export const freshState=()=>({participants:[],prizes:[],winners:[],live:{phase:'idle',prizeId:'',candidateId:null,exclusions:[],attempt:0,startedAt:null},updatedAt:0});
export async function sendAction(type,payload={}){
 if(!auth?.currentUser)throw Error('Sessão expirada. Entre novamente.');
 const token=await auth.currentUser.getIdToken();
 const response=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({type,eventId,payload})});
 let result;try{result=await response.json()}catch{throw Error(`Servidor indisponível (${response.status}).`)}
 if(!response.ok)throw Error(result.error||`Erro ${response.status}`);
 return result;
}
