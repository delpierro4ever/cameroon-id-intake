/**
 * ID Registration Service — Google Apps Script backend
 * ----------------------------------------------------
 * One Web App, bound to ONE Google Sheet with three tabs:
 *   Appointments | Submissions | Registered
 *
 * SETUP (do this from your dedicated BUSINESS Google account — whoever owns
 * this account owns the data and the backend):
 *   1. Create a new Google Sheet.
 *   2. Extensions > Apps Script. Delete the sample code, paste THIS file.
 *   3. Run setupSheets() once (Run menu) and authorize when prompted.
 *      This creates the three tabs with headers.
 *   4. Deploy > New deployment > type "Web app".
 *        - Execute as: Me
 *        - Who has access: Anyone
 *      Deploy, copy the /exec URL.
 *   5. Paste that URL into APPS_SCRIPT_URL in both the form and the dashboard.
 *   6. Share the Sheet with your partner as Editor.
 *
 * The browser apps POST with Content-Type text/plain to avoid a CORS preflight
 * (Apps Script can't answer preflight OPTIONS). That makes these "simple"
 * cross-origin requests, which Apps Script handles fine.
 */

var SHEETS = {
  appointments: {
    name: 'Appointments',
    headers: ['id', 'name', 'phone', 'appointmentDate', 'notes', 'status'],
  },
  submissions: {
    name: 'Submissions',
    headers: ['id', 'timestamp', 'givenNames', 'surnames', 'address', 'mobilePhone', 'status'],
  },
  registered: {
    name: 'Registered',
    headers: ['id', 'timestamp', 'givenNames', 'surnames', 'address', 'mobilePhone', 'amountPaid', 'paidDate', 'status'],
  },
  biometrics: {
    name: 'Biometrics',
    headers: ['id', 'clientId', 'name', 'phone', 'stationName', 'rdvDate', 'status'],
  },
};

/** Run once from the editor to create the three tabs with headers. */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (key) {
    var cfg = SHEETS[key];
    var sheet = ss.getSheetByName(cfg.name) || ss.insertSheet(cfg.name);
    sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  });
  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);
}

/* ---------- helpers ---------- */

function newId() {
  return 'ID-' + Date.now().toString(36);
}

function getSheet(cfgKey) {
  var cfg = SHEETS[cfgKey];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(cfg.name);
  if (!sheet) {
    sheet = ss.insertSheet(cfg.name);
    sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function readObjects(cfgKey) {
  var sheet = getSheet(cfgKey);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) obj[headers[c]] = values[i][c];
    out.push(obj);
  }
  return out;
}

function appendObject(cfgKey, obj) {
  var cfg = SHEETS[cfgKey];
  var sheet = getSheet(cfgKey);
  var row = cfg.headers.map(function (h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
  return obj;
}

function findSheetRowById(cfgKey, id) {
  var sheet = getSheet(cfgKey);
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) return i + 1; // 1-based sheet row
  }
  return -1;
}

/* ---------- Appointments ---------- */

function addAppointment(p) {
  return appendObject('appointments', {
    id: newId(),
    name: p.name || '',
    phone: p.phone || '',
    appointmentDate: p.appointmentDate || '',
    notes: p.notes || '',
    status: 'Scheduled',
  });
}

function listAppointments() {
  return readObjects('appointments');
}

function updateAppointment(p) {
  var row = findSheetRowById('appointments', p.id);
  if (row < 0) throw new Error('Appointment not found: ' + p.id);
  var col = SHEETS.appointments.headers.indexOf('status') + 1;
  getSheet('appointments').getRange(row, col).setValue(p.status);
  return { id: p.id, status: p.status };
}

function deleteAppointment(p) {
  var row = findSheetRowById('appointments', p.id);
  if (row < 0) throw new Error('Appointment not found: ' + p.id);
  getSheet('appointments').deleteRow(row);
  return { id: p.id, deleted: true };
}

/* ---------- Submissions ---------- */

function addSubmission(p) {
  return appendObject('submissions', {
    id: newId(),
    timestamp: new Date().toISOString(),
    givenNames: p.givenNames || '',
    surnames: p.surnames || '',
    address: p.address || '',
    mobilePhone: p.mobilePhone || '',
    status: 'Submitted',
  });
}

function listSubmissions() {
  return readObjects('submissions');
}

function deleteSubmission(p) {
  var row = findSheetRowById('submissions', p.id);
  if (row < 0) throw new Error('Submission not found: ' + p.id);
  getSheet('submissions').deleteRow(row);
  return { id: p.id, deleted: true };
}

/* ---------- Registered ---------- */

/** Move a row from Submissions to Registered, recording payment. */
function confirmRegister(p) {
  var subs = readObjects('submissions');
  var match = null;
  for (var i = 0; i < subs.length; i++) {
    if (String(subs[i].id) === String(p.id)) { match = subs[i]; break; }
  }
  if (!match) throw new Error('Submission not found: ' + p.id);

  var reg = appendObject('registered', {
    id: match.id,
    timestamp: match.timestamp || new Date().toISOString(),
    givenNames: match.givenNames,
    surnames: match.surnames,
    address: match.address || '',
    mobilePhone: match.mobilePhone,
    amountPaid: Number(p.amountPaid) || 0,
    paidDate: p.paidDate || '',
    status: 'Done',
  });

  var row = findSheetRowById('submissions', p.id);
  if (row > 0) getSheet('submissions').deleteRow(row);
  return reg;
}

function listRegistered() {
  return readObjects('registered');
}

/** Append directly to Registered (back-fill already-registered clients). */
function addManual(p) {
  return appendObject('registered', {
    id: newId(),
    timestamp: new Date().toISOString(),
    givenNames: p.name || '',
    surnames: '',
    address: p.address || '',
    mobilePhone: p.phone || '',
    amountPaid: Number(p.amountPaid) || 0,
    paidDate: p.paidDate || '',
    status: 'Done',
  });
}

/* ---------- Biometrics ---------- */
/* The client's biometrics rendez-vous at a police station. The date is chosen
   by the client in the government portal; we enter it manually once confirmed.
   Separate from Appointments (which is our own client meetings). */

function addBiometrics(p) {
  return appendObject('biometrics', {
    id: newId(),
    clientId: p.clientId || '',
    name: p.name || '',
    phone: p.phone || '',
    stationName: p.stationName || '',
    rdvDate: p.rdvDate || '',
    status: 'Pending',
  });
}

function listBiometrics() {
  return readObjects('biometrics');
}

/** Update status and/or rdvDate by id (only the fields provided). */
function updateBiometrics(p) {
  var row = findSheetRowById('biometrics', p.id);
  if (row < 0) throw new Error('Biometrics entry not found: ' + p.id);
  var sheet = getSheet('biometrics');
  var headers = SHEETS.biometrics.headers;
  if (p.status !== undefined) sheet.getRange(row, headers.indexOf('status') + 1).setValue(p.status);
  if (p.rdvDate !== undefined) sheet.getRange(row, headers.indexOf('rdvDate') + 1).setValue(p.rdvDate);
  return { id: p.id, status: p.status, rdvDate: p.rdvDate };
}

function deleteBiometrics(p) {
  var row = findSheetRowById('biometrics', p.id);
  if (row < 0) throw new Error('Biometrics entry not found: ' + p.id);
  getSheet('biometrics').deleteRow(row);
  return { id: p.id, deleted: true };
}

/* ---------- dispatch ---------- */

var ACTIONS = {
  addAppointment: addAppointment,
  listAppointments: listAppointments,
  updateAppointment: updateAppointment,
  deleteAppointment: deleteAppointment,
  addSubmission: addSubmission,
  listSubmissions: listSubmissions,
  deleteSubmission: deleteSubmission,
  confirmRegister: confirmRegister,
  listRegistered: listRegistered,
  addManual: addManual,
  addBiometrics: addBiometrics,
  listBiometrics: listBiometrics,
  updateBiometrics: updateBiometrics,
  deleteBiometrics: deleteBiometrics,
};

function handle(action, params) {
  var fn = ACTIONS[action];
  if (!fn) throw new Error('Unknown action: ' + action);
  return fn(params || {});
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (ignore) {}
  try {
    var body = (e && e.postData && e.postData.contents)
      ? JSON.parse(e.postData.contents)
      : {};
    return json({ ok: true, data: handle(body.action, body) });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action) {
      return json({ ok: true, data: handle(e.parameter.action, e.parameter) });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
  return json({ ok: true, data: 'ID Registration Service backend is running.' });
}
