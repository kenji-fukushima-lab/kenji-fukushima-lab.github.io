---
page_id: new-members
layout: page
permalink: /join/new-members/
lang: ja
title: 新メンバーにお願いしたい手続き
last_updated: 2026-10-08
nav: false
---

当研究室へ参加することが決まった方々にお願いしたい手続きを以下に説明します。博士研究員、大学院生、技術補佐員、秘書、その他すべての研究室メンバーに共通する手続きです。外部から当研究室を訪問されている方も、目安として１ヶ月以上滞在される場合は同様の手続きをお願いします。以下で説明する手順は、着任日前に済ませていただいても大丈夫です。

## Issueフォームでメンバー情報を登録する

[新規メンバー登録フォーム](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/issues/new?template=3_member_registration.yml)を開き、氏名・役職・GitHubユーザー名・公開希望日などをご記入ください。GitHubユーザー名は必須です。その他の項目は、研究室ウェブサイトで公開したい情報・リンクしたいアカウントのみ入力してください。メンバー情報は[プロフィール更新フォーム](https://github.com/kenji-fukushima-lab/kenji-fukushima-lab.github.io/issues/new?template=2_profile_update.yml)からいつでも変更可能です。この申請をもとに、研究室のタスク管理に使用するプライベートリポジトリ[kflab](https://github.com/kfuku52/kflab)へ招待いたします。

## プロフィール写真を添付する

登録フォームの「プロフィール写真」欄に、正方形に近い写真を1枚ドラッグ&ドロップしてください。本人写真を公開したくない場合は、他の写真やイラストでも大丈夫です。写真を添付しない場合は、既定の画像を使用します。現メンバーの例は[メンバーページ]({{ '/people/' | relative_url }})でご確認いただけます。

## 承認手順

Issueフォームの投稿後、福島（GitHub: `kfuku52`）がIssueに `/approve-member` とコメントして承認し、登録用のプルリクエスト（PR）が作成されます。承認前には登録PRは作成されず、ウェブサイトにも掲載されません。

PRの内容を確認してマージした後、公開希望日以降の最初の正常なビルドで[メンバーページ]({{ '/people/' | relative_url }})に掲載されます。定期ビルドは毎日08:30（日本時間）に開始予定ですが、遅れる場合があります。公開希望日が過ぎてから承認・マージされた場合は、その後の最初の正常なビルドで掲載されます。Issueの内容を修正した場合も、福島の新しい承認コメントが必要です。

[メンバー募集の案内に戻る]({{ '/join/' | relative_url }})
