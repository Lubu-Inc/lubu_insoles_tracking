// ═══════════════════════════════════════════════════════════════════════════════
// Insole Tracker — Google Apps Script Backend
// ═══════════════════════════════════════════════════════════════════════════════
//
// SETUP:
// 1. Create a Google Sheet with two tabs: "Insoles" and "History"
// 2. In "Insoles" tab, add header row: id | serialNumber | type | size | location | enclosure | pairStatus | notes | dateAdded | lastModified
// 3. In "History" tab, add header row: id | insoleId | timestamp | field | oldValue | newValue
// 4. Open Extensions > Apps Script, paste this code
// 5. Deploy > New deployment > Web app > Execute as "Me", access "Anyone"
// 6. Copy the deployment URL and paste it into js/api.js
//
// ═══════════════════════════════════════════════════════════════════════════════

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

// ── HTTP Handlers ────────────────────────────────────────────────────────────

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || '';
  let result;

  try {
    switch (action) {
      case 'getInsoles':
        result = handleGetInsoles();
        break;
      case 'getHistory':
        result = handleGetHistory(e.parameter.insoleId);
        break;
      case 'debugSheet':
        result = handleDebugSheet();
        break;
      // GET-based fallbacks for write operations (CORS workaround)
      case 'addInsole':
        result = handleAddInsole(JSON.parse(e.parameter.data));
        break;
      case 'updateInsole':
        result = handleUpdateInsole(JSON.parse(e.parameter.data));
        break;
      case 'deleteInsole':
        result = handleDeleteInsole(e.parameter.id);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let params;
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Invalid JSON' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const action = params.action || '';
  let result;

  try {
    switch (action) {
      case 'addInsole':
        result = handleAddInsole(params.data);
        break;
      case 'updateInsole':
        result = handleUpdateInsole(params.data);
        break;
      case 'deleteInsole':
        result = handleDeleteInsole(params.id);
        break;
      default:
        result = { success: false, error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Read Operations ──────────────────────────────────────────────────────────

function handleGetInsoles() {
  const sheet = getSheet('Insoles');
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const headers = data[0];

  // Validate headers match expected order
  const expectedHeaders = ['id', 'serialNumber', 'type', 'size', 'location', 'enclosure', 'pairStatus', 'notes', 'dateAdded', 'lastModified'];
  const headerMismatch = [];
  for (let i = 0; i < expectedHeaders.length; i++) {
    if (headers[i] !== expectedHeaders[i]) {
      headerMismatch.push(`Column ${i + 1}: expected "${expectedHeaders[i]}", got "${headers[i]}"`);
    }
  }

  if (headerMismatch.length > 0) {
    return {
      success: false,
      error: 'Sheet headers do not match expected format. Issues: ' + headerMismatch.join('; ')
    };
  }

  const insoles = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // skip empty rows

    // CRITICAL FIX: Only map up to the number of headers
    // This prevents reading extra columns that might have old data
    const obj = {};
    for (let colIdx = 0; colIdx < headers.length; colIdx++) {
      const header = headers[colIdx];
      const value = row[colIdx];

      // Convert Date objects to ISO strings
      if (value instanceof Date) {
        obj[header] = value.toISOString();
      } else {
        obj[header] = value;
      }
    }

    insoles.push(obj);
  }

  return { success: true, data: insoles };
}

function handleGetHistory(insoleId) {
  if (!insoleId) return { success: false, error: 'Missing insoleId' };

  const sheet = getSheet('History');
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, data: [] };

  const headers = data[0];
  const history = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[1] !== insoleId) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx];
      if (row[idx] instanceof Date) {
        obj[h] = row[idx].toISOString();
      }
    });
    history.push(obj);
  }

  // Sort newest first
  history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return { success: true, data: history };
}

// ── Write Operations ─────────────────────────────────────────────────────────

function handleAddInsole(data) {
  if (!data) return { success: false, error: 'Missing insole data' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet('Insoles');
    const now = new Date().toISOString();
    const id = data.id || Utilities.getUuid();

    const row = [
      id,                         // A: id
      data.serialNumber || '',    // B: serialNumber
      data.type || 'Core',        // C: type
      data.size || 'C',           // D: size
      data.location || '',        // E: location
      data.enclosure || 'New',    // F: enclosure
      data.pairStatus || 'Both',  // G: pairStatus
      data.notes || '',           // H: notes
      data.dateAdded || now,      // I: dateAdded
      now,                        // J: lastModified
    ];

    sheet.appendRow(row);

    // Log creation in History
    addHistoryEntry(id, 'Created', '', 'New insole added');

    const insole = {
      id, serialNumber: row[1], type: row[2], size: row[3],
      location: row[4], enclosure: row[5], pairStatus: row[6], notes: row[7], dateAdded: row[8],
      lastModified: row[9],
    };

    return { success: true, data: insole };
  } finally {
    lock.releaseLock();
  }
}

function handleUpdateInsole(data) {
  if (!data || !data.id) return { success: false, error: 'Missing insole ID' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet('Insoles');
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    let rowIndex = -1;

    for (let i = 1; i < allData.length; i++) {
      if (allData[i][0] === data.id) {
        rowIndex = i + 1; // 1-based row number
        break;
      }
    }

    if (rowIndex === -1) return { success: false, error: 'Insole not found' };

    // Build old object for diff
    const oldRow = allData[rowIndex - 1];
    const oldObj = {};
    headers.forEach((h, idx) => { oldObj[h] = oldRow[idx]; });

    // Fields that can be updated
    const updatableFields = ['serialNumber', 'type', 'size', 'location', 'enclosure', 'pairStatus', 'notes'];
    const fieldColMap = {};
    headers.forEach((h, idx) => { fieldColMap[h] = idx + 1; }); // 1-based column

    const now = new Date().toISOString();
    const changes = [];

    updatableFields.forEach(field => {
      if (data[field] !== undefined) {
        const oldVal = (oldObj[field] || '').toString();
        const newVal = (data[field] || '').toString();
        if (oldVal !== newVal) {
          changes.push({ field, oldValue: oldVal, newValue: newVal });
          sheet.getRange(rowIndex, fieldColMap[field]).setValue(data[field]);
        }
      }
    });

    // Always update lastModified
    sheet.getRange(rowIndex, fieldColMap['lastModified']).setValue(now);

    // Log each change to History
    changes.forEach(change => {
      addHistoryEntry(data.id, change.field, change.oldValue, change.newValue);
    });

    // Return updated insole
    const updatedRow = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    const updatedObj = {};
    headers.forEach((h, idx) => {
      updatedObj[h] = updatedRow[idx];
      if (updatedRow[idx] instanceof Date) {
        updatedObj[h] = updatedRow[idx].toISOString();
      }
    });

    return { success: true, data: updatedObj, changes: changes.length };
  } finally {
    lock.releaseLock();
  }
}

function handleDeleteInsole(id) {
  if (!id) return { success: false, error: 'Missing insole ID' };

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet('Insoles');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        sheet.deleteRow(i + 1);
        addHistoryEntry(id, 'Deleted', '', 'Insole removed');
        return { success: true };
      }
    }

    return { success: false, error: 'Insole not found' };
  } finally {
    lock.releaseLock();
  }
}

// ── History Helper ───────────────────────────────────────────────────────────

function addHistoryEntry(insoleId, field, oldValue, newValue) {
  const sheet = getSheet('History');
  sheet.appendRow([
    Utilities.getUuid(),
    insoleId,
    new Date().toISOString(),
    field,
    oldValue,
    newValue,
  ]);
}

// ── Debug Helper ─────────────────────────────────────────────────────────────

function handleDebugSheet() {
  const sheet = getSheet('Insoles');
  const data = sheet.getDataRange().getValues();

  return {
    success: true,
    debug: {
      headers: data[0],
      headerCount: data[0].length,
      rows: data.slice(1).map((row, idx) => ({
        rowNumber: idx + 2,
        columnCount: row.length,
        values: row
      }))
    }
  };
}
