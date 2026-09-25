import {JSDOM} from 'jsdom';
import {build} from 'vite';
import {fileURLToPath} from 'node:url';
import {rmSync} from 'node:fs';
const out=fileURLToPath(new URL('./.harness.mjs',import.meta.url));
rmSync(out,{force:true});
const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost/',pretendToBeVisual:true});
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.navigator=dom.window.navigator;
globalThis.HTMLElement=dom.window.HTMLElement;globalThis.HTMLTextAreaElement=dom.window.HTMLTextAreaElement;globalThis.Event=dom.window.Event;globalThis.MouseEvent=dom.window.MouseEvent;
globalThis.localStorage=dom.window.localStorage;globalThis.requestAnimationFrame=cb=>setTimeout(cb,0);globalThis.cancelAnimationFrame=id=>clearTimeout(id);
globalThis.IS_REACT_ACT_ENVIRONMENT=false;

await build({logLevel:'error',plugins:[{name:'skip-css',enforce:'pre',resolveId(id){if(id.endsWith('.css'))return '\0empty.css'},load(id){return id==='\0empty.css'?'export default {}':null}}],build:{ssr:true,write:true,outDir:'.',rollupOptions:{input:{h:fileURLToPath(new URL('./harness.jsx',import.meta.url))},output:{entryFileNames:'.harness.mjs',format:'esm'}},publicDir:false}});
const H=await import(out);
H.render();
const assert=(c,m)=>{if(!c){console.error('FAIL:',m);process.exit(1)}console.log('PASS:',m);};
let t=H.body();

// 1. 初始：展项1有未修复记录，发布按钮禁用，有拦截横幅
assert(t.includes('发布已被挡住'),'拦截横幅显示');
const pubBtn=H.button('发布');
assert(pubBtn.disabled,'有未结记录时发布按钮禁用');

// 2. 访客预览展示安全快照（初始内容）
H.act(()=>H.button('◉ 访客预览').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));
assert(H.body().includes('潮汐之后'),'访客列表展示已发布展项(快照标题)');
H.act(()=>H.button('返回编辑').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));

// 3. 未填管理员姓名登记 -> 提示
H.setPlaceholder('如：北侧投影幕 · 左下角','测试位置');
H.setPlaceholder('看到的损坏 / 异常表现','测试现象');
H.click('登记 / 追加');
assert(H.body().includes('请先在台账顶部填写当前管理员姓名'),'未填管理员时拦截登记');

// 4. 填管理员后登记成功
H.setVal('.admin-field input','张三');
assert(H.body().includes('该位置已有未结记录')===false,'换用新位置前不显示追加提示');
H.setPlaceholder('如：北侧投影幕 · 左下角','测试位置');
H.click('登记 / 追加');
t=H.body();
assert(t.includes('IS-')&&t.includes('测试位置'),'新记录已登记');
assert(/IS-\d{4}.*测试位置/.test(t.replace(/\s+/g,' ')),'记录包含编号与位置');

// 5. 同位置再登记 -> 追加，不新开（记录数不增加）
H.setPlaceholder('如：北侧投影幕 · 左下角','测试位置');
assert(H.body().includes('不另开一条'),'同位置输入时提示将追加');
H.setPlaceholder('看到的损坏 / 异常表现','第二次巡查又发现裂痕扩大');
H.setPlaceholder('现场已采取的措施（可为空，后续可追加）','再次加固');
H.click('登记 / 追加');
t=H.body();
assert(t.includes('已追加到未结记录'),'同位置提交提示追加');
assert(t.includes('第二次巡查又发现裂痕扩大'),'追加内容出现在时间线');
const issueCards=H.$$('.issue-card').filter(c=>c.textContent.includes('测试位置'));
assert(issueCards.length===1,'同位置只有一条记录');
assert(t.includes('现场补充'),'追加事件类型为现场补充');

// 6. 等待复检状态下继续追加 -> 复检前补充，状态回到未修复
H.setPlaceholder('填写本次维修处理经过，提交后进入复检…','已更换幕布');
H.click('提交维修，转复检');
t=H.body();
assert(t.includes('等待复检'),'维修提交后进入等待复检');
H.setPlaceholder('如：北侧投影幕 · 左下角','测试位置');
assert(H.body().includes('不另开一条'),'等待复检时同位置提示追加');
H.setPlaceholder('看到的损坏 / 异常表现','复检前再观察到一处褶皱');
H.click('登记 / 追加');
t=H.body();
assert(t.includes('复检前补充'),'等待复检追加标记为复检前补充');
const card=H.$$('.issue-card').find(c=>c.textContent.includes('测试位置'));
assert(card.className.includes('未修复'),'追加后状态回到未修复，需重新提交维修');

// 7. 张三重新提交维修；同一管理员复检被禁止，李四可退回
H.setPlaceholder('填写本次维修处理经过，提交后进入复检…','二次维修');
H.click('提交维修，转复检');
const passBtn=H.$$('button').find(b=>b.textContent.trim()==='复检正常，闭环');
assert(passBtn&&passBtn.disabled,'维修提交人不能自己复检（按钮禁用）');
H.setVal('.admin-field input','李四');
H.click('复检异常，退回');
assert(H.$$('.issue-card').find(c=>c.textContent.includes('测试位置')).className.includes('未修复'),'另一名管理员复检异常退回未修复');

// 8. 张三再次提交维修，李四复检通过 -> 闭环，历史保留，发布按钮恢复
H.setVal('.admin-field input','张三');
H.setPlaceholder('填写本次维修处理经过，提交后进入复检…','三次维修完成');
H.click('提交维修，转复检');
H.setVal('.admin-field input','李四');
H.click('复检正常，闭环');
t=H.body();
assert(t.includes('已闭环'),'另一名管理员复检通过后闭环');
const closed=H.$$('.issue-card').find(c=>c.textContent.includes('测试位置'));
assert(closed.querySelectorAll('.tl-item').length>=6,'历次处理全部保留(>=6条事件)');
assert(t.includes('还有其他未结记录'),'另有 IS-0421 未闭环，安全版本不刷新');

// 9. 新记录虽闭环，但种子记录 IS-0421 仍未修复 -> 发布仍然被挡
assert(H.button('发布更新').disabled,'种子记录 IS-0421 仍挡着发布');
assert(H.body().includes('IS-0421'),'拦截横幅继续指出挡路记录');

// 10. 处理掉种子记录 IS-0421：张三维修、李四复检
H.setVal('.admin-field input','张三');
// 找到 IS-0421 卡片内的维修按钮
const seedCard=H.$$('.issue-card').find(c=>c.textContent.includes('IS-0421'));
assert(seedCard&&seedCard.className.includes('未修复'),'IS-0421 初始为未修复');
const seedTa=seedCard.querySelector('textarea');
const setter=Object.getOwnPropertyDescriptor(globalThis.HTMLTextAreaElement.prototype,'value').set;
setter.call(seedTa,'修补裂口完成');seedTa.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
H.act(()=>seedCard.querySelector('button').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));
H.setVal('.admin-field input','李四');
const seedCard2=H.$$('.issue-card').find(c=>c.textContent.includes('IS-0421'));
const btns=seedCard2.querySelectorAll('button');
H.act(()=>btns[1].dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true}))); // 复检正常，闭环
t=H.body();
assert(!t.includes('发布已被挡住'),'全部闭环后拦截横幅消失');
assert(t.includes('现场无未结问题'),'显示安全状态条');

// 11. 编辑内容后发布 -> 快照更新，访客可见新内容
assert(H.body().includes('访客端版本确认于'),'编辑前安全条显示已确认版本');
H.setVal('.editor input','潮汐之后（更新版）');
assert(H.body().includes('发布后访客才会看到'),'有未发布改动时安全条提示先发布');
H.click('发布更新');
H.act(()=>H.button('◉ 访客预览').dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true})));
assert(H.body().includes('潮汐之后（更新版）'),'发布后访客看到新版本');

console.log('\nALL TESTS PASSED');
rmSync(out,{force:true});
process.exit(0);
