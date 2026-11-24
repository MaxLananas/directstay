(() => {
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const nav = document.querySelector('.floor-nav');
  if (!nav) return;
  const links = [...nav.querySelectorAll('a')];
  const anchors = links.map(a => document.querySelector(a.hash));
  const signal = document.querySelector('.signal-field');
  const stripe = document.querySelector('.channel-stripe');
  const channelNames = ['01 / GOOGLE', '02 / SUIVI CLIENT', '03 / OFFRES DIRECTES'];
  const palettes = [
    ['#d9bfff','#a587ff','#697eff','#faf0ff'],
    ['#ffb994','#ff7d8f','#c875df','#ffebaf'],
    ['#e2ff8c','#a3e6af','#76cbe9','#fff9b9']
  ];
  const scenes = [];
  let channel = 0, scheduled = 0, lastDraw = 0, lastSection = -1, pageDirty = true;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  nav.hidden = false;
  function pageProgress() {
    const documentHeight = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.style.setProperty('--page-progress', documentHeight > 0 ? clamp(scrollY / documentHeight, 0, 1) : 0);
    if (stripe && !motion.matches) {
      const rect = stripe.getBoundingClientRect();
      if (rect.top < innerHeight && rect.bottom > 0) {
        stripe.style.setProperty('--stripe-shift', clamp((rect.top - innerHeight*.52)*.40,-188,188)+'px');
      }
    }
    let current = 0;
    anchors.forEach((section, index) => {
      if (section && section.getBoundingClientRect().top <= innerHeight * .52) current = index;
    });
    if (lastSection !== current) {
      lastSection = current;
      links.forEach((link, i) => {
        if (i === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  }
  function tick(now) {
    scheduled = 0;
    if (document.hidden) return;
    if (pageDirty) {
      pageDirty = false;
      pageProgress();
    }
    const animated = !motion.matches && scenes.some(s => s.visible);
    if (now - lastDraw >= 31 || !animated) {
      lastDraw = now;
      for (const scene of scenes) if (scene.visible) paint(scene, motion.matches ? 0 : now / 1000);
    }
    if (animated) wake();
  }
  function wake() { if (!scheduled && !document.hidden) scheduled = requestAnimationFrame(tick); }
  function scroll() { pageDirty = true; wake(); }
  addEventListener('scroll', scroll, {passive:true});
  addEventListener('resize', scroll, {passive:true});
  document.addEventListener('visibilitychange', scroll);
  motion.addEventListener('change', scroll);

  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      const scene = scenes.find(s => s.element === entry.target);
      if (scene) scene.visible = entry.isIntersecting;
    }
    wake();
  }) : null;

  for (const element of document.querySelectorAll('.signal-field,.departure')) {
    const canvas = element.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    const scene = {element, canvas, ctx, kind:element === signal ? 'orbit' : 'gate', visible:!observer, x:0, y:0};
    scenes.push(scene);
    element.classList.add('has-canvas');
    observer?.observe(element);
    element.parentElement.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch' || motion.matches) return;
      const bounds = element.getBoundingClientRect();
      scene.x = clamp((e.clientX - bounds.left) / bounds.width - .5, -.5, .5);
      scene.y = clamp((e.clientY - bounds.top) / bounds.height - .5, -.5, .5);
    }, {passive:true});
    element.parentElement.addEventListener('pointerleave', () => { scene.x = scene.y = 0; });
  }

  const serviceTabs = document.querySelector('.service-tabs');
  if (serviceTabs && signal) {
    const read = () => {
      const selected = [...serviceTabs.querySelectorAll('button')].findIndex(t => t.getAttribute('aria-selected') === 'true');
      channel = Math.max(0, selected);
      signal.dataset.channel = channel + 1;
      signal.querySelector('.signal-channel').textContent = channelNames[channel];
      wake();
    };
    new MutationObserver(read).observe(serviceTabs, {subtree:true, attributes:true, attributeFilter:['aria-selected']});
    read();
  }

  const faqDial = document.querySelector('.faq-dial');
  if (faqDial) {
    const questions = [...document.querySelectorAll('#faq details')];
    questions.forEach((question, index) => question.addEventListener('toggle', () => {
      if (question.open) {
        faqDial.style.setProperty('--dial-angle', 8 + 47 * index + 'deg');
        faqDial.querySelector('b').textContent = '0' + (index + 1);
      } else if (!questions.some(item => item.open)) {
        faqDial.style.removeProperty('--dial-angle');
        faqDial.querySelector('b').textContent = '05';
      }
    }));
  }

  const revenue = document.querySelector('#revenue');
  const fee = document.querySelector('#commission');
  const allocation = document.querySelector('.allocation');
  if (revenue && fee && allocation) {
    const money = new Intl.NumberFormat('fr-FR', {style:'currency',currency:'EUR',maximumFractionDigits:0});
    const costs = allocation.querySelector('#allocation-fee');
    const net = allocation.querySelector('#allocation-net');
    const read = () => {
      const gross = revenue.valueAsNumber;
      const rate = fee.valueAsNumber;
      const amount = gross * rate / 100;
      allocation.style.setProperty('--fee', rate + '%');
      costs.textContent = money.format(amount);
      net.textContent = money.format(gross - amount);
    };
    revenue.addEventListener('input', read);
    fee.addEventListener('input', read);
    read();
  }

  for (const panel of document.querySelectorAll('.specimen,.price-tag,.service-art,.method-visual')) {
    const art = panel.querySelector('.mock-search,.member,.audit-sheet,.report-sheet');
    panel.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || motion.matches) return;
      const box = panel.getBoundingClientRect();
      const x = (event.clientX-box.left)/box.width-.5, y = (event.clientY-box.top)/box.height-.5;
      panel.style.setProperty('--lx', x*115+'px');
      panel.style.setProperty('--ly', y*95+'px');
      if (art) {
        art.style.setProperty('--hover-rx', -y*15+'deg');
        art.style.setProperty('--hover-ry', x*15+'deg');
      }
    }, {passive:true});
    panel.addEventListener('pointerleave', () => {
      panel.style.removeProperty('--lx');
      panel.style.removeProperty('--ly');
      art?.style.removeProperty('--hover-rx');
      art?.style.removeProperty('--hover-ry');
    });
  }

  function paint(scene, t) {
    const {element,canvas,ctx} = scene;
    const w = element.clientWidth, h = element.clientHeight;
    if (!w || !h) return;
    const density = Math.min(devicePixelRatio || 1, 1.35);
    const W = Math.round(w*density), H = Math.round(h*density);
    if (W !== canvas.width || H !== canvas.height) { canvas.width = W; canvas.height = H; }
    ctx.setTransform(density,0,0,density,0,0);
    ctx.clearRect(0,0,w,h);
    const px = motion.matches ? 0 : scene.x, py = motion.matches ? 0 : scene.y;
    if (scene.kind === 'orbit') orbit(ctx, w,h,t,px,py);
    else gate(ctx,w,h,t,px,py);
  }

  function orbit(ctx,w,h,t,px,py) {
    const cx=w*(w<550?.57:.65), cy=h*.51;
    const radius=Math.min(w*.36,h*.94), colors=palettes[channel], tau=Math.PI*2;
    const spin=t*.21+channel*.65+px*.95;
    const tilt=.55+py*.48;
    function project(x,y,z) {
      const rx=x*Math.cos(spin)+z*Math.sin(spin), rz=z*Math.cos(spin)-x*Math.sin(spin);
      const ry=y*Math.cos(tilt)-rz*Math.sin(tilt);
      const depth=y*Math.sin(tilt)+rz*Math.cos(tilt);
      const scale=2.9/(2.9-depth);
      return [cx+rx*scale*radius,cy+ry*scale*radius,scale];
    }
    for(let ring=0;ring<4;ring++){
      const angle=ring*.68+channel*.27;
      const r=.69+ring*.095;
      const pts=[];
      ctx.beginPath();
      for(let i=0;i<=100;i++){
        const a=i/100*tau;
        const x=r*Math.cos(a), y=r*Math.sin(a);
        const p=project(x,y*Math.sin(angle),y*Math.cos(angle));
        pts.push(p);
        if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);
      }
      ctx.strokeStyle=colors[ring];ctx.globalAlpha=.32+ring*.07;ctx.lineWidth=ring===3?1.35:.8;ctx.stroke();
      for(let i=0;i<4;i++){
        const point=pts[Math.floor((i*25+ring*17+t*(4+ring))%100)];
        ctx.beginPath();ctx.arc(point[0],point[1],(1.9+ring*.4)*point[2],0,tau);
        ctx.globalAlpha=.9;ctx.fillStyle=colors[ring];ctx.fill();
      }
    }
    const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,radius*.31);
    glow.addColorStop(0,colors[0]+'cc');glow.addColorStop(.33,colors[1]+'6a');glow.addColorStop(1,colors[2]+'00');
    ctx.fillStyle=glow;ctx.fillRect(cx-radius,cy-radius,radius*2,radius*2);
    ctx.strokeStyle=colors[3];ctx.lineWidth=.8;ctx.beginPath();
    ctx.moveTo(cx-12,cy);ctx.lineTo(cx+12,cy);ctx.moveTo(cx,cy-12);ctx.lineTo(cx,cy+12);ctx.stroke();
    ctx.globalAlpha=1;
  }

  function gate(ctx,w,h,t,px,py) {
    const cx=w*(w<620?.68:.77)+px*27, cy=h*.53+py*20;
    const R=Math.min(w*.39,h*.67);
    const floor=ctx.createRadialGradient(cx,cy,0,cx,cy,R*1.22);
    floor.addColorStop(0,'#ecc2ff43');floor.addColorStop(.42,'#c765ff31');floor.addColorStop(1,'#7346ce00');
    ctx.fillStyle=floor;ctx.fillRect(0,0,w,h);
    const colors=['#b4a1ff','#ff9ada','#ffc79c','#f2ffae','#686efa'];
    for(let layer=0;layer<24;layer++){
      const n=layer/23;
      const radius=R*(.24+n*.76);
      ctx.beginPath();
      for(let i=0;i<=100;i++){
        const a=i/100*Math.PI*2;
        const ripple=1+Math.sin(a*3+n*8-t*.65)*.068+Math.cos(a*5-t*.52+n*6)*.040;
        const x=cx+Math.cos(a)*radius*ripple*(1.11-n*.18)+Math.sin(t*.5+n*7)*11;
        const y=cy+Math.sin(a)*radius*ripple*.86+Math.sin(n*11)*8;
        if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
      }
      ctx.strokeStyle=colors[layer%colors.length];ctx.globalAlpha=.22+(1-n)*.46;ctx.lineWidth=layer%6===0?1.45:.74;
      ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  scroll();
})();
