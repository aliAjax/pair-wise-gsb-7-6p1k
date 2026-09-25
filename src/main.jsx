import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

/* ---------------- 管理员 ---------------- */
const ADMINS=[{id:'admin1',name:'林澈'},{id:'admin2',name:'周宁'}];
const adminName=id=>(ADMINS.find(a=>a.id===id)||{name:id||'管理员'}).name;

/* ---------------- 初始数据 ---------------- */
const seedExhibits=[
  {id:1,title:'潮汐之后',room:'A01 · 主展厅',type:'装置',desc:'一件记录海岸线变化的沉浸式影像装置。',audio:'https://example.com/audio.mp3',status:'已发布',color:'#e6b45d',
    liveVersion:{title:'潮汐之后',room:'A01 · 主展厅',type:'装置',desc:'一件记录海岸线变化的沉浸式影像装置。',audio:'https://example.com/audio.mp3',color:'#e6b45d'}},
  {id:2,title:'未寄出的信',room:'B02 · 纸上时间',type:'档案',desc:'来自三代人的手写信件与声音档案。',audio:'',status:'草稿',color:'#ef8f84'},
  {id:3,title:'柔软的边界',room:'C01 · 新媒介',type:'互动',desc:'观众的移动会改变墙面上的光影。本季更新新增地面感应区，踩下后浮现潮汐纹路。',audio:'',status:'已发布',color:'#83b9b1',
    liveVersion:{title:'柔软的边界',room:'C01 · 新媒介',type:'互动',desc:'观众的移动会改变墙面上的光影。',audio:'',color:'#83b9b1'}}
];

const seedRecords=[
  {id:'r-seed-1',exhibitId:1,location:'东侧感应灯带',status:'等待复检',repairBy:'admin1',openedAt:'2026-09-22T10:20',closedAt:null,entries:[
    {type:'发现',time:'2026-09-22T10:20',by:'周宁',现象:'灯带两小段不亮，观众靠近时没有跟随反应。',处理经过:'已临时断电，现场拉警戒线围挡。'},
    {type:'维修',time:'2026-09-24T15:40',by:'林澈',处理经过:'更换灯带驱动模块并重新接线，连续通电测试两小时未见异常。'}
  ]},
  {id:'r-seed-2',exhibitId:3,location:'地面互动感应区',status:'未修复',repairBy:null,openedAt:'2026-09-25T09:05',closedAt:null,entries:[
    {type:'发现',time:'2026-09-25T09:05',by:'林澈',现象:'左下角两块感应砖无反馈，观众踩上去光影没有变化。',处理经过:''}
  ]},
  {id:'r-seed-3',exhibitId:2,location:'二层档案柜射灯',status:'已关闭',repairBy:'admin1',openedAt:'2026-09-20T11:30',closedAt:'2026-09-21T16:00',entries:[
    {type:'发现',time:'2026-09-20T11:30',by:'周宁',现象:'射灯频闪，影响纸质展件观看。',处理经过:''},
    {type:'维修',time:'2026-09-21T14:10',by:'林澈',处理经过:'清理镇流器接触点并更换灯泡，持续试灯 40 分钟。'},
    {type:'复检',time:'2026-09-21T16:00',by:'周宁',结论:'正常',备注:'连续观察半天无频闪，恢复开放。'}
  ]}
];

/* ---------------- 工具 ---------------- */
const loadJSON=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const snapshot=x=>({title:x.title,room:x.room,type:x.type,desc:x.desc,audio:x.audio,color:x.color});
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const pad=n=>String(n).padStart(2,'0');
const nowInput=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`};
const fmt=t=>{const d=new Date(t);if(isNaN(+d))return t;return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`};

const OPEN_STATUS=['未修复','等待复检'];
const STATUS_CLS={'未修复':'st-damage','等待复检':'st-recheck','已关闭':'st-closed'};

/* ---------------- 一条现场状况记录 ---------------- */
function RecordCard({r,adminId,onRepair,onRecheck}){
  const [mode,setMode]=useState('');
  const [note,setNote]=useState('');
  const open=OPEN_STATUS.includes(r.status);
  const submit=()=>{
    const v=note.trim();
    if(!v)return;
    if(mode==='repair'){onRepair(r.id,v);setMode('');setNote('');}
    if(mode==='pass'||mode==='fail'){onRecheck(r.id,mode==='pass',v);setMode('');setNote('');}
  };
  return <article className={'rec '+(open?'rec-open':'rec-closed')}>
    <header className="rec-head">
      <div className="rec-loc"><span className="pin">⌖</span><strong>{r.location}</strong></div>
      <div className="rec-tags">
        {open&&<span className="rec-block-tag">挡住发布</span>}
        <span className={'rec-status '+STATUS_CLS[r.status]}>{r.status}</span>
      </div>
    </header>
    <ol className="timeline">
      {r.entries.map((e,i)=>
        <li key={i} className={'tl tl-'+e.type}>
          <div className="tl-when">{fmt(e.time)} · {e.by}</div>
          <div className="tl-type">
            {e.type==='发现'&&<><b>现场发现</b><p>{e.现象}</p>{e.处理经过&&<p className="tl-action">先期处理：{e.处理经过}</p>}</>}
            {e.type==='维修'&&<><b>维修提交</b><p>{e.处理经过}</p></>}
            {e.type==='复检'&&<><b>复检结论：<em className={e.结论==='正常'?'ok':'bad'}>{e.结论}</em></b>{e.备注&&<p>{e.备注}</p>}</>}
          </div>
        </li>)}
    </ol>
    {r.status==='未修复'&&(mode==='repair'
      ? <div className="rec-form">
          <textarea rows="2" placeholder="记录维修与处理经过，提交后进入等待复检…" value={note} onChange={e=>setNote(e.target.value)}/>
          <div className="rec-actions"><button className="link" onClick={()=>{setMode('');setNote('')}}>取消</button><button className="mini-primary" disabled={!note.trim()} onClick={submit}>提交维修</button></div>
        </div>
      : <button className="mini-primary" onClick={()=>setMode('repair')}>提交维修，转等待复检</button>)}
    {r.status==='等待复检'&&(
      r.repairBy===adminId
        ? <p className="rec-hint">维修由 {adminName(r.repairBy)} 提交，需由另一名管理员复检确认。</p>
        : (mode==='pass'||mode==='fail'
            ? <div className="rec-form">
                <textarea rows="2" placeholder={mode==='pass'?'复检情况说明（可选，建议填写）':'仍存在的问题，退回未修复…'} value={note} onChange={e=>setNote(e.target.value)}/>
                <div className="rec-actions"><button className="link" onClick={()=>{setMode('');setNote('')}}>取消</button>
                  <button className="mini-warn" disabled={mode==='fail'&&!note.trim()} onClick={submit}>{mode==='pass'?'确认正常，关闭记录':'仍有问题，退回维修'}</button></div>
              </div>
            : <div className="rec-actions">
                <span className="rec-hint">维修人 {adminName(r.repairBy)} · 由你（{adminName(adminId)}）复检</span>
                <button className="mini-warn" onClick={()=>setMode('fail')}>仍有问题</button>
                <button className="mini-primary" onClick={()=>setMode('pass')}>复检通过，恢复</button>
              </div>))}
    {r.status==='已关闭'&&<p className="rec-closed-note">已修复并经 {r.entries.filter(e=>e.type==='复检').slice(-1)[0]?.by||'—'} 复检确认 · {fmt(r.closedAt)} 关闭，履历归档保留</p>}
  </article>;
}

/* ---------------- 应用 ---------------- */
function App(){
  const [exhibits,setExhibits]=useState(()=>loadJSON('guide-exhibits',seedExhibits).map(x=>x.status==='已发布'&&!x.liveVersion?{...x,liveVersion:snapshot(x)}:x));
  const [records,setRecords]=useState(()=>loadJSON('guide-ledger',seedRecords));
  const [adminId,setAdminId]=useState(()=>loadJSON('guide-admin','admin1'));
  const [selected,setSelected]=useState(1);
  const [view,setView]=useState('edit');
  const [filter,setFilter]=useState('全部');
  const [form,setForm]=useState({title:'',room:'',type:'装置',desc:'',audio:''});
  const [rep,setRep]=useState({location:'',foundAt:nowInput(),phenomenon:'',action:''});
  const [notice,setNotice]=useState('');

  useEffect(()=>localStorage.setItem('guide-exhibits',JSON.stringify(exhibits)),[exhibits]);
  useEffect(()=>localStorage.setItem('guide-ledger',JSON.stringify(records)),[records]);
  useEffect(()=>localStorage.setItem('guide-admin',JSON.stringify(adminId)),[adminId]);
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),4000);return ()=>clearTimeout(t)},[notice]);

  const visible=useMemo(()=>filter==='全部'?exhibits:exhibits.filter(x=>x.status===filter),[exhibits,filter]);
  const current=exhibits.find(x=>x.id===selected)||exhibits[0];
  const openOf=id=>records.filter(r=>r.exhibitId===id&&OPEN_STATUS.includes(r.status));
  const me=ADMINS.find(a=>a.id===adminId)||ADMINS[0];

  const add=()=>{
    if(!form.title.trim()){setNotice('请先填写展项标题');return;}
    const item={...form,id:Date.now(),status:'草稿',color:['#e6b45d','#ef8f84','#83b9b1','#9ba7dc'][exhibits.length%4]};
    setExhibits([...exhibits,item]);setSelected(item.id);
    setForm({title:'',room:'',type:'装置',desc:'',audio:''});setNotice('展项已保存为草稿');
  };
  const update=(k,v)=>setExhibits(exhibits.map(x=>x.id===current.id?{...x,[k]:v}:x));

  /* 发布：有未结现场记录时一律挡住；访客始终看上次确认安全的快照 */
  const publishUpdate=()=>{
    const blockers=openOf(current.id);
    if(blockers.length){setNotice(`发布被 ${blockers.length} 条未结现场记录挡住，需修复并复检通过后才能发布`);return;}
    const wasLive=current.status==='已发布';
    setExhibits(xs=>xs.map(x=>x.id===current.id?{...x,status:'已发布',liveVersion:snapshot(x)}:x));
    setNotice(wasLive?'已发布更新，访客预览切换为本次确认安全的版本':'已发布，访客预览已更新');
  };
  const withdraw=()=>{update('status','草稿');setNotice('已撤回发布，访客端不再显示该展项');};

  /* 登记现场状况：同位置有未结记录则追加，不另开一条 */
  const submitReport=()=>{
    const loc=rep.location.trim();
    if(!loc){setNotice('请填写损坏位置');return;}
    if(!rep.phenomenon.trim()){setNotice('请填写损坏现象');return;}
    const entry={type:'发现',time:rep.foundAt?new Date(rep.foundAt).toISOString():new Date().toISOString(),by:me.name,现象:rep.phenomenon.trim(),处理经过:rep.action.trim()};
    const existing=records.find(r=>r.exhibitId===current.id&&OPEN_STATUS.includes(r.status)&&r.location.trim()===loc);
    if(existing){
      setRecords(rs=>rs.map(r=>r.id===existing.id?{...r,entries:[...r.entries,entry]}:r));
      setNotice(`「${loc}」已有未结记录，已追加到原记录，未另开一条`);
    }else{
      const r={id:uid('r-'),exhibitId:current.id,location:loc,status:'未修复',repairBy:null,openedAt:entry.time,closedAt:null,entries:[entry]};
      setRecords(rs=>[r,...rs]);
      setNotice('现场状况已登记，发布已暂停');
    }
    setRep({location:'',foundAt:nowInput(),phenomenon:'',action:''});
  };

  const submitRepair=(rid,note)=>setRecords(rs=>rs.map(r=>r.id===rid?{...r,status:'等待复检',repairBy:adminId,entries:[...r.entries,{type:'维修',time:new Date().toISOString(),by:me.name,处理经过:note}]}:r));
  const submitRecheck=(rid,pass,note)=>{
    const target=records.find(r=>r.id===rid);
    if(!target||target.repairBy===adminId){setNotice('复检必须由提交维修之外的另一名管理员完成');return;}
    const entry={type:'复检',time:new Date().toISOString(),by:me.name,结论:pass?'正常':'仍有问题',备注:note};
    setRecords(rs=>rs.map(r=>r.id===rid?{...r,status:pass?'已关闭':'未修复',closedAt:pass?entry.time:null,...(pass?{}:{repairBy:null}),entries:[...r.entries,entry]}:r));
    setNotice(pass?'复检通过，记录已关闭，可以发布恢复后的版本':'已退回未修复，请继续处理');
  };

  const exportData=()=>{
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([JSON.stringify({exhibits,records},null,2)],{type:'application/json'}));
    a.download='exhibition-guide.json';a.click();setNotice('已导出展项与现场台账数据');
  };

  /* ---------------- 访客端：只渲染上次确认安全的快照 ---------------- */
  const live=x=>({...x,...(x.liveVersion||snapshot(x)),_safe:!!x.liveVersion});
  if(view==='visitor'){
    const published=exhibits.filter(x=>x.status==='已发布'&&x.liveVersion).map(live);
    return <div className="visitor">
      <header><div className="brand"><span className="mark">M</span><span>潮汐美术馆</span></div><button className="ghost" onClick={()=>setView('edit')}>返回编辑</button></header>
      <main className="visitor-main">
        <span className="eyebrow">VISITOR GUIDE / 2024</span>
        <h1>沿着作品，<em>走进</em>另一种时间。</h1>
        <p className="lead">当你靠近一件作品，它的故事就开始流动。选择一个展项开始探索。</p>
        <div className="visitor-grid">{published.map(x=><article className="visitor-card" key={x.id} onClick={()=>{setSelected(x.id);setView('detail')}}>
          <div className="art" style={{background:x.color}}><span>{String(x.id).padStart(2,'0')}</span><i>↗</i></div>
          <div className="card-meta"><small>{x.room}</small><h3>{x.title}</h3><p>{x.desc}</p></div>
        </article>)}</div>
      </main>
    </div>;
  }
  if(view==='detail'&&current){
    const v=current.status==='已发布'&&current.liveVersion?live(current):null;
    if(!v)return <div className="visitor">
      <header><div className="brand"><span className="mark">M</span><span>潮汐美术馆 · 导览</span></div><button className="ghost" onClick={()=>setView('visitor')}>← 全部展项</button></header>
      <main className="visitor-main"><h1 style={{fontSize:34}}>该展项目前<em>暂不可用</em>。</h1><p className="lead">现场维护中，请稍后通过导览页选择其他展项。</p></main>
    </div>;
    return <div className="visitor">
      <header><div className="brand"><span className="mark">M</span><span>潮汐美术馆 · 导览</span></div><button className="ghost" onClick={()=>setView('visitor')}>← 全部展项</button></header>
      <main className="detail">
        <div className="detail-art" style={{background:v.color}}><span>{String(v.id).padStart(2,'0')}</span></div>
        <div className="detail-copy">
          <span className="eyebrow">{v.room} / {v.type}</span>
          <h1>{v.title}</h1><p>{v.desc}</p>
          {v.audio&&<button className="audio" onClick={()=>setNotice('正在播放导览音频…')}>▶ 播放语音导览</button>}
          <div className="qr"><div className="qr-box">▦</div><div><strong>分享这个展项</strong><small>扫描二维码，在手机上继续阅读</small></div></div>
        </div>
      </main>
      {notice&&<div className="toast">{notice}</div>}
    </div>;
  }

  /* ---------------- 编辑工作台 ---------------- */
  const blockers=current?openOf(current.id):[];
  const myRecords=records.filter(r=>r.exhibitId===current?.id).sort((a,b)=>{
    const ao=OPEN_STATUS.includes(a.status)?(a.status==='未修复'?0:1):2,bo=OPEN_STATUS.includes(b.status)?(b.status==='未修复'?0:1):2;
    return ao!==bo?ao-b:new Date(b.openedAt)-new Date(a.openedAt);
  });
  const sameLoc=rep.location.trim()&&myRecords.find(r=>OPEN_STATUS.includes(r.status)&&r.location.trim()===rep.location.trim());

  return <div className="app">
    <aside>
      <div className="brand"><span className="mark">M</span><span>展览工作台</span></div>
      <div className="side-label">当前项目</div>
      <div className="project"><span className="project-dot"></span><div><strong>潮汐之后</strong><small>2024 春季展</small></div><span>⌄</span></div>
      <nav>
        <button className="active">▧ <span>展项内容</span><b>{exhibits.length}</b></button>
        <button>⌁ <span>展厅动线</span></button>
        <button>◉ <span>二维码</span></button>
      </nav>
      <div className="side-foot">
        <div className="admin-switch">
          <div className="side-label" style={{margin:'0 0 6px'}}>当前管理员（复检需换人）</div>
          <div className="admin-btns">{ADMINS.map(a=>
            <button key={a.id} className={adminId===a.id?'on':''} onClick={()=>{setAdminId(a.id);setNotice('已切换为管理员 '+a.name)}}>{a.name}</button>)}
          </div>
        </div>
        <button>⚙ 设置</button>
        <small>已自动保存 · 刚刚</small>
      </div>
    </aside>
    <main className="workspace">
      <header className="topbar">
        <div><span className="eyebrow">EXHIBITION BUILDER</span><h1>展项内容</h1></div>
        <div className="top-actions">
          <button className="secondary" onClick={exportData}>↓ 导出 JSON</button>
          <button className="secondary" onClick={()=>setView('visitor')}>◉ 访客预览</button>
          {current&&<>
            {current.status==='已发布'&&<button className="secondary" onClick={withdraw}>撤回发布</button>}
            <button className="primary" disabled={!!blockers.length} title={blockers.length?blockers.map(r=>r.location+'（'+r.status+'）').join('、'):''} onClick={publishUpdate}>
              {blockers.length?'现场问题未结，不可发布':'发布更新'} <span>↗</span>
            </button>
          </>}
        </div>
      </header>
      <div className="content">
        <section className="list-pane">
          <div className="list-head">
            <div><h2>全部展项</h2><span>{exhibits.length} 个展项</span></div>
            <button className="add-btn" onClick={()=>document.querySelector('.form-panel').scrollIntoView({behavior:'smooth'})}>＋ 添加展项</button>
          </div>
          <div className="filters">{['全部','已发布','草稿'].map(x=><button className={filter===x?'selected':''} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div>
          <div className="exhibit-list">{visible.map(x=>{
            const opens=openOf(x.id);
            return <button className={'exhibit-row '+(selected===x.id?'chosen':'')} key={x.id} onClick={()=>setSelected(x.id)}>
              <span className="thumb" style={{background:x.color}}>{String(x.id).padStart(2,'0')}</span>
              <span className="row-copy"><strong>{x.title}</strong><small>{x.room} · {x.type}</small></span>
              {opens.length>0&&<span className="warn-dot" title={'未结现场记录：'+opens.map(r=>r.location).join('、')}>⚠{opens.length}</span>}
              <span className={'status '+(x.status==='已发布'?'live':'draft')}>{x.status}</span>
              <span className="chev">›</span>
            </button>;})}
          </div>
        </section>
        <section className="form-panel">
          <div className="panel-title">
            <div><span className="eyebrow">EDIT EXHIBIT</span><h2>编辑展项</h2></div>
            <span className={'status '+(current?.status==='已发布'?'live':'draft')}>{current?.status}</span>
          </div>

          {current&&blockers.length>0&&<div className="block-banner">
            <div className="bb-title">⚠ 现场有未结问题，发布已被挡住</div>
            <ul>{blockers.map(r=>
              <li key={r.id}><span className={'rec-status '+STATUS_CLS[r.status]}>{r.status}</span><strong>{r.location}</strong><small>{fmt(r.openedAt)} 登记 · 最近 {r.entries[r.entries.length-1].type}：{r.entries[r.entries.length-1].by}</small></li>)}
            </ul>
            <p>{current.status==='已发布'
              ? '访客预览保持上次确认安全的版本，当前编辑暂不外发；问题修复并经另一名管理员复检通过后即可发布。'
              : '问题修复并经另一名管理员复检通过后，才能发布该展项。'}</p>
            <button className="link" onClick={()=>document.getElementById('ledger-'+current.id)?.scrollIntoView({behavior:'smooth'})}>前往处理 ↓</button>
          </div>}

          {current&&<div className="editor">
            <label>展项标题<input value={current.title} onChange={e=>update('title',e.target.value)}/></label>
            <div className="two">
              <label>所在展厅<input value={current.room} onChange={e=>update('room',e.target.value)}/></label>
              <label>内容类型<select value={current.type} onChange={e=>update('type',e.target.value)}><option>装置</option><option>档案</option><option>互动</option><option>绘画</option></select></label>
            </div>
            <label>展项介绍<textarea rows="5" value={current.desc} onChange={e=>update('desc',e.target.value)}/></label>
            <label>语音导览 URL<input value={current.audio} placeholder="https://…" onChange={e=>update('audio',e.target.value)}/><small className="hint">访客扫描二维码后可播放</small></label>
            <div className="preview-block">
              <div className="preview-heading"><span>二维码预览</span><button onClick={()=>setNotice('二维码链接已复制')}>复制链接</button></div>
              <div className="qr-preview"><div className="qr-box big">▦</div><div><strong>展项-{String(current.id).padStart(3,'0')}</strong><small>/guide/{current.id}</small></div></div>
            </div>
          </div>}

          {current&&<div className="ledger" id={'ledger-'+current.id}>
            <div className="panel-title">
              <div><span className="eyebrow">SITE CONDITION LEDGER</span><h2>现场状况台账 · {current.title}</h2></div>
              <span className={blockers.length?'ledger-count danger':'ledger-count'}>{blockers.length?blockers.length+' 条未结':'无未结问题'}</span>
            </div>

            <div className="report-form">
              <div className="two">
                <label>损坏位置
                  <input list={'loc-'+current.id} value={rep.location} onChange={e=>setRep({...rep,location:e.target.value})} placeholder="如：东侧感应灯带"/>
                  <datalist id={'loc-'+current.id}>{[...new Set(myRecords.map(r=>r.location))].map(l=><option key={l} value={l}/>)}</datalist>
                </label>
                <label>发现时间<input type="datetime-local" value={rep.foundAt} onChange={e=>setRep({...rep,foundAt:e.target.value})}/></label>
              </div>
              <label>损坏现象<textarea rows="2" value={rep.phenomenon} onChange={e=>setRep({...rep,phenomenon:e.target.value})} placeholder="现场看到的情况…"/></label>
              <label>处理经过（发现时已采取的措施，可留空）<textarea rows="2" value={rep.action} onChange={e=>setRep({...rep,action:e.target.value})} placeholder="如：已断电、围挡、通知维保…"/></label>
              {sameLoc&&<p className="append-hint">↳ 该位置已有一条<b>{sameLoc.status}</b>记录，提交后会追加进去，不会另开一条。</p>}
              <button className="primary full" onClick={submitReport}>登记现场状况</button>
            </div>

            <div className="rec-list">
              {myRecords.length===0&&<p className="ledger-empty">该展项还没有现场状况记录。</p>}
              {myRecords.map(r=><RecordCard key={r.id} r={r} adminId={adminId} onRepair={submitRepair} onRecheck={submitRecheck}/>)}
            </div>
          </div>}

          <div className="new-form">
            <div className="panel-title"><div><span className="eyebrow">NEW ENTRY</span><h2>快速添加展项</h2></div></div>
            <div className="two"><input placeholder="展项标题" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><input placeholder="展厅编号" value={form.room} onChange={e=>setForm({...form,room:e.target.value})}/></div>
            <textarea placeholder="一句话介绍…" rows="2" value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})}/>
            <button className="primary full" onClick={add}>保存新展项</button>
          </div>
        </section>
      </div>
    </main>
    {notice&&<div className="toast">{notice}</div>}
  </div>;
}

createRoot(document.getElementById('root')).render(<App/>);
