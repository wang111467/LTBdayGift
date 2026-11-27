
(function(){
"use strict";
var el=document.getElementById("intro");
var I=window.__intro={active:true,ready:false,cbs:[],onReady:function(f){I.ready?f():I.cbs.push(f)}};
function fireReady(){ if(I.ready)return; I.ready=true; var c=I.cbs; I.cbs=[]; c.forEach(function(f){try{f()}catch(e){if(window.console)console.log(e)}}); }
if(document.body.hasAttribute("data-skip-intro")||/[?&]nointro/.test(location.search)||location.hash==="#cake"){ el.parentNode.removeChild(el); I.active=false; I.ready=true; return; }
window.__introHold=true;
var COLS=[["#dbecfa","#c9e1f7"],["#f7dfeb","#f2cfe0"],["#f6f1d4","#f0e6b8"],["#e9e1f9","#dccff5"],["#d9f2e9","#c5e9dc"],["#f9e5de","#f4d6cb"]];
var TEXTS=[["生日快乐", ""], ["希望你天天开心", "永远幸福"], ["今天也要开心呀", ""], ["所有的期待都如愿", ""], ["愿你每天都有好心情", ""], ["愿你被世界温柔以待", ""], ["今天是属于你的日子", "生日快乐 天天快乐"], ["新的一岁快乐", ""], ["岁岁平安", "年年有今朝"], ["愿你一直闪闪发光", ""], ["今天你最大", "心想事成"], ["好运常在", ""]];
var cal=document.getElementById("iCal"),center=document.getElementById("iCenter"),go=document.getElementById("iGo");
var L={},T0=null;
function layout(){
  var W=window.innerWidth,H=window.innerHeight,desk=W>=900&&W/H>=1;
  var introW=desk?Math.min(W*.6,H*.98):Math.min(W*.94,H*.62);
  var cw=Math.round(introW*.245),ch=Math.round(cw*.62);
  L={W:W,H:H,cw:cw,ch:ch};
  var zh=cal.querySelector(".zh"),en=cal.querySelector(".en"),st=cal.querySelector(".stroke");
  var zfs=Math.round(Math.min(introW*.33,W*.205));
  zh.style.fontSize=zfs+"px"; en.style.fontSize=Math.round(zfs*.5)+"px"; en.style.top=Math.round(zfs*.6)+"px";
  st.style.top=Math.round(zfs*.8)+"px"; st.style.height=Math.round(zfs*1.1)+"px"; st.style.marginLeft=Math.round(-zfs*.75)+"px"; st.style.width=Math.max(2,Math.round(zfs*.035))+"px";
  cal.style.top=(H*(desk?.49:.46)-zfs*.6)+"px";
  center.style.width=Math.round(introW*.62)+"px";
  center.style.height=Math.round(introW*.27)+"px";
  center.style.top=(H*(desk?.5:.47)-1.3*(introW-cw)/32)+"px";
  center.querySelector("b").style.fontSize=Math.round(introW*.068)+"px";
  center.querySelector("small").style.fontSize=Math.max(10,Math.round(introW*.032))+"px";
  el.style.setProperty("--zs",desk?"1.18":"1.0");
}
var FILL0=0,FILL1=3.2,centerT=3.45,zoomT=3.3,goT=4.2;
/* 小卡片在轻触后直接铺满屏幕。 */
var fc=document.getElementById("iFill"),fx=fc.getContext("2d"),fBase=document.createElement("canvas"),fbx=fBase.getContext("2d"),FC=[],fSpr={},fDone=0,fStatic=0,fDpr=1,fW=0,fH=0,exitT=0;
function fSprite(ci,ti){ var key=ci+"_"+ti; if(fSpr[key])return fSpr[key];
  // Pastel cards with a white rim, corner decorations and a short wish.
  var w=F.cw,h=F.ch,pd=Math.ceil(w*.08),d=fDpr,c=document.createElement("canvas"); c.width=Math.ceil((w+pd*2)*d); c.height=Math.ceil((h+pd*2)*d);
  var x=c.getContext("2d"); x.scale(d,d); x.translate(pd,pd); var r=Math.max(4,Math.round(w*.06)),col=COLS[ci],tx=TEXTS[ti];
  function rr(x0,y0,ww,hh,ra){ x.beginPath(); x.moveTo(x0+ra,y0); x.arcTo(x0+ww,y0,x0+ww,y0+hh,ra); x.arcTo(x0+ww,y0+hh,x0,y0+hh,ra); x.arcTo(x0,y0+hh,x0,y0,ra); x.arcTo(x0,y0,x0+ww,y0,ra); x.closePath(); }
  var a=100*Math.PI/180,dx=Math.sin(a),dy=-Math.cos(a),hl=(Math.abs(w*dx)+Math.abs(h*dy))/2,g=x.createLinearGradient(w/2-dx*hl,h/2-dy*hl,w/2+dx*hl,h/2+dy*hl);
  g.addColorStop(0,"#fbfbfe"); g.addColorStop(.45,col[0]); g.addColorStop(1,col[1]);
  x.save(); x.shadowColor="rgba(150,80,120,.12)"; x.shadowBlur=10; x.shadowOffsetY=4; rr(0,0,w,h,r); x.fillStyle=g; x.fill(); x.restore();
  x.save(); x.shadowColor="rgba(110,60,95,.2)"; x.shadowBlur=2; x.shadowOffsetY=1; rr(0,0,w,h,r); x.fillStyle=g; x.fill(); x.restore();
  rr(.5,.5,w-1,h-1,r); x.strokeStyle="rgba(255,255,255,.9)"; x.lineWidth=1; x.stroke();
  var fi=w*.095; x.fillStyle="rgba(92,78,90,.85)"; x.font=fi.toFixed(1)+"px -apple-system,PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif"; x.textBaseline="top";
  x.textAlign="left"; x.fillText("♡",w*.06,w*.045); x.textAlign="right"; x.fillText("×",w-w*.06,w*.045);
  var fs=w*.083; x.textAlign="center"; x.textBaseline="top"; x.fillStyle="#3b3238"; x.font="700 "+fs.toFixed(1)+"px -apple-system,PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif";
  if(x.letterSpacing!==undefined)x.letterSpacing=(fs*.04).toFixed(2)+"px";
  var ty=h*.44+fs*.125; x.fillText(tx[0],w/2,ty);
  if(tx[1]){ var f2=fs*.7; x.font="500 "+f2.toFixed(1)+"px -apple-system,PingFang SC,Hiragino Sans GB,Microsoft YaHei,sans-serif"; x.fillStyle="rgba(80,70,78,.5)"; x.fillText(tx[1],w/2,ty+fs*1.25+f2*.25); }
  return fSpr[key]={c:c,pd:pd}; }
var F={};
function fillLayout(){
  var W=L.W,H=L.H; fDpr=Math.min(2,window.devicePixelRatio||1); fW=W; fH=H;
  fc.width=Math.round(W*fDpr); fc.height=Math.round(H*fDpr); fBase.width=fc.width; fBase.height=fc.height;
  F.cw=L.cw; F.ch=L.ch; fSpr={};
  // a jittered grid in shuffled order: random-looking like the reference, but it is guaranteed to cover the whole screen
  var gx=F.cw*.62,gy=F.ch*.62,nx=Math.ceil((W+F.cw*.4)/gx),ny=Math.ceil((H+F.ch*.4)/gy),P=[];
  for(var j=0;j<ny;j++)for(var i=0;i<nx;i++)P.push([i*gx-F.cw*.3+(Math.random()-.3)*gx*.8,j*gy-F.ch*.3+(Math.random()-.3)*gy*.8]);
  for(var e=0;e<Math.round(P.length*.35);e++)P.push([Math.random()*W-F.cw*.5,Math.random()*H-F.ch*.5]);
  for(i=P.length-1;i>0;i--){ var k=(Math.random()*(i+1))|0,tmp=P[i];P[i]=P[k];P[k]=tmp; }
  var n=Math.min(P.length,700); FC=[];
  for(i=0;i<n;i++){ var u=i/(n-1); FC.push({x:P[i][0],y:P[i][1],ci:(Math.random()*COLS.length)|0,ti:(Math.random()*TEXTS.length)|0,t:FILL0+(FILL1-FILL0)*Math.pow(u,.62),r:Math.random()}); }
  fDone=0; fStatic=0; fbx.setTransform(1,0,0,1,0,0); fbx.clearRect(0,0,fBase.width,fBase.height); window.__intro.fillN=n;
}
function fDraw(x,c,sc,al,dx,dy,rot){ var s=fSprite(c.ci,c.ti),w=s.c.width/fDpr,h=s.c.height/fDpr; x.save(); x.globalAlpha=al; x.translate((c.x+F.cw/2+(dx||0))*fDpr,(c.y+F.ch/2+(dy||0))*fDpr); if(rot)x.rotate(rot); x.scale(sc*fDpr,sc*fDpr); x.drawImage(s.c,-w/2,-h/2,w,h); x.restore(); }
function pop(k){ if(k>=1)return 1; if(k<=0)return .55; var e=1-Math.pow(1-k,3); return .55+.45*e+Math.sin(k*Math.PI)*.08; }
function fillFrame(t,now){
  if(t<FILL0-.05&&!exitT)return;
  while(fDone<FC.length&&FC[fDone].t+.2<=t){ fDraw(fbx,FC[fDone],1,1); fDone++; }
  if(!exitT&&fDone>=FC.length){ if(fStatic)return; fStatic=1; } else fStatic=0;
  fx.setTransform(1,0,0,1,0,0); fx.clearRect(0,0,fc.width,fc.height);
  if(exitT){ // the cards scatter outward into the light
    var e=Math.min(1,(now-exitT)/1150),ei=e*e*(3-2*e);
    for(var i=0;i<fDone;i++){ var c=FC[i],vx=c.x+F.cw/2-fW/2,vy=c.y+F.ch/2-fH/2,dd=Math.hypot(vx,vy)||1,sp=(.9+c.r*.8)*Math.max(fW,fH)*.9*ei*ei;
      fDraw(fx,c,1+ei*.35,Math.max(0,1-ei*1.15),vx/dd*sp,vy/dd*sp-ei*20*c.r,(c.r-.5)*ei*.9); }
    return; }
  fx.drawImage(fBase,0,0);
  for(var j=fDone;j<FC.length&&FC[j].t<=t;j++){ var k=(t-FC[j].t)/.2; fDraw(fx,FC[j],pop(k),Math.min(1,k*3)); }
}
layout(); fillLayout();
function resizeIntro(){ layout(); fillLayout(); }
window.addEventListener("resize",resizeIntro);
var started=false;
function frame(now){
  if(T0===null)T0=now;
  var t=(now-T0)/1000;
  if(I.paused){ requestAnimationFrame(frame); return; }
  fillFrame(t,now);
  fireReady();
  if(t>=zoomT)el.classList.add("zoom");
  if(t>=centerT-.15)el.classList.add("settle");
  if(t>=centerT)center.classList.add("on");
  if(t>=goT&&I.active)exit();
  if(I.active||(exitT&&now-exitT<1400))requestAnimationFrame(frame);
}
function begin(){
  if(started||!I.active)return;
  started=true;
  el.classList.add("started");
  try{ if(window.__introAudio)window.__introAudio.start(); }catch(e){}
  requestAnimationFrame(frame);
}
I.begin=begin;
document.getElementById("iTap").addEventListener("click",function(e){ e.stopPropagation(); begin(); });
el.addEventListener("click",function(){ if(!started)begin(); });
I.seek=function(sec){ if(!started)begin(); T0=performance.now()-sec*1000; };
function exit(){
  if(!I.active)return; I.active=false; window.__introHold=false; window.removeEventListener("resize",resizeIntro); fireReady(); try{if(window.__introAudio)window.__introAudio.toCake();}catch(e){}
  // cinematic exit: the card swells into light, the little cards scatter outward, the light opens onto the cake
  exitT=performance.now(); el.classList.add("leave"); try{ document.documentElement.classList.add("fromIntro"); }catch(e){}
  setTimeout(function(){ el.classList.add("out"); try{ document.documentElement.classList.add("fromIntroGo"); }catch(e){} },520);
  setTimeout(function(){ if(el.parentNode)el.parentNode.removeChild(el); try{ document.documentElement.classList.remove("fromIntro","fromIntroGo"); }catch(e){} document.dispatchEvent(new CustomEvent("birthday:intro-finished")); },2200);
}
I.exit=exit;
go.addEventListener("click",function(e){ e.stopPropagation(); exit(); });
})();
