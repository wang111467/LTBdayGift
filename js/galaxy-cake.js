
(function(){
"use strict";
var $ = function(id){ return document.getElementById(id); };
function rnd(a,b){ return a + Math.random()*(b-a); }

/* Music is managed by the existing shared player. */
function musicBoxMoment() {}
function stopVoices() {}
function unduckSong() {}

/* ---------- UI state shared by 3D and 2D ---------- */
var lit = true;
function markScenePainted(){
  if (window.__birthdayScenePainted) return;
  window.__birthdayScenePainted = true;
  document.dispatchEvent(new CustomEvent("birthday:painted"));
}
function showWish(){ document.dispatchEvent(new CustomEvent('birthday:extinguished')); }
function hideWish(){}

/* ---------- WebGL check ---------- */
function hasWebGL(){
  try{ var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"))); }catch(e){ return false; }
}
var ok3d = !/[?&]render=2d(?:&|$)/.test(location.search) && typeof THREE !== "undefined" && hasWebGL(), booted = false;
function boot(){
  if (booted) return;
  if (ok3d && !window.__cakeSideImage.naturalWidth){
    window.__cakeSideReady.then(boot, function(){ ok3d = false; boot(); }); return;
  }
  booted = true;
  if (ok3d){ try{ start3D(); }catch(err){ ok3d = false; if (window.console) console.log("3D init failed", err); var st = $("stage"); st.innerHTML = ""; } }
  if (!ok3d) start2D();
}
// Start initializing the cake behind the full-screen cards.
if (window.__intro && window.__intro.active) window.__intro.onReady(boot); else boot();

/* =================================================================== */
function start3D(){
var stage = $("stage");
var renderer = new THREE.WebGLRenderer({antialias:true, alpha:false, powerPreference:"high-performance"});
var PR = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(PR);
renderer.setClearColor(0x03050f, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = false; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(36, 1, .1, 200);
camera.position.set(0, 1.25, 10);
camera.lookAt(0, -.05, 0);

/* soft studio lighting: env reflections + key + rim + fill */
var X = window.THREEX || null;
try{
  if (X && X.RoomEnvironment){ var pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new X.RoomEnvironment(), .04).texture; pmrem.dispose(); }
}catch(e){}
scene.add(new THREE.AmbientLight(0x9aa0ff, .45));
var key = new THREE.DirectionalLight(0xfff1e0, 1.8); key.position.set(-5, 5.5, 2.2); key.castShadow = false;
key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = -2.6; key.shadow.camera.right = 2.6; key.shadow.camera.top = 2.6; key.shadow.camera.bottom = -2.6;
key.shadow.camera.near = 1; key.shadow.camera.far = 20; key.shadow.bias = -.0004; key.shadow.normalBias = .02; key.shadow.radius = 5;
scene.add(key);
var rim = new THREE.DirectionalLight(0x7a8cff, 2.4); rim.position.set(4.5, 2.5, -5); scene.add(rim);
var rim2 = new THREE.DirectionalLight(0xff9ec8, 1.2); rim2.position.set(-5, 1.5, -3); scene.add(rim2);
var fill = new THREE.DirectionalLight(0xd8d0ff, .8); fill.position.set(4, 1, 6); scene.add(fill);

/* --- point shader shared by all particle systems --- */
var VS = "attribute float size;attribute vec3 acol;attribute float phase;attribute float alpha;" +
 "uniform float uTime;uniform float uPR;uniform float uTw;uniform float uScale;varying vec3 vC;varying float vA;" +
 "void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;" +
 "float sp=1.2+fract(phase*7.31)*2.8;float tw=1.0-uTw*0.5*(1.0+sin(uTime*sp+phase*6.2831));" +
 "vA=alpha*tw;vC=acol;gl_PointSize=max(size*uPR*uScale/(-mv.z),1.0);}";
var FS = "uniform float uMode;uniform float uOpacity;varying vec3 vC;varying float vA;" +
 "void main(){vec2 c=gl_PointCoord-0.5;float d=length(c)*2.0;if(d>1.0)discard;" +
 "float glow=pow(1.0-d,1.8)+0.6*(1.0-smoothstep(0.0,0.35,d));" +
 "float bok=(1.0-smoothstep(0.82,1.0,d))*(0.45+0.55*smoothstep(0.35,0.92,d));" +
 "float a=mix(glow,bok,uMode);vec3 lc=pow(vC,vec3(2.2));gl_FragColor=vec4(lc*a,a)*vA*uOpacity;\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}";
var allMats = [];
function pointsMat(opts){
  var m = new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0},uPR:{value:PR},uTw:{value:opts.tw||0},uScale:{value:300},uMode:{value:opts.mode||0},uOpacity:{value:opts.opacity==null?1:opts.opacity}},
    vertexShader:VS, fragmentShader:FS, transparent:true, depthWrite:false,
    blending:THREE.CustomBlending, blendSrc:THREE.OneFactor, blendDst:THREE.OneMinusSrcAlphaFactor
  });
  if (opts.additive){ m.blendDst = THREE.OneFactor; }
  allMats.push(m); return m;
}
function makePoints(n, mat){
  var g = new THREE.BufferGeometry();
  var a = {position:new Float32Array(n*3), acol:new Float32Array(n*3), size:new Float32Array(n), phase:new Float32Array(n), alpha:new Float32Array(n)};
  g.setAttribute("position", new THREE.BufferAttribute(a.position,3));
  g.setAttribute("acol", new THREE.BufferAttribute(a.acol,3));
  g.setAttribute("size", new THREE.BufferAttribute(a.size,1));
  g.setAttribute("phase", new THREE.BufferAttribute(a.phase,1));
  g.setAttribute("alpha", new THREE.BufferAttribute(a.alpha,1));
  for (var i=0;i<n;i++){ a.phase[i] = Math.random(); a.alpha[i] = 1; }
  var p = new THREE.Points(g, mat); p.frustumCulled = false; p.userData.a = a; p.userData.n = n;
  return p;
}
function setCol(arr,i,c){ arr[i*3]=c[0]; arr[i*3+1]=c[1]; arr[i*3+2]=c[2]; }
function dirty(p){ var g = p.geometry; for (var k in g.attributes) g.attributes[k].needsUpdate = true; }

/* --- background starfield --- */
var stars = makePoints(1100, pointsMat({tw:.75, additive:true}));
(function(){ var a = stars.userData.a;
  for (var i=0;i<1100;i++){
    var u = Math.random()*2-1, th = Math.random()*6.2832, r = rnd(35,70), s = Math.sqrt(1-u*u);
    a.position[i*3] = r*s*Math.cos(th); a.position[i*3+1] = r*u; a.position[i*3+2] = r*s*Math.sin(th) - 10;
    var t = Math.random(); setCol(a.acol,i, t<.15?[1,.85,.7]:t<.3?[.7,.8,1]:[1,1,1]);
    a.size[i] = rnd(.5,1.6) * (Math.random()<.05?2.2:1);
  } dirty(stars); })();
scene.add(stars);

/* --- world group (drag to orbit) --- */
var world = new THREE.Group(); scene.add(world);
var cakeG = new THREE.Group(); world.add(cakeG);

function radialTex(stops, size){
  var c = document.createElement("canvas"); c.width = c.height = size||128; var s = c.width/2, x = c.getContext("2d");
  var g = x.createRadialGradient(s,s,0,s,s,s); stops.forEach(function(st){ g.addColorStop(st[0],st[1]); });
  x.fillStyle = g; x.fillRect(0,0,c.width,c.height);
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/* ================= hand-painted gouache starry cake ================= */
var CAKE_R = 1.22, CAKE_H = 2.0, CAKE_BOTTOM = -1.3, CAKE_TOP = CAKE_BOTTOM + CAKE_H, CREAM_TOP = CAKE_TOP + .012;
var GOLD = 0xf2c46b;
function shadowy(m){ m.castShadow = false; m.receiveShadow = false; return m; }
var dummy = new THREE.Object3D();
// seeded random so the painting looks the same on every load
var pseed = 20011109;
function pr(){ pseed = (pseed*1664525 + 1013904223) >>> 0; return pseed/4294967296; }
function pf(a,b){ return a + pr()*(b-a); }
function pick(arr){ return arr[(pr()*arr.length)|0]; }
function hexRGB(h){ var n = parseInt(h.slice(1),16); return [n>>16&255, n>>8&255, n&255]; }
function rgba(c, a, j){ j = j||0; return "rgba("+Math.max(0,Math.min(255,(c[0]+pf(-j,j))|0))+","+Math.max(0,Math.min(255,(c[1]+pf(-j,j))|0))+","+Math.max(0,Math.min(255,(c[2]+pf(-j,j))|0))+","+a.toFixed(3)+")"; }
function starPts(x,y,r,rot,inner){ var p = []; for (var i=0;i<10;i++){ var rr = i%2 ? r*(inner||.42) : r, a = rot + i*Math.PI/5; p.push([x+Math.sin(a)*rr, y-Math.cos(a)*rr]); } return p; }
function bez(p, t){ var u = 1-t; return [u*u*u*p[0][0]+3*u*u*t*p[1][0]+3*u*t*t*p[2][0]+t*t*t*p[3][0], u*u*u*p[0][1]+3*u*u*t*p[1][1]+3*u*t*t*p[2][1]+t*t*t*p[3][1]]; }
// one bristle brush stroke along a cubic bezier: many thin hairs, colour jitter, tapered ends, dry broken tail
function brushStroke(x, pts, width, col, alpha, o){
  o = o || {}; var n = o.hairs || Math.max(6, Math.min(26, (width/3)|0)), dry = o.dry == null ? .55 : o.dry, jit = o.jit == null ? 22 : o.jit;
  var len = 0, prev = pts[0]; for (var s=1;s<=10;s++){ var q = bez(pts, s/10); len += Math.hypot(q[0]-prev[0], q[1]-prev[1]); prev = q; }
  var N = Math.max(8, Math.min(90, (len/7)|0)), P = [], Nn = [];
  for (var i=0;i<=N;i++){ var t = i/N, a = bez(pts, Math.max(0,t-.01)), b = bez(pts, Math.min(1,t+.01)), dx = b[0]-a[0], dy = b[1]-a[1], l = Math.hypot(dx,dy)||1;
    P.push(bez(pts,t)); Nn.push([-dy/l, dx/l]); }
  x.lineCap = "round"; x.lineJoin = "round";
  for (var h=0;h<n;h++){
    var off = (h/(n-1)-.5)*width*pf(.85,1.1), hw = width/n*pf(1.3,2.6), ha = alpha*pf(.45,1), start = pr()*.12, end = 1 - pr()*.25*(Math.abs(off)/width*2+.3);
    x.strokeStyle = rgba(col, ha, jit); x.lineWidth = hw; x.beginPath(); var pen = false;
    for (i=0;i<=N;i++){ var t2 = i/N; if (t2 < start || t2 > end){ pen = false; continue; }
      var taper = .55 + .45*Math.sin(Math.PI*Math.min(1, t2*1.15)), gap = t2 > dry && pr() < (t2-dry)*1.3;
      var px = P[i][0] + Nn[i][0]*off*taper, py = P[i][1] + Nn[i][1]*off*taper;
      if (gap){ pen = false; continue; }
      if (!pen){ x.moveTo(px,py); pen = true; } else x.lineTo(px,py); }
    x.stroke();
  }
}
// stroke drawn three times so it wraps around the cylinder seam
function wrapStroke(x, W, pts, width, col, alpha, o){
  var minX = Math.min(pts[0][0],pts[3][0]) - width, maxX = Math.max(pts[0][0],pts[3][0]) + width;
  brushStroke(x, pts, width, col, alpha, o);
  if (minX < 0) brushStroke(x, pts.map(function(p){ return [p[0]+W,p[1]]; }), width, col, alpha, o);
  if (maxX > W) brushStroke(x, pts.map(function(p){ return [p[0]-W,p[1]]; }), width, col, alpha, o);
}
function diagPts(cx, cy, len, ang, bend){ var dx = Math.cos(ang)*len/2, dy = Math.sin(ang)*len/2, nx = -dy*bend, ny = dx*bend;
  return [[cx-dx, cy-dy], [cx-dx*.35+nx, cy-dy*.35+ny], [cx+dx*.35+nx*.6, cy+dy*.35+ny*.6], [cx+dx, cy+dy]]; }
function paintStar(x, cx, cy, r, col, rot, a){
  var p = starPts(cx, cy, r, rot, pf(.38,.5)).map(function(q){ return [q[0]+pf(-r,r)*.09, q[1]+pf(-r,r)*.09]; });
  x.beginPath(); p.forEach(function(q,i){ i ? x.lineTo(q[0],q[1]) : x.moveTo(q[0],q[1]); }); x.closePath();
  x.fillStyle = rgba(col, a||.95, 14); x.fill();
  x.lineWidth = Math.max(1, r*.12); x.strokeStyle = rgba([255,236,170], .55, 10); x.stroke();
  // a lighter dab on one arm, like a gouache highlight
  x.beginPath(); x.moveTo(cx, cy); x.lineTo(p[0][0], p[0][1]); x.lineTo(p[1][0], p[1][1]); x.closePath(); x.fillStyle = rgba([255,240,190], .35, 10); x.fill();
}
function splat(x, cx, cy, r, col, a){
  x.fillStyle = rgba(col, a, 18); x.beginPath();
  var k = 9 + (pr()*6|0); for (var i=0;i<=k;i++){ var t = i/k*6.2832, rr = r*pf(.55,1.15); var px = cx+Math.cos(t)*rr, py = cy+Math.sin(t)*rr*pf(.7,1); i ? x.lineTo(px,py) : x.moveTo(px,py); }
  x.closePath(); x.fill();
  var m = 3 + (pr()*7|0); for (i=0;i<m;i++){ var t3 = pr()*6.2832, d = r*pf(1.2,2.8); x.beginPath(); x.arc(cx+Math.cos(t3)*d, cy+Math.sin(t3)*d, r*pf(.08,.28), 0, 6.2832); x.fill(); }
}
function grain(x, W, H, amt){
  var id = x.getImageData(0,0,W,H), d = id.data;
  for (var i=0;i<d.length;i+=4){ var g = (pr()-.5)*amt; d[i] += g; d[i+1] += g; d[i+2] += g; }
  x.putImageData(id, 0, 0);
}
function canvasTex(c, wrap){ var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (wrap) t.wrapS = THREE.RepeatWrapping; return t; }

var NAVY = ["#0a1450","#0d1a66","#13248a","#0b123f","#1a2f9c","#102070","#162a80"].map(hexRGB);
var BLUES = ["#2f58e0","#3d6cff","#4a78ff","#2a46c8","#5b86ff","#6d92ff"].map(hexRGB);
var VIOLETS = ["#6a46e6","#7d54f0","#9468ff","#5a3fd0","#a27cff"].map(hexRGB);
var WARMS = ["#d43fc8","#e95bb8","#ff7ab4","#ff8fa8","#c84ad6"].map(hexRGB);
var GOLDS = ["#ffc44a","#ffb238","#ffd36a","#ff9a3a","#ff8a5c","#ffa77e","#f6c25a"].map(hexRGB);

/* --- side: navy gouache with diagonal colour streaks, gold splashes and painted stars --- */
// Original 3072 x 800 painting baked from the original seeded brush code.
// Continue the same random sequence for the top, plate and candle.
pseed = 611950113;
var sideTex = new THREE.Texture(window.__cakeSideImage);
sideTex.colorSpace = THREE.SRGBColorSpace;
sideTex.wrapS = sideTex.wrapT = THREE.ClampToEdgeWrapping;
sideTex.generateMipmaps = false;
sideTex.minFilter = sideTex.magFilter = THREE.LinearFilter;
sideTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
sideTex.needsUpdate = true;

/* --- top: glowing swirl of gold, cream, butter yellow, pink and lavender --- */
var topC = document.createElement("canvas"), TW = 1024; topC.width = topC.height = TW;
(function(){
  var x = topC.getContext("2d"), c = TW/2, i;
  var g = x.createRadialGradient(c,c,0,c,c,c); g.addColorStop(0,"#fff4d0"); g.addColorStop(.35,"#ffd25a"); g.addColorStop(.7,"#ffb0a0"); g.addColorStop(.9,"#b09af0"); g.addColorStop(1,"#7f86e6");
  x.fillStyle = g; x.fillRect(0,0,TW,TW);
  var swirl = ["#ffc93c","#ffd45a","#ffe48a","#ffb030","#ff9fc2","#ffc85a","#fff0c4","#fff6dc","#f78fb8","#c4a8ff","#ffbf40","#ffe9a8","#ffa060","#ffd970"].map(hexRGB);
  function arcPts(r0, a0, da, dr){ var p = []; for (var k=0;k<4;k++){ var t = k/3, a = a0 + da*t, r = r0 + dr*t; p.push([c+Math.cos(a)*r, c+Math.sin(a)*r]); } return p; }
  for (i=0;i<340;i++){ var r0 = Math.sqrt(pr())*c*.98, col = swirl[(pr()*swirl.length)|0];
    if (r0 < c*.3 && pr()<.6) col = pick([[255,248,226],[255,236,170],[255,222,120]]);
    if (r0 > c*.84 && pr()<.45) col = pick([[184,164,255],[150,160,255],[255,190,90]]);
    brushStroke(x, arcPts(r0, pf(0,6.28), pf(.5,1.6), pf(-.12,.05)*c), pf(14,52)*(.5+r0/c), col, pf(.45,.85), {jit:16, dry:.5}); }
  // highlights around the candle
  for (i=0;i<18;i++){ var rr = pf(.04,.3)*c; brushStroke(x, arcPts(rr, pf(0,6.28), pf(.6,1.4), pf(-.05,.05)*c), pf(8,26), [255,252,236], pf(.5,.9), {jit:6}); }
  for (i=0;i<26;i++) paintStar(x, c+pf(-.85,.85)*c, c+pf(-.85,.85)*c, pf(6,14), pick(GOLDS), pf(0,6.28), .85);
  for (i=0;i<500;i++){ x.fillStyle = rgba(pr()<.5 ? [255,255,255] : [255,200,90], pf(.4,.95), 10); x.beginPath(); x.arc(pf(0,TW), pf(0,TW), pf(.6,2.2), 0, 6.2832); x.fill(); }
  var h = x.createRadialGradient(c,c,0,c,c,c*.35); h.addColorStop(0,"rgba(255,246,220,.6)"); h.addColorStop(1,"rgba(255,240,200,0)"); x.fillStyle = h; x.fillRect(0,0,TW,TW);
  grain(x, TW, TW, 12);
})();
var topTex = canvasTex(topC);

/* --- plate: pale lavender blue with painted highlight strokes --- */
var plateC = document.createElement("canvas"), PW = 1024; plateC.width = plateC.height = PW;
(function(){
  var x = plateC.getContext("2d"), c = PW/2, i;
  var g = x.createRadialGradient(c*.8,c*1.2,0,c,c,c); g.addColorStop(0,"#b4bcf0"); g.addColorStop(.6,"#8890d0"); g.addColorStop(1,"#6c74bc");
  x.fillStyle = g; x.fillRect(0,0,PW,PW);
  function arcPts(r0, a0, da){ var p = []; for (var k=0;k<4;k++){ var a = a0 + da*k/3; p.push([c+Math.cos(a)*r0, c+Math.sin(a)*r0]); } return p; }
  for (i=0;i<90;i++){ var r0 = pf(.62,.98)*c, a0 = pf(0,6.28), col = pick([[200,208,255],[160,168,236],[130,140,214],[190,180,250],[110,120,200]]);
    if (Math.sin(a0) > .2 && pr()<.55) col = pick([[255,200,120],[255,170,110],[255,226,160],[255,160,180]]);
    brushStroke(x, arcPts(r0, a0, pf(.3,1.1)), pf(10,36), col, pf(.4,.8), {jit:12, dry:.45}); }
  for (i=0;i<30;i++) brushStroke(x, arcPts(pf(.86,.97)*c, pf(.2,2.9), pf(.2,.7)), pf(4,12), [255,255,255], pf(.6,.95), {hairs:6, jit:4});
  // the cake's soft shadow in the middle
  var s = x.createRadialGradient(c,c,c*.5,c,c,c*.72); s.addColorStop(0,"rgba(20,24,90,.85)"); s.addColorStop(1,"rgba(40,40,120,0)"); x.fillStyle = s; x.fillRect(0,0,PW,PW);
  for (i=0;i<200;i++){ x.fillStyle = rgba([255,230,170], pf(.4,.9), 10); x.beginPath(); x.arc(pf(0,PW), pf(0,PW), pf(.6,2), 0, 6.2832); x.fill(); }
  grain(x, PW, PW, 10);
})();
var plateTex = canvasTex(plateC);

// painterly materials are unlit so the gouache colours read exactly as painted
var sideMat = new THREE.MeshBasicMaterial({map:sideTex, toneMapped:false});
var side = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(CAKE_R, CAKE_R*1.004, CAKE_H, 160, 1, true), sideMat));
side.position.y = CAKE_BOTTOM + CAKE_H/2; side.rotation.y = -1.2; cakeG.add(side);
// view-space shading: soft light from the upper left, shadowed right side, glowing lavender rim, candle warmth near the top
var shadeMat = new THREE.ShaderMaterial({uniforms:{uFlame:{value:1}},
  vertexShader:"varying vec3 vN;varying vec3 vV;varying float vY;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);vY=uv.y;gl_Position=projectionMatrix*mv;}",
  fragmentShader:"uniform float uFlame;varying vec3 vN;varying vec3 vV;varying float vY;void main(){vec3 n=normalize(vN);float l=dot(n,normalize(vec3(-0.75,0.25,0.6)));"+
    "float dark=clamp(0.45-l*0.7,0.0,0.6)*(1.0-0.5*smoothstep(0.75,1.0,vY));float fr=pow(1.0-max(dot(n,normalize(vV)),0.0),3.0);"+
    "vec3 rim=vec3(0.5,0.45,1.0)*fr*0.22+vec3(1.0,0.75,0.4)*smoothstep(0.82,1.0,vY)*0.16*uFlame*max(l+0.4,0.0);"+
    "gl_FragColor=vec4(rim,dark);}",
  transparent:true, depthWrite:false, blending:THREE.CustomBlending, blendSrc:THREE.OneFactor, blendDst:THREE.OneMinusSrcAlphaFactor, toneMapped:false});
shadeMat.polygonOffset = true; shadeMat.polygonOffsetFactor = -1; shadeMat.polygonOffsetUnits = -4;
var shade = new THREE.Mesh(side.geometry, shadeMat); shade.position.copy(side.position); shade.rotation.y = side.rotation.y; shade.renderOrder = 2; cakeG.add(shade);

var capMat = new THREE.MeshBasicMaterial({map:topTex, toneMapped:false});
var cap = new THREE.Mesh(new THREE.CircleGeometry(CAKE_R*1.002, 128), capMat); cap.rotation.x = -Math.PI/2; cap.position.y = CREAM_TOP; cakeG.add(cap);
// rounded painted lip where the top meets the side
var lipC = document.createElement("canvas"); lipC.width = 1024; lipC.height = 64;
(function(){ var x = lipC.getContext("2d"); x.fillStyle = "#d6c4ff"; x.fillRect(0,0,1024,64);
  for (var i=0;i<120;i++) wrapStroke(x, 1024, diagPts(pf(0,1024), pf(0,64), pf(40,160), pf(-.2,.2), .1), pf(10,30), pick([[255,214,110],[255,240,200],[200,180,255],[255,190,215],[150,150,250]]), pf(.5,.9), {jit:16});
})();
var lip = new THREE.Mesh(new THREE.TorusGeometry(CAKE_R - .015, .035, 10, 160), new THREE.MeshBasicMaterial({map:canvasTex(lipC, true), toneMapped:false}));
lip.rotation.x = Math.PI/2; lip.position.y = CREAM_TOP - .022; cakeG.add(lip);
var topBorder = lip;

/* --- flat pale lavender blue plate --- */
var P = CAKE_BOTTOM, PLATE_R = 1.95;
var plateEdge = new THREE.MeshBasicMaterial({color:0x6e76c0, toneMapped:false});
var plate = new THREE.Mesh(new THREE.CylinderGeometry(PLATE_R, PLATE_R*.97, .07, 128), [plateEdge, new THREE.MeshBasicMaterial({map:plateTex, toneMapped:false}), plateEdge]);
plate.position.y = P - .036; cakeG.add(plate);
var plateRim = new THREE.Mesh(new THREE.TorusGeometry(PLATE_R, .022, 8, 128), new THREE.MeshBasicMaterial({color:0xb8bef0, toneMapped:false}));
plateRim.rotation.x = Math.PI/2; plateRim.position.y = P; cakeG.add(plateRim);
var stand = plate;

/* --- one pale lavender pink candle --- */
var candleTexC = document.createElement("canvas"); candleTexC.width = 128; candleTexC.height = 512;
(function(){ var c = candleTexC.getContext("2d"); var g = c.createLinearGradient(0,0,128,0); g.addColorStop(0,"#efc8ee"); g.addColorStop(.45,"#dca6e2"); g.addColorStop(1,"#a77ccf");
  c.fillStyle = g; c.fillRect(0,0,128,512);
  for (var i=0;i<26;i++){ var xx = pf(0,128); brushStroke(c, [[xx,pf(-20,60)],[xx+pf(-6,6),170],[xx+pf(-6,6),340],[xx+pf(-6,6),pf(460,540)]], pf(8,22), pick([[250,226,250],[226,180,236],[200,160,232],[250,196,222]]), pf(.3,.6), {hairs:6, jit:8}); }
  var t = c.createLinearGradient(0,0,0,140); t.addColorStop(0,"rgba(255,226,170,.7)"); t.addColorStop(1,"rgba(255,226,170,0)"); c.fillStyle = t; c.fillRect(0,0,128,140); })();
var candleTex = new THREE.CanvasTexture(candleTexC); candleTex.colorSpace = THREE.SRGBColorSpace; candleTex.anisotropy = 4;
var CANDLE_H = .78;
var candle = new THREE.Mesh(new THREE.CylinderGeometry(.075, .078, CANDLE_H, 40), new THREE.MeshBasicMaterial({map:candleTex, toneMapped:false}));
candle.material.emissiveIntensity = 0;
candle.position.y = CREAM_TOP + CANDLE_H/2 - .01; cakeG.add(candle);
var candleShade = new THREE.Mesh(candle.geometry, shadeMat); candleShade.position.copy(candle.position); candleShade.renderOrder = 2; cakeG.add(candleShade);
var candleTop = new THREE.Mesh(new THREE.CircleGeometry(.075, 32), new THREE.MeshBasicMaterial({color:0xfff2fa, toneMapped:false}));
candleTop.rotation.x = -Math.PI/2; candleTop.position.y = CREAM_TOP + CANDLE_H - .009; cakeG.add(candleTop);
var WICK_Y = CREAM_TOP + CANDLE_H + .035;
var wickCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.045,0), new THREE.Vector3(.002,0,0), new THREE.Vector3(.012,.04,0)]);
var wick = new THREE.Mesh(new THREE.TubeGeometry(wickCurve, 8, .0075, 6), new THREE.MeshBasicMaterial({color:0x2a1a12}));
wick.position.y = WICK_Y; cakeG.add(wick);

/* --- flame: inner blue core, bright body, warm outer glow and soft bloom halo --- */
function teardropTex(layers){
  var c = document.createElement("canvas"); c.width = 128; c.height = 256; var x = c.getContext("2d");
  x.translate(64,236);
  layers.forEach(function(L){ var w = L[0], h = L[1];
    var g = x.createRadialGradient(0,-h*.22,0,0,-h*.3,h*.75); g.addColorStop(0,L[2]); g.addColorStop(.55,L[3]); g.addColorStop(1,"rgba(0,0,0,0)");
    x.beginPath(); x.moveTo(0,-h); x.bezierCurveTo(w*.35,-h*.62, w,-h*.34, w*.8,-h*.12); x.bezierCurveTo(w*.6,h*.06,-w*.6,h*.06,-w*.8,-h*.12);
    x.bezierCurveTo(-w,-h*.34,-w*.35,-h*.62,0,-h); x.fillStyle = g; x.filter = "blur("+L[4]+"px)"; x.fill(); x.filter = "none"; });
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
var flameG = new THREE.Group(); flameG.position.y = WICK_Y + .03; cakeG.add(flameG);
function addSprite(tex, sx, sy, y, op, blend){
  var m = new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false, blending:blend||THREE.AdditiveBlending, opacity:op, toneMapped:false});
  var s = new THREE.Sprite(m); s.scale.set(sx,sy,1); s.position.y = y; s.userData.base = [sx,sy,y,op]; flameG.add(s); return s;
}
var halo = addSprite(radialTex([[0,"rgba(255,210,130,.6)"],[.16,"rgba(255,176,90,.28)"],[.45,"rgba(255,140,70,.08)"],[1,"rgba(0,0,0,0)"]]), 3.4, 3.4, .2, .6);
var glow = addSprite(radialTex([[0,"rgba(255,214,140,1)"],[.22,"rgba(255,170,70,.6)"],[1,"rgba(255,120,30,0)"]]), 1.3, 1.3, .26, .38);
var flameOuter = addSprite(teardropTex([[46,210,"rgba(255,184,60,.95)","rgba(255,110,20,.8)",6]]), .42, .92, .34, .8);
var flameCore = addSprite(teardropTex([[30,150,"rgba(255,240,190,1)","rgba(255,190,80,.8)",4]]), .14, .32, .18, .7);
var flameBlue = addSprite(radialTex([[0,"rgba(120,160,255,.95)"],[.45,"rgba(70,110,255,.45)"],[1,"rgba(40,60,255,0)"]]), .08, .07, .02, .85);
var ember = addSprite(radialTex([[0,"rgba(255,140,60,1)"],[.4,"rgba(255,80,20,.5)"],[1,"rgba(0,0,0,0)"]]), .05, .05, .045, 0);
var flameSprites = [halo, glow, flameOuter, flameCore, flameBlue];
var flameLight = new THREE.PointLight(0xffa04a, 2.6, 7, 1.4); flameLight.position.y = .15; flameG.add(flameLight);
var smoke = makePoints(40, pointsMat({opacity:.5})); flameG.add(smoke);
var smokeOn = 0, emberT = 0;

/* --- rings of silver dotted particles + halo trails --- */
var ribbonMats = [];

function ribbonMat(seed){
  var m = new THREE.ShaderMaterial({uniforms:{uR:{value:2},uTime:{value:0},uSeed:{value:seed*1.7},uOpacity:{value:1}},
    vertexShader:"varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
    fragmentShader:"uniform float uR;uniform float uTime;uniform float uSeed;uniform float uOpacity;varying vec2 vP;"+
      "void main(){float a=atan(vP.y,vP.x)/6.2831853+0.5;float r=length(vP);"+
      "float s1=pow(fract(a*2.0-uTime*0.07+uSeed),5.0);float s2=pow(fract(a*3.0+uTime*0.045+uSeed*0.37),9.0)*0.7;"+
      "float w=clamp((r-uR)/0.06+0.5,0.0,1.0);float edge=smoothstep(0.0,0.35,0.5-abs(w-0.5));float hair=0.7+0.3*sin(w*40.0+a*30.0);"+
      "float k=(0.32+s1*0.9+s2)*edge*hair;vec3 base=uSeed<0.5?vec3(0.78,0.68,1.0):(uSeed<2.0?vec3(1.0,0.72,0.3):vec3(0.9,0.9,1.0));vec3 c=mix(base,vec3(1.0,0.97,0.9),s1*0.8);"+
      "c=pow(c,vec3(2.2))*2.2;gl_FragColor=vec4(c*k,k)*uOpacity;\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}",
    transparent:true, depthWrite:false, side:THREE.DoubleSide, blending:THREE.AdditiveBlending});
  ribbonMats.push(m); return m;
}
var RINGS = [{rx:1.62, rz:1.62, tilt:[.16, 0, .2], y:-.55, speed:.16, n:500, col:0},{rx:1.86, rz:1.86, tilt:[.1, 0, -.15], y:-.05, speed:-.11, n:600, col:1},{rx:1.5, rz:1.5, tilt:[-.08, 0, .26], y:-.95, speed:.09, n:300, col:2}];
var ringObjs = [];
RINGS.forEach(function(R, idx){
  var holder = new THREE.Group(); holder.rotation.set(R.tilt[0], R.tilt[1], R.tilt[2]); holder.position.y = R.y; world.add(holder);
  var spin = new THREE.Group(); holder.add(spin);
  var p = makePoints(R.n, pointsMat({tw:.5})), a = p.userData.a;
  for (var i=0;i<R.n;i++){
    var t = Math.random()*6.2832, j = (Math.random()+Math.random()-1)*.06;
    a.position[i*3] = Math.cos(t)*(R.rx+j); a.position[i*3+1] = (Math.random()-.5)*.03; a.position[i*3+2] = Math.sin(t)*(R.rz+j);
    var b = rnd(.75,1), gw = Math.random(); setCol(a.acol,i, gw<.6 ? [b, b*.82, b*.45] : [b*.9,b*.85,b]); a.size[i] = Math.random()<.05 ? rnd(1.2,2.0) : rnd(.35,.8);
    a.alpha[i] = rnd(.3,.8);
  }
  dirty(p); spin.add(p);
  // halo trails
  var HEADS = 5, TL = 70, trail = makePoints(HEADS*TL, pointsMat({additive:true, opacity:0})), ta = trail.userData.a;
  for (var h=0;h<HEADS;h++) for (var k=0;k<TL;k++){
    var ii = h*TL+k, f = 1 - k/TL, white = k < 6;
    setCol(ta.acol, ii, white ? [1,.97,.88] : [1, .62+.28*f, .22+.3*f]);
    ta.size[ii] = (k===0 ? 4.0 : 2.0*f + .45); ta.alpha[ii] = Math.pow(f,1.6)*.85; ta.phase[ii] = 0;
  }
  holder.add(trail);
  // glowing golden light ribbon streaks along the ring
  var rib = new THREE.Mesh(new THREE.RingGeometry(R.rx-.03, R.rx+.03, 256, 1), ribbonMat(R.col)); rib.material.uniforms.uR.value = R.rx; rib.rotation.x = -Math.PI/2; spin.add(rib);
  ringObjs.push({R:R, holder:holder, spin:spin, pts:p, trail:trail, heads:[0,1,2,3,4].map(function(h){ return {t:h*1.2566+idx, v:rnd(1.4,2.1)*(R.speed>0?1:-1)}; })});
});

/* --- small planet with its own ring --- */
var planetG = new THREE.Group(); world.add(planetG); planetG.visible = false;
(function(){
  var c = document.createElement("canvas"); c.width = 256; c.height = 128; var x = c.getContext("2d");
  var g = x.createLinearGradient(0,0,0,128); g.addColorStop(0,"#9ec4ff"); g.addColorStop(.35,"#4f6fe0"); g.addColorStop(.6,"#7a5ad8"); g.addColorStop(1,"#2b2f8f");
  x.fillStyle = g; x.fillRect(0,0,256,128);
  for (var i=0;i<14;i++){ x.fillStyle = "rgba(255,255,255,"+rnd(.04,.15)+")"; x.fillRect(0,rnd(0,128),256,rnd(2,8)); }
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  var planet = new THREE.Mesh(new THREE.SphereGeometry(.27, 32, 20), new THREE.MeshStandardMaterial({map:t, roughness:.6, emissive:0x223377, emissiveIntensity:.5}));
  planetG.add(planet);
  var ring = new THREE.Mesh(new THREE.RingGeometry(.38,.52,64), new THREE.MeshBasicMaterial({color:0xd9e2ff, transparent:true, opacity:.55, side:THREE.DoubleSide, depthWrite:false}));
  ring.rotation.x = Math.PI/2 - .35; ring.rotation.y = .3; planetG.add(ring);
  planetG.userData.planet = planet;
})();

/* --- dreamy field of colourful soft bokeh orbs and small gold sparkles --- */
var ORBN = 260, orbs = makePoints(ORBN, pointsMat({mode:.5, tw:.25, additive:true}));
(function(){ var a = orbs.userData.a, pal = [[1,.78,.3],[.3,.85,.8],[.35,.55,1],[1,.5,.72],[.68,.48,1],[1,.6,.25],[1,.85,.45],[.3,.7,1],[1,.7,.3],[1,.8,.4]];
  for (var i=0;i<ORBN;i++){ var th = Math.random()*6.2832, r = rnd(2.4,8.5), y = rnd(-3.0,4.6);
    a.position[i*3] = Math.cos(th)*r; a.position[i*3+1] = y; a.position[i*3+2] = Math.sin(th)*r - 1.5;
    setCol(a.acol,i,pal[i%pal.length]); var big = Math.random()<.3; a.size[i] = big ? rnd(7,12) : rnd(2.5,6.5); a.alpha[i] = big ? rnd(.1,.2) : rnd(.35,.7); }
  dirty(orbs); })();
world.add(orbs);
var SPK = 420, sparks = makePoints(SPK, pointsMat({tw:.9, additive:true}));
(function(){ var a = sparks.userData.a;
  for (var i=0;i<SPK;i++){ var th = Math.random()*6.2832, r = rnd(1.7,4.6);
    a.position[i*3] = Math.cos(th)*r; a.position[i*3+1] = rnd(-1.6,3.2); a.position[i*3+2] = Math.sin(th)*r;
    var w = Math.random(); setCol(a.acol,i, w<.8 ? [1,.78,.35] : [1,.6,.8]); a.size[i] = rnd(.7,2.2); a.alpha[i] = rnd(.5,1); }
  dirty(sparks); })();
world.add(sparks);
var topGlow = new THREE.Sprite(new THREE.SpriteMaterial({map:radialTex([[0,"rgba(255,214,150,1)"],[.25,"rgba(255,170,110,.55)"],[.6,"rgba(255,120,150,.15)"],[1,"rgba(255,120,150,0)"]], 256),
  transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.25}));
topGlow.scale.set(4.6, 2.4, 1); topGlow.position.set(0, CREAM_TOP + .35, 0); cakeG.add(topGlow);
// painted light streaks floating in the dark navy background
var streaks = [];
(function(){
  function streakTex(cols){ var c = document.createElement("canvas"); c.width = 1024; c.height = 256; var x = c.getContext("2d");
    x.filter = "blur(2px)"; for (var i=0;i<9;i++){ var y0 = pf(60,200); brushStroke(x, [[pf(0,120),y0+pf(-30,30)],[pf(300,450),y0+pf(-50,10)],[pf(600,750),y0+pf(-60,0)],[pf(880,1024),y0-pf(20,80)]], pf(6,30), pick(cols), pf(.2,.5), {hairs:10, jit:20, dry:.5}); }
    return canvasTex(c); }
  var defs = [[[[255,200,90],[255,160,70],[255,226,150]], -2.6, 2.4, -3.2, 6.5, 1.6, .35, .3],
              [[[110,150,255],[160,130,255],[90,200,230]], 2.6, 1.6, -3.6, 6.0, 1.5, -.42, .22],
              [[[255,190,110],[255,140,170],[200,170,255]], 2.2, -1.9, -2.6, 5.2, 1.3, .3, .22],
              [[[255,214,120],[255,240,200]], -2.8, -.6, -3.0, 5.0, 1.2, -.25, .2]];
  defs.forEach(function(d){ var m = new THREE.Mesh(new THREE.PlaneGeometry(d[4], d[5]), new THREE.MeshBasicMaterial({map:streakTex(d[0]), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:d[7], toneMapped:false}));
    m.position.set(d[1], d[2], d[3]); m.rotation.z = d[6]; m.userData.op = d[7]; scene.add(m); streaks.push(m); });
})();


/* --- "happy birthday" canvas script text curving below the cake --- */
var hbMesh = (function(){
  var W = 1024, H = 320, c = document.createElement("canvas"); c.width = W; c.height = H; var x = c.getContext("2d");
  var text = "happy birthday", fs = 92;
  x.font = "italic " + fs + "px 'Snell Roundhand','Apple Chancery','Segoe Script','Brush Script MT','Lucida Handwriting','Dancing Script','URW Chancery L','Z003',cursive";
  x.fillStyle = "#ffffff"; x.textBaseline = "middle";
  x.shadowColor = "rgba(190,200,255,.9)"; x.shadowBlur = 16;
  var total = x.measureText(text).width, R = 1500, ang = total / R, a = -ang/2, cx = W/2, cy = -R + 170 + 40;
  // draw along a gentle downward-smiling arc
  for (var i=0;i<text.length;i++){
    var ch = text[i], w = x.measureText(ch).width, mid = a + (w/2)/R;
    x.save(); x.translate(cx + Math.sin(mid)*R, cy + Math.cos(mid)*R); x.rotate(-mid); x.fillText(ch, -w/2, 0); x.restore();
    a += w/R;
  }
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  var m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4*H/W), new THREE.MeshBasicMaterial({map:t, transparent:true, depthWrite:false, opacity:.95}));
  m.position.set(0, -2.02, 1.5); scene.add(m); return m;
})();

/* --- 星河: milky way band --- */
var GN = 3200, galaxy = makePoints(GN, pointsMat({tw:.8, additive:true, opacity:0}));
(function(){ var a = galaxy.userData.a;
  var pal = [[.75,.8,1],[1,.85,.95],[.6,.7,1],[1,1,1],[1,.9,.7],[.8,.65,1]];
  for (var i=0;i<GN;i++){
    var t = rnd(-1,1), along = t*26, g = (Math.random()+Math.random()+Math.random()-1.5)*(Math.random()<.75?.9:2.6);
    a.position[i*3] = along; a.position[i*3+1] = g + Math.sin(t*3)*.8; a.position[i*3+2] = rnd(-3,3);
    var c = pal[(Math.random()*pal.length)|0], core = 1 - Math.min(Math.abs(g)/3,1);
    setCol(a.acol,i,[c[0]*(.6+.4*core), c[1]*(.6+.4*core), c[2]*(.7+.3*core)]);
    a.size[i] = rnd(.6,1.8)*(Math.random()<.03?2.4:1); a.alpha[i] = rnd(.35,1)*(.5+.5*core);
  } dirty(galaxy); })();
var NB = 160, nebula = makePoints(NB, pointsMat({additive:true, opacity:0}));
(function(){ var a = nebula.userData.a, pal = [[.35,.3,.8],[.6,.3,.7],[.25,.45,.9],[.8,.5,.6]];
  for (var i=0;i<NB;i++){ var t = rnd(-1,1); a.position[i*3] = t*25; a.position[i*3+1] = (Math.random()-.5)*1.6 + Math.sin(t*3)*.8; a.position[i*3+2] = rnd(-2,2);
    setCol(a.acol,i,pal[i%4]); a.size[i] = rnd(28,60); a.alpha[i] = rnd(.05,.12); } dirty(nebula); })();
var galaxyG = new THREE.Group(); galaxyG.add(nebula); galaxyG.position.set(0, 1, -14); galaxyG.rotation.z = .55; galaxyG.add(galaxy); scene.add(galaxyG);
// close sparkle dust around the cake for the galaxy mode
var DN = 500, dust = makePoints(DN, pointsMat({tw:.9, additive:true, opacity:0}));
(function(){ var a = dust.userData.a;
  for (var i=0;i<DN;i++){ var th = Math.random()*6.283, r = rnd(1.8,4.6);
    a.position[i*3] = Math.cos(th)*r; a.position[i*3+1] = rnd(-1.6,2.6); a.position[i*3+2] = Math.sin(th)*r;
    setCol(a.acol,i, Math.random()<.5?[.75,.85,1]:[1,.9,.75]); a.size[i] = rnd(.6,1.5); }
  dirty(dust); })();
world.add(dust);

/* --- 小雪 --- */
var SN = 420, snow = makePoints(SN, pointsMat({additive:false, opacity:0}));
(function(){ var a = snow.userData.a;
  for (var i=0;i<SN;i++){ a.position[i*3] = rnd(-7,7); a.position[i*3+1] = rnd(-5,6); a.position[i*3+2] = rnd(-5,5); setCol(a.acol,i,[1,1,1]); a.size[i] = rnd(1.1,2.8); a.alpha[i] = rnd(.5,.9); }
  dirty(snow); })();
scene.add(snow);

/* --- 流星雨 --- */
var MN = 9, ML = 42, meteors = makePoints(MN*ML, pointsMat({additive:true, opacity:0})), meteorState = [];
(function(){ var a = meteors.userData.a;
  for (var m=0;m<MN;m++){ meteorState.push({life:-rnd(0,3)});
    for (var k=0;k<ML;k++){ var i = m*ML+k, f = 1-k/ML; setCol(a.acol,i, k<3?[1,1,1]:[.7+.3*f,.8+.2*f,1]); a.size[i] = k===0?3.4:2.4*f+.3; a.alpha[i] = 0; } }
})();
scene.add(meteors);
function spawnMeteor(s){
  s.x = rnd(-4,12); s.y = rnd(4,9); s.z = rnd(-9,-3); var sp = rnd(9,14); s.vx = -sp*.78; s.vy = -sp*.55; s.life = 0; s.max = rnd(1.0,1.7);
}

/* --- wish burst: colorful bokeh --- */
var BN = 300, bokeh = makePoints(BN, pointsMat({mode:1})), bstate = [];
(function(){ var a = bokeh.userData.a;
  var pal = [[1,.55,.15],[1,.75,.2],[1,.92,.45],[.35,.6,1],[.55,.8,1],[1,1,1],[1,.45,.35]];
  for (var i=0;i<BN;i++){ setCol(a.acol,i,pal[(Math.random()*pal.length)|0]); a.alpha[i] = 0; a.size[i] = 0; bstate.push({v:new THREE.Vector3(), life:9, max:1, s:1}); }
})();
world.add(bokeh);
function burst(){
  var a = bokeh.userData.a, origin = new THREE.Vector3(0, WICK_Y + .2, 0);
  for (var i=0;i<BN;i++){
    var st = bstate[i], u = Math.random()*2-1, th = Math.random()*6.283, s = Math.sqrt(1-u*u), sp = rnd(2.2,6.5);
    st.v.set(s*Math.cos(th)*sp*1.15, u*sp*.6 + rnd(.6,2.4), s*Math.sin(th)*sp);
    a.position[i*3] = origin.x; a.position[i*3+1] = origin.y; a.position[i*3+2] = origin.z;
    st.life = -Math.random()*.35; st.max = rnd(2.4,4.2); st.s = Math.random()<.18 ? rnd(6,10.5) : rnd(2.4,5.6);
  }
}

/* --- effects toggles --- */
var fx = {galaxy:true, snow:true, meteor:true, halo:true}, fxLevel = {};
Array.prototype.forEach.call(document.querySelectorAll(".bar button[data-fx]"), function(button){
  var effect = button.getAttribute("data-fx");
  function syncButton(){
    button.classList.toggle("on", fx[effect]);
    button.setAttribute("aria-pressed", String(fx[effect]));
  }
  fxLevel[effect] = fx[effect] ? 1 : 0;
  syncButton();
  button.addEventListener("click", function(e){
    e.stopPropagation();
    fx[effect] = !fx[effect];
    syncButton();
  });
});

/* --- blow / relight --- */
var flameLevel = 1;
function blow(){
  if (!lit || !window.birthdayFlow || window.birthdayFlow.state !== "celebrating") return; lit = false; burst(); smokeOn = 2.2; emberT = 2.5; showWish();
  musicBoxMoment();
}
function relight(){ if (lit) return; lit = true; hideWish(); stopVoices(); unduckSong(); }
function toggleCandle(){} // Use the explicit wish button to advance the birthday flow.
$("hint").addEventListener("click", function(e){ e.stopPropagation(); toggleCandle(); });

/* --- drag to orbit, tap to blow --- */
var el = renderer.domElement, drag = null, yaw = 0, pitch = 0, yawV = 0, autoT = 0, idle = 0;
var ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
var hitTargets = [side, cap, candle, flameOuter, glow, topBorder, plate];
function ptr(e){ var t = e.touches && e.touches[0] ? e.touches[0] : (e.changedTouches && e.changedTouches[0]) || e; return {x:t.clientX, y:t.clientY}; }
function down(e){ var p = ptr(e); drag = {x:p.x, y:p.y, sx:p.x, sy:p.y, t:Date.now(), moved:0}; }
function move(e){
  if (!drag) return; var p = ptr(e), dx = p.x-drag.x, dy = p.y-drag.y; drag.x = p.x; drag.y = p.y;
  drag.moved += Math.abs(dx)+Math.abs(dy);
  yaw += dx*.008; yawV = dx*.008; pitch = Math.max(-.35, Math.min(.5, pitch + dy*.005)); idle = 0;
  if (e.cancelable) e.preventDefault();
}
function up(e){
  if (!drag) return; var d = drag; drag = null;
  if (d.moved < 8 && Date.now()-d.t < 500){
    var r = el.getBoundingClientRect(); ndc.set((d.sx-r.left)/r.width*2-1, -((d.sy-r.top)/r.height)*2+1);
    ray.setFromCamera(ndc, camera);
    var hits = ray.intersectObjects(hitTargets, false);
    if (hits.length) toggleCandle();
  }
}
el.addEventListener("mousedown", down); window.addEventListener("mousemove", move); window.addEventListener("mouseup", up);
el.addEventListener("touchstart", down, {passive:true}); el.addEventListener("touchmove", move, {passive:false}); el.addEventListener("touchend", up);
el.style.cursor = "grab";

/* --- optional bloom post-processing --- */
var composer = null, bloomPass = null, BLOOM_BASE = .55, perfT = 0, perfN = 0, perfStrikes = 0;
try{
  var gl2 = renderer.capabilities.isWebGL2;
  if (X && X.EffectComposer && gl2 && !/[?&]nobloom/.test(location.search)){
    var rt = new THREE.WebGLRenderTarget(4, 4, {type:THREE.HalfFloatType, samples:4});
    composer = new X.EffectComposer(renderer, rt);
    composer.addPass(new X.RenderPass(scene, camera));
    bloomPass = new X.UnrealBloomPass(new THREE.Vector2(256, 256), BLOOM_BASE, .55, .95);
    composer.addPass(bloomPass);
    composer.addPass(new X.OutputPass());
  }
}catch(e){ composer = null; bloomPass = null; }
var zoom = 1;

/* --- layout --- */
var viewW = 1, viewH = 1, isDesk = false;
function layout(){
  var r = stage.getBoundingClientRect(); viewW = Math.max(1, r.width); viewH = Math.max(1, r.height);
  isDesk = window.matchMedia("(min-width:900px) and (min-aspect-ratio:1/1), (max-height:560px) and (min-aspect-ratio:1/1)").matches;
  renderer.setSize(viewW, viewH, false);
  if (composer){ composer.setPixelRatio(PR); composer.setSize(viewW, viewH); }
  var regionW = isDesk ? viewW*.62 : viewW;
  camera.aspect = regionW/viewH;
  var needHalfW = isDesk ? 3.4 : 2.45, needHalfH = isDesk ? 2.75 : 2.6;
  var vf = camera.fov*Math.PI/180, tanV = Math.tan(vf/2), tanH = tanV*camera.aspect;
  var dist, offY = 0, offX = 0;
  if (isDesk){ dist = Math.max(needHalfW/tanH, needHalfH/tanV) + 1.2; offX = -(viewW*.69 - viewW/2); offY = Math.min(60, viewH*.075); if (viewH <= 560){ dist *= 1.25; offY = Math.min(60, viewH*.15); } }
  else {
    // portrait: the top part is covered by text and the bottom by the control bar
    var panelH = $("panel").getBoundingClientRect().bottom + 8, barH = viewH - document.querySelector(".bottom").getBoundingClientRect().top + 30;
    var avail = Math.max(140, viewH - panelH - barH), frac = avail / viewH;
    dist = Math.max(needHalfW/tanH, needHalfH/(tanV*frac)) + .6;
    var centerPx = panelH + avail/2; offY = -(centerPx - viewH/2);
  }
  dist *= zoom;
  camera.position.set(0, dist*(zoom < 1 ? .32 : .19), dist);
  camera.lookAt(0, zoom < 1 ? -.25 : -.35, 0);
  if (zoom < 1){ offX = 0; offY = 0; }
  camera.aspect = viewW/viewH; camera.setViewOffset(viewW, viewH, offX, offY, viewW, viewH);
  camera.updateProjectionMatrix();
  for (var i=0;i<allMats.length;i++) allMats[i].uniforms.uScale.value = viewH * .55 / tanV * .045;
}
window.addEventListener("resize", layout);
document.addEventListener("birthday:layout", layout);
window.addEventListener("orientationchange", function(){ setTimeout(layout, 300); });
layout(); setTimeout(layout, 50);

/* --- animation --- */
var clock = new THREE.Clock(), time = 0, spinOff = false;
function approach(v, target, rate, dt){ return v + (target - v)*Math.min(1, rate*dt); }
var heldFrames = 0;
function frame(){
  if (window.__introHold && heldFrames > 2){ clock.getDelta(); requestAnimationFrame(frame); return; }
  heldFrames++;
  var dt = Math.min(clock.getDelta(), .05); time += dt;
  for (var i=0;i<allMats.length;i++) allMats[i].uniforms.uTime.value = time;
  for (i=0;i<ribbonMats.length;i++) ribbonMats[i].uniforms.uTime.value = time;
  orbs.rotation.y = time*.02;
  for (var k in fx) fxLevel[k] = approach(fxLevel[k], fx[k]?1:0, 3, dt);

  // orbit
  if (!drag){ idle += dt; yawV *= .94; yaw += yawV + (spinOff ? 0 : dt*.12); pitch = approach(pitch, 0, idle > 2 ? .6 : 0, dt); }
  world.rotation.y = yaw; world.rotation.x = pitch*.6;
  stars.rotation.y = time*.006;

  // flame
  flameLevel = approach(flameLevel, lit?1:0, lit?3:9, dt);
  var fl = 1 + Math.sin(time*13)*.05 + Math.sin(time*23.7)*.04 + (Math.random()-.5)*.06;
  var sway = Math.sin(time*2.3)*.5 + Math.sin(time*5.7)*.3 + Math.sin(time*11.1)*.2;
  flameSprites.forEach(function(sp, si){ var b = sp.userData.base, isBody = si >= 2;
    var sy = isBody ? fl : (.94 + .06*fl), sx = isBody ? (1 - (fl-1)*.5) : sy;
    sp.scale.set(b[0]*sx*(si===4?1:flameLevel), b[1]*sy*flameLevel, 1);
    sp.position.set(isBody ? sway*.012*(si===3?.6:1) : 0, b[2]*(si===4?1:(.7+.3*flameLevel)), 0);
    sp.material.rotation = isBody ? -sway*.06 : 0;
    sp.material.opacity = b[3]*flameLevel*(isBody ? 1 : (.85+.15*fl));
    sp.visible = flameLevel > .01; });
  flameLight.intensity = 2.6*flameLevel*fl; topGlow.material.opacity = (composer ? .2 : .45)*(.35+.65*flameLevel); shadeMat.uniforms.uFlame.value = flameLevel; for (i=0;i<streaks.length;i++) streaks[i].material.opacity = streaks[i].userData.op*(.8+.2*Math.sin(time*.4+i));
  candle.material.emissiveIntensity = .06*flameLevel;
  emberT = Math.max(0, emberT - dt); ember.material.opacity = Math.min(1, emberT*.6)*(.7+.3*Math.sin(time*20)); ember.visible = emberT > 0;
  if (bloomPass) bloomPass.strength = BLOOM_BASE*(.75 + .25*flameLevel);
  // smoke after blowing out
  var sa = smoke.userData.a; smokeOn = Math.max(0, smokeOn - dt);
  for (i=0;i<40;i++){
    var ph = (time*.6 + i/40)%1;
    sa.position[i*3] = Math.sin(ph*9+i)*.06*ph*3; sa.position[i*3+1] = ph*1.1; sa.position[i*3+2] = Math.cos(ph*7+i)*.04;
    sa.acol[i*3] = sa.acol[i*3+1] = sa.acol[i*3+2] = .55; sa.size[i] = 1.5 + ph*5; sa.alpha[i] = (1-ph)*Math.min(1,smokeOn)*.6;
  } dirty(smoke);

  // rings and halo trails
  var halo = fxLevel.halo;
  ringObjs.forEach(function(o, idx){
    o.spin.rotation.y += o.R.speed*dt*(1+halo*1.5);
    o.pts.material.uniforms.uOpacity.value = 1 - halo*.35;
    var tr = o.trail, ta = tr.userData.a, TL = 70;
    tr.material.uniforms.uOpacity.value = halo;
    tr.visible = halo > .01;
    if (tr.visible){
      o.heads.forEach(function(h, hi){
        h.t += h.v*dt;
        for (var k=0;k<TL;k++){ var t = h.t - k*.022*Math.sign(h.v), ii = hi*TL+k;
          ta.position[ii*3] = Math.cos(t)*o.R.rx; ta.position[ii*3+1] = 0; ta.position[ii*3+2] = Math.sin(t)*o.R.rz; }
      }); dirty(tr);
    }
  });
  planetG.position.set(Math.cos(time*.18+2.4)*2.5, .9 + Math.sin(time*.5)*.12, Math.sin(time*.18+2.4)*1.6);
  planetG.userData.planet.rotation.y += dt*.4;

  // galaxy
  galaxy.material.uniforms.uOpacity.value = fxLevel.galaxy; galaxy.visible = nebula.visible = fxLevel.galaxy > .01; nebula.material.uniforms.uOpacity.value = fxLevel.galaxy;
  dust.material.uniforms.uOpacity.value = fxLevel.galaxy*.9; dust.visible = galaxy.visible;
  galaxyG.rotation.y = Math.sin(time*.05)*.15;

  // snow
  snow.material.uniforms.uOpacity.value = fxLevel.snow; snow.visible = fxLevel.snow > .01;
  if (snow.visible){ var s = snow.userData.a;
    for (i=0;i<SN;i++){ s.position[i*3+1] -= dt*(.35+s.phase[i]*.5); s.position[i*3] += Math.sin(time*.8+s.phase[i]*20)*dt*.18;
      if (s.position[i*3+1] < -5){ s.position[i*3+1] = 6; s.position[i*3] = rnd(-7,7); } }
    snow.geometry.attributes.position.needsUpdate = true; }

  // meteors
  meteors.material.uniforms.uOpacity.value = fxLevel.meteor; meteors.visible = fxLevel.meteor > .01;
  if (meteors.visible){ var ma = meteors.userData.a;
    for (var m=0;m<MN;m++){ var st = meteorState[m]; st.life += dt;
      if (st.life > (st.max||0)){ if (st.max) { st.max = 0; st.life = -rnd(.2,2.2); } else if (st.life >= 0) spawnMeteor(st); }
      var on = st.max && st.life >= 0, f = on ? Math.sin(Math.min(1, st.life/st.max)*Math.PI) : 0;
      for (k=0;k<ML;k++){ var ii = m*ML+k;
        if (on){ var tt = st.life - k*.006; ma.position[ii*3] = st.x + st.vx*tt; ma.position[ii*3+1] = st.y + st.vy*tt; ma.position[ii*3+2] = st.z; }
        ma.alpha[ii] = on ? f*Math.pow(1-k/ML,1.3) : 0; } }
    dirty(meteors); }

  // bokeh burst
  var ba = bokeh.userData.a, anyB = false;
  for (i=0;i<BN;i++){ var b = bstate[i]; if (b.life > b.max) { ba.alpha[i] = 0; continue; } anyB = true;
    b.life += dt; if (b.life < 0){ ba.alpha[i] = 0; continue; }
    b.v.y -= 2.6*dt; b.v.multiplyScalar(1 - 1.1*dt);
    ba.position[i*3] += b.v.x*dt; ba.position[i*3+1] += b.v.y*dt; ba.position[i*3+2] += b.v.z*dt;
    var lf = b.life/b.max; ba.size[i] = b.s*(.6+.6*Math.min(1, b.life*4)); ba.alpha[i] = Math.min(1, b.life*5)*(1-lf*lf)*.9; }
  bokeh.visible = anyB; if (anyB) dirty(bokeh);

  if (composer) composer.render(dt); else renderer.render(scene, camera);
  markScenePainted();
  // performance guard: drop bloom, then shadows, if the device is struggling
  perfT += dt; perfN++;
  if (perfT > 2.5){ var fps = perfN/perfT; perfT = 0; perfN = 0;
    if (fps < 32 && perfStrikes < 3 && !/[?&]noguard/.test(location.search)){ perfStrikes++; if (composer){ composer = null; bloomPass = null; } else if (renderer.shadowMap.enabled){ renderer.shadowMap.autoUpdate = false; } } }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__bday = {blow:blow, relight:relight, fx:fx, bloom:function(){ return !!composer; }, setZoom:function(z){ zoom = z; layout(); }, stopSpin:function(){ yaw = 0; yawV = 0; spinOff = true; }};
document.dispatchEvent(new CustomEvent("birthday:ready"));
}

/* =================================================================== */
function start2D(){
  document.body.classList.add("cake-2d");
  $("stage").style.display = "none"; $("bar").style.display = "none"; $("nogl").style.display = "block";
  var cv = $("fallback2d"); cv.style.display = "block"; var c = cv.getContext("2d"), W, H, DPR = Math.min(window.devicePixelRatio||1, 2);
  var st = []; for (var i=0;i<160;i++) st.push([Math.random(), Math.random(), Math.random()*2+.4, Math.random()*6]);
  var parts = [];
  function size(){ W = innerWidth; H = innerHeight; cv.width = W*DPR; cv.height = H*DPR; c.setTransform(DPR,0,0,DPR,0,0); }
  size(); window.addEventListener("resize", size);
  function geo(){
    var wide = W > H && (W >= 900 || H <= 560);
    var top = wide ? 55 : $("panel").getBoundingClientRect().bottom + 30;
    var bottom = document.querySelector(".bottom").getBoundingClientRect().top - 50;
    var space = Math.max(90, bottom - top);
    var w = Math.max(60, Math.min(wide ? W*.28 : W*.5, 220, (space - 55)/.9));
    return {cx:wide ? W*.69 : W/2, cy:top + space*.5, w:w, h:w*.6};
  }
  function blow2D(){ if (lit && window.birthdayFlow && window.birthdayFlow.state === "celebrating"){ lit = false; showWish(); var g = geo();
      for (var i=0;i<120;i++) parts.push({x:g.cx, y:g.cy-g.h/2-50, vx:rnd(-3,3), vy:rnd(-5,-1), r:rnd(3,9), c:["#ffa040","#ffd54a","#6fa0ff","#ffffff"][i%4], l:1}); }
    }
  window.__bday = {blow:blow2D, relight:function(){}, fx:{}};
  document.dispatchEvent(new CustomEvent("birthday:ready"));
  $("hint").addEventListener("click", function(e){ e.stopPropagation(); cv.click(); });
  function loop(t){
    c.fillStyle = "#000"; c.fillRect(0,0,W,H);
    st.forEach(function(s){ c.globalAlpha = .4+.6*Math.abs(Math.sin(t/900+s[3])); c.fillStyle = "#fff"; c.fillRect(s[0]*W, s[1]*H, s[2], s[2]); });
    c.globalAlpha = 1; var g = geo();
    c.fillStyle = "#cfd0f5"; c.beginPath(); c.ellipse(g.cx, g.cy+g.h/2, g.w*.68, g.w*.14, 0, 0, 6.283); c.fill();
    c.fillStyle = "#16215f"; c.fillRect(g.cx-g.w/2, g.cy-g.h/2, g.w, g.h);
    c.beginPath(); c.ellipse(g.cx, g.cy+g.h/2, g.w/2, g.w*.1, 0, 0, Math.PI); c.fill();
    c.fillStyle = "#f6f3ff"; c.beginPath(); c.ellipse(g.cx, g.cy-g.h/2, g.w/2, g.w*.1, 0, 0, 6.283); c.fill();
    c.fillStyle = "#ffd34a"; for (var i=0;i<9;i++){ c.beginPath(); c.arc(g.cx-g.w/2+20+((i*53)%(g.w-40)), g.cy-g.h/2+25+((i*37)%(g.h-40)), 3.5, 0, 6.283); c.fill(); }
    c.fillStyle = "#fbf8ff"; c.fillRect(g.cx-5, g.cy-g.h/2-48, 10, 46);
    if (lit){ var fl = 1+Math.sin(t/60)*.08; var rg = c.createRadialGradient(g.cx, g.cy-g.h/2-62, 0, g.cx, g.cy-g.h/2-62, 60);
      rg.addColorStop(0,"rgba(255,200,110,.8)"); rg.addColorStop(1,"rgba(255,150,60,0)"); c.fillStyle = rg; c.fillRect(g.cx-60, g.cy-g.h/2-122, 120, 120);
      c.fillStyle = "#fff3c4"; c.beginPath(); c.ellipse(g.cx, g.cy-g.h/2-60, 6, 13*fl, 0, 0, 6.283); c.fill(); }
    parts = parts.filter(function(p){ p.vy += .12; p.x += p.vx; p.y += p.vy; p.l -= .008; c.globalAlpha = Math.max(0,p.l); c.fillStyle = p.c; c.beginPath(); c.arc(p.x,p.y,p.r,0,6.283); c.fill(); return p.l > 0; });
    c.globalAlpha = 1; c.fillStyle = "#fff"; c.font = "italic 30px 'Snell Roundhand','Segoe Script','Brush Script MT',cursive"; c.textAlign = "center";
    c.fillText("happy birthday", g.cx, g.cy+g.h/2+g.w*.14+40);
    markScenePainted();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
})();

