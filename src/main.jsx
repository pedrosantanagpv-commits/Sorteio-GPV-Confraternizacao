import React, {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LayoutDashboard,Users,Gift,Shuffle,History,Settings,ExternalLink,Monitor,Radio,LogOut,Plus,Upload,Search,ChevronRight,ChevronDown,CheckCircle2,XCircle,Clock,UserRound,ArrowRight,RotateCcw,AlertTriangle,X,Menu,Download,Trash2,Pencil,Play,Pause,ShieldCheck,Info,FileSpreadsheet,Maximize2,Sparkles,PartyPopper,Volume2,VolumeX,Check,MinusCircle} from 'lucide-react';
import Papa from 'papaparse';
import {STORAGE_KEY,demoState,normalize,randomIndex,formatTime,toCSV,downloadText} from './data';
import './styles.css';
import {onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'firebase/auth';
import {onSnapshot,doc} from 'firebase/firestore';
import {auth,db,configured,eventId,freshState,sendAction} from './firebase';

const links=[['/admin',LayoutDashboard,'Dashboard'],['/admin/participantes',Users,'Participantes'],['/admin/premios',Gift,'Prêmios'],['/admin/sorteio',Shuffle,'Sorteio ao vivo'],['/admin/historico',History,'Histórico'],['/admin/configuracoes',Settings,'Configurações']];
const phases={idle:'Aguardando',announced:'Prêmio anunciado',spinning:'Sorteando',candidate:'Arte revelada · validar presença',confirmed:'Premiação confirmada'};
const visualLabels={masculino:'Gladiador',feminino:'Gladiadora',neutro:'Gladiador(a)'};
const visualOf=p=>['masculino','feminino','neutro'].includes(p?.visualProfile)?p.visualProfile:'neutro';
function App(){
 const [route,setRoute]=useState(location.pathname==='/'?'/admin':location.pathname);
 const [sidebar,setSidebar]=useState(false),[toast,setToast]=useState('');
 const [user,setUser]=useState(undefined),[state,setState]=useState(freshState),[publicState,setPublicState]=useState(null);
 const [authError,setAuthError]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[logging,setLogging]=useState(false),[loading,setLoading]=useState(true);
 const stateRef=useRef(state);stateRef.current=state;
 const isTel=route.startsWith('/telao');
 const demoTel=isTel&&new URLSearchParams(window.location.search).get('demo')==='1';
 const notice=(m)=>setToast(m);
 useEffect(()=>{if(!auth){setUser(null);return}return onAuthStateChanged(auth,setUser,()=>setUser(null))},[]);
 useEffect(()=>{if(demoTel||!configured||!db)return;return onSnapshot(doc(db,'events',eventId,'screen','live'),snap=>setPublicState(snap.exists()?snap.data():null),e=>{if(isTel)setAuthError('Sem acesso ao telão: '+e.message)})},[isTel,demoTel]);
 useEffect(()=>{
  if(demoTel||!user||!db){setLoading(false);return}
  let active=true;let unsub=()=>{};setLoading(true);
  (async()=>{
   try{await sendAction('init');if(!active)return;
    unsub=onSnapshot(doc(db,'events',eventId,'state','current'),snap=>{if(snap.exists()){setState(snap.data());setLoading(false)}},e=>{setAuthError('Firestore: '+e.message);setLoading(false)});
   }catch(e){if(active){setAuthError(e.message);setLoading(false)}}
  })();return()=>{active=false;unsub()};
 },[user,demoTel]);
 useEffect(()=>{const handler=()=>setRoute(location.pathname==='/'?'/admin':location.pathname);window.addEventListener('popstate',handler);return()=>window.removeEventListener('popstate',handler)},[]);
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(t)},[toast]);
 const navigate=target=>{history.pushState({},'',target);setRoute(target);setSidebar(false);window.scrollTo(0,0)};
 const action=async(type,payload={})=>{try{await sendAction(type,payload);return true}catch(e){notice(e.message);return false}};
 const mutate=useCallback(fn=>{
  const old=stateRef.current,next=fn(old);if(next===old)return;
  const peopleChange=JSON.stringify(next.participants)!==JSON.stringify(old.participants);
  const prizeChange=JSON.stringify(next.prizes)!==JSON.stringify(old.prizes);
  if(peopleChange&&!prizeChange)action('setParticipants',{participants:next.participants});
  else if(prizeChange&&!peopleChange)action('setPrizes',{prizes:next.prizes});
  else notice('Operação indisponível. Use os controles oficiais do sorteio.');
 },[]);
 const wonIds=useMemo(()=>new Set(state.winners.map(w=>w.participantId)),[state.winners]);
 const active=state.participants.filter(p=>p.active&&!wonIds.has(p.id));
 const remaining=p=>Math.max(0,p.quantity-state.winners.filter(w=>w.prizeId===p.id).length);
 const prizesRemaining=state.prizes.reduce((n,p)=>n+(p.active?remaining(p):0),0);
 const currentPrize=state.prizes.find(p=>p.id===state.live.prizeId);
 const selected=state.participants.find(p=>p.id===state.live.candidateId);
 const eligibility=active.filter(p=>!state.live.exclusions.includes(p.id));
 const choosePrize=id=>action('select',{id});
 const announcePrize=()=>action('announce');
 const beginDraw=()=>action('draw');
 useEffect(()=>{
  if(!user||state.live.phase!=='spinning')return;
  const delay=Math.max(0,12100-(Date.now()-(state.live.startedAt||Date.now())));
  const timeout=setTimeout(()=>action('reveal'),delay);
  return()=>clearTimeout(timeout);
 },[user,state.live.phase,state.live.startedAt]);
 const reject=()=>action('reject'),confirm=()=>action('confirm'),finish=()=>action('finish');
 const stats=[{label:'Participantes',value:state.participants.length,icon:Users},{label:'Elegíveis',value:active.length,icon:ShieldCheck},{label:'Prêmios restantes',value:prizesRemaining,icon:Gift},{label:'Ganhadores',value:state.winners.length,icon:PartyPopper}];
 const common={state,mutate,notice,navigate,wonIds,remaining,active,prizesRemaining};
 if(isTel&&demoTel)return <DemoTelon onExit={()=>{window.location.href='/admin'}}/>;
 if(isTel){
  const live=publicState?{phase:publicState.phase,prizeId:'public',candidateId:publicState.candidate?.name||null,exclusions:[],attempt:publicState.attempt||0,startedAt:publicState.startedAt}:freshState().live;
  const safeState={participants:[],winners:[],live};
  return <Telon state={safeState} selected={publicState?.candidate||null} prize={publicState?.prize||null} onExit={()=>navigate('/admin')}/>;
 }
 if(!configured)return <div className="login-stage"><div className="login-box"><div className="login-logo">GPV <span>SORTEIOS</span></div><h1>Firebase não configurado</h1><p>Adicione as variáveis VITE_FIREBASE_* no projeto da Vercel e publique novamente.</p></div></div>;
 const doLogin=async e=>{e.preventDefault();setLogging(true);setAuthError('');try{await signInWithEmailAndPassword(auth,email.trim(),password)}catch(e){setAuthError('E-mail ou senha inválidos, ou login não autorizado.')}finally{setLogging(false)}};
 if(user===undefined||loading&&user)return <div className="login-stage"><div className="login-box"><div className="login-logo">GPV <span>SORTEIOS</span></div><h2>Conectando ao evento...</h2>{authError&&<p className="login-error">{authError}</p>}</div></div>;
 if(!user)return <div className="login-stage"><form className="login-box" onSubmit={doLogin}><div className="login-logo">GPV <span>SORTEIOS</span></div><small>CONFRATERNIZAÇÃO 2026</small><h1>Acesso do operador</h1><p>Entre com o usuário autorizado no Firebase Authentication.</p><label>E-mail<input type="email" required autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seu@email.com"/></label><label>Senha<input type="password" required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Sua senha"/></label>{authError&&<div className="login-error">{authError}</div>}<button className="button button-primary button-large" disabled={logging}>{logging?'Entrando...':'ENTRAR NO PAINEL'} <ArrowRight size={18}/></button></form></div>;
 if(authError)return <div className="login-stage"><div className="login-box"><h2>Configuração pendente</h2><p className="login-error">{authError}</p><p>Confira GPV_ADMIN_UID, FIREBASE_SERVICE_ACCOUNT_JSON e as regras do Firestore.</p><button className="button button-outline" onClick={()=>signOut(auth)}>Sair</button></div></div>;
 return <div className="app-shell">
  {sidebar&&<div className="mobile-overlay" onClick={()=>setSidebar(false)} />}
  <aside className={'sidebar '+(sidebar?'open':'')}>
   <div className="brand"><div className="brand-mark">G<span>✦</span></div><div><strong>GPV<span> SORTEIOS</span></strong><small>CONFRATERNIZAÇÃO 2026</small></div></div>
   <div className="side-caption">MENU PRINCIPAL</div>
   <nav>{links.map(([href,Icon,label])=><button key={href} className={'nav-link '+(route===href?'active':'')} onClick={()=>navigate(href)}><Icon size={18}/><span>{label}</span>{route===href&&<span className="active-dot"/>}</button>)}</nav>
   <div className="sidebar-bottom"><div className="side-promo"><Sparkles size={20}/><strong>É tempo de celebrar.</strong><span>Grandes momentos merecem grandes premiações.</span></div><div className="side-footer"><span className="status-dot"/> Firebase conectado <span>v0.3.6</span></div></div>
  </aside>
  <div className="main-side"><header className="topbar"><div className="top-left"><button className="icon-button mobile-menu" onClick={()=>setSidebar(true)}><Menu size={20}/></button><div className="breadcrumb">GPV Sorteios <ChevronRight size={14}/><strong>{links.find(l=>l[0]===route)?.[2]||'Dashboard'}</strong></div></div><div className="header-actions"><span className="demo-indicator"><span className="status-dot"/> FIREBASE AO VIVO</span><button className="button button-outline tel-btn" onClick={()=>window.open('/telao','_blank')}><Monitor size={16}/> Abrir telão <ExternalLink size={14}/></button><button className="icon-button" title="Sair" onClick={()=>signOut(auth)}><LogOut size={18}/></button><div className="avatar">GP</div></div></header>
   <main className="page">
    {(route==='/admin'||route==='/')&&<Dashboard {...common} stats={stats}/>}
    {route==='/admin/participantes'&&<Participants {...common}/>}
    {route==='/admin/premios'&&<Prizes {...common}/>}
    {route==='/admin/sorteio'&&<Draw {...common} prize={currentPrize} selected={selected} eligibility={eligibility} choosePrize={choosePrize} beginDraw={beginDraw} announcePrize={announcePrize} reject={reject} confirm={confirm} finish={finish}/>}
    {route==='/admin/historico'&&<HistoryPage {...common}/>}
    {route==='/admin/configuracoes'&&<Preferences {...common} action={action}/>}
    {!links.some(l=>l[0]===route)&&route!=='/'&&<Dashboard {...common} stats={stats}/>}
   </main><footer className="app-footer">GPV ASSOCIADOS <span>•</span> Sorteios 2026 <span>•</span> Firebase · v0.3.6</footer>
  </div>{toast&&<div className="toast"><Info size={17}/>{toast}<button onClick={()=>setToast('')}><X size={15}/></button></div>}
 </div>;
}
function PageHeader({eyebrow,title,description,children}){return <div className="page-heading"><div><div className="eyebrow"><span className="tiny-diamond"/> {eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{children&&<div className="heading-actions">{children}</div>}</div>}
function Stat({item}){const Icon=item.icon;return <div className="stat-card"><div className="stat-top"><span>{item.label}</span><div className="stat-icon"><Icon size={19}/></div></div><strong>{String(item.value).padStart(2,'0')}</strong><div className="stat-detail"><span className="mini-line"/>Atualizado em tempo real*</div></div>}
function Dashboard({state,navigate,stats,remaining,active}){const next=state.prizes.find(p=>p.active&&remaining(p)>0);const recent=[...state.winners].reverse().slice(0,4);return <>
 <PageHeader eyebrow="VISÃO GERAL" title={<>Bem-vindo ao <em>GPV Sorteios.</em></>} description="Tudo pronto para uma confraternização inesquecível? Acompanhe os números do evento." ><button className="button button-primary" onClick={()=>navigate('/admin/sorteio')}><Shuffle size={17}/> Ir para o sorteio <ArrowRight size={16}/></button></PageHeader>
 <div className="demo-alert"><Info size={18}/><span><b>Firebase conectado.</b> Cadastre participantes e prêmios para iniciar a confraternização. O telão está sincronizado em tempo real.</span></div>
 <div className="stats-grid">{stats.map(i=><Stat key={i.label} item={i}/>)}</div>
 <div className="dashboard-grid"><section className="feature-panel"><div className="feature-glow"/><div className="eyebrow light"><Sparkles size={14}/> A NOITE É DE CELEBRAR</div><h2>Uma celebração.<br/><span>Infinitas conquistas.</span></h2><p>Prepare o próximo grande momento. Controle a premiação enquanto o público acompanha tudo no telão.</p><button className="button button-primary" onClick={()=>navigate('/admin/sorteio')}>Iniciar operação <ArrowRight size={17}/></button><div className="feature-watermark">2026</div></section>
 <section className="surface-card next-prize"><div className="card-heading"><div><span className="eyebrow">PRÓXIMA PREMIAÇÃO</span><h3>Prêmio da vez</h3></div><span className="outline-tag">{next?'Disponível':'Concluído'}</span></div>{next?<><div className="prize-art"><span>{next.emoji||'🎁'}</span></div><h3>{next.name}</h3><p>{next.description||'Um presente especial para esta noite.'}</p><div className="prize-meta"><Gift size={15}/>{remaining(next)} {remaining(next)===1?'unidade disponível':'unidades disponíveis'}</div></>:<div className="empty-small">Todos os prêmios foram distribuídos.</div>}</section></div>
 <section className="surface-card table-section"><div className="card-heading"><div><span className="eyebrow">ACOMPANHAMENTO</span><h3>Últimos ganhadores</h3></div><button className="text-button" onClick={()=>navigate('/admin/historico')}>Ver histórico <ArrowRight size={15}/></button></div>{recent.length?<div className="winners-list">{recent.map(w=><div className="winner-row" key={w.id}><div className="winner-badge"><Check size={16}/></div><div><strong>{w.participantName}</strong><small>{w.prizeName}</small></div><span>{formatTime(w.createdAt)}</span></div>)}</div>:<div className="empty-list"><div className="empty-graphic"><Gift size={28}/></div><strong>Os melhores momentos ainda estão por vir.</strong><p>Os ganhadores aparecerão aqui após a confirmação dos sorteios.</p></div>}</section>
 </>}
function Modal({title,description,onClose,children}){return <div className="modal-shade" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><div className="modal-header"><div><h3>{title}</h3>{description&&<p>{description}</p>}</div><button className="icon-button" onClick={onClose}><X size={19}/></button></div>{children}</div></div>}
function Participants({state,mutate,notice,wonIds,active}){
 const [query,setQuery]=useState('');const [filter,setFilter]=useState('todos');const [modal,setModal]=useState(null);const [form,setForm]=useState({name:'',sector:'',code:'',visualProfile:'neutro'});const [uploadingArt,setUploadingArt]=useState(false);const [importRows,setImportRows]=useState(null);const [importName,setImportName]=useState('');const [importError,setImportError]=useState('');
 const list=state.participants.filter(p => {
  const matchesSearch = normalize(`${p.name} ${p.sector} ${p.code}`).includes(normalize(query));
  const matchesFilter = filter === 'todos' ||
    (filter === 'elegiveis' && p.active && !wonIds.has(p.id)) ||
    (filter === 'premiados' && wonIds.has(p.id)) ||
    (filter === 'inativos' && !p.active);
  return matchesSearch && matchesFilter;
 });
 const openForm=(p)=>{if(uploadingArt)return;setForm(p?{...p}:{name:'',sector:'',code:'',visualProfile:'neutro',artUrl:''});setModal('form')};
 const uploadParticipantArt=async(file)=>{
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){notice('Selecione JPG, PNG ou WebP.');return}
  if(file.size>5*1024*1024){notice('A arte deve ter até 5 MB.');return}
  setUploadingArt(true);
  try{
   if(!auth?.currentUser)throw Error('Sessão expirada. Entre novamente.');
   const token=await auth.currentUser.getIdToken();
   const signedRes=await fetch('/api/upload-sign',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({kind:'participante'})});
   const signed=await signedRes.json();if(!signedRes.ok)throw Error(signed.error||'Falha ao autorizar o envio.');
   const data=new FormData();data.append('file',file);
   for(const key of ['api_key','folder','public_id','timestamp','signature'])data.append(key,String(signed[key]));
   const response=await fetch(`https://api.cloudinary.com/v1_1/${signed.cloud_name}/image/upload`,{method:'POST',body:data});
   const result=await response.json();if(!response.ok||!result.secure_url)throw Error(result.error?.message||'Falha ao enviar a arte.');
   setForm(current=>({...current,artUrl:result.secure_url}));notice('Arte enviada! Clique em Salvar participante para vincular.');
  }catch(e){notice(e.message||'Falha no upload da arte.')}finally{setUploadingArt(false)}
 };
 const save=()=>{if(uploadingArt){notice('Aguarde o envio da arte terminar.');return}if(!form.name.trim()){notice('Informe o nome do participante.');return}const code=normalize(form.code),name=normalize(form.name),sector=normalize(form.sector);if(state.participants.some(p=>p.id!==form.id&&((code&&normalize(p.code)===code)||(!code&&!p.code&&normalize(p.name)===name&&normalize(p.sector)===sector)))){notice('Participante duplicado: confira nome ou matrícula.');return}
  mutate(s=>({...s,participants:form.id?s.participants.map(p=>p.id===form.id?{...p,...form,name:form.name.trim(),sector:form.sector.trim(),code:form.code.trim(),visualProfile:form.visualProfile||'neutro',artUrl:(form.artUrl||'').trim()}:p):[...s.participants,{id:crypto.randomUUID(),name:form.name.trim(),sector:form.sector.trim(),code:form.code.trim(),visualProfile:form.visualProfile||'neutro',artUrl:(form.artUrl||'').trim(),active:true}]}));setModal(null);notice('Participante salvo com sucesso.')};
 const remove=p=>{if(wonIds.has(p.id)||state.live.candidateId===p.id){notice('Não é possível excluir um participante relacionado a sorteios.');return}if(!window.confirm(`Excluir ${p.name}?`))return;mutate(s=>({...s,participants:s.participants.filter(x=>x.id!==p.id)}))};
 const toggle=p=>{if(state.live.phase!=='idle'&&state.live.phase!=='confirmed'){notice('Não altere participantes durante um sorteio em andamento.');return}mutate(s=>({...s,participants:s.participants.map(x=>x.id===p.id?{...x,active:!x.active}:x)}))};
 const processFile=async file=>{if(!file)return;setImportError('');setImportRows(null);setImportName(file.name);try{let rows=[];
  if(file.name.toLowerCase().endsWith('.csv')){const text=await file.text();const result=Papa.parse(text,{header:true,skipEmptyLines:true,delimiter:'',transformHeader:h=>normalize(h).replace(/[^a-z0-9]/g,'')});if(result.errors.length&&result.data.length===0)throw Error('CSV inválido');rows=result.data}
  else if(file.name.toLowerCase().endsWith('.xlsx')){const ExcelJS=(await import('exceljs')).default;const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await file.arrayBuffer());const sheet=workbook.worksheets[0];if(!sheet)throw Error('Planilha vazia');const headers=[];sheet.getRow(1).eachCell((cell,i)=>headers[i-1]=normalize(cell.text).replace(/[^a-z0-9]/g,''));sheet.eachRow((row,n)=>{if(n===1)return;const item={};headers.forEach((h,i)=>{item[h]=String(row.getCell(i+1).text||'').trim()});rows.push(item)})}
  else throw Error('Envie um arquivo CSV ou XLSX.');
  const mapped=rows.map(r=>({name:String(r.nome||r.name||'').trim(),code:String(r.matricula||r.codigo||r.id||r.identificador||'').trim(),sector:String(r.setor||r.equipe||r.departamento||'').trim(),visualProfile:(()=>{const v=normalize(r.perfilvisual||r.perfil||r.genero||r.modelo||'');return ['f','feminino','mulher','gladiadora'].includes(v)?'feminino':['m','masculino','homem','gladiador'].includes(v)?'masculino':'neutro'})(),artUrl:String(r.arteurl||r.imagemurl||r.arturl||'').trim()})).filter(p=>p.name);
  if(!mapped.length)throw Error('Nenhum nome encontrado. A primeira linha deve conter a coluna "nome".');setImportRows(mapped)
 }catch(e){setImportError(e.message||'Falha ao ler o arquivo.')}};
 const importPreview=useMemo(()=>{if(!importRows)return null;const codes=new Set(state.participants.filter(p=>p.code).map(p=>normalize(p.code)));const names=new Set(state.participants.map(p=>normalize(p.name)+'|'+normalize(p.sector)));let duplicates=0;const valid=[];for(const p of importRows){const key=normalize(p.name)+'|'+normalize(p.sector),id=normalize(p.code);if((id&&codes.has(id))||names.has(key)){duplicates++;continue}valid.push(p);if(id)codes.add(id);names.add(key)}return{valid,duplicates}},[importRows,state.participants]);
 const applyImport=()=>{if(!importPreview?.valid.length){notice('Nenhum participante novo para importar.');return}mutate(s=>({...s,participants:[...s.participants,...importPreview.valid.map(p=>({...p,id:crypto.randomUUID(),active:true}))]}));notice(`${importPreview.valid.length} participante(s) importado(s).`);setModal(null);setImportRows(null)};
 return <><PageHeader eyebrow="GESTÃO DE PESSOAS" title={<>Participantes<span className="gold-period">.</span></>} description="Organize a lista de convidados e acompanhe quem ainda está elegível."><button className="button button-outline" onClick={()=>{setModal('import');setImportRows(null);setImportError('')}}><Upload size={17}/> Importar Excel/CSV</button><button className="button button-primary" onClick={()=>openForm()}><Plus size={17}/> Novo participante</button></PageHeader>
 <div className="section-stats"><span><strong>{state.participants.length}</strong> cadastrados</span><span><strong>{active.length}</strong> elegíveis</span><span><strong>{wonIds.size}</strong> premiados</span></div>
 <section className="surface-card data-card"><div className="data-tools"><div className="search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nome, setor ou matrícula..."/></div><select className="select" value={filter} onChange={e=>setFilter(e.target.value)}><option value="todos">Todos os participantes</option><option value="elegiveis">Elegíveis</option><option value="premiados">Premiados</option><option value="inativos">Inativos</option></select></div>
 <div className="table-scroll"><table className="data-table"><thead><tr><th>PARTICIPANTE</th><th>MATRÍCULA / CÓDIGO</th><th>SETOR</th><th>ARTE</th><th>STATUS</th><th className="right">AÇÕES</th></tr></thead><tbody>{list.map(p=><tr key={p.id}><td><div className="person-cell"><div className="person-avatar">{p.name.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}</div><strong>{p.name}</strong></div></td><td className="muted">{p.code||'—'}</td><td className="muted">{p.sector||'—'}</td><td className="muted"><div className="person-art-cell">{p.artUrl?<img src={p.artUrl} alt={'Arte de '+p.name} loading="lazy"/>:<span className="person-art-empty"><ShieldCheck size={17}/></span>}<span>{p.artUrl?'Personalizada':visualLabels[visualOf(p)]}</span></div></td><td><span className={'status-pill '+(wonIds.has(p.id)?'gold':p.active?'green':'gray')}>{wonIds.has(p.id)?'Premiado':p.active?'Elegível':'Inativo'}</span></td><td><div className="row-actions"><button title="Editar" className="icon-button" onClick={()=>openForm(p)}><Pencil size={16}/></button><button title={p.active?'Desativar':'Ativar'} className="icon-button" onClick={()=>toggle(p)}>{p.active?<MinusCircle size={16}/>:<CheckCircle2 size={16}/>}</button><button title="Excluir" className="icon-button danger" onClick={()=>remove(p)}><Trash2 size={16}/></button></div></td></tr>)}</tbody></table>{!list.length&&<div className="empty-table">Nenhum participante encontrado.</div>}</div><div className="table-bottom">Exibindo {list.length} de {state.participants.length} participantes</div></section>
 {modal==='form'&&<Modal title={form.id?'Editar participante':'Novo participante'} description="Preencha os dados para participar das premiações." onClose={()=>{if(!uploadingArt)setModal(null)}}><div className="form-grid"><label className="field full"><span>Nome completo *</span><input autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nome do participante"/></label><label className="field"><span>Matrícula / código</span><input value={form.code} onChange={e=>setForm({...form,code:e.target.value})} placeholder="Ex.: GPV-025"/></label><label className="field"><span>Setor / equipe</span><input value={form.sector} onChange={e=>setForm({...form,sector:e.target.value})} placeholder="Ex.: Comercial"/></label><label className="field full"><span>Arte de revelação</span><select value={form.visualProfile||'neutro'} onChange={e=>setForm({...form,visualProfile:e.target.value})}><option value="neutro">Padrão (sem perfil informado)</option><option value="masculino">Gladiador GPV</option><option value="feminino">Gladiadora GPV · Athena</option></select></label><div className="field full prize-upload-field"><span>Arte personalizada do Gladiador / Gladiadora</span><label className="prize-upload-drop"><Upload size={20}/><strong>{uploadingArt?'Enviando imagem...':'Selecionar imagem do participante'}</strong><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingArt} onChange={e=>{const file=e.target.files?.[0];e.target.value='';uploadParticipantArt(file)}}/></label><small>JPG, PNG ou WebP · até 5 MB · upload protegido para Cloudinary. Recomendado: 16:9.</small>{form.artUrl&&<div className="prize-upload-preview"><img src={form.artUrl} alt="Prévia da arte do participante"/><button type="button" className="button button-outline" disabled={uploadingArt} onClick={()=>setForm(prev=>({...prev,artUrl:''}))}>Remover imagem</button></div>}<small>{form.artUrl?'A arte será vinculada após salvar.':'Sem imagem cadastrada, será exibida a matriz oficial.'}</small></div></div><div className="modal-actions"><button className="button button-outline" disabled={uploadingArt} onClick={()=>setModal(null)}>Cancelar</button><button className="button button-primary" disabled={uploadingArt} onClick={save}><Check size={16}/> {uploadingArt?'Enviando arte...':'Salvar participante'}</button></div></Modal>}
 {modal==='import'&&<Modal title="Importar participantes" description="Excel/CSV: nome, setor, matricula e perfil (opcional: masculino/feminino)." onClose={()=>setModal(null)}><label className="upload-drop"><FileSpreadsheet size={31}/><strong>{importName||'Selecione uma planilha'}</strong><span>Clique para escolher um arquivo CSV ou XLSX</span><input type="file" accept=".csv,.xlsx" onChange={e=>processFile(e.target.files?.[0])}/></label>{importError&&<div className="import-error"><AlertTriangle size={17}/>{importError}</div>}{importPreview&&<div className="import-preview"><div className="import-counters"><span><strong>{importRows.length}</strong> registros lidos</span><span className="positive"><strong>{importPreview.valid.length}</strong> novos</span><span className="warning"><strong>{importPreview.duplicates}</strong> duplicados ignorados</span></div><div className="preview-rows">{importPreview.valid.slice(0,5).map((p,i)=><div key={i}><strong>{p.name}</strong><span>{p.sector||'Sem setor'} · {p.code||'Sem código'}</span></div>)}{importPreview.valid.length>5&&<small>+ {importPreview.valid.length-5} outros participantes</small>}</div></div>}<div className="modal-actions"><button className="button button-outline" onClick={()=>setModal(null)}>Cancelar</button><button disabled={!importPreview?.valid.length} className="button button-primary" onClick={applyImport}><Upload size={16}/> Importar {importPreview?.valid.length||0}</button></div></Modal>}
 </>}
function Prizes({state,mutate,notice,remaining}){const [modal,setModal]=useState(false);const [uploading,setUploading]=useState(false);const [form,setForm]=useState({name:'',description:'',quantity:1,emoji:'🎁',active:true,imageUrl:''});const [query,setQuery]=useState('');const icons=['🎁','📺','🎫','🏆','🔊','💻','📱','🎧','☕','🛍️'];
 const open=p=>{setForm(p?{...p}:{name:'',description:'',quantity:1,emoji:'🎁',active:true,imageUrl:''});setModal(true)};
 const uploadPrizeImage=async(file)=>{
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){notice('Escolha uma imagem JPG, PNG ou WebP.');return}
  if(file.size>5*1024*1024){notice('A imagem deve ter até 5 MB.');return}
  setUploading(true);
  try{
   const user=auth.currentUser;if(!user)throw Error('Sessão expirada.');
   const token=await user.getIdToken();
   const signedResponse=await fetch('/api/upload-sign',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}'});
   const signed=await signedResponse.json();if(!signedResponse.ok)throw Error(signed.error||'Erro ao autorizar upload.');
   const data=new FormData();data.append('file',file);
   for(const key of ['api_key','folder','public_id','timestamp','signature'])data.append(key,String(signed[key]));
   const response=await fetch(`https://api.cloudinary.com/v1_1/${signed.cloud_name}/image/upload`,{method:'POST',body:data});
   const result=await response.json();if(!response.ok||!result.secure_url)throw Error(result.error?.message||'Falha ao enviar a imagem.');
   setForm(prev=>({...prev,imageUrl:result.secure_url}));notice('Imagem carregada. Salve o prêmio para vincular.');
  }catch(error){notice(error.message||'Erro no upload.')}finally{setUploading(false)}
 };
 const save=()=>{if(uploading){notice('Aguarde a conclusão do upload.');return}const qty=Number(form.quantity);if(!form.name.trim()||!Number.isInteger(qty)||qty<1||qty>10000){notice('Informe um nome e uma quantidade válida.');return}if(form.id&&qty<state.winners.filter(w=>w.prizeId===form.id).length){notice('A quantidade não pode ser menor que o total já sorteado.');return}mutate(s=>({...s,prizes:form.id?s.prizes.map(p=>p.id===form.id?{...form,name:form.name.trim(),quantity:qty}:p):[...s.prizes,{...form,id:crypto.randomUUID(),name:form.name.trim(),quantity:qty}]}));setModal(false);notice('Prêmio salvo.')};
 const remove=p=>{if(state.winners.some(w=>w.prizeId===p.id)||state.live.prizeId===p.id&&state.live.phase!=='idle'){notice('Este prêmio possui resultados ou um sorteio ativo.');return}if(!confirm(`Excluir o prêmio ${p.name}?`))return;mutate(s=>({...s,prizes:s.prizes.filter(x=>x.id!==p.id),live:s.live.prizeId===p.id?{...s.live,prizeId:''}:s.live}))};
 return <><PageHeader eyebrow="CATÁLOGO DE PREMIAÇÕES" title={<>Os grandes <em>prêmios.</em></>} description="Cadastre e organize cada presente que fará parte desta noite especial."><button className="button button-primary" onClick={()=>open()}><Plus size={17}/> Adicionar prêmio</button></PageHeader>
 <div className="data-tools prize-tools"><div className="search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar premiação..."/></div><span className="little-count">{state.prizes.length} prêmios cadastrados</span></div>
 <div className="prize-grid">{state.prizes.filter(p=>normalize(p.name).includes(normalize(query))).map(p=><div className="prize-card" key={p.id}><div className="prize-card-top"><span className={'status-pill '+(!p.active?'gray':remaining(p)?'green':'gold')}>{!p.active?'Inativo':remaining(p)?'Disponível':'Esgotado'}</span><div className="row-actions"><button className="icon-button" title="Editar" onClick={()=>open(p)}><Pencil size={16}/></button><button className="icon-button danger" title="Excluir" onClick={()=>remove(p)}><Trash2 size={16}/></button></div></div><div className="prize-emoji">{p.imageUrl?<img className="prize-image" src={p.imageUrl} alt={p.name}/>:p.emoji||'🎁'}</div><div className="prize-card-content"><h3>{p.name}</h3><p>{p.description||'Prêmio especial da confraternização.'}</p><div className="prize-line"><span>Unidades disponíveis</span><strong>{remaining(p)} <small>/ {p.quantity}</small></strong></div><div className="progress-track"><div style={{width:`${100*(p.quantity-remaining(p))/p.quantity}%`}}/></div></div></div>)}</div>
 {modal&&<Modal title={form.id?'Editar prêmio':'Adicionar prêmio'} description="Configure os detalhes da premiação." onClose={()=>setModal(false)}><div className="form-grid"><label className="field full"><span>Nome do prêmio *</span><input autoFocus value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Ex.: Smart TV 50 polegadas"/></label><label className="field full"><span>Descrição (opcional)</span><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Uma breve frase sobre o prêmio"/></label><label className="field"><span>Quantidade total *</span><input type="number" min="1" max="10000" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></label><label className="field"><span>Status</span><select value={form.active?'active':'inactive'} onChange={e=>setForm({...form,active:e.target.value==='active'})}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></label><div className="field full prize-upload-field"><span>Fotografia do prêmio (JPG, PNG ou WebP · até 5 MB)</span><label className="prize-upload-drop"><Upload size={19}/><strong>{uploading?'Enviando imagem...':'Selecionar imagem do produto'}</strong><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e=>{uploadPrizeImage(e.target.files?.[0]);e.target.value=''}}/></label>{form.imageUrl&&<div className="prize-upload-preview"><img src={form.imageUrl} alt="Prévia da foto do prêmio"/><button className="button button-outline" disabled={uploading} onClick={()=>setForm(prev=>({...prev,imageUrl:''}))}>Remover imagem</button></div>}<small>Upload seguro com Cloudinary. A foto aparecerá no anúncio do telão.</small></div><div className="field full"><span>Ícone do prêmio</span><div className="emoji-picker">{icons.map(x=><button key={x} className={form.emoji===x?'selected':''} onClick={()=>setForm({...form,emoji:x})}>{x}</button>)}</div></div></div><div className="modal-actions"><button className="button button-outline" onClick={()=>setModal(false)}>Cancelar</button><button className="button button-primary" onClick={save} disabled={uploading}><Check size={16}/> {uploading?'Enviando...':'Salvar prêmio'}</button></div></Modal>}</>}
function Draw({state,prize,selected,eligibility,choosePrize,announcePrize,beginDraw,reject,confirm,finish,remaining,active,navigate}){const live=state.live;const pending=live.phase==='candidate';const [showAbsent,setShowAbsent]=useState(false);const [showConfirm,setShowConfirm]=useState(false);const available=state.prizes.filter(p=>p.active&&remaining(p)>0);return <><PageHeader eyebrow="CENTRAL DE COMANDO" title={<>Sorteio <em>ao vivo.</em></>} description="Tudo sob controle. Escolha o prêmio, inicie o sorteio e valide a presença."><div className="raffle-head-actions"><button className="button button-primary" onClick={()=>window.open('/telao?demo=1','_blank')}><Play size={17}/> TESTAR ANIMAÇÃO <ExternalLink size={14}/></button><button className="button button-outline" onClick={()=>window.open('/telao','_blank')}><Monitor size={17}/> Visualizar telão <ExternalLink size={14}/></button></div></PageHeader>
 <div className="draw-top-status"><div className="live-pulse"><Radio size={16}/> CONTROLE DO EVENTO</div><span>Estado atual: <strong>{phases[live.phase]}</strong></span><span>Elegíveis: <strong>{active.length}</strong></span></div>
 <div className="draw-grid"><section className="surface-card draw-control"><div className="card-heading"><div><span className="eyebrow">01 / CONTROLE</span><h3>Preparar sorteio</h3></div><span className="outline-tag"><ShieldCheck size={14}/> Um prêmio por pessoa</span></div><label className="field"><span>Selecione a premiação</span><select value={live.prizeId||''} disabled={live.phase!=='idle'} onChange={e=>choosePrize(e.target.value)}><option value="">Escolher prêmio...</option>{state.prizes.map(p=><option key={p.id} value={p.id} disabled={!p.active||remaining(p)===0}>{p.name} · {remaining(p)} restante(s)</option>)}</select></label>
 <div className="selected-prize"><div className="selected-emoji">{prize?.imageUrl?<img src={prize.imageUrl} alt={prize.name}/>:prize?.emoji||'🎁'}</div><div><small>PRÊMIO SELECIONADO</small><h2>{prize?.name||'Selecione um prêmio'}</h2><p>{prize?.description||'Escolha uma premiação para começar.'}</p></div></div>
 <div className="draw-detail"><div><span>Unidades restantes</span><strong>{prize?remaining(prize):'—'}</strong></div><div><span>Elegíveis nesta rodada</span><strong>{eligibility.length}</strong></div><div><span>Tentativas neste prêmio</span><strong>{live.attempt}</strong></div></div>
 {live.phase==='idle'&&<button className="button button-primary button-large" onClick={announcePrize} disabled={!prize||remaining(prize)===0||!eligibility.length}><Gift size={21}/> ANUNCIAR PRÊMIO NO TELÃO <ArrowRight size={18}/></button>}
 {live.phase==='announced'&&<div className="announced-actions"><div className="announced-note"><CheckCircle2 size={18}/> Prêmio anunciado no telão. Aguarde o apresentador e inicie quando desejar.</div><button className="button button-primary button-large" onClick={beginDraw} disabled={!eligibility.length}><Shuffle size={21}/> INICIAR SORTEIO <ArrowRight size={18}/></button></div>}
 {live.phase==='spinning'&&<button className="button button-primary button-large" disabled><span className="spinner"/> SORTEIO EM ANDAMENTO...</button>}
 {pending&&<div className="candidate-controls"><div className="candidate-intro"><UserRound size={18}/> PARTICIPANTE SORTEADO</div><h2>{selected?.name||'—'}</h2><p>{selected?.sector||'Equipe GPV'} · Arte {visualLabels[visualOf(selected)]} já revelada no telão</p><button className="button button-primary button-large" onClick={()=>setShowConfirm(true)}><CheckCircle2 size={19}/> CONFIRMAR PRESENÇA E PREMIAR</button><button className="button button-danger-outline button-large" onClick={()=>setShowAbsent(true)}><XCircle size={19}/> AUSENTE — SORTEAR NOVAMENTE</button></div>}
 {live.phase==='confirmed'&&<div className="confirmed-controls"><div className="confirmed-icon"><PartyPopper size={28}/></div><strong>Ganhador confirmado!</strong><h2>{selected?.name}</h2><p>O resultado foi salvo no histórico.</p><button className="button button-primary button-large" onClick={finish}>Preparar próximo sorteio <ArrowRight size={18}/></button></div>}
 </section>
 <div className="draw-side"><section className="live-preview"><div className="live-preview-top"><span><span className="status-dot"/> PRÉVIA DO TELÃO</span><button onClick={()=>window.open('/telao','_blank')}><Maximize2 size={16}/></button></div><div className="live-preview-content"><div className="preview-ring">{prize?.imageUrl&&live.phase==='announced'?<img className="preview-prize-image" src={prize.imageUrl} alt={prize.name}/>:<Sparkles size={30}/>}</div><small>CONFRATERNIZAÇÃO GPV 2026</small><h3>{live.phase==='spinning'?'SORTEANDO...':live.phase==='candidate'?'PRESENÇA?':live.phase==='confirmed'?'TEMOS UM GANHADOR!':live.phase==='announced'?'O PRÓXIMO PRÊMIO É...':'A PRÓXIMA SURPRESA'}</h3><p>{live.phase==='candidate'||live.phase==='confirmed'?selected?.name:prize?.name||'ESTÁ CHEGANDO'}</p></div><div className="live-preview-bottom">Abra a tela dedicada para a experiência completa <ExternalLink size={13}/></div></section>
 <section className="surface-card session-card"><div className="card-heading"><div><span className="eyebrow">02 / ANDAMENTO</span><h3>Rodada atual</h3></div><span className="round-tag">Tentativa {live.attempt}</span></div><div className="session-line"><span><Users size={16}/> Participantes elegíveis</span><strong>{eligibility.length}</strong></div><div className="session-line"><span><XCircle size={16}/> Ausentes nesta rodada</span><strong>{live.exclusions.length}</strong></div><div className="exclusion-box">{live.exclusions.length?state.participants.filter(p=>live.exclusions.includes(p.id)).map(p=><span key={p.id}>{p.name}</span>):<p>Os participantes ausentes nesta rodada aparecerão aqui. Eles continuam aptos a outros prêmios.</p>}</div></section></div></div>
 {showAbsent&&<Modal title="Participante ausente?" description={`Marcar ${selected?.name||'o participante'} como ausente desta rodada?`} onClose={()=>setShowAbsent(false)}><p className="modal-copy">Ele não será sorteado novamente para <strong>{prize?.name}</strong> nesta rodada, mas continuará elegível para outras premiações.</p><div className="modal-actions"><button className="button button-outline" onClick={()=>setShowAbsent(false)}>Cancelar</button><button className="button button-danger" onClick={()=>{reject();setShowAbsent(false)}}><XCircle size={17}/> Confirmar ausência</button></div></Modal>}
 {showConfirm&&<Modal title="Confirmar ganhador" description="Confira a presença antes de registrar o prêmio." onClose={()=>setShowConfirm(false)}><div className="confirm-summary"><strong>{selected?.name}</strong><span>{prize?.name}</span></div><p className="modal-copy">Após confirmar, o participante não poderá ganhar nenhum outro prêmio.</p><div className="modal-actions"><button className="button button-outline" onClick={()=>setShowConfirm(false)}>Cancelar</button><button className="button button-primary" onClick={()=>{confirm();setShowConfirm(false)}}><CheckCircle2 size={17}/> Confirmar e premiar</button></div></Modal>}</>}
function HistoryPage({state,notice}){const [query,setQuery]=useState('');const list=[...state.winners].reverse().filter(w=>normalize(w.participantName+' '+w.prizeName).includes(normalize(query)));const exportFile=()=>{if(!state.winners.length){notice('Ainda não há resultados para exportar.');return}downloadText('gpv-sorteios-2026-resultados.csv',toCSV([['Ganhador','Prêmio','Data e hora','Operador','Tentativa'],...state.winners.map(w=>[w.participantName,w.prizeName,formatTime(w.createdAt),w.operator,w.attempt])]))};return <><PageHeader eyebrow="REGISTRO DAS CONQUISTAS" title={<>Histórico de <em>ganhadores.</em></>} description="Cada premiação, um momento para lembrar. Consulte os resultados confirmados."><button className="button button-outline" onClick={exportFile}><Download size={17}/> Exportar CSV</button></PageHeader><div className="history-banner"><div className="history-banner-icon"><PartyPopper size={25}/></div><div><strong>{state.winners.length} {state.winners.length===1?'pessoa premiada':'pessoas premiadas'}</strong><span>Resultados registrados no Firebase</span></div></div><section className="surface-card data-card"><div className="data-tools"><div className="search-box"><Search size={18}/><input placeholder="Pesquisar ganhador ou prêmio..." value={query} onChange={e=>setQuery(e.target.value)}/></div></div><div className="table-scroll"><table className="data-table"><thead><tr><th>GANHADOR</th><th>PRÊMIO</th><th>DATA E HORA</th><th>TENTATIVA</th><th>STATUS</th></tr></thead><tbody>{list.map(w=><tr key={w.id}><td><strong>{w.participantName}</strong></td><td className="muted">{w.prizeName}</td><td className="muted">{formatTime(w.createdAt)}</td><td className="muted">{w.attempt}</td><td><span className="status-pill green">Confirmado</span></td></tr>)}</tbody></table>{!list.length&&<div className="empty-table">Nenhum resultado confirmado até agora.</div>}</div><div className="table-bottom">{list.length} resultado(s) encontrado(s)</div></section></>}
function Preferences({state,action,notice}){
 const [resetOpen,setResetOpen]=useState(false),[resetText,setResetText]=useState(''),[resetBusy,setResetBusy]=useState(false);
 const exportBackup=()=>downloadText('gpv-sorteios-2026-backup.json',JSON.stringify(state,null,2),'application/json');
 const reset=async()=>{
  if(resetText!=='REINICIAR TESTES')return;
  setResetBusy(true);
  const ok=await action('resetTests',{confirmation:resetText});
  setResetBusy(false);
  if(ok){setResetOpen(false);setResetText('');notice('Testes reiniciados. Histórico de premiações zerado; participantes e prêmios preservados.');}
 };
 return <><PageHeader eyebrow="PREFERÊNCIAS DA APLICAÇÃO" title={<>Configurações<span className="gold-period">.</span></>} description="Estado da integração Firebase, backup e reinicialização dos testes."/>
 <div className="settings-stack">
  <section className="surface-card settings-section"><div className="settings-icon"><ShieldCheck size={22}/></div><div><h3>Versão 0.3.3 · Reinício de testes</h3><p>Dados sincronizados em tempo real entre operador e telão. Sorteios e confirmações são processados no servidor.</p><div className="info-chips"><span>React + Vite</span><span>Vercel Functions</span><span>Firebase Auth</span><span>Cloud Firestore</span></div></div></section>
  <section className="surface-card settings-section"><div className="settings-icon"><Download size={22}/></div><div><h3>Backup do evento</h3><p>Exporte uma cópia dos dados para arquivamento antes de fazer mudanças.</p><button className="button button-outline" onClick={exportBackup}><Download size={16}/> Exportar JSON</button></div></section>
  <section className="surface-card settings-section danger-zone"><div className="settings-icon"><RotateCcw size={22}/></div><div><h3>Reiniciar testes de sorteio</h3><p>Limpa os resultados confirmados, libera novamente os ganhadores e reinicia o sorteio atual. <strong>Participantes e prêmios cadastrados continuam salvos.</strong> Uma cópia do estado anterior fica arquivada no Firestore para auditoria.</p><div className="reset-actions"><strong>{state.winners.length} resultado(s) confirmado(s)</strong><button className="button button-danger-outline" onClick={()=>{setResetOpen(true);setResetText('')}} disabled={state.live.phase==='spinning'||state.live.phase==='candidate'}><RotateCcw size={16}/> Reiniciar testes</button></div>{(state.live.phase==='spinning'||state.live.phase==='candidate')&&<p>Finalize o sorteio pendente ou marque ausência antes de reiniciar.</p>}</div></section>
 </div>
 {resetOpen&&<div className="modal-shade" onMouseDown={e=>{if(e.target===e.currentTarget&&!resetBusy)setResetOpen(false)}}><div className="modal" role="dialog" aria-modal="true" aria-label="Reiniciar testes"><div className="modal-header"><div><h3>Reiniciar todos os testes?</h3><p>Esta ação remove os resultados ativos deste evento e libera todos os participantes para sortear novamente. Os prêmios e participantes serão mantidos. Um arquivo de auditoria será salvo no Firestore.</p></div><button className="icon-button" disabled={resetBusy} onClick={()=>setResetOpen(false)}><X size={18}/></button></div><label className="field full">Digite <strong>REINICIAR TESTES</strong> para confirmar<input value={resetText} onChange={e=>setResetText(e.target.value)} autoComplete="off" placeholder="REINICIAR TESTES"/></label><div className="modal-actions"><button className="button button-outline" disabled={resetBusy} onClick={()=>setResetOpen(false)}>Cancelar</button><button className="button button-danger" disabled={resetBusy||resetText!=='REINICIAR TESTES'} onClick={reset}>{resetBusy?'Reiniciando...':'Confirmar reinício'}</button></div></div></div>}
 </>;
}
// Standalone visual test: entirely local; never calls the protected Firebase API.
function DemoTelon({onExit}){
 const [phase,setPhase]=useState('idle');
 const [profile,setProfile]=useState('feminino');
 const [startedAt,setStartedAt]=useState(0);
 const candidate={name:profile==='feminino'?'PARTICIPANTE DEMONSTRAÇÃO':'PARTICIPANTE DEMONSTRAÇÃO',visualProfile:profile};
 useEffect(()=>{if(phase!=='spinning')return;
   const id=setTimeout(()=>setPhase('candidate'),12100);
   return()=>clearTimeout(id);
 },[phase,startedAt]);
 const begin=()=>{setStartedAt(Date.now());setPhase('spinning')};
 const live={phase,prizeId:'demo',candidateId:phase==='candidate'||phase==='confirmed'?'demo':null,startedAt,exclusions:[],attempt:1};
 return <div className="gpv-demo-shell">
  <Telon state={{participants:[],winners:[],live}} selected={candidate} prize={{id:'demo',name:'Smart TV 50 polegadas (Demonstração)',description:'Uma premiação especial para celebrar!',emoji:'📺'}} onExit={onExit}/>
  <div className="gpv-demo-controls" role="group" aria-label="Controles do teste visual">
    <strong>TESTE VISUAL · SEM REGISTRO NO FIRESTORE</strong>
    <div className="gpv-demo-buttons">
     <select aria-label="Perfil de teste" value={profile} onChange={e=>setProfile(e.target.value)} disabled={phase==='spinning'}><option value="feminino">Gladiadora</option><option value="masculino">Gladiador</option></select>
     <button onClick={()=>setPhase('announced')} disabled={phase==='spinning'}>ANUNCIAR PRÊMIO</button><button onClick={begin} disabled={phase==='spinning'}>{phase==='announced'?'INICIAR SORTEIO':'TESTAR GIRO'}</button>
     {phase==='candidate'&&<button onClick={()=>setPhase('confirmed')}>SIMULAR PRESENÇA</button>}
     {phase==='candidate'&&<button onClick={begin}>AUSENTE · GIRAR DE NOVO</button>}
     <button onClick={()=>setPhase('idle')}>STANDBY</button>
    </div>
  </div>
 </div>;
}
// The approved master images are served unchanged. Text and status are independent HTML overlays.
function OfficialWinnerArtwork({participant,phase,prize}){
 const feminine=visualOf(participant)==='feminino';
 const master=feminine?'/assets/matriz-gladiadora-oficial.png':'/assets/matriz-gladiador-oficial.png';
 const custom=participant?.artUrl&&/^https:\/\//i.test(participant.artUrl)?participant.artUrl:null;
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[custom]);
 return <div className={'official-reveal '+(feminine?'official-female':'official-male')}>
  <div className="official-reveal-frame">
   <img className="official-reveal-image" src={custom&&!failed?custom:master} onError={()=>setFailed(true)} alt={feminine?'Arte oficial da Gladiadora GPV':'Arte oficial do Gladiador GPV'}/>
   <div className="official-reveal-name" aria-label={'Participante sorteado: '+(participant?.name||'Participante')}><span>{participant?.name||'PARTICIPANTE'}</span></div>
   <div className={'official-reveal-status '+(phase==='confirmed'?'prize-confirmed':'prize-pending')}>
    {phase==='confirmed'?'✓ PRÊMIO CONFIRMADO':'AGUARDANDO VALIDAÇÃO DE PRESENÇA · PRÊMIO AINDA NÃO CONFIRMADO'}
   </div>
  </div>
 </div>;
}
function Telon({state,selected,prize,onExit}){
 const [now,setNow]=useState(Date.now());
 const live=state.live;
 const spinning=live.phase==='spinning';
 useEffect(()=>{if(!spinning)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),100);return()=>clearInterval(timer)},[spinning,live.startedAt]);
 const elapsed=spinning?Math.max(0,now-(live.startedAt||now)):0;
 const pickingBall=spinning&&elapsed>=10000;
 const countdown=Math.max(0,Math.ceil((10000-elapsed)/1000));
 useEffect(()=>{['/assets/matriz-gladiador-oficial.png','/assets/matriz-gladiadora-oficial.png'].forEach(src=>{const img=new Image();img.src=src})},[]);
 const goFull=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});else document.exitFullscreen?.().catch(()=>{})};
 return <div className={'telao gladiator-screen phase-'+live.phase+(live.phase==='idle'?' standby-screen':'')}>
  <div className="telao-halo halo-left"/><div className="telao-halo halo-right"/>
  <div className="beam beam-a"/><div className="beam beam-b"/>
  <div className="particles">{Array.from({length:24},(_,i)=><span key={i} style={{'--i':i,'--left':`${(i*43.79)%100}%`}}/>)}</div>
  <div className="screen-top"><div className="tel-logo"><img src="/assets/gpv-symbol.png" alt="Símbolo GPV"/><span>GPV ASSOCIADOS</span></div><div className="screen-title">CONFRATERNIZAÇÃO <strong>2026</strong><span>GPV SORTEIOS · GLADIADOR DA VEZ</span></div><div className="screen-top-right"><span className="screen-line"/> UMA NOITE PARA CELEBRAR</div></div>
  <div className="tel-center gladiator-center">
   {live.phase==='idle'&&<div className="gpv-standby" aria-label="GPV Sorteios: Em instantes, começaremos os sorteios!"><img className="gpv-standby-animation" src="/assets/gladiador-standby-animado.gif" alt="Gladiador GPV animado aguardando os sorteios"/></div>}
   {live.phase==='announced'&&<div className="gpv-prize-announcement"><div className="gpv-announcement-visual">{prize?.imageUrl?<img src={prize.imageUrl} alt={prize.name||'Prêmio da vez'} />:<span>{prize?.emoji||'🎁'}</span>}</div><div className="gpv-announcement-copy"><span className="gpv-gala-eyebrow">GPV SORTEIOS · CONFRATERNIZAÇÃO 2026</span><h1>O PRÓXIMO <em>PRÊMIO É...</em></h1><div className="gpv-announcement-name">{prize?.name||'Prêmio especial'}</div>{prize?.description&&<p>{prize.description}</p>}<strong>QUEM SERÁ O PRÓXIMO PREMIADO?</strong></div></div>}
   {spinning&&<div className="gladiator-animation"><div className="gladiator-visual" key={pickingBall?'outro':'loop'}><img src={pickingBall?'/assets/gladiador-bola-final.gif':'/assets/gladiador-globo-loop.gif'} alt={pickingBall?'Gladiador retirando a bola da sorte':'Gladiador girando o globo da sorte'}/></div><div className="gladiator-status"><span className="gpv-gala-eyebrow">{pickingBall?'O MOMENTO CHEGOU':'BOA SORTE A TODOS!'}</span><h1>{pickingBall?'A BOLA DA':'O GLOBO ESTÁ'}<em>{pickingBall?' SORTE!':' GIRANDO...'}</em></h1><p>{pickingBall?'O gladiador está revelando o sorteado!':'O próximo gladiador está sendo escolhido...'}</p><div className="gladiator-countdown">{pickingBall?<><Sparkles size={23}/> REVELANDO...</>:<><span>{countdown}</span><small>SEGUNDOS</small></>}</div></div></div>}
   {(live.phase==='candidate'||live.phase==='confirmed')&&<OfficialWinnerArtwork participant={selected} phase={live.phase} prize={prize}/>}
  </div>
  <div className="tel-bottom"><div className="bottom-prize"><span>✦</span><div><small>PRÊMIO DA VEZ</small><strong>{prize?.name||'GPV Sorteios'}</strong></div></div><div className="bottom-center"><span/><span/><span/></div><div className="bottom-number">GPV <strong>2026</strong></div></div>
  <div className="telao-utilities"><button title="Tela cheia" onClick={goFull}><Maximize2 size={19}/></button><button title="Voltar ao painel" onClick={onExit}><ExternalLink size={19}/></button></div>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
