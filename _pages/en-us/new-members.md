---
page_id: new-members
layout: page
permalink: /join/new-members/
lang: en-us
title: Getting started as a new member
last_updated: 2026-10-08
nav: false
---

The following steps are for everyone who has agreed to join our lab, including postdocs, graduate students, technical assistants, secretaries, and other lab members. Visitors staying for approximately one month or longer should also complete these steps. You are welcome to complete them before your start date.

## Register your member information using the issue form

Open the [new member registration form](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/issues/new?template=3_member_registration.yml) and fill in your name, role, GitHub username, requested publication date, and other details. Your GitHub username is required. Include only the other information and accounts you would like to publish or link from the lab website. You can change your member information at any time through the [profile update form](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/issues/new?template=2_profile_update.yml). We will use this application to invite you to [kflab](https://github.com/kfuku52/kflab), the private repository we use to manage lab tasks.

## Attach a profile photo

Drag and drop one approximately square photo into the registration form's profile photo field. If you prefer not to publish a photo of yourself, another photo or an illustration is also welcome. If you do not attach an image, the default image will be used. See the [members page]({{ '/people/' | relative_url }}) for examples.

## Approval procedure

After you submit the issue form, Kenji (GitHub: `kfuku52`) approves the issue by commenting `/approve-member`, and a registration pull request (PR) is created. Before approval, no registration PR is created and your profile is not listed on the website.

After the PR is reviewed and merged, your profile will appear on the [members page]({{ '/people/' | relative_url }}) in the first successful build on or after the requested date. The daily build normally starts at 08:30 Japan time and may run later. If the date has already passed when the PR is approved and merged, the next successful build will publish the profile. Revised issue content requires a new approval comment from Kenji.

[Back to information about joining the lab]({{ '/join/' | relative_url }})
