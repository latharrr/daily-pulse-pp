  /**
  * Daily Pulse -- Production Google Sheets backend.
  *
  * Architecture: one Google Spreadsheet containing multiple subsheets
  * (Users, Teams, Tasks, Checkins, Checkouts, ActivityLog, AuditLog, Config).
  * This script is a pure CRUD layer: it never hashes or verifies passwords.
  * The Next.js server hashes with bcrypt before writing and compares after
  * reading, so this script only ever stores/returns an opaque PasswordHash.
  *
  * -- Security --
  * Every request must include a `token` field matching the API_TOKEN script
  * property. Set it once via the Apps Script editor:
  *   File > Project properties > Script properties > Add "API_TOKEN"
  * Or run `setApiToken('your-secret-here')` once in the editor.
  *
  * -- Setup --
  * 1. Create a new Google Sheet.
  * 2. Extensions > Apps Script, delete the boilerplate, paste this whole file.
  * 3. Run `setupSheets()` once from the Apps Script editor. Authorize when
  *    prompted. This creates all tabs with headers and seeds one admin account:
  *      username: admin   password: admin123   (change this immediately)
  * 4. Set the API_TOKEN script property (see Security above).
  * 5. Deploy > New deployment > type "Web app".
  *      - Execute as: Me
  *      - Who has access: Anyone
  * 6. Copy the deployment URL into GOOGLE_SCRIPT_URL in your Next.js env.
  * 7. Copy the same API_TOKEN into GOOGLE_SCRIPT_TOKEN in your Next.js env.
  *
  * Re-running `setupSheets()` later is safe -- it only creates tabs/headers that
  * don't already exist and never touches existing rows.
  */

  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================

  const VERSION = '2.0.0';
  const SCHEMA_VERSION = '2025-07-08-v1';

  const SCRIPT_PROP_API_TOKEN = 'API_TOKEN';
  const DEFAULT_PAGE_LIMIT = 100;
  const MAX_PAGE_LIMIT = 1000;
  const LOCK_TIMEOUT_MS = 30000;

  const SHEETS = {
    CONFIG: 'Config',
    USERS: 'Users',
    TEAMS: 'Teams',
    TASKS: 'Tasks',
    CHECKINS: 'Checkins',
    CHECKOUTS: 'Checkouts',
    ACTIVITY: 'ActivityLog',
    AUDIT: 'AuditLog',
  };

  const HEADERS = {
    [SHEETS.CONFIG]: ['Key', 'Value', 'UpdatedAt'],
    [SHEETS.USERS]: ['UserID', 'Name', 'Username', 'Role', 'TeamID', 'PasswordHash', 'Active', 'IsDeleted', 'CreatedAt', 'UpdatedAt'],
    [SHEETS.TEAMS]: ['TeamID', 'TeamName', 'ManagerID', 'IsDeleted', 'CreatedAt', 'UpdatedAt'],
    [SHEETS.TASKS]: ['TaskID', 'UserID', 'Date', 'Title', 'Priority', 'Deadline', 'EstimatedHours', 'Status', 'Progress', 'Notes', 'Blockers', 'CarriedForward', 'IsDeleted', 'CreatedAt', 'UpdatedAt', 'CompletedAt', 'AssignedBy'],
    [SHEETS.CHECKINS]: ['CheckinID', 'UserID', 'Date', 'TaskCount', 'Notes', 'Blockers', 'IdempotencyKey', 'SubmittedAt'],
    [SHEETS.CHECKOUTS]: ['CheckoutID', 'UserID', 'Date', 'CompletedCount', 'PendingCount', 'PostponedCount', 'PostponeReason', 'TomorrowPlan', 'WorkingHours', 'Notes', 'IdempotencyKey', 'SubmittedAt'],
    [SHEETS.ACTIVITY]: ['LogID', 'UserID', 'Action', 'Details', 'Timestamp'],
    [SHEETS.AUDIT]: ['AuditID', 'Timestamp', 'Level', 'Action', 'Details', 'CallerIp'],
  };

  const ROLES = ['admin', 'manager', 'employee'];
  const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
  const TASK_STATUSES = ['planned', 'in_progress', 'blocked', 'waiting_review', 'completed', 'postponed', 'cancelled'];
  const TERMINAL_STATUSES = ['completed', 'cancelled'];

  // Pre-hashed with bcrypt (10 rounds) -- plaintext is "admin123".
  const SEED_ADMIN_PASSWORD_HASH = '$2b$10$E4i.mPQbZxGFXe0fG2XvIeQy.2ZEwFMex5AQKNVe5RkudSKg/d2Pu';

  // ============================================
  // HTTP ENTRY POINTS
  // ============================================

  function doGet(e) {
    const action = e && e.parameter && e.parameter.action ? e.parameter.action : 'ping';
    if (action === 'ping') {
      return jsonResponse({ success: true, data: { status: 'ok', version: VERSION, schema: SCHEMA_VERSION } });
    }
    return jsonResponse({ success: false, error: 'Unknown GET action' }, 400);
  }

  function doOptions() {
    return outputWithCors(jsonResponse({ success: true, data: { status: 'ok' } }));
  }

  function doPost(e) {
    let action = null;
    let data = {};
    let token = null;
    let callerIp = null;

    try {
      const body = JSON.parse(e.postData.contents);
      action = body.action;
      data = body.data || {};
      token = body.token;
      callerIp = e && e.context && e.context.email ? e.context.email : null;
    } catch (err) {
      audit('ERROR', 'Invalid request body', err.message, callerIp);
      return jsonResponse({ success: false, error: 'Invalid request body' }, 400);
    }

    const tokenError = checkToken(token);
    if (tokenError) {
      audit('WARN', 'Unauthorized request', 'Action: ' + action + '. ' + tokenError, callerIp);
      return jsonResponse({ success: false, error: tokenError }, 403);
    }

    try {
      const result = handleRequest(action, data);
      return jsonResponse(result);
    } catch (err) {
      audit('ERROR', 'Unhandled exception in ' + action, err.message + '\n' + (err.stack || ''), callerIp);
      return jsonResponse({ success: false, error: err.message || 'Server error' }, 500);
    }
  }

  function jsonResponse(obj, statusCode) {
    const output = ContentService.createTextOutput(JSON.stringify(obj));
    output.setMimeType(ContentService.MimeType.JSON);
    if (statusCode) {
      try {
        output.setContent(JSON.stringify(Object.assign({}, obj, { statusCode: statusCode })));
      } catch (_) {}
    }
    return outputWithCors(output);
  }

  function outputWithCors(output) {
    return output;
  }

  // ============================================
  // AUTH & AUDIT
  // ============================================

  function checkToken(token) {
    const expected = getScriptProperty(SCRIPT_PROP_API_TOKEN);
    if (!expected) {
      return 'API_TOKEN script property is not configured. Set it before using this backend.';
    }
    if (!token) return 'Missing API token';
    if (String(token) !== String(expected)) return 'Invalid API token';
    return null;
  }

  function getScriptProperty(key) {
    try {
      return PropertiesService.getScriptProperties().getProperty(key);
    } catch (err) {
      return null;
    }
  }

  function setScriptProperty(key, value) {
    PropertiesService.getScriptProperties().setProperty(key, value);
  }

  /**
  * Manual helper: run once in the Apps Script editor to set the API token.
  * Example: setApiToken('my-secret-token')
  */
  function setApiToken(token) {
    if (!token) throw new Error('Token is required');
    setScriptProperty(SCRIPT_PROP_API_TOKEN, token);
    Logger.log('API_TOKEN set. Do not log it again.');
  }

  function audit(level, action, details, callerIp) {
    try {
      appendRow(SHEETS.AUDIT, {
        AuditID: uuid(),
        Timestamp: nowIso(),
        Level: level,
        Action: action,
        Details: String(details || '').substring(0, 2000),
        CallerIp: callerIp || '',
      });
    } catch (_) {
      // Never fail the request because of audit logging.
    }
  }

  // ============================================
  // REQUEST ROUTING & VALIDATION
  // ============================================

  function handleRequest(action, data) {
    if (!action) return { success: false, error: 'Missing action' };

    switch (action) {
      case 'getUserAuth': return getUserAuth(data);
      case 'getUsers': return getUsers(data);
      case 'createUser': return createUser(data);
      case 'updateUser': return updateUser(data);
      case 'deleteUser': return deleteUser(data);
      case 'restoreUser': return restoreUser(data);
      case 'getTeams': return getTeams(data);
      case 'createTeam': return createTeam(data);
      case 'updateTeam': return updateTeam(data);
      case 'deleteTeam': return deleteTeam(data);
      case 'restoreTeam': return restoreTeam(data);
      case 'getTasks': return getTasks(data);
      case 'createTask': return createTask(data);
      case 'updateTask': return updateTask(data);
      case 'deleteTask': return deleteTask(data);
      case 'restoreTask': return restoreTask(data);
      case 'getPendingTasks': return getPendingTasks(data);
      case 'submitCheckin': return submitCheckin(data);
      case 'getCheckins': return getCheckins(data);
      case 'deleteCheckin': return deleteCheckin(data);
      case 'submitCheckout': return submitCheckout(data);
      case 'getCheckouts': return getCheckouts(data);
      case 'deleteCheckout': return deleteCheckout(data);
      case 'getDashboard': return getDashboard(data);
      case 'logActivity': return logActivity(data);
      case 'getActivityLog': return getActivityLog(data);
      case 'getVersion': return { success: true, data: { version: VERSION, schema: SCHEMA_VERSION } };
      default: return { success: false, error: 'Unknown action: ' + action };
    }
  }

  function validate(action, data) {
    const missing = [];
    const invalid = [];

    function requireField(field, label) {
      const val = data[field];
      if (val === undefined || val === null || String(val).trim() === '') {
        missing.push(label || field);
      }
    }

    function requireEnum(field, allowed, label) {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        if (allowed.indexOf(String(data[field])) === -1) {
          invalid.push((label || field) + ' must be one of: ' + allowed.join(', '));
        }
      }
    }

    function requireDate(field, label) {
      if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
        if (!isValidDate(String(data[field]))) {
          invalid.push((label || field) + ' must be a valid date (yyyy-MM-dd)');
        }
      }
    }

    switch (action) {
      case 'getUserAuth':
        requireField('username');
        break;
      case 'createUser':
        requireField('name');
        requireField('username');
        requireField('passwordHash');
        requireEnum('role', ROLES);
        break;
      case 'updateUser':
        requireField('userId');
        requireEnum('role', ROLES);
        break;
      case 'deleteUser':
      case 'restoreUser':
        requireField('userId');
        break;
      case 'createTeam':
        requireField('teamName');
        break;
      case 'updateTeam':
      case 'deleteTeam':
      case 'restoreTeam':
        requireField('teamId');
        break;
      case 'createTask':
        requireField('userId');
        requireField('title');
        requireEnum('priority', PRIORITIES);
        requireDate('deadline');
        break;
      case 'updateTask':
      case 'deleteTask':
      case 'restoreTask':
        requireField('taskId');
        requireEnum('status', TASK_STATUSES);
        requireEnum('priority', PRIORITIES);
        requireDate('deadline');
        break;
      case 'getPendingTasks':
        requireField('userId');
        break;
      case 'submitCheckin':
        requireField('userId');
        break;
      case 'submitCheckout':
        requireField('userId');
        break;
      case 'deleteCheckin':
        requireField('checkinId');
        break;
      case 'deleteCheckout':
        requireField('checkoutId');
        break;
      case 'logActivity':
        requireField('userId');
        requireField('action');
        break;
    }

    if (missing.length > 0) return 'Missing required fields: ' + missing.join(', ');
    if (invalid.length > 0) return 'Invalid fields: ' + invalid.join('; ');
    return null;
  }

  // ============================================
  // SHEET HELPERS
  // ============================================

  function getSpreadsheet() {
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  function getSheet(name) {
    const sheet = getSpreadsheet().getSheetByName(name);
    if (!sheet) throw new Error('Sheet "' + name + '" not found -- run setupSheets() first.');
    return sheet;
  }

  function ensureSheet(name) {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    return sheet;
  }

  function readAll(sheetName, options) {
    options = options || {};
    const sheet = getSheet(sheetName);
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) return { rows: [], headers: values[0] || [] };
    const headers = values[0];
    const rows = values.slice(1)
      .map(function (row, index) {
        const obj = { _rowNumber: index + 2 };
        headers.forEach(function (h, i) { obj[h] = row[i]; });
        return obj;
      })
      .filter(function (row) {
        return Object.keys(row).some(function (key) {
          if (key === '_rowNumber') return false;
          return row[key] !== '' && row[key] !== null && row[key] !== undefined;
        });
      });
    return { rows: rows, headers: headers };
  }

  function readRows(sheetName, options) {
    options = options || {};
    const { rows, headers } = readAll(sheetName);
    let result = rows.slice();

    if (options.excludeDeleted !== false && headers.indexOf('IsDeleted') !== -1) {
      result = result.filter(function (r) { return r.IsDeleted !== true && r.IsDeleted !== 'true' && r.IsDeleted !== 1 && r.IsDeleted !== '1'; });
    }

    if (options.filters) {
      Object.keys(options.filters).forEach(function (key) {
        const val = options.filters[key];
        if (val === undefined || val === null || val === '') return;
        result = result.filter(function (r) { return String(r[key]) === String(val); });
      });
    }

    if (options.sortBy) {
      const dir = options.sortOrder === 'asc' ? 1 : -1;
      result.sort(function (a, b) {
        const av = a[options.sortBy];
        const bv = b[options.sortBy];
        if (av === bv) return 0;
        if (av === undefined || av === null || av === '') return 1;
        if (bv === undefined || bv === null || bv === '') return -1;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return (String(av) > String(bv) ? 1 : -1) * dir;
      });
    }

    const total = result.length;
    const limit = clampPageLimit(options.limit);
    const offset = Math.max(0, parseInt(options.offset || 0, 10) || 0);
    const paginated = result.slice(offset, offset + limit);

    return {
      rows: paginated,
      meta: { total: total, limit: limit, offset: offset },
    };
  }

  function appendRow(sheetName, obj) {
    const sheet = getSheet(sheetName);
    const headers = HEADERS[sheetName];
    const row = headers.map(function (h) {
      return obj[h] !== undefined && obj[h] !== null ? obj[h] : '';
    });
    sheet.appendRow(row);
    return sheet.getLastRow();
  }

  function findRowNumber(sheetName, idColumn, idValue) {
    const sheet = getSheet(sheetName);
    const headers = HEADERS[sheetName];
    const colIndex = headers.indexOf(idColumn);
    const values = sheet.getDataRange().getValues();
    for (let r = 1; r < values.length; r++) {
      if (values[r][colIndex] === idValue) return r + 1;
    }
    return -1;
  }

  function findRowByFilter(sheetName, filters) {
    const { rows } = readAll(sheetName);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let match = true;
      Object.keys(filters).forEach(function (key) {
        if (String(row[key]) !== String(filters[key])) match = false;
      });
      if (match) return row;
    }
    return null;
  }

  function updateRow(sheetName, rowNumber, fields) {
    const sheet = getSheet(sheetName);
    const headers = HEADERS[sheetName];
    Object.keys(fields).forEach(function (key) {
      const colIndex = headers.indexOf(key);
      if (colIndex === -1) return;
      sheet.getRange(rowNumber, colIndex + 1).setValue(fields[key]);
    });
  }

  function rowAsObject(sheetName, rowNumber) {
    const sheet = getSheet(sheetName);
    const headers = HEADERS[sheetName];
    const values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
    const obj = {};
    headers.forEach(function (h, i) { obj[h] = values[i]; });
    return obj;
  }

  function deleteRow(sheetName, rowNumber) {
    const sheet = getSheet(sheetName);
    sheet.deleteRow(rowNumber);
  }

  function withLock(fn) {
    const lock = LockService.getScriptLock();
    try {
      const gotLock = lock.tryLock(LOCK_TIMEOUT_MS);
      if (!gotLock) throw new Error('Server busy -- could not acquire lock');
      return fn();
    } finally {
      try { lock.releaseLock(); } catch (_) {}
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  function uuid() {
    return Utilities.getUuid();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function todayStr() {
    return Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  }

  function yesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return Utilities.formatDate(d, 'UTC', 'yyyy-MM-dd');
  }

  function isValidDate(str) {
    if (!str) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    const d = new Date(str);
    return !isNaN(d.getTime());
  }

  function clampPageLimit(limit) {
    const n = parseInt(limit, 10) || DEFAULT_PAGE_LIMIT;
    if (n < 1) return DEFAULT_PAGE_LIMIT;
    if (n > MAX_PAGE_LIMIT) return MAX_PAGE_LIMIT;
    return n;
  }

  function toBool(val) {
    if (val === true || val === 'true' || val === 1 || val === '1') return true;
    return false;
  }

  function toNumber(val, fallback) {
    const n = Number(val);
    return isNaN(n) ? fallback : n;
  }

  function sanitizeUser(user) {
    if (!user) return user;
    const copy = Object.assign({}, user);
    delete copy.PasswordHash;
    return copy;
  }

  function buildSuccessResponse(payload, meta) {
    const resp = { success: true };
    Object.keys(payload).forEach(function (key) { resp[key] = payload[key]; });
    if (meta) resp.meta = meta;
    return resp;
  }

  // ============================================
  // USERS
  // ============================================

  function getUserAuth(data) {
    const err = validate('getUserAuth', data);
    if (err) return { success: false, error: err };

    const { rows } = readAll(SHEETS.USERS);
    const user = rows.find(function (u) { return u.Username === data.username; });
    if (!user || toBool(user.IsDeleted)) return { success: false, error: 'Invalid credentials' };
    if (!toBool(user.Active)) return { success: false, error: 'Invalid credentials' };

    return { success: true, user: user };
  }

  function getUsers(data) {
    data = data || {};
    const filters = {};
    if (data.teamId) filters.TeamID = data.teamId;
    if (data.role) filters.Role = data.role;

    let { rows, meta } = readRows(SHEETS.USERS, {
      filters: filters,
      excludeDeleted: true,
      limit: data.limit,
      offset: data.offset,
      sortBy: data.sortBy || 'Name',
      sortOrder: data.sortOrder || 'asc',
    });

    if (data.activeOnly) {
      rows = rows.filter(function (u) { return toBool(u.Active); });
      meta.total = rows.length;
    }

    return buildSuccessResponse({ users: rows.map(sanitizeUser) }, meta);
  }

  function createUser(data) {
    const err = validate('createUser', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const existing = findRowByFilter(SHEETS.USERS, { Username: data.username });
      if (existing && !toBool(existing.IsDeleted)) {
        return { success: false, error: 'Username already exists' };
      }

      const user = {
        UserID: uuid(),
        Name: String(data.name).trim(),
        Username: String(data.username).trim().toLowerCase(),
        Role: data.role || 'employee',
        TeamID: data.teamId || '',
        PasswordHash: data.passwordHash,
        Active: true,
        IsDeleted: false,
        CreatedAt: nowIso(),
        UpdatedAt: nowIso(),
      };
      appendRow(SHEETS.USERS, user);
      logActivity({ userId: user.UserID, action: 'USER_CREATED', details: 'Username: ' + user.Username });
      return buildSuccessResponse({ user: sanitizeUser(user) });
    });
  }

  function updateUser(data) {
    const err = validate('updateUser', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const rowNum = findRowNumber(SHEETS.USERS, 'UserID', data.userId);
      if (rowNum === -1) return { success: false, error: 'User not found' };

      const fields = { UpdatedAt: nowIso() };
      if (data.name !== undefined) fields.Name = String(data.name).trim();
      if (data.teamId !== undefined) fields.TeamID = data.teamId;
      if (data.role !== undefined) fields.Role = data.role;
      if (data.active !== undefined) fields.Active = toBool(data.active);
      if (data.passwordHash !== undefined) fields.PasswordHash = data.passwordHash;
      updateRow(SHEETS.USERS, rowNum, fields);

      const updated = rowAsObject(SHEETS.USERS, rowNum);
      logActivity({ userId: updated.UserID, action: 'USER_UPDATED', details: 'Fields: ' + Object.keys(fields).join(', ') });
      return buildSuccessResponse({ user: sanitizeUser(updated) });
    });
  }

  function deleteUser(data) {
    const err = validate('deleteUser', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const rowNum = findRowNumber(SHEETS.USERS, 'UserID', data.userId);
      if (rowNum === -1) return { success: false, error: 'User not found' };
      updateRow(SHEETS.USERS, rowNum, { IsDeleted: true, Active: false, UpdatedAt: nowIso() });
      logActivity({ userId: data.userId, action: 'USER_DELETED', details: '' });
      return { success: true, message: 'User deleted' };
    });
  }

  function restoreUser(data) {
    const err = validate('restoreUser', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const rowNum = findRowNumber(SHEETS.USERS, 'UserID', data.userId);
      if (rowNum === -1) return { success: false, error: 'User not found' };
      updateRow(SHEETS.USERS, rowNum, { IsDeleted: false, UpdatedAt: nowIso() });
      logActivity({ userId: data.userId, action: 'USER_RESTORED', details: '' });
      return { success: true, message: 'User restored' };
    });
  }

  // ============================================
  // TEAMS
  // ============================================

  function getTeams(data) {
    data = data || {};
    const { rows, meta } = readRows(SHEETS.TEAMS, {
      excludeDeleted: true,
      limit: data.limit,
      offset: data.offset,
      sortBy: data.sortBy || 'TeamName',
      sortOrder: data.sortOrder || 'asc',
    });
    return buildSuccessResponse({ teams: rows }, meta);
  }

  function createTeam(data) {
    const err = validate('createTeam', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const team = {
        TeamID: uuid(),
        TeamName: String(data.teamName).trim(),
        ManagerID: data.managerId || '',
        IsDeleted: false,
        CreatedAt: nowIso(),
        UpdatedAt: nowIso(),
      };
      appendRow(SHEETS.TEAMS, team);
      logActivity({ userId: data.managerId || '', action: 'TEAM_CREATED', details: 'Team: ' + team.TeamName });
      return buildSuccessResponse({ team: team });
    });
  }

  function updateTeam(data) {
    const err = validate('updateTeam', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const rowNum = findRowNumber(SHEETS.TEAMS, 'TeamID', data.teamId);
      if (rowNum === -1) return { success: false, error: 'Team not found' };

      const fields = { UpdatedAt: nowIso() };
      if (data.teamName !== undefined) fields.TeamName = String(data.teamName).trim();
      if (data.managerId !== undefined) fields.ManagerID = data.managerId;
      updateRow(SHEETS.TEAMS, rowNum, fields);

      const updated = rowAsObject(SHEETS.TEAMS, rowNum);
      logActivity({ userId: data.managerId || '', action: 'TEAM_UPDATED', details: 'Team: ' + updated.TeamName });
      return buildSuccessResponse({ team: updated });
    });
  }

  function deleteTeam(data) {
    const err = validate('deleteTeam', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const rowNum = findRowNumber(SHEETS.TEAMS, 'TeamID', data.teamId);
      if (rowNum === -1) return { success: false, error: 'Team not found' };
      updateRow(SHEETS.TEAMS, rowNum, { IsDeleted: true, UpdatedAt: nowIso() });
      logActivity({ userId: '', action: 'TEAM_DELETED', details: 'TeamID: ' + data.teamId });
      return { success: true, message: 'Team deleted' };
    });
  }

  function restoreTeam(data) {
    const err = validate('restoreTeam', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const rowNum = findRowNumber(SHEETS.TEAMS, 'TeamID', data.teamId);
      if (rowNum === -1) return { success: false, error: 'Team not found' };
      updateRow(SHEETS.TEAMS, rowNum, { IsDeleted: false, UpdatedAt: nowIso() });
      logActivity({ userId: '', action: 'TEAM_RESTORED', details: 'TeamID: ' + data.teamId });
      return { success: true, message: 'Team restored' };
    });
  }

  // ============================================
  // TASKS
  // ============================================

  function getTasks(data) {
    data = data || {};
    const filters = {};
    if (data.userId) filters.UserID = data.userId;
    if (data.date) filters.Date = data.date;
    if (data.status) filters.Status = data.status;
    if (data.priority) filters.Priority = data.priority;

    const { rows, meta } = readRows(SHEETS.TASKS, {
      filters: filters,
      excludeDeleted: true,
      limit: data.limit,
      offset: data.offset,
      sortBy: data.sortBy || 'CreatedAt',
      sortOrder: data.sortOrder || 'desc',
    });
    return buildSuccessResponse({ tasks: rows }, meta);
  }

  function createTask(data) {
    const err = validate('createTask', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const task = {
        TaskID: uuid(),
        UserID: data.userId,
        Date: data.date || todayStr(),
        Title: String(data.title).trim(),
        Priority: data.priority || 'medium',
        Deadline: data.deadline || '',
        EstimatedHours: toNumber(data.estimatedHours, 0),
        Status: data.status || 'planned',
        Progress: toNumber(data.progress, 0),
        Notes: data.notes || '',
        Blockers: data.blockers || '',
        CarriedForward: toBool(data.carriedForward),
        IsDeleted: false,
        CreatedAt: nowIso(),
        UpdatedAt: nowIso(),
        CompletedAt: '',
        AssignedBy: data.assignedBy || data.userId,
      };
      appendRow(SHEETS.TASKS, task);
      logActivity({ userId: data.userId, action: 'TASK_CREATED', details: 'Task: ' + task.Title });
      return buildSuccessResponse({ task: task });
    });
  }

  function updateTask(data) {
    const err = validate('updateTask', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const rowNum = findRowNumber(SHEETS.TASKS, 'TaskID', data.taskId);
      if (rowNum === -1) return { success: false, error: 'Task not found' };

      const fields = { UpdatedAt: nowIso() };
      if (data.title !== undefined) fields.Title = String(data.title).trim();
      if (data.priority !== undefined) fields.Priority = data.priority;
      if (data.deadline !== undefined) fields.Deadline = data.deadline;
      if (data.estimatedHours !== undefined) fields.EstimatedHours = toNumber(data.estimatedHours, 0);
      if (data.status !== undefined) fields.Status = data.status;
      if (data.progress !== undefined) fields.Progress = toNumber(data.progress, 0);
      if (data.notes !== undefined) fields.Notes = data.notes;
      if (data.blockers !== undefined) fields.Blockers = data.blockers;
      if (data.carriedForward !== undefined) fields.CarriedForward = toBool(data.carriedForward);

      if (data.status === 'completed') {
        fields.CompletedAt = nowIso();
        fields.Progress = 100;
      } else if (data.status === 'cancelled') {
        fields.CompletedAt = '';
      }

      updateRow(SHEETS.TASKS, rowNum, fields);

      const updated = rowAsObject(SHEETS.TASKS, rowNum);
      logActivity({ userId: data.userId || updated.UserID, action: 'TASK_UPDATED', details: 'TaskID: ' + updated.TaskID });
      return buildSuccessResponse({ task: updated });
    });
  }

  function deleteTask(data) {
    const err = validate('deleteTask', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const rowNum = findRowNumber(SHEETS.TASKS, 'TaskID', data.taskId);
      if (rowNum === -1) return { success: false, error: 'Task not found' };
      updateRow(SHEETS.TASKS, rowNum, { IsDeleted: true, UpdatedAt: nowIso() });
      logActivity({ userId: data.userId || '', action: 'TASK_DELETED', details: 'TaskID: ' + data.taskId });
      return { success: true, message: 'Task deleted' };
    });
  }

  function restoreTask(data) {
    const err = validate('restoreTask', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const rowNum = findRowNumber(SHEETS.TASKS, 'TaskID', data.taskId);
      if (rowNum === -1) return { success: false, error: 'Task not found' };
      updateRow(SHEETS.TASKS, rowNum, { IsDeleted: false, UpdatedAt: nowIso() });
      logActivity({ userId: data.userId || '', action: 'TASK_RESTORED', details: 'TaskID: ' + data.taskId });
      return { success: true, message: 'Task restored' };
    });
  }

  function getPendingTasks(data) {
    const err = validate('getPendingTasks', data);
    if (err) return { success: false, error: err };

    const yesterday = yesterdayStr();
    const { rows } = readAll(SHEETS.TASKS);
    const tasks = rows.filter(function (t) {
      return t.UserID === data.userId &&
            t.Date === yesterday &&
            !toBool(t.IsDeleted) &&
            TERMINAL_STATUSES.indexOf(t.Status) === -1;
    });
    return buildSuccessResponse({ tasks: tasks, date: yesterday });
  }

  // ============================================
  // CHECKINS
  // ============================================

  function submitCheckin(data) {
    const err = validate('submitCheckin', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const today = todayStr();
      const key = data.idempotencyKey || '';

      if (key) {
        const existing = findRowByFilter(SHEETS.CHECKINS, { IdempotencyKey: key });
        if (existing) return buildSuccessResponse({ checkin: existing, cached: true });
      }

      const dup = findRowByFilter(SHEETS.CHECKINS, { UserID: data.userId, Date: today });
      if (dup) return { success: false, error: 'Already checked in today' };

      const checkin = {
        CheckinID: uuid(),
        UserID: data.userId,
        Date: today,
        TaskCount: toNumber(data.taskCount, 0),
        Notes: data.notes || '',
        Blockers: data.blockers || '',
        IdempotencyKey: key,
        SubmittedAt: nowIso(),
      };
      appendRow(SHEETS.CHECKINS, checkin);
      logActivity({ userId: data.userId, action: 'CHECKIN_SUBMITTED', details: 'Date: ' + today });
      return buildSuccessResponse({ checkin: checkin });
    });
  }

  function getCheckins(data) {
    data = data || {};
    const filters = {};
    if (data.userId) filters.UserID = data.userId;
    if (data.date) filters.Date = data.date;

    const { rows, meta } = readRows(SHEETS.CHECKINS, {
      filters: filters,
      limit: data.limit,
      offset: data.offset,
      sortBy: data.sortBy || 'SubmittedAt',
      sortOrder: data.sortOrder || 'desc',
    });
    return buildSuccessResponse({ checkins: rows }, meta);
  }

  function deleteCheckin(data) {
    const err = validate('deleteCheckin', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const rowNum = findRowNumber(SHEETS.CHECKINS, 'CheckinID', data.checkinId);
      if (rowNum === -1) return { success: false, error: 'Checkin not found' };
      deleteRow(SHEETS.CHECKINS, rowNum);
      logActivity({ userId: data.userId || '', action: 'CHECKIN_DELETED', details: 'CheckinID: ' + data.checkinId });
      return { success: true, message: 'Checkin deleted' };
    });
  }

  // ============================================
  // CHECKOUTS
  // ============================================

  function submitCheckout(data) {
    const err = validate('submitCheckout', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const today = todayStr();
      const key = data.idempotencyKey || '';

      if (key) {
        const existing = findRowByFilter(SHEETS.CHECKOUTS, { IdempotencyKey: key });
        if (existing) return buildSuccessResponse({ checkout: existing, cached: true });
      }

      const dup = findRowByFilter(SHEETS.CHECKOUTS, { UserID: data.userId, Date: today });
      if (dup) return { success: false, error: 'Already checked out today' };

      const checkout = {
        CheckoutID: uuid(),
        UserID: data.userId,
        Date: today,
        CompletedCount: toNumber(data.completedCount, 0),
        PendingCount: toNumber(data.pendingCount, 0),
        PostponedCount: toNumber(data.postponedCount, 0),
        PostponeReason: data.postponeReason || '',
        TomorrowPlan: data.tomorrowPlan || '',
        WorkingHours: toNumber(data.workingHours, 0),
        Notes: data.notes || '',
        IdempotencyKey: key,
        SubmittedAt: nowIso(),
      };
      appendRow(SHEETS.CHECKOUTS, checkout);
      logActivity({ userId: data.userId, action: 'CHECKOUT_SUBMITTED', details: 'Date: ' + today });
      return buildSuccessResponse({ checkout: checkout });
    });
  }

  function getCheckouts(data) {
    data = data || {};
    const filters = {};
    if (data.userId) filters.UserID = data.userId;
    if (data.date) filters.Date = data.date;

    const { rows, meta } = readRows(SHEETS.CHECKOUTS, {
      filters: filters,
      limit: data.limit,
      offset: data.offset,
      sortBy: data.sortBy || 'SubmittedAt',
      sortOrder: data.sortOrder || 'desc',
    });
    return buildSuccessResponse({ checkouts: rows }, meta);
  }

  function deleteCheckout(data) {
    const err = validate('deleteCheckout', data);
    if (err) return { success: false, error: err };

    return withLock(function () {
      const rowNum = findRowNumber(SHEETS.CHECKOUTS, 'CheckoutID', data.checkoutId);
      if (rowNum === -1) return { success: false, error: 'Checkout not found' };
      deleteRow(SHEETS.CHECKOUTS, rowNum);
      logActivity({ userId: data.userId || '', action: 'CHECKOUT_DELETED', details: 'CheckoutID: ' + data.checkoutId });
      return { success: true, message: 'Checkout deleted' };
    });
  }

  // ============================================
  // DASHBOARD
  // ============================================

  function getDashboard(data) {
    data = data || {};
    const today = todayStr();

    const { rows: allUsers } = readAll(SHEETS.USERS);
    let teamUsers = allUsers.filter(function (u) {
      return toBool(u.Active) && u.Role !== 'admin' && !toBool(u.IsDeleted);
    });
    if (data.teamId) teamUsers = teamUsers.filter(function (u) { return u.TeamID === data.teamId; });

    const teamUserIds = teamUsers.map(function (u) { return u.UserID; });

    const { rows: allCheckins } = readAll(SHEETS.CHECKINS);
    const todayCheckins = allCheckins.filter(function (c) {
      return c.Date === today && teamUserIds.indexOf(c.UserID) !== -1;
    });
    const checkedInIds = todayCheckins.map(function (c) { return c.UserID; });

    const { rows: allTasks } = readAll(SHEETS.TASKS);
    const todayTasks = allTasks.filter(function (t) {
      return t.Date === today && teamUserIds.indexOf(t.UserID) !== -1 && !toBool(t.IsDeleted);
    });

    const completed = todayTasks.filter(function (t) { return t.Status === 'completed'; }).length;
    const pending = todayTasks.filter(function (t) {
      return ['planned', 'in_progress', 'waiting_review'].indexOf(t.Status) !== -1;
    }).length;
    const blocked = todayTasks.filter(function (t) { return t.Status === 'blocked'; }).length;
    const postponed = todayTasks.filter(function (t) { return t.Status === 'postponed'; }).length;
    const delayed = todayTasks.filter(function (t) {
      if (!t.Deadline) return false;
      return new Date(t.Deadline) < new Date() && TERMINAL_STATUSES.indexOf(t.Status) === -1;
    }).length;

    const members = teamUsers.map(function (u) {
      const isCheckedIn = checkedInIds.indexOf(u.UserID) !== -1;
      const userTasks = todayTasks.filter(function (t) { return t.UserID === u.UserID; });
      const currentTask = userTasks.find(function (t) {
        return t.Notes && String(t.Notes).indexOf('[Focus]') === 0;
      }) || userTasks[0] || null;

      return {
        checkedIn: isCheckedIn,
        currentTask: currentTask ? currentTask.Title : null,
        currentTaskStatus: currentTask ? currentTask.Status : null,
        currentTaskProgress: currentTask ? currentTask.Progress : null,
        currentTaskNotes: currentTask ? currentTask.Notes : null,
        taskCount: userTasks.length,
        completedCount: userTasks.filter(function (t) { return t.Status === 'completed'; }).length,
        pendingCount: userTasks.filter(function (t) {
          return ['planned', 'in_progress', 'waiting_review'].indexOf(t.Status) !== -1;
        }).length,
        user: sanitizeUser(u),
      };
    });

    return buildSuccessResponse({
      dashboard: {
        totalMembers: members.length,
        checkedIn: checkedInIds.length,
        notCheckedIn: members.filter(function (m) { return !m.checkedIn; }).length,
        totalTasks: todayTasks.length,
        completed: completed,
        pending: pending,
        blocked: blocked,
        postponed: postponed,
        delayed: delayed,
        completionRate: todayTasks.length > 0 ? Math.round((completed / todayTasks.length) * 100) : 0,
        members: members,
        notCheckedInList: members.filter(function (m) { return !m.checkedIn; }),
        todayTasks: todayTasks,
      },
    });
  }

  // ============================================
  // ACTIVITY LOG
  // ============================================

  function logActivity(data) {
    const log = {
      LogID: uuid(),
      UserID: data.userId || '',
      Action: data.action || '',
      Details: String(data.details || '').substring(0, 2000),
      Timestamp: nowIso(),
    };
    appendRow(SHEETS.ACTIVITY, log);
    return buildSuccessResponse({ log: log });
  }

  function getActivityLog(data) {
    data = data || {};
    const filters = {};
    if (data.userId) filters.UserID = data.userId;

    let { rows, meta } = readRows(SHEETS.ACTIVITY, {
      filters: filters,
      limit: data.limit,
      offset: data.offset,
      sortBy: data.sortBy || 'Timestamp',
      sortOrder: data.sortOrder || 'desc',
    });

    if (data.date) {
      rows = rows.filter(function (l) { return String(l.Timestamp).indexOf(data.date) === 0; });
      meta.total = rows.length;
    }

    return buildSuccessResponse({ logs: rows }, meta);
  }

  // ============================================
  // SETUP & MAINTENANCE
  // ============================================

  function setupSheets() {
    const ss = getSpreadsheet();

    Object.keys(HEADERS).forEach(function (name) {
      let sheet = ss.getSheetByName(name);
      if (!sheet) {
        sheet = ss.insertSheet(name);
        Logger.log('Created sheet: ' + name);
      }
      if (sheet.getLastRow() === 0) {
        const headers = HEADERS[name];
        sheet.appendRow(headers);
        sheet.setFrozenRows(1);
        formatHeaderRow(sheet, headers.length);
        applyColumnFormats(sheet, name);
      }
    });

    const defaultSheet = ss.getSheetByName('Sheet1');
    if (defaultSheet && defaultSheet.getLastRow() === 0) {
      ss.deleteSheet(defaultSheet);
    }

    const { rows: users } = readAll(SHEETS.USERS);
    if (users.length === 0) {
      appendRow(SHEETS.USERS, {
        UserID: uuid(),
        Name: 'Admin',
        Username: 'admin',
        Role: 'admin',
        TeamID: '',
        PasswordHash: SEED_ADMIN_PASSWORD_HASH,
        Active: true,
        IsDeleted: false,
        CreatedAt: nowIso(),
        UpdatedAt: nowIso(),
      });
      Logger.log('Seeded admin account -- username: admin, password: admin123. Change this after first login.');
    }

    setConfig('schemaVersion', SCHEMA_VERSION);
    setConfig('setupAt', nowIso());
    setConfig('version', VERSION);

    Logger.log('Setup complete. Version: ' + VERSION);
  }

  function formatHeaderRow(sheet, numCols) {
    const range = sheet.getRange(1, 1, 1, numCols);
    range.setFontWeight('bold');
    range.setBackground('#e5e7eb');
  }

  function applyColumnFormats(sheet, sheetName) {
    const headers = HEADERS[sheetName];
    headers.forEach(function (header, index) {
      const col = index + 1;
      if (header.indexOf('At') !== -1 || header === 'Timestamp' || header === 'SubmittedAt' || header === 'CompletedAt' || header === 'CreatedAt' || header === 'UpdatedAt') {
        sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
      }
      if (header === 'Date' || header === 'Deadline') {
        sheet.getRange(2, col, sheet.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd');
      }
    });
  }

  function setConfig(key, value) {
    const sheet = getSheet(SHEETS.CONFIG);
    const values = sheet.getDataRange().getValues();
    for (let r = 1; r < values.length; r++) {
      if (values[r][0] === key) {
        sheet.getRange(r + 1, 2).setValue(value);
        sheet.getRange(r + 1, 3).setValue(nowIso());
        return;
      }
    }
    appendRow(SHEETS.CONFIG, { Key: key, Value: value, UpdatedAt: nowIso() });
  }

  function getConfig(key) {
    const sheet = getSheet(SHEETS.CONFIG);
    const values = sheet.getDataRange().getValues();
    for (let r = 1; r < values.length; r++) {
      if (values[r][0] === key) return values[r][1];
    }
    return null;
  }
