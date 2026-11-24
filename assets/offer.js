(() => {
  const config = globalThis.directStayOffer;
  if (!config) return;
  const money = new Intl.NumberFormat('fr-FR', {style:'currency', currency:'EUR', maximumFractionDigits:0});
  const percent = new Intl.NumberFormat('fr-FR', {style:'percent', maximumFractionDigits:1});
  const annual = config.monthly * 12 + config.setup;
  const price = {'monthly-number': String(config.monthly), setup: money.format(config.setup), year: money.format(annual)};
  for (const node of document.querySelectorAll('[data-offer-price]')) node.textContent = price[node.dataset.offerPrice];

  const email = config.auditEmail.trim();
  const localPreview = location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if ((config.auditOpen || localPreview) && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) {
    const address = 'mailto:' + encodeURIComponent(email).replace(/%40/i,'@');
    const subject = 'Audit DirectStay';
    const body = [
      'Nom et site de l’hôtel :',
      'Moteur de réservation :',
      'CA annuel HT par canal (données agrégées) :',
      'Commissions totales sur la même période :',
      '',
      'Merci de ne joindre aucune donnée de voyageur.'
    ].join('\r\n');
    for (const link of document.querySelectorAll('[data-audit-link]')) {
      link.href = address + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      link.hidden = false;
    }
    for (const link of document.querySelectorAll('[data-audit-email]')) {
      link.href = address;
      link.textContent = email;
      link.hidden = false;
    }
    for (const message of document.querySelectorAll('[data-audit-unavailable]')) message.hidden = true;
  }

  const get = id => document.getElementById(id);
  const revenue = get('revenue'), commission = get('commission');
  const shift = get('shift'), cost = get('direct-cost'), result = get('scenario-net');
  if (!revenue || !commission || !shift || !cost || !result) return;
  const volumeText = get('scenario-volume'), savingsText = get('scenario-savings');
  const thresholdText = get('scenario-threshold'), status = get('scenario-status');
  const shiftOut = get('shift-val'), costOut = get('direct-cost-val');

  function calculate() {
    const gross = revenue.valueAsNumber;
    const shiftRate = shift.valueAsNumber, costRate = cost.valueAsNumber;
    const margin = commission.valueAsNumber - costRate;
    const moved = gross * shiftRate / 100;
    const saved = moved * margin / 100;
    const net = saved - annual;
    const threshold = margin > 0 ? Math.ceil(annual * 100 / margin) : null;
    shiftOut.value = percent.format(shiftRate / 100);
    costOut.value = percent.format(costRate / 100);
    shift.setAttribute('aria-valuetext', shiftOut.value);
    cost.setAttribute('aria-valuetext', costOut.value);
    volumeText.textContent = money.format(moved);
    savingsText.textContent = money.format(saved);
    result.value = money.format(net);
    result.dataset.result = net < 0 ? 'negative' : net > 0 ? 'positive' : 'zero';
    thresholdText.textContent = threshold === null ? 'Aucun à ces taux' : money.format(threshold);
    status.textContent = margin <= 0 ? 'À ces taux, transférer des réservations ne permet pas de couvrir le forfait.'
      : threshold > gross ? 'Même en transférant tout ce chiffre d’affaires, les économies ne couvriraient pas le forfait.'
      : net < 0 ? 'Dans ce scénario, les économies ne couvrent pas le forfait.'
      : net > 0 ? 'Dans ce scénario, les économies dépassent le forfait.'
      : 'Dans ce scénario, les économies couvrent exactement le forfait.';
  }
  shift.disabled = false;
  cost.disabled = false;
  for (const field of [revenue,commission,shift,cost]) field.addEventListener('input', calculate);
  calculate();
})();
