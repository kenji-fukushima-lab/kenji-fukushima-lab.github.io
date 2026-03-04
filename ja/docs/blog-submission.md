# Blog submission workflow

## For lab members

1. Open the repository Issues page.
2. Choose `📝 Blog post submission`.
3. Fill in post title, article date, language, and body.
4. Drag and drop images into the body field if needed.
5. Submit the issue.

Notes:

- `Add a title` in the issue header is for issue tracking only.
- Blog post title is taken from `記事タイトル / Post Title`.
- `記事日付 / Article Date` is the date shown on the post page, not the publication date.
- Author is derived automatically from your GitHub username and linked to your profile.

What happens next:

- A pull request is created automatically.
- Attached GitHub images are downloaded into `assets/img/posts/`.
- Markdown image links are rewritten to local paths.
- The post is published only after maintainer approval and merge.

## For maintainer

1. Review the generated pull request.
2. Confirm front matter and file paths.
3. Confirm downloaded images and content rights.
4. Approve and merge when ready.

Generated files:

- Post markdown: `_posts/<lang>/YYYY-MM-DD-<slug>.md`
- Image assets: `assets/img/posts/YYYY-MM-DD_<slug>_issue<no>_<index>.<ext>`
