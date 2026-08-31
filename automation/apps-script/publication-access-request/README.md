# KFLAB Publication Access Request

Google Apps Script backend for the publication-access form on the Fukushima Lab
website.

## Workflow

1. A visitor submits their name, affiliation, and email address.
2. The service accepts at most one request per address per Japan-calendar day.
3. A verification link valid for 24 hours is emailed to the submitted address.
4. Opening the link sends the researchmap URL and the shared download password.
5. Request state is recorded in a private Google Sheet owned by the deploying
   account. Records are retained so that suspected misuse can be investigated.

Public name, affiliation, and email values are written with
`Range.setRichTextValues`, so leading `=` (or other spreadsheet-like text) stays
literal. The formula-capable `appendRow` call receives only server-generated
metadata and empty placeholders. A text-write or mail failure records
`verification_error` and releases the reservation. Existing records are not
rewritten by this change.

Outgoing messages intentionally do not set `Reply-To`.

## Deployment

1. Create an Apps Script project owned by `kflab52@gmail.com`.
2. Add `Code.gs` and use the settings from `appsscript.json`.
3. In Project Settings, add the script property `DOWNLOAD_PASSWORD`. Keep its
   value out of this public repository.
4. Run `setup()` once and authorize access to Google Sheets and email.
5. Deploy as a web app:
   - Execute as: the deploying account
   - Who has access: anyone
6. Put the `/exec` deployment URL in the website form action.

The request log spreadsheet ID is kept in the script property
`REQUEST_SPREADSHEET_ID`. The download password is read from
`DOWNLOAD_PASSWORD`; it is not stored in the repository.

To open the request log from Apps Script, run `setup()` and follow the URL shown
in the execution result. The current log is also in the deploying account's
Google Drive under `KFLAB Publication Access Requests`.

## Updating an existing deployment

GitHub Actions tests `Code.gs`, but a GitHub push does not publish Apps Script.
Replace the existing project's `Code.gs` with the reviewed repository version,
then choose **Deploy → Manage deployments → Edit → New version → Deploy**.
Keep the existing deployment ID, script properties, spreadsheet, and access
settings. Do not create a new log or copy its data into Git.

Before publication, a disposable test spreadsheet can confirm that names such
as `=1+1` have empty `getFormulas()` results and unchanged displayed text. Local
Node tests exercise literal writes, verification, expiry, quota and delivery
failures without sending real email. Do not send test mail through the public
form or inspect private request values unnecessarily.

The literal-text API is documented in the
[Apps Script Range reference](https://developers.google.com/apps-script/reference/spreadsheet/range#setrichtextvaluesvalues).

Current production web app:

<https://script.google.com/macros/s/AKfycbzZgmU-msHncbv54IT0B034oEoUJYVUTbhrT2I8guNRq1VUf_pVKedw-AzzCRc25r03/exec>
