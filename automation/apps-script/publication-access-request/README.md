# KFLAB Publication Access Request

This directory contains the Google Apps Script backend source for the lab's
publication-access form. It is deployed separately from the website.

## Source behavior and deployment status

The repository implementation:

1. Accepts a visitor's name, affiliation, and email address.
2. Limits requests to one per address per Japan-calendar day, with a configured
   total cap of 45 requests per day and additional mail-quota checks.
3. Emails a verification link valid for 24 hours.
4. Sends the researchmap URL and shared download password after verification.
5. Records request state in a private Google Sheet; the source does not
   automatically delete old records.

Name, affiliation, and email values are written using `Range.setRichTextValues`,
so spreadsheet-like input remains literal text. The formula-capable `appendRow`
call receives server-generated metadata and empty placeholders. A text-write or
verification-mail failure records `verification_error` and releases the
reservation. Existing records are not rewritten. Outgoing messages do not set
`Reply-To`.

**Last deployment check: 2026-08-31.** The repository source and local tests were
checked, but access to the project behind the configured production deployment
was not available. The deployed version and its use of the literal-text fix
remain unverified. Passing GitHub CI is not evidence that Apps Script was updated.

The website's configured endpoint is the `web_app_url` in
[\_data/publication_access.yml](../../../_data/publication_access.yml).
Use that deployment ID to identify the existing Apps Script project; a similarly
named project or the GitHub source alone does not establish which code is live.

## Updating the existing service

1. Open the Apps Script project that owns the configured deployment, using an
   account authorized to edit it. Confirm its deployment ID before changing code.
2. Preserve the existing `DOWNLOAD_PASSWORD` and `REQUEST_SPREADSHEET_ID` script
   properties, request log, execute-as account, and access settings.
3. Replace [Code.gs](Code.gs) with the reviewed source and compare project
   settings with [appsscript.json](appsscript.json).
4. Choose **Deploy → Manage deployments → Edit → New version → Deploy** for the
   existing deployment. Keep its ID and `/exec` URL.
5. Record the deployed source revision/version and verify the non-submitting
   status page. A status page alone does not verify email delivery or log writes.

Do not create a replacement project or spreadsheet just because the existing
one is inaccessible. Obtain the production editor URL/access from its owner.
Do not send test requests through the public form or copy private log values
into Git, issues, screenshots, or CI artifacts.

## Initial setup for a new service

Only use this procedure when intentionally creating a new service, not when
updating the existing deployment. The intended service account is
`kflab52@gmail.com`; verify ownership and deployment access before setup.

1. Create the project in the intended account and add `Code.gs` and manifest settings.
2. Set the private `DOWNLOAD_PASSWORD` script property.
3. Run `setup()` and authorize the required access. With no
   `REQUEST_SPREADSHEET_ID`, it creates a private spreadsheet titled
   `KFLAB Publication Access Requests` and stores its ID. With an existing ID,
   it opens that spreadsheet instead; confirm the property before running it.
4. Deploy a web app executing as the deploying account, with access for anyone.
5. Update `web_app_url` in the website data file and validate/deploy the website.

`setup()` returns the spreadsheet URL. To locate an existing log, use the
`REQUEST_SPREADSHEET_ID` property in the correct project rather than guessing
from a Drive filename. Never commit the password or private log contents.

## Validation

Local Node tests exercise literal writes, verification, expiry, quotas, and
mail failures without sending real email:

```bash
npm run test:unit:js
```

Run this from the repository root after `npm ci`. Before an Apps Script release,
a disposable test project/spreadsheet can check that names such as `=1+1` have
empty `getFormulas()` results and unchanged displayed text. Use test recipients
only when a delivery test is explicitly intended and authorized. The literal-text
API is documented in the
[Apps Script Range reference](https://developers.google.com/apps-script/reference/spreadsheet/range#setrichtextvaluesvalues).
