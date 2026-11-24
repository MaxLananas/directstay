(() => {
  const section = document.querySelector('.passage');
  if (!section) return;
  const canvas = section.querySelector('canvas');
  const chapters = [...section.querySelectorAll('.passage-scene')];
  const timeline = section.querySelector('.passage-timeline');
  const steps = [...timeline.querySelectorAll('a')];
  const label = section.querySelector('.passage-index');
  const screen = section.querySelector('.passage-screen');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const posterMode = new URLSearchParams(location.search).get('passage') === 'poster';
  let paint = null, queued = 0, onScreen = false, previous = -1, px = 0, py = 0;

  const fit = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function update() {
    queued = 0;
    if (!onScreen && !posterMode) return;
    const rect = section.getBoundingClientRect();
    const travel = Math.max(1, rect.height - screen.clientHeight);
    const progress = fit(-rect.top / travel, 0, 1);
    const index = progress < .33 ? 0 : progress < .66 ? 1 : 2;
    if (index !== previous) {
      previous = index;
      section.dataset.scene = index + 1;
      label.textContent = '0' + (index + 1) + ' / 03';
      chapters.forEach((chapter, i) => {
        chapter.classList.toggle('scene-current', i === index);
        if (i === index) steps[i].setAttribute('aria-current', 'step');
        else steps[i].removeAttribute('aria-current');
      });
    }
    section.style.setProperty('--travel', progress);
    paint?.(posterMode ? .12 : motion.matches ? index * .42 : progress, motion.matches ? 0 : px, motion.matches ? 0 : py);
  }
  function schedule() {
    if (onScreen && !queued) queued = requestAnimationFrame(update);
  }
  function init() {
    if (paint) return;
    try {
      paint = makeRenderer();
      if (paint) section.classList.add('is-rendered');
    } catch (error) {
      if (posterMode) console.error(error);
    }
  }
  section.classList.add('is-cinematic');
  timeline.hidden = false;
  if (/^#passage-[123]$/.test(location.hash)) {
    const start = location.hash;
    requestAnimationFrame(() => {
      const target = document.getElementById(start.slice(1));
      if (target && location.hash === start) {
        scrollTo({ top: target.getBoundingClientRect().top + scrollY, behavior: 'instant' });
      }
    });
  }
  motion.addEventListener('change', schedule);
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  screen.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || motion.matches) return;
    const box = screen.getBoundingClientRect();
    px = (e.clientX - box.left) / box.width - .5;
    py = (e.clientY - box.top) / box.height - .5;
    schedule();
  });
  screen.addEventListener('pointerleave', () => { px = py = 0; schedule(); });
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    paint = null;
    section.classList.remove('is-rendered');
  });
  canvas.addEventListener('webglcontextrestored', () => { init(); schedule(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) { init(); schedule(); }
    }).observe(section);
  } else { onScreen = true; init(); schedule(); }

  function makeRenderer() {
    const gl = canvas.getContext('webgl', {
      antialias: false, alpha: false, depth: false, stencil: false,
      powerPreference: 'low-power', preserveDrawingBuffer: posterMode
    });
    if (!gl) return null;
    const vertex = `
      attribute vec2 a_position;
      void main(){gl_Position=vec4(a_position,0.,1.);}
    `;
    const fragment = `
      precision highp float;
      uniform vec2 u_size;
      uniform vec2 u_pointer;
      uniform float u_progress;

      float box(vec3 p, vec3 b){
        vec3 q=abs(p)-b;
        return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);
      }
      float arch(vec2 p,float r,float spring){
        return max(length(vec2(p.x,max(0.,p.y-spring)))-r,-p.y);
      }
      vec2 merge(vec2 a, vec2 b){return a.x < b.x ? a : b;}
      vec2 field(vec3 p){
        vec2 hit=vec2(p.y,1.);
        hit=merge(hit,vec2(box(p-vec3(-3.85,3.3,3.),vec3(.42,3.35,17.)),2.));
        hit=merge(hit,vec2(box(p-vec3(3.85,3.3,3.),vec3(.42,3.35,17.)),2.));
        hit=merge(hit,vec2(box(p-vec3(0.,6.65,3.),vec3(4.35,.28,17.)),2.));
        float rib=mod(p.z+4.8,4.8)-2.4;
        float outer=arch(p.xy,3.45,2.34);
        float inner=arch(p.xy+vec2(0.,.05),2.58,2.1);
        hit=merge(hit,vec2(max(abs(rib)-.20,max(outer,-inner)),3.));
        float lip=arch(p.xy+vec2(0.,.08),2.63,2.12);
        hit=merge(hit,vec2(max(abs(rib)-.26,max(lip,-inner)),4.));
        float portal=arch(p.xy+vec2(0.,.06),2.03,2.40);
        float rear=box(p-vec3(0.,3.3,14.7),vec3(4.1,3.35,.29));
        hit=merge(hit,vec2(max(rear,-portal),3.));
        hit=merge(hit,vec2(box(p-vec3(0.,3.25,17.),vec3(4.5,4.,.28)),5.));
        return hit;
      }
      vec3 normal(vec3 p){
        const float e=.007;
        return normalize(vec3(field(p+vec3(e,0,0)).x-field(p-vec3(e,0,0)).x,
          field(p+vec3(0,e,0)).x-field(p-vec3(0,e,0)).x,
          field(p+vec3(0,0,e)).x-field(p-vec3(0,0,e)).x));
      }
      float hash(vec2 p){return fract(sin(dot(floor(p),vec2(12.9898,78.233)))*43758.5453);}
      void main(){
        vec2 uv=(gl_FragCoord.xy*2.-u_size)/u_size.y;
        float aspect=u_size.x/u_size.y;
        uv.x-=min(.58, .25*aspect);
        vec3 ro=vec3(.20+sin(u_progress*3.1416)*.64+u_pointer.x*.33,2.42+u_pointer.y*.20,-10.55+u_progress*15.6);
        vec3 aim=normalize(vec3(-.025-ro.x*.036,.018,1.));
        vec3 right=normalize(cross(vec3(0.,1.,0.),aim));
        vec3 up=cross(aim,right);
        vec3 rd=normalize(1.60*aim+uv.x*right+uv.y*up);
        float travel=0.;
        vec2 s=vec2(0.);
        for(int i=0;i<66;i++){
          s=field(ro+rd*travel);
          if(s.x<.008||travel>34.)break;
          travel+=max(.011,s.x*.91);
        }
        vec3 p=ro+rd*travel;
        vec3 color=vec3(.045,.07,.22);
        float phase=smoothstep(.22,.48,u_progress), finale=smoothstep(.65,.92,u_progress);
        vec3 apricot=mix(mix(vec3(1.,.49,.26),vec3(1.,.30,.61),phase),vec3(.86,1.,.37),finale);
        vec3 grade=mix(mix(vec3(.12,.19,.46),vec3(.40,.13,.39),phase),vec3(.14,.37,.38),finale);
        if(travel<34.){
          vec3 n=normal(p);
          vec3 l=normalize(vec3(0.,4.5,15.3)-p);
          float key=max(dot(n,l),0.);
          float rim=max(dot(n,normalize(vec3(-.7,.3,-.65))),0.);
          float occlusion=clamp(field(p+n*.20).x*5.,.25,1.);
          float warm=exp(-abs(p.z-14.2)*.115);
          vec3 base=grade;
          if(s.y<1.5){
            vec2 tile=abs(fract(p.xz*.52+.5)-.5);
            float mortar=smoothstep(.473,.498,max(tile.x,tile.y));
            base=(grade*.61+vec3(.06,.05,.095))*(1.-.25*mortar);
            float electric=exp(-abs(abs(p.x)-2.53)*55.);
            base+=apricot*electric*(.19+.19*phase);
            vec3 reflected=reflect(rd,n);
            float cut=(15.5-p.z)/max(.01,reflected.z);
            vec3 rp=p+reflected*cut;
            float lightShape=exp(-.50*abs(rp.x)-.29*abs(rp.y-1.9));
            base+=.57*apricot*lightShape*warm;
          } else if(s.y>3.5&&s.y<4.5){
            base=grade*.9+mix(vec3(.34,.39,.52),apricot*.45,phase*.64);
          } else if(s.y>2.5){
            base=grade+vec3(.06,.09,.11);
          }
          color=base*(.45+.62*key+.52*rim)*occlusion+apricot*warm*key*.27;
          if(s.y>4.5){
            vec2 q=(p.xy-vec2(0.,2.8))*vec2(.33,.20);
            float sun=exp(-dot(q,q)*3.);
            color=mix(apricot*.75,apricot*.77+vec3(.88,.69,.42),sun);
          }
          float haze=1.-exp(-travel*.034);
          color=mix(color,vec3(.24,.31,.63),haze*.50);
        }
        vec2 lightUv=uv-vec2(-.025,-.018);
        float bloom=exp(-dot(lightUv,lightUv)*(3.8+2.4*(1.-u_progress)));
        color+=apricot*bloom*(.12+.18*u_progress);
        color=vec3(1.)-exp(-color*1.55);
        color=pow(max(color,0.),vec3(.91));
        color*=1.-.095*clamp(dot(uv*.65,uv*.65),0.,1.);
        color+=(hash(gl_FragCoord.xy)-.5)*.028;
        gl_FragColor=vec4(color,1.);
      }
    `;
    function compile(type, text) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message);
      }
      return shader;
    }
    const program = gl.createProgram();
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    const size = gl.getUniformLocation(program, 'u_size');
    const pointer = gl.getUniformLocation(program, 'u_pointer');
    const progress = gl.getUniformLocation(program, 'u_progress');
    return (value, x, y) => {
      const fullW = screen.clientWidth;
      const fullH = screen.clientHeight;
      if (!fullW || !fullH) return;
      const scale = Math.min(.78, 940 / fullW, 650 / fullH);
      const w = Math.max(1, Math.round(fullW * scale)), h = Math.max(1, Math.round(fullH * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0,0,w,h);
      gl.uniform2f(size,w,h);
      gl.uniform2f(pointer,x,y);
      gl.uniform1f(progress,value);
      gl.drawArrays(gl.TRIANGLES,0,3);
    };
  }
})();

