const EQUIPMENT_KEY = 'control-electrovalvulas-equipment-v1';
const CONFIG_KEY = 'control-electrovalvulas-config-v1';

function createDefaultEquipment() {
  return [
    { id: 'pump', name: 'Motobomba', channel: 11, kind: 'pump', manualOn: false, schedules: [] },
    ...Array.from({ length: 10 }, (_, index) => ({
      id: `valve-${index + 1}`,
      name: `Válvula ${index + 1}`,
      channel: index + 1,
      kind: 'valve',
      manualOn: false,
      schedules: Array.from({ length: 3 }, () => ({ enabled: false, start: '06:00', end: '06:30' })),
    })),
  ];
}

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function isValidTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function restoreSchedules(saved = {}) {
  const savedSchedules = Array.isArray(saved.schedules) ? saved.schedules : [];
  return Array.from({ length: 3 }, (_, index) => {
    const savedSchedule = savedSchedules[index] || {};
    const migrateLegacySchedule = index === 0 && !Array.isArray(saved.schedules);
    return {
      enabled: Boolean(savedSchedule.enabled ?? (migrateLegacySchedule && saved.scheduleEnabled)),
      start: isValidTime(savedSchedule.start) ? savedSchedule.start : (migrateLegacySchedule && isValidTime(saved.start) ? saved.start : '06:00'),
      end: isValidTime(savedSchedule.end) ? savedSchedule.end : (migrateLegacySchedule && isValidTime(saved.end) ? saved.end : '06:30'),
    };
  });
}

const savedConfig = readJson(CONFIG_KEY);
const savedEquipment = readJson(EQUIPMENT_KEY) || savedConfig?.equipment;
const savedById = new Map(Array.isArray(savedEquipment) ? savedEquipment.map((item) => [item.id, item]) : []);
const state = {
  equipment: createDefaultEquipment().map((item) => {
    const saved = savedById.get(item.id) || {};
    return {
      ...item,
      manualOn: Boolean(saved.manualOn),
      schedules: item.kind === 'valve' ? restoreSchedules(saved) : [],
    };
  }),
  powerOn: Boolean(savedConfig?.scheduleActive),
  scheduleActive: Boolean(savedConfig?.scheduleActive),
  savedAt: null,
};

const equipmentGrid = document.querySelector('#equipmentGrid');
const scheduleButton = document.querySelector('#toggleSchedule');
const toastElement = document.querySelector('#toast');
let toastTimer;

function timeIsWithinSchedule(start, end, date, beforeMinutes = 0, afterMinutes = 0) {
  const current = date.getHours() * 60 + date.getMinutes();
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const duration = (endMinutes - startMinutes + 1440) % 1440;

  if (duration === 0) return false;
  const extendedDuration = duration + beforeMinutes + afterMinutes;
  if (extendedDuration >= 1440) return true;

  const extendedStart = (startMinutes - beforeMinutes + 1440) % 1440;
  const elapsed = (current - extendedStart + 1440) % 1440;
  return elapsed < extendedDuration;
}

function isEquipmentOn(item, now = new Date()) {
  if (!state.scheduleActive) return item.manualOn;
  if (!state.powerOn) return false;

  if (item.kind === 'pump') {
    return state.equipment.some((valve) => valve.kind === 'valve'
      && valve.schedules.some((schedule) => schedule.enabled
        && timeIsWithinSchedule(schedule.start, schedule.end, now, 1, 1)));
  }

  return item.schedules.some((schedule) => schedule.enabled
    && timeIsWithinSchedule(schedule.start, schedule.end, now));
}

function renderEquipment() {
  equipmentGrid.innerHTML = state.equipment.map((item) => {
    const isPump = item.kind === 'pump';
    const outputOn = isEquipmentOn(item);
    const statusText = isPump ? (outputOn ? 'Encendida' : 'Apagada') : (outputOn ? 'Abierta' : 'Cerrada');
    const scheduleContent = isPump
      ? `
        <div class="pump-schedule-info">
          <div>
            <h4 class="pump-schedule-title">Acompañamiento automático</h4>
            <p class="pump-schedule-note">La motobomba sigue las franjas habilitadas de las válvulas y no necesita horarios propios.</p>
          </div>
          <div class="pump-schedule-offsets" aria-label="Margen de funcionamiento de la motobomba">
            <div class="pump-schedule-offset">
              <span>Arranque</span>
              <strong>1 min antes</strong>
            </div>
            <div class="pump-schedule-offset">
              <span>Apagado</span>
              <strong>1 min después</strong>
            </div>
          </div>
        </div>
      `
      : item.schedules.map((schedule, index) => `
        <div class="schedule-period">
          <div class="schedule-card-heading">
            <span>Horario ${index + 1}</span>
            <label class="schedule-toggle" aria-label="Activar horario ${index + 1} para ${item.name}">
              <input type="checkbox" data-action="toggle-schedule" data-period-index="${index}" data-id="${item.id}" ${schedule.enabled ? 'checked' : ''} />
              <span class="toggle-track" aria-hidden="true"><span></span></span>
            </label>
          </div>
          <div class="schedule-times">
            <label class="time-field">
              <span>Desde</span>
              <input type="time" lang="en-GB" value="${schedule.start}" aria-label="Inicio del horario ${index + 1} de ${item.name}" data-action="set-schedule-time" data-part="start" data-period-index="${index}" data-id="${item.id}" />
            </label>
            <span class="time-separator" aria-hidden="true">a</span>
            <label class="time-field">
              <span>Hasta</span>
              <input type="time" lang="en-GB" value="${schedule.end}" aria-label="Fin del horario ${index + 1} de ${item.name}" data-action="set-schedule-time" data-part="end" data-period-index="${index}" data-id="${item.id}" />
            </label>
          </div>
        </div>
      `).join('');

    return `
      <article class="device-card ${isPump ? 'pump-card' : ''} ${outputOn ? 'is-active' : ''}" data-device-card="${item.id}">
        <div class="device-card-heading">
          <div class="device-title">
            <span class="channel-label">CANAL ${item.channel}</span>
            <h3>${item.name}</h3>
          </div>
          <div class="device-state">
            <span class="device-status" data-output-status="${item.id}">${statusText}</span>
            <button class="device-switch ${outputOn ? 'is-on' : ''}" type="button" role="switch" aria-checked="${outputOn}" aria-label="${outputOn ? 'Apagar' : 'Encender'} ${item.name}" data-action="toggle-device" data-id="${item.id}" ${state.scheduleActive ? 'disabled' : ''}>
              <span></span>
            </button>
          </div>
        </div>
        <div class="schedule-divider"></div>
        ${scheduleContent}
      </article>
    `;
  }).join('');

  refreshOutputs();
}

function refreshOutputs() {
  const now = new Date();
  let activeCount = 0;

  state.equipment.forEach((item) => {
    const outputOn = isEquipmentOn(item, now);
    if (outputOn) activeCount += 1;

    const card = equipmentGrid.querySelector(`[data-device-card="${item.id}"]`);
    if (!card) return;

    const switchButton = card.querySelector('[data-action="toggle-device"]');
    const status = card.querySelector(`[data-output-status="${item.id}"]`);
    const statusText = item.kind === 'pump' ? (outputOn ? 'Encendida' : 'Apagada') : (outputOn ? 'Abierta' : 'Cerrada');

    card.classList.toggle('is-active', outputOn);
    switchButton.classList.toggle('is-on', outputOn);
    switchButton.setAttribute('aria-checked', String(outputOn));
    switchButton.setAttribute('aria-label', `${outputOn ? 'Apagar' : 'Encender'} ${item.name}`);
    switchButton.disabled = state.scheduleActive;
    status.textContent = statusText;
  });

  document.querySelector('#activeCount').textContent = String(activeCount).padStart(2, '0');
  const systemOn = activeCount > 0;
  const systemState = document.querySelector('#systemState');
  if (systemState) {
    systemState.innerHTML = `<span class="state-dot ${systemOn ? 'is-on' : ''}"></span> ${systemOn ? 'Sistema encendido' : 'Sistema apagado'}`;
  }
  document.querySelector('#masterCaption').textContent = state.scheduleActive
    ? 'Horarios activos; equipos según programación'
    : systemOn ? 'Sistema energizado' : 'Todos los equipos apagados';
}

function updateClock(date = new Date()) {
  document.querySelector('#clockTime').textContent = new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(date);
  document.querySelector('#clockDate').textContent = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(date);
  refreshOutputs();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.hidden = false;
  toastTimer = window.setTimeout(() => { toastElement.hidden = true; }, 3600);
}

function setAllOutputs(isOn) {
  state.scheduleActive = false;
  state.powerOn = isOn;
  state.equipment = state.equipment.map((item) => ({ ...item, manualOn: isOn }));
  refreshScheduleControls();
  renderEquipment();
  saveAllChanges();
  showToast(isOn ? 'Sistema encendido.' : 'Sistema apagado.');
}

function refreshScheduleControls() {
  scheduleButton.textContent = state.scheduleActive ? 'Desactivar horarios' : 'Activar horarios';
  document.querySelector('#scheduleStatus').textContent = state.scheduleActive ? 'Horarios habilitados' : 'Horarios desactivados';
  document.querySelector('.schedule-master').classList.toggle('is-scheduled', state.scheduleActive);
}

function saveEquipmentOnly() {
  try {
    localStorage.setItem(EQUIPMENT_KEY, JSON.stringify(state.equipment));
    state.savedAt = new Date();
    document.querySelector('#savedLabel').textContent = `Equipos guardados a las ${new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }).format(state.savedAt)}`;
    return true;
  } catch {
    showToast('No fue posible guardar en este navegador.');
    return false;
  }
}

function saveAllChanges() {
  if (!saveEquipmentOnly()) return;
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({
      equipment: state.equipment,
      scheduleActive: state.scheduleActive,
      savedAt: new Date().toISOString(),
    }));
    showToast('Cambios y horarios guardados en este dispositivo.');
  } catch {
    showToast('No fue posible guardar en este navegador.');
  }
}

equipmentGrid.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="toggle-device"]');
  if (!button || state.scheduleActive) return;
  const item = state.equipment.find((device) => device.id === button.dataset.id);
  if (!item) return;
  item.manualOn = !item.manualOn;
  refreshOutputs();
});

equipmentGrid.addEventListener('change', (event) => {
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const item = state.equipment.find((device) => device.id === control.dataset.id);
  if (!item) return;

  if (control.dataset.action === 'toggle-schedule' || control.dataset.action === 'set-schedule-time') {
    const periodIndex = Number(control.dataset.periodIndex);
    const schedule = item.schedules[periodIndex];
    if (!schedule) return;

    if (control.dataset.action === 'toggle-schedule') {
      schedule.enabled = control.checked;
    } else if (isValidTime(control.value)) {
      schedule[control.dataset.part] = control.value;
      schedule.enabled = true;
      const scheduleToggle = equipmentGrid.querySelector(`[data-device-card="${item.id}"] [data-action="toggle-schedule"][data-period-index="${periodIndex}"]`);
      if (scheduleToggle) scheduleToggle.checked = true;
    }

    refreshOutputs();
    saveAllChanges();
  }
});

document.querySelector('#turnAllOn').addEventListener('click', () => setAllOutputs(true));
document.querySelector('#turnAllOff').addEventListener('click', () => setAllOutputs(false));
document.querySelector('#saveChanges').addEventListener('click', saveAllChanges);
document.querySelector('#saveEquipment').addEventListener('click', () => {
  if (saveEquipmentOnly()) showToast('Configuración de válvulas y motobomba guardada.');
});
document.querySelector('#syncClock').addEventListener('click', () => {
  const localTime = new Date();
  updateClock(localTime);
  document.querySelector('#syncCaption').textContent = `Hora local actualizada a las ${new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }).format(localTime)}`;
  showToast('Hora actualizada en la vista previa. Para enviarla a la ESP32, integra su API.');
});
scheduleButton.addEventListener('click', () => {
  state.scheduleActive = !state.scheduleActive;
  state.powerOn = state.scheduleActive;
  if (state.scheduleActive) {
    state.equipment = state.equipment.map((item) => ({ ...item, manualOn: false }));
  }
  refreshScheduleControls();
  renderEquipment();
  saveAllChanges();
});

refreshScheduleControls();
renderEquipment();
updateClock();
window.setInterval(updateClock, 1000);
