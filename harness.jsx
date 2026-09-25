import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {App} from './src/main.jsx';

const container=document.getElementById('root');
const root=createRoot(container);
export function render(){flushSync(()=>root.render(React.createElement(App)));}
export const body=()=>container.textContent;
export const $=s=>container.querySelector(s);
export const $$=s=>[...container.querySelectorAll(s)];
export const act=fn=>{flushSync(fn)};
export function button(prefix){const b=$$('button').find(b=>b.textContent.trim().startsWith(prefix));if(!b)throw new Error('no button: '+prefix);return b;}
export function click(prefix){const b=button(prefix);flushSync(()=>b.dispatchEvent(new window.MouseEvent('click',{bubbles:true})));return b;}
export function setVal(sel,val){const n=$(sel);const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(n),'value').set;setter.call(n,val);n.dispatchEvent(new window.Event('input',{bubbles:true}));flushSync(()=>{});}
export function setPlaceholder(ph,val){const n=$$('input,textarea').find(n=>n.getAttribute('placeholder')===ph);if(!n)throw new Error('no ph: '+ph);const setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(n),'value').set;setter.call(n,val);n.dispatchEvent(new window.Event('input',{bubbles:true}));flushSync(()=>{});}
