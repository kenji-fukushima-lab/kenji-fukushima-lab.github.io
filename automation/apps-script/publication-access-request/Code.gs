const CONFIG = Object.freeze({
  TIME_ZONE: "Asia/Tokyo",
  REQUESTS_SHEET_NAME: "Requests",
  REQUESTS_SPREADSHEET_TITLE: "KFLAB Publication Access Requests",
  RESEARCHMAP_URL: "https://researchmap.jp/kenji_fukushima/published_papers?lang=en",
  DOWNLOAD_PASSWORD_PROPERTY: "DOWNLOAD_PASSWORD",
  TOKEN_VALID_HOURS: 24,
  MAX_REQUESTS_PER_ADDRESS_PER_DAY: 1,
  MAX_REQUESTS_PER_DAY: 100,
  RETENTION_DAYS: 365,
  SENDER_NAME: "Fukushima Lab",
});

const HEADERS = Object.freeze([
  "submitted_at",
  "request_date_jst",
  "name",
  "affiliation",
  "email",
  "email_hash",
  "token_hash",
  "token_expires_at",
  "verified_at",
  "access_sent_at",
  "status",
]);

const COL = Object.freeze({
  SUBMITTED_AT: 1,
  REQUEST_DATE: 2,
  NAME: 3,
  AFFILIATION: 4,
  EMAIL: 5,
  EMAIL_HASH: 6,
  TOKEN_HASH: 7,
  TOKEN_EXPIRES_AT: 8,
  VERIFIED_AT: 9,
  ACCESS_SENT_AT: 10,
  STATUS: 11,
});

/**
 * Creates the private request log owned by the deploying account.
 * Run this once from the Apps Script editor before deploying the web app.
 */
function setup() {
  const sheet = getRequestSheet_();
  return sheet.getParent().getUrl();
}

/**
 * Handles verification links and a simple service-status page.
 */
function doGet(e) {
  const token = String((e && e.parameter && e.parameter.token) || "").trim();
  if (!token) {
    return renderPage_("Fukushima Lab publication access", "<p>This service verifies email addresses for publication-access requests.</p>");
  }

  return verifyTokenAndSendAccess_(token);
}

/**
 * Accepts a URL-encoded form submission from the laboratory website.
 */
function doPost(e) {
  try {
    const params = (e && e.parameter) || {};

    // Honeypot. Browsers leave this hidden field empty; basic bots often do not.
    if (String(params.website || "").trim()) {
      return renderRequestAccepted_();
    }
    if (String(params.consent || "") !== "yes") {
      throw new Error("Consent is required");
    }

    const request = normalizeRequest_(params);
    validateRequest_(request);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    let sheet;
    let rowNumber;
    let token;
    try {
      sheet = getRequestSheet_();
      purgeOldRows_(sheet);

      const today = formatRequestDate_(new Date());
      const existingCounts = countRequestsForDate_(sheet, today, request.email);
      if (existingCounts.forAddress >= CONFIG.MAX_REQUESTS_PER_ADDRESS_PER_DAY || existingCounts.total >= CONFIG.MAX_REQUESTS_PER_DAY) {
        return renderRequestAccepted_();
      }

      token = createToken_();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + CONFIG.TOKEN_VALID_HOURS * 60 * 60 * 1000);

      sheet.appendRow([
        now,
        today,
        request.name,
        request.affiliation,
        request.email,
        sha256_(request.email),
        sha256_(token),
        expiresAt,
        "",
        "",
        "verification_pending",
      ]);
      rowNumber = sheet.getLastRow();
    } finally {
      lock.releaseLock();
    }

    try {
      sendVerificationEmail_(request, token);
      sheet.getRange(rowNumber, COL.STATUS).setValue("verification_sent");
    } catch (error) {
      sheet.getRange(rowNumber, COL.STATUS).setValue("verification_error");
      throw error;
    }

    return renderRequestAccepted_();
  } catch (error) {
    console.error(error);
    return renderPage_("Request could not be processed", "<p>Please check the information you entered and try again later.</p>");
  }
}

function verifyTokenAndSendAccess_(token) {
  const tokenHash = sha256_(token);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  let sheet;
  let rowNumber;
  let request;
  try {
    sheet = getRequestSheet_();
    rowNumber = findRowByTokenHash_(sheet, tokenHash);
    if (!rowNumber) {
      return renderInvalidLink_();
    }

    const row = sheet.getRange(rowNumber, 1, 1, HEADERS.length).getValues()[0];
    const status = String(row[COL.STATUS - 1]);
    const expiresAt = new Date(row[COL.TOKEN_EXPIRES_AT - 1]);

    if (status === "access_sent") {
      return renderPage_("Email address already verified", "<p>The publication-access information has already been sent to this address.</p>");
    }
    if (status !== "verification_sent" || Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      return renderInvalidLink_();
    }

    request = {
      name: String(row[COL.NAME - 1]),
      affiliation: String(row[COL.AFFILIATION - 1]),
      email: String(row[COL.EMAIL - 1]),
    };
    sheet.getRange(rowNumber, COL.STATUS).setValue("sending_access");
  } finally {
    lock.releaseLock();
  }

  try {
    sendAccessEmail_(request);
    const sentAt = new Date();
    sheet.getRange(rowNumber, COL.VERIFIED_AT, 1, 3).setValues([[sentAt, sentAt, "access_sent"]]);
  } catch (error) {
    sheet.getRange(rowNumber, COL.STATUS).setValue("verification_sent");
    console.error(error);
    return renderPage_("Email could not be sent", "<p>Please wait a few minutes and open the verification link again.</p>");
  }

  return renderPage_("Email address verified", "<p>Publication-access information has been sent to your email address.</p>");
}

function normalizeRequest_(params) {
  return {
    name: collapseWhitespace_(params.name),
    affiliation: collapseWhitespace_(params.affiliation),
    email: String(params.email || "")
      .trim()
      .toLowerCase(),
  };
}

function validateRequest_(request) {
  if (request.name.length < 2 || request.name.length > 120) {
    throw new Error("Invalid name");
  }
  if (request.affiliation.length < 2 || request.affiliation.length > 200) {
    throw new Error("Invalid affiliation");
  }
  if (request.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(request.email)) {
    throw new Error("Invalid email address");
  }
}

function sendVerificationEmail_(request, token) {
  const serviceUrl = ScriptApp.getService().getUrl();
  if (!serviceUrl) {
    throw new Error("Deploy the script as a web app before accepting requests");
  }

  const verificationUrl = `${serviceUrl}?token=${encodeURIComponent(token)}`;
  const subject = "Confirm your email address – Fukushima Lab publication access";
  const plainBody = [
    `Dear ${request.name},`,
    "",
    "We received a request for access to publication files from the Fukushima Lab website.",
    "Please confirm your email address by opening the following link within 24 hours:",
    "",
    verificationUrl,
    "",
    "If you did not submit this request, you can ignore this message.",
    "",
    "Fukushima Lab",
    "National Institute of Genetics",
  ].join("\n");
  const htmlBody = [
    `<p>Dear ${escapeHtml_(request.name)},</p>`,
    "<p>We received a request for access to publication files from the Fukushima Lab website.</p>",
    "<p>Please confirm your email address by opening the following link within 24 hours:</p>",
    `<p><a href="${escapeHtml_(verificationUrl)}" style="display:inline-block;padding:10px 16px;background:#1769aa;color:#fff;text-decoration:none;border-radius:4px">Confirm email address</a></p>`,
    "<p>If you did not submit this request, you can ignore this message.</p>",
    "<p>Fukushima Lab<br>National Institute of Genetics</p>",
  ].join("");

  MailApp.sendEmail({
    to: request.email,
    subject,
    body: plainBody,
    htmlBody,
    name: CONFIG.SENDER_NAME,
  });
}

function sendAccessEmail_(request) {
  const downloadPassword = getDownloadPassword_();
  const subject = "Fukushima Lab publication access information";
  const plainBody = [
    `Dear ${request.name},`,
    "",
    "Thank you for your interest in our work.",
    "",
    "Publication files are available from the researchmap page:",
    CONFIG.RESEARCHMAP_URL,
    "",
    "Download password:",
    downloadPassword,
    "",
    "The same password works for all publication files available for download on that researchmap page.",
    "",
    "Fukushima Lab",
    "National Institute of Genetics",
  ].join("\n");
  const htmlBody = [
    `<p>Dear ${escapeHtml_(request.name)},</p>`,
    "<p>Thank you for your interest in our work.</p>",
    "<p>Publication files are available from the ",
    `<a href="${escapeHtml_(CONFIG.RESEARCHMAP_URL)}">researchmap page</a>.</p>`,
    "<p>Download password:</p>",
    `<p style="font-size:1.2rem"><strong>${escapeHtml_(downloadPassword)}</strong></p>`,
    "<p>The same password works for all publication files available for download on that researchmap page.</p>",
    "<p>Fukushima Lab<br>National Institute of Genetics</p>",
  ].join("");

  MailApp.sendEmail({
    to: request.email,
    subject,
    body: plainBody,
    htmlBody,
    name: CONFIG.SENDER_NAME,
  });
}

function getDownloadPassword_() {
  const password = PropertiesService.getScriptProperties().getProperty(CONFIG.DOWNLOAD_PASSWORD_PROPERTY);
  if (!password) {
    throw new Error(`Missing script property: ${CONFIG.DOWNLOAD_PASSWORD_PROPERTY}`);
  }
  return password;
}

function getRequestSheet_() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheetId = properties.getProperty("REQUEST_SPREADSHEET_ID");
  let spreadsheet;

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create(CONFIG.REQUESTS_SPREADSHEET_TITLE);
    properties.setProperty("REQUEST_SPREADSHEET_ID", spreadsheet.getId());
  }

  let sheet = spreadsheet.getSheetByName(CONFIG.REQUESTS_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(CONFIG.REQUESTS_SHEET_NAME);
  }

  const existingHeader = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (existingHeader.join("\t") !== HEADERS.join("\t")) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.autoResizeColumns(1, HEADERS.length);
    sheet.hideColumns(COL.EMAIL_HASH, 2);
  }

  return sheet;
}

function countRequestsForDate_(sheet, requestDate, email) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { total: 0, forAddress: 0 };
  }

  const values = sheet.getRange(2, COL.REQUEST_DATE, lastRow - 1, 4).getDisplayValues();
  let total = 0;
  let forAddress = 0;
  values.forEach((row) => {
    if (row[0] !== requestDate) {
      return;
    }
    total += 1;
    if (String(row[3]).trim().toLowerCase() === email) {
      forAddress += 1;
    }
  });
  return { total, forAddress };
}

function findRowByTokenHash_(sheet, tokenHash) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return null;
  }
  const match = sheet
    .getRange(2, COL.TOKEN_HASH, lastRow - 1, 1)
    .createTextFinder(tokenHash)
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : null;
}

function purgeOldRows_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return;
  }

  const cutoff = Date.now() - CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const submitted = sheet.getRange(2, COL.SUBMITTED_AT, lastRow - 1, 1).getValues();
  for (let index = submitted.length - 1; index >= 0; index -= 1) {
    const date = new Date(submitted[index][0]);
    if (!Number.isNaN(date.getTime()) && date.getTime() < cutoff) {
      sheet.deleteRow(index + 2);
    }
  }
}

function renderRequestAccepted_() {
  return renderPage_(
    "Please check your email",
    [
      "<p>If the submitted information was accepted, a verification message has been sent.</p>",
      "<p>Requests are limited to one per email address per day.</p>",
      "<p>You may close this page and return to the Fukushima Lab website.</p>",
    ].join("")
  );
}

function renderInvalidLink_() {
  return renderPage_("Verification link unavailable", "<p>This verification link is invalid, expired, or has already been used.</p>");
}

function renderPage_(title, bodyHtml) {
  const html = [
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${escapeHtml_(title)}</title>`,
    "<style>body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;margin:0;background:#f5f7f8;color:#17232d}main{max-width:42rem;margin:8vh auto;padding:2rem;background:#fff;border-radius:.75rem;box-shadow:0 8px 28px rgba(0,0,0,.08)}h1{font-size:1.6rem;margin-top:0}a{color:#1769aa}</style>",
    "</head><body><main>",
    `<h1>${escapeHtml_(title)}</h1>`,
    bodyHtml,
    "</main></body></html>",
  ].join("");
  return HtmlService.createHtmlOutput(html).setTitle(title).addMetaTag("viewport", "width=device-width, initial-scale=1");
}

function createToken_() {
  return `${Utilities.getUuid()}${Utilities.getUuid()}`.replace(/-/g, "");
}

function sha256_(value) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8);
  return digest
    .map((byte) => {
      const normalized = byte < 0 ? byte + 256 : byte;
      return normalized.toString(16).padStart(2, "0");
    })
    .join("");
}

function formatRequestDate_(date) {
  return Utilities.formatDate(date, CONFIG.TIME_ZONE, "yyyy-MM-dd");
}

function collapseWhitespace_(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function escapeHtml_(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
