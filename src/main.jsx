import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const seed=[{id:1,title:'潮汐之后',room:'A01 · 主展厅',type:'装置',desc:'一件记录海岸线变化的沉浸式影像装置。',audio:'https://example.com/audio.mp3',status:'已发布',color:'#e6b45d'},{id:2,title:'未寄出的信',room:'B02 · 纸上时间',type:'档案',desc:'来自三代人的手写信件与声音档案。',audio:'',status:'草稿',color:'#ef8f84'},{id:3,title:'柔软的边界',room:'C01 · 新媒介',type:'互动',desc:'观众的移动会改变墙面上的光影。',audio:'',status:'已发布',color:'#83b9b1'}];

// 现场状况台账演示数据：展项 1 有一条未修复记录（挡住发布），展项 3 有一条已闭环记录（展示历史）
const seedIssues=[
 {id:'IS-0421',exhibitId:1,location:'北侧投影幕 · 左下角',foundAt:'2024-03-18T10:20',events:[
   {at:'2024-03-18T10:20',type:'report',reporter:'王敏',phenomenon:'幕布出现约 15cm 裂口，投影时形成明显亮斑。',handling:'已用胶带临时固定，提示观众不要靠近；等待维修排期。'}],status:'未修复'},
 {id:'IS-0398',exhibitId:3,location:'地面感应区 · 2 号传感器',foundAt:'2024-02-26T14:05',events:[
   {at:'2024-02-26T14:05',type:'report',reporter:'王敏',phenomenon:'2 号传感器间歇性失灵，光影对脚步无响应。',handling:'登记并重启控制器，故障复现。'},
   {at:'2024-03-02T09:30',type:'repair',reporter:'陈工',handling:'更换感应线圈并重新校准灵敏度。'},
   {at:'2024-03-02T16:40',type:'recheck',reporter:'王敏',passed:true,handling:'连续触发 30 次全部响应，恢复正常。'}],status:'已修复'}
];

const SNAP_FIELDS=['title','room','type','desc','audio'];
const loadExhibits=()=>{try{const raw=localStorage.getItem('guide-exhibits');
  if(raw){const list=JSON.parse(raw);
   // 旧数据迁移：已发布展项没有安全版本快照时，以当前内容作为确认安全的版本
   return list.map(x=>x.status==='已发布'&&!x.snapshots?.[x.id]?{...x,snapshots:{[x.id]:snapshotOf(x)}}:x)}
  // 首次进入：已发布展项的当前内容即“上次确认安全的版本”
  return seed.map(x=>x.status==='已发布'?{...x,snapshots:{[x.id]:snapshotOf(x)}}:x)}catch{return seed}};
const loadIssues=()=>{try{return JSON.parse(localStorage.getItem('guide-issues'))??seedIssues}catch{return seedIssues}};
function snapshotOf(x,ts){return {at:ts||Date.now(),title:x.title,room:x.room,type:x.type,desc:x.desc,audio:x.audio}}
const open=iss=>iss.status==='未修复'||iss.status==='等待复检';
const pad=n=>String(n).padStart(2,'0');
function fmt(ts){const d=new Date(ts);if(isNaN(d))return ts;return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`}
const nowLocal=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`};
const snapOf=x=>x.snapshots?.[x.id]||null;

export function App(){
 const [exhibits,setExhibits]=useState(loadExhibits);
 const [issues,setIssues]=useState(loadIssues);
 const [selected,setSelected]=useState(1);
 const [view,setView]=useState('edit');
 const [filter,setFilter]=useState('全部');
 const [form,setForm]=useState({title:'',room:'',type:'装置',desc:'',audio:''});
 const [notice,setNotice]=useState('');
 const [adminName,setAdminName]=useState(()=>localStorage.getItem('guide-admin')||'');
 useEffect(()=>localStorage.setItem('guide-exhibits',JSON.stringify(exhibits)),[exhibits]);
 useEffect(()=>localStorage.setItem('guide-issues',JSON.stringify(issues)),[issues]);
 useEffect(()=>localStorage.setItem('guide-admin',adminName),[adminName]);

 const visible=useMemo(()=>filter==='全部'?exhibits:exhibits.filter(x=>x.status===filter),[exhibits,filter]);
 const current=exhibits.find(x=>x.id===selected)||exhibits[0];
 const currentIssues=useMemo(()=>issues.filter(i=>i.exhibitId===current?.id),[issues,current]);
 const blocking=useMemo(()=>currentIssues.filter(open),[currentIssues]);
 const blockingCount=useMemo(()=>exhibits.map(x=>[x.id,issues.filter(i=>i.exhibitId===x.id&&open(i)).length]),[exhibits,issues]);
 const countFor=id=>(blockingCount.find(x=>x[0]===id)||[id,0])[1];
 const safe=snapOf(current);
 const published=current?.status==='已发布';
 const stale=published&&safe&&SNAP_FIELDS.some(k=>current[k]!==safe[k]);

 const mutateIssues=fn=>setIssues(prev=>fn(prev));
 const add=()=>{if(!form.title.trim())return;const item={...form,id:Date.now(),status:'草稿',color:['#e6b45d','#ef8f84','#83b9b1','#9ba7dc'][exhibits.length%4]};setExhibits([...exhibits,item]);setSelected(item.id);setForm({title:'',room:'',type:'装置',desc:'',audio:''});setNotice('展项已保存为草稿');};
 const update=(k,v)=>setExhibits(exhibits.map(x=>x.id===current.id?{...x,[k]:v}:x));

 // 登记现场状况：同展项同位置已有未结记录时，把本次情况追加进原记录，不另开一条
 const reportIssue=input=>{
  const who=adminName.trim();
  if(!who){setNotice('请先在台账顶部填写当前管理员姓名');return false}
  const loc=input.location.trim(),ph=input.phenomenon.trim(),handling=input.handling.trim();
  if(!loc||!ph||!input.foundAt){setNotice('请补全损坏位置、损坏现象和发现时间');return false}
  const existing=issues.find(i=>i.exhibitId===current.id&&open(i)&&i.location.trim().toLowerCase()===loc.toLowerCase());
  const event={at:input.foundAt,type:existing?(existing.status==='等待复检'?'recheck-note':'note'):'report',reporter:who,phenomenon:ph,handling:handling||'（未填写处理经过）'};
  if(existing){mutateIssues(list=>list.map(i=>i.id===existing.id?{...i,events:[...i.events,event],status:'未修复'}:i));
   setNotice(`已追加到未结记录 ${existing.id}（${existing.location}）`);}
  else{const id='IS-'+String(Math.floor(1000+Math.random()*9000));
   mutateIssues(list=>[{id,exhibitId:current.id,location:loc,foundAt:input.foundAt,events:[event],status:'未修复'},...list]);
   setNotice(`已登记记录 ${id}，该展项在闭环前无法发布`);}
  return true;
 };
 const submitRepair=(id,handling)=>{
  const who=adminName.trim();if(!who){setNotice('请先填写当前管理员姓名');return false}
  if(!handling.trim()){setNotice('请填写维修处理经过');return false}
  mutateIssues(list=>list.map(i=>i.id===id?{...i,status:'等待复检',events:[...i.events,{at:nowLocal(),type:'repair',reporter:who,handling:handling.trim()}]}:i));
  setNotice(`维修已提交，记录 ${id} 等待另一名管理员复检`);return true;
 };
 const submitRecheck=(id,passed,handling)=>{
  const who=adminName.trim();if(!who){setNotice('请先填写当前管理员姓名');return false}
  const iss=issues.find(i=>i.id===id);const repair=[...iss.events].reverse().find(e=>e.type==='repair');
  if(repair&&repair.reporter===who){setNotice('复检必须由维修提交人以外的另一名管理员完成');return false}
  const nextIssues=issues.map(i=>i.id===id?{...i,status:passed?'已修复':'未修复',events:[...i.events,{at:nowLocal(),type:'recheck',reporter:who,passed,handling:handling.trim()||(passed?'复检确认正常。':'复检未通过，退回继续维修。')}]}:i);
  setIssues(nextIssues);
  if(!passed){setNotice(`记录 ${id} 复检未通过，已退回维修`);return true}
  // 该展项再无未结记录时：若展项在线，把当前编辑内容确认成新的安全版本，访客随即可见
  const stillOpen=nextIssues.some(i=>i.exhibitId===iss.exhibitId&&open(i));
  if(stillOpen)return setNotice(`记录 ${id} 已复检通过，但该展项还有其他未结记录`);
  const ex=exhibits.find(x=>x.id===iss.exhibitId);
  if(ex?.status==='已发布')setExhibits(list=>list.map(x=>x.id===iss.exhibitId?{...x,snapshots:{...x.snapshots,[x.id]:snapshotOf(x)}}:x));
  setNotice(ex?.status==='已发布'?`记录 ${id} 已复检通过，现场确认安全，访客预览已恢复为最新版本`:`记录 ${id} 已复检通过，展项恢复可发布状态`);
  return true;
 };
 const publish=()=>{
  if(blocking.length){setNotice(`存在 ${blocking.length} 条未修复 / 等待复检记录，无法发布`);return;}
  if(!published){setExhibits(list=>list.map(x=>x.id===current.id?{...x,status:'已发布',snapshots:{...x.snapshots,[x.id]:snapshotOf(x)}}:x));setNotice('已发布，访客预览已更新');}
  else{setExhibits(list=>list.map(x=>x.id===current.id?{...x,snapshots:{...x.snapshots,[x.id]:snapshotOf(x)}}:x));setNotice('新版本已确认安全并发布，访客预览已更新');}
 };
 const withdraw=()=>{update('status','草稿');setNotice('已撤回发布');};
 const exportData=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({exhibits,issues},null,2)],{type:'application/json'}));a.download='exhibition-guide.json';a.click();setNotice('已导出展项与台账数据');};

 const pubList=exhibits.filter(x=>x.status==='已发布').map(x=>({x,snap:snapOf(x)})).filter(v=>v.snap);

 if(view==='visitor') return <div className="visitor"><header><div className="brand"><span className="mark">M</span><span>潮汐美术馆</span></div><button className="ghost" onClick={()=>setView('edit')}>返回编辑</button></header><main className="visitor-main"><span className="eyebrow">VISITOR GUIDE / 2024</span><h1>沿着作品，<em>走进</em>另一种时间。</h1><p className="lead">当你靠近一件作品，它的故事就开始流动。选择一个展项开始探索。</p><div className="visitor-grid">{pubList.map(({x,snap})=><article className="visitor-card" key={x.id} onClick={()=>{setSelected(x.id);setView('detail')}}><div className="art" style={{background:x.color}}><span>{String(x.id).padStart(2,'0')}</span><i>↗</i></div><div className="card-meta"><small>{snap.room}</small><h3>{snap.title}</h3><p>{snap.desc}</p></div></article>)}</div></main></div>;
 if(view==='detail'&&current){const snap=snapOf(current);return <div className="visitor"><header><div className="brand"><span className="mark">M</span><span>潮汐美术馆 · 导览</span></div><button className="ghost" onClick={()=>setView('visitor')}>← 全部展项</button></header><main className="detail"><div className="detail-art" style={{background:current.color}}><span>{String(current.id).padStart(2,'0')}</span></div><div className="detail-copy"><span className="eyebrow">{snap.room} / {snap.type}</span><h1>{snap.title}</h1><p>{snap.desc}</p>{snap.audio&&<button className="audio" onClick={()=>setNotice('正在播放导览音频…')}>▶ 播放语音导览</button>}<div className="qr"><div className="qr-box">▦</div><div><strong>分享这个展项</strong><small>扫描二维码，在手机上继续阅读</small></div></div></div></main>{notice&&<div className="toast">{notice}</div>}</div>;}

 return <div className="app"><aside><div className="brand"><span className="mark">M</span><span>展览工作台</span></div><div className="side-label">当前项目</div><div className="project"><span className="project-dot"></span><div><strong>潮汐之后</strong><small>2024 春季展</small></div><span>⌄</span></div><nav><button className="active">▧ <span>展项内容</span><b>{exhibits.length}</b></button><button>⌁ <span>展厅动线</span></button><button>◉ <span>二维码</span></button></nav><div className="side-foot"><button>⚙ 设置</button><small>已自动保存 · 刚刚</small></div></aside><main className="workspace"><header className="topbar"><div><span className="eyebrow">EXHIBITION BUILDER</span><h1>展项内容</h1></div><div className="top-actions"><button className="secondary" onClick={exportData}>↓ 导出 JSON</button><button className="secondary" onClick={()=>setView('visitor')}>◉ 访客预览</button>{published&&<button className="secondary" onClick={withdraw}>撤回发布</button>}<button className={'primary'+(blocking.length?' blocked':'')} disabled={blocking.length>0} onClick={publish} title={blocking.length?'存在未结现场记录，暂不能发布':''}>{published?'发布更新':'发布'} <span>↗</span></button></div></header><div className="content"><section className="list-pane"><div className="list-head"><div><h2>全部展项</h2><span>{exhibits.length} 个展项</span></div><button className="add-btn" onClick={()=>document.querySelector('.new-form').scrollIntoView({behavior:'smooth'})}>＋ 添加展项</button></div><div className="filters">{['全部','已发布','草稿'].map(x=><button className={filter===x?'selected':''} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div><div className="exhibit-list">{visible.map(x=><button className={'exhibit-row '+(selected===x.id?'chosen':'')} key={x.id} onClick={()=>setSelected(x.id)}><span className="thumb" style={{background:x.color}}>{String(x.id).padStart(2,'0')}</span><span className="row-copy"><strong>{x.title}</strong><small>{x.room} · {x.type}</small></span>{countFor(x.id)>0&&<span className="issue-pill" title="存在未结现场状况记录">⚠ {countFor(x.id)}</span>}<span className={'status '+(x.status==='已发布'?'live':'draft')}>{x.status}</span><span className="chev">›</span></button>)}</div></section><section className="form-panel"><div className="panel-title"><div><span className="eyebrow">EDIT EXHIBIT</span><h2>编辑展项</h2></div><span className={'status '+(current?.status==='已发布'?'live':'draft')}>{current?.status}</span></div>{current&&<div className="editor"><label>展项标题<input value={current.title} onChange={e=>update('title',e.target.value)}/></label><div className="two"><label>所在展厅<input value={current.room} onChange={e=>update('room',e.target.value)}/></label><label>内容类型<select value={current.type} onChange={e=>update('type',e.target.value)}><option>装置</option><option>档案</option><option>互动</option><option>绘画</option></select></label></div><label>展项介绍<textarea rows="5" value={current.desc} onChange={e=>update('desc',e.target.value)}/></label><label>语音导览 URL<input value={current.audio} placeholder="https://…" onChange={e=>update('audio',e.target.value)}/><small className="hint">访客扫描二维码后可播放</small></label><div className="preview-block"><div className="preview-heading"><span>二维码预览</span><button onClick={()=>setNotice('二维码链接已复制')}>复制链接</button></div><div className="qr-preview"><div className="qr-box big">▦</div><div><strong>展项-{String(current.id).padStart(3,'0')}</strong><small>/guide/{current.id}</small></div></div></div>

 {blocking.length>0&&<div className="block-banner"><div className="block-head"><span>⛔ 现场问题未闭环，发布已被挡住</span><span className="status repairing">未修复 {blocking.filter(i=>i.status==='未修复').length}</span><span className="status waiting">待复检 {blocking.filter(i=>i.status==='等待复检').length}</span></div><p>访客端仍在展示上次确认安全的版本{safe&&<>（确认于 {fmt(safe.at)}）{stale&&<em>；当前编辑里有未发布的改动</em>}</>}。以下记录复检通过后才能发布：</p><ul>{blocking.map(i=><li key={i.id}><b>{i.id}</b><span>{i.location}</span><i>{i.status==='未修复'?'等待维修 / 补充情况':'已维修，等待另一名管理员复检'}</i></li>)}</ul></div>}
 {blocking.length===0&&published&&<div className="safe-banner">✓ 现场无未结问题{safe&&<>，访客端版本确认于 {fmt(safe.at)}{stale&&<em>；编辑内容有改动，发布后访客才会看到</em>}</>}</div>}

<Ledger adminName={adminName} setAdminName={setAdminName} issues={currentIssues} onReport={reportIssue} onRepair={submitRepair} onRecheck={submitRecheck}/></div>}<div className="new-form"><div className="panel-title"><div><span className="eyebrow">NEW ENTRY</span><h2>快速添加展项</h2></div></div><div className="two"><input placeholder="展项标题" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><input placeholder="展厅编号" value={form.room} onChange={e=>setForm({...form,room:e.target.value})}/></div><textarea placeholder="一句话介绍…" rows="2" value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})}/><button className="primary full" onClick={add}>保存新展项</button></div></section></div></main>{notice&&<div className="toast">{notice}</div>}</div>;
}

const ISSUE_LABEL={report:'损坏登记',note:'现场补充',repair:'维修提交','recheck-note':'复检前补充',recheck:'管理员复检'};

function Ledger({adminName,setAdminName,issues,onReport,onRepair,onRecheck}){
 const [location,setLocation]=useState('');const [phenomenon,setPhenomenon]=useState('');const [foundAt,setFoundAt]=useState(nowLocal().slice(0,16));const [handling,setHandling]=useState('');
 const dup=location.trim()&&issues.find(i=>open(i)&&i.location.trim().toLowerCase()===location.trim().toLowerCase());
 const submit=()=>{if(onReport({location,phenomenon,foundAt,handling})){setLocation('');setPhenomenon('');setHandling('');setFoundAt(nowLocal().slice(0,16));}};
 return <div className="ledger"><div className="ledger-head"><div><span className="eyebrow">SITE CONDITION LEDGER</span><h2>现场状况台账</h2></div><label className="admin-field">当前管理员<input value={adminName} onChange={e=>setAdminName(e.target.value)} placeholder="姓名（登记 / 维修 / 复检留痕）"/></label></div>
 {dup&&<div className="dup-hint">该位置已有未结记录 <b>{dup.id}</b>（{dup.status}），提交后会继续追加到原记录，不另开一条。</div>}
 <div className="ledger-form">
  <div className="two"><label>损坏位置<input value={location} onChange={e=>setLocation(e.target.value)} placeholder="如：北侧投影幕 · 左下角"/></label><label>发现时间<input type="datetime-local" value={foundAt} onChange={e=>setFoundAt(e.target.value)}/></label></div>
  <label>损坏现象<textarea rows="2" value={phenomenon} onChange={e=>setPhenomenon(e.target.value)} placeholder="看到的损坏 / 异常表现"/></label>
  <label>处理经过<textarea rows="2" value={handling} onChange={e=>setHandling(e.target.value)} placeholder="现场已采取的措施（可为空，后续可追加）"/></label>
  <button className="secondary full" onClick={submit}>登记 / 追加现场状况</button>
 </div>
 <div className="issue-list">{issues.length===0&&<p className="ledger-empty">暂无现场状况记录。</p>}{issues.map(i=><IssueCard key={i.id} issue={i} adminName={adminName} onRepair={onRepair} onRecheck={onRecheck}/>)}</div>
 </div>;
}

function IssueCard({issue,adminName,onRepair,onRecheck}){
 const [repairText,setRepairText]=useState('');const [recheckText,setRecheckText]=useState('');
 const repair=[...issue.events].reverse().find(e=>e.type==='repair');
 const sameAsRepair=repair&&adminName.trim()===repair.reporter;
 return <div className={'issue-card '+issue.status}><div className="issue-top"><b>{issue.id}</b><span className="issue-loc">{issue.location}</span><span className={'status '+badge(issue.status)}>{issue.status}</span></div>
 <div className="timeline">{issue.events.map((e,idx)=><div className="tl-item" key={idx}><span className="tl-time">{fmt(e.at)}</span><div className="tl-body"><strong>{ISSUE_LABEL[e.type]||'处理记录'}<i>· {e.reporter}</i>{e.type==='recheck'&&<em className={e.passed?'pass':'fail'}>{e.passed?'复检正常':'复检未通过'}</em>}</strong>{e.phenomenon&&<p>{e.phenomenon}</p>}<p>{e.handling}</p></div></div>)}</div>
 {issue.status==='未修复'&&<div className="issue-action"><textarea rows="2" placeholder="填写本次维修处理经过，提交后进入复检…" value={repairText} onChange={e=>setRepairText(e.target.value)}/><button className="secondary" onClick={()=>{if(onRepair(issue.id,repairText))setRepairText('');}}>提交维修，转复检</button></div>}
 {issue.status==='等待复检'&&<div className="issue-action"><textarea rows="2" placeholder="复检备注（可选）" value={recheckText} onChange={e=>setRecheckText(e.target.value)}/><div className="recheck-row"><small>{sameAsRepair?'维修由你提交，需由另一名管理员复检':'维修提交人：'+repair?.reporter+'，请以其他管理员身份复检'}</small><span><button className="secondary" onClick={()=>{if(onRecheck(issue.id,false,recheckText))setRecheckText('');}}>复检异常，退回</button><button className="primary" disabled={sameAsRepair} onClick={()=>{if(onRecheck(issue.id,true,recheckText))setRecheckText('');}}>复检正常，闭环</button></span></div></div>}
 {issue.status==='已修复'&&<div className="issue-closed">✓ 已闭环 · 共 {issue.events.length} 条处理记录，历史全程保留</div>}
 </div>;
}
const badge=s=>s==='未修复'?'repairing':s==='等待复检'?'waiting':'resolved';

if(typeof document!=='undefined')createRoot(document.getElementById('root')).render(<App/>);
