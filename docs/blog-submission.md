# Blog submission workflow

## For lab members

1. Open the [blog post submission form](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/issues/new?template=3_blog_post.yml).
2. Fill in the post title, article date, language (`ja` or `en-us`), and Markdown body.
3. Optionally choose a URL slug and drag images into the body field.
4. Submit the issue and follow its bot comment to the review PR.

Issues, attachments, and PRs in this repository are public before website
publication. Do not submit private information or embargoed material.

### Title, date, and author

- Leave the issue header's prefilled title in place. It is updated to
  `Blog post submission: <title>`; the article uses `記事タイトル / Post Title`.
- `記事日付 / Article Date` must be a real date in `YYYY-MM-DD` format. It sets
  the displayed date and the post's date-based URL. A future date also delays
  visibility until that date in Japan time and a successful site build. It is
  not a promise of publication at a particular time.
- The author links to the submitting account's **GitHub profile**, not its lab
  member card. Some known usernames also have a configured display name.
- An omitted slug is derived from the title. If no ASCII slug can be generated,
  the fallback is `post-<issue number>`; choose an explicit slug for a stable URL.
- English posts are supported, but the English blog index is currently hidden
  from navigation and marked `noindex`.

### Body and images

Use Markdown. Raw HTML and Liquid are rejected, except that GitHub attachment
image markup can be converted to the site's own figure include. Do not paste
scripts, arbitrary includes, or embed HTML into the form. Put an X post URL in
the issue for a maintainer to embed later.

Recognized GitHub image attachments are downloaded into `assets/img/posts/`
and rewritten to local figures. Ordinary external Markdown image URLs remain
remote. Check warnings in the PR: a failed download can leave the original
Markdown image URL in place rather than making the whole submission fail.

The workflow tries to correct EXIF orientation and optimize supported raster
images. Its output budget is 900,000 bytes for JPG, PNG, WebP, and GIF assets;
images that cannot meet that budget are rejected. Large animated images are
not automatically flattened to meet it. Prefer JPG/PNG and compress oversized
animations yourself. Other formats are not a substitute for checking that the
published image renders correctly. Supply descriptive alt text and confirm
permission to publish the images.

### Generated files and publication

- Post: `_posts/<lang>/YYYY-MM-DD-<slug>.md`
- Existing filename collision: `_posts/<lang>/YYYY-MM-DD-<slug>-issue<number>.md`
- Images: `assets/img/posts/YYYY-MM-DD_<slug>_issue<number>_<index>.<ext>`, with
  a two-digit index beginning at `01`. Optimization may change the extension.

The workflow applies the `blog-post` label, creates or updates a PR for the
issue, and requests maintainer review for submissions from other accounts.
Review and merge are followed by the site CI/deployment pipeline. The article
appears only after successful deployment and once its date is eligible.
The [daily build](WORKFLOWS.md#scheduled-posts) also catches up future-dated posts
that were already merged.

If generation fails, read the issue comment and
[workflow log](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/actions/workflows/blog-post-submission.yml),
correct the input, and save the issue to retry. For infrastructure or permission
errors, ask a maintainer rather than repeatedly resubmitting. To amend an already
merged article, edit the existing source through a normal review; reopening its
submission issue can create a second post with the collision suffix.

## For maintainers

Review the title, date/time zone, language, slug, author, body, downloaded assets,
warnings, and publication rights. Check the rendered page and applicable checks
before merging. An issue edit can regenerate the PR, so coordinate direct PR
edits with the submitter. See [submission CI notes](WORKFLOWS.md#submission-workflows)
if a bot-created PR has no automatic check run.

## Embedding an X post

This is a **maintainer source-edit step**, not valid input in the issue form.
Add the shared include to the reviewed post instead of pasting a script or raw
`twitter-tweet` blockquote:

```liquid
{% include x_embed.liquid username="account" id="1234567890" lang="ja" label="Xで投稿を見る" %}
```

The include always renders a direct link as a fallback. The site loads X's
widget script once, and only when an embed is close to the viewport. Do not use
an example ID as an actual post; replace it with the intended public post ID.
