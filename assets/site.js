const revenue = document.querySelector('#revenue');
const commission = document.querySelector('#commission');

if (revenue && commission) {
  const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const percent = new Intl.NumberFormat('fr-FR', { style: 'percent' });
  const revenueValue = document.querySelector('#revenue-val');
  const commissionValue = document.querySelector('#commission-val');
  const total = document.querySelector('#total');

  function update() {
    const rate = commission.valueAsNumber / 100;
    revenueValue.value = eur.format(revenue.valueAsNumber);
    commissionValue.value = percent.format(rate);
    total.value = eur.format(revenue.valueAsNumber * rate);
    revenue.setAttribute('aria-valuetext', revenueValue.value);
    commission.setAttribute('aria-valuetext', commissionValue.value);
  }

  revenue.disabled = false;
  commission.disabled = false;
  revenue.addEventListener('input', update);
  commission.addEventListener('input', update);
  update();
}

function installTabs(tabSelector, panelSelector, idPrefix, vertical = false) {
  const tabs = document.querySelector(tabSelector);
  const group = document.querySelector(panelSelector);
  const panels = group ? [...group.querySelectorAll('article[data-tab]')] : [];
  if (!tabs || panels.length < 2) return;
  const controls = panels.map((panel, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.id = idPrefix + (index + 1);
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panel.id);
    const number = document.createElement('span');
    number.setAttribute('aria-hidden', 'true');
    number.textContent = String(index + 1).padStart(2, '0');
    button.append(number, panel.dataset.tab);
    if (vertical) {
      const arrow = document.createElement('i');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      button.append(arrow);
    }
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id);
    panel.tabIndex = 0;
    button.addEventListener('click', () => activate(index));
    button.addEventListener('keydown', event => {
      const position = {
        [vertical ? 'ArrowUp' : 'ArrowLeft']: (index + panels.length - 1) % panels.length,
        [vertical ? 'ArrowDown' : 'ArrowRight']: (index + 1) % panels.length,
        Home: 0,
        End: panels.length - 1
      }[event.key];
      if (position === undefined) return;
      event.preventDefault();
      activate(position);
      controls[position].focus();
    });
    tabs.append(button);
    return button;
  });
  function activate(index) {
    controls.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index));
      button.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
  }
  tabs.setAttribute('role', 'tablist');
  if (vertical) tabs.setAttribute('aria-orientation', 'vertical');
  tabs.hidden = false;
  if (vertical) group.parentElement.classList.add('method-interactive');
  group.classList.add('enhanced');
  activate(0);
}

installTabs('.service-tabs', '.service-grid', 'levier-');
installTabs('.method-tabs', '.method-panels', 'etape-', true);

const specimen = document.querySelector('.specimen');
const rotateSpecimen = specimen?.querySelector('.scene-spin');
if (rotateSpecimen) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  rotateSpecimen.hidden = false;
  rotateSpecimen.addEventListener('click', () => {
    if (!specimen.classList.contains('scene-ready')) specimen.toggleAttribute('data-reversed');
  });
  specimen.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || reduceMotion.matches || specimen.classList.contains('scene-ready')) return;
    const bounds = specimen.getBoundingClientRect();
    specimen.style.setProperty('--poster-x', ((event.clientX - bounds.left) / bounds.width - .5) * 19 + 'px');
    specimen.style.setProperty('--poster-y', ((event.clientY - bounds.top) / bounds.height - .5) * 15 + 'px');
  });
  specimen.addEventListener('pointerleave', () => {
    specimen.style.removeProperty('--poster-x');
    specimen.style.removeProperty('--poster-y');
  });
}

