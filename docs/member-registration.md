# New member registration

Members who have agreed to join the lab can submit their information through the
[new member form](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/issues/new?template=3_member_registration.yml).
Name, role, GitHub username, and the earliest website publication date are required.
The date is `YYYY-MM-DD` in `Asia/Tokyo`; other fields and a photo are optional.
Enter the submitting account's username explicitly. Only Kenji can submit another
account's identity. Kenji uses the application to invite the member to the private
`kflab` repository; no separate email of GitHub account details is needed.
Existing members use the separate
[profile update form](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/issues/new?template=2_profile_update.yml).

The issue and attachments are public immediately. The requested date controls
website listing, not visibility in GitHub. Include only information that may be public.

## Approval and publication

1. Submission or editing produces an acknowledgement; it does not create a profile PR.
2. Kenji (`kfuku52`) reviews the issue and posts a new comment containing only
   `/approve-member`. Other accounts and edited comments cannot authorize registration.
3. The workflow runs trusted default-branch code, verifies the comment identity again
   in Python, and creates or updates a reviewable PR. It uses the issue snapshot from
   the approval event. Later issue edits require a new approval comment and do not
   silently replace the approved PR content. The workflow checks the live approval
   before generation and again immediately before writing the PR. Closed issues and
   removed, edited, or superseded approvals cannot change the PR. It also checks the
   approval ID stored in any existing registration PR, so rerunning an older workflow
   cannot replace a newer approved profile after the newer comment is withdrawn.
4. Review the PR and run the normal site checks before merging. Bot-created PRs may
   need **Approve workflows to run**; see [submission workflows](WORKFLOWS.md#submission-workflows).
5. After merge, the first successful build on or after the requested date publishes
   the profile. A date in the past is caught up by the next build. The existing daily
   Deploy run normally starts at 08:30 Japan time; GitHub can run it later.

No automatic merge, direct default-branch push, new daily workflow, or privileged
publishing token is added. The approval author and comment ID are recorded in the
generated profile and linked from the PR. The approval is for the content captured
by that comment; posting another approval updates the PR to the newly approved snapshot.

## Stored data and scheduling

Registration creates `_profiles/current_members/<github-username>.md` from the
existing profile template and normalizes link fields using the existing updater.
It refuses existing usernames or filenames. Optional photos use the existing
attachment validation, conversion, and image budget, under `assets/img/people/`.
Registration photos use `member-registration-<issue>-<github-username>.<extension>`
so account names cannot overwrite existing members' photos or the default image.
An existing registration asset is rejected. Invalid photo inputs leave no partial
member record; the completed profile is installed with one atomic rename.
Existing profile fields and the update form retain their formats and behavior.

New metadata is `publish_on`, `registration_issue`, `registration_approved_by`, and
`registration_approval_comment`. Issue fields cannot choose these approval values.
The build rejects invalid or missing registration dates, hides registrations whose
approver is not `kfuku52`, and excludes future profiles before language coordination
and generators. The member list, homepage count, coauthor profile lookup, and search
therefore all use the same eligible records. Sources and uploaded assets in GitHub
remain public before the website publication date.

Manually maintained profiles without registration metadata keep their current
behavior. A reviewed manual profile can optionally use `publish_on` for scheduling.
Scheduled `draft: true` or `published: false` profiles stay excluded. Sources remain
in place; no date-triggered commits or file moves are needed.

Run `npm run checks:push -- --base origin/main` after changes. Focused regressions
are in `tests/test_create_member_registration_from_issue.py`,
`tests/js/member-registration.test.js`, and `test/scheduled_profiles_test.rb`;
use the documented production/browser checks
for the updated joining guide and member pages. Live GitHub event behavior requires
these files to be on the default branch.
