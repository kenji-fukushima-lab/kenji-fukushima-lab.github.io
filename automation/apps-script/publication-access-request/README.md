# KFLAB Publication Access Request

Google Apps Script backend for the publication-access form on the Fukushima Lab
website.

## Workflow

1. A visitor submits their name, affiliation, and email address.
2. The service accepts at most one request per address per Japan-calendar day.
3. A verification link valid for 24 hours is emailed to the submitted address.
4. Opening the link sends the researchmap URL and the shared download password.
5. Request state is recorded in a private Google Sheet owned by the deploying
   account. Rows older than 365 days are removed when a new request is processed.

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

Current production web app:

<https://script.google.com/macros/s/AKfycbzZgmU-msHncbv54IT0B034oEoUJYVUTbhrT2I8guNRq1VUf_pVKedw-AzzCRc25r03/exec>
