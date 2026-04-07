
const currentUrl = window.location.href;
const siteUrl = "https://kenji-fukushima-lab.github.io"; 
let updatedUrl = currentUrl.replace("https://kenji-fukushima-lab.github.io", "");
if (currentUrl.length == updatedUrl.length && currentUrl.startsWith("http://127.0.0.1")) {
  const otherSiteUrl = siteUrl.replace("localhost", "127.0.0.1");
  updatedUrl = currentUrl.replace(otherSiteUrl + "", "");
}
if ("ja".length > 0) {
  updatedUrl = updatedUrl.replace("/ja", "");
}
// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// command palette items
ninja.data = [{
    id: "nav-概要",
    title: "概要",
    description: "",
    section: "ナビゲーション",
    handler: () => {
      window.location.href = "/ja/";
    },
  },{id: "nav-メンバー",
          title: "メンバー",
          description: "当研究室のメンバー一覧です。",
          section: "ナビゲーション",
          handler: () => {
            window.location.href = "/ja/people/";
          },
        },{id: "nav-論文",
          title: "論文",
          description: "当研究室から発表した論文を、最新のものから順にリストしています。当研究室のメンバーとして論文に貢献した著者を太字で示しています。当研究室のメンバーが筆頭あるいは責任著者を務める論文にはプレビュー画像を付しています。†: 共筆頭著者. *: (共)責任著者.",
          section: "ナビゲーション",
          handler: () => {
            window.location.href = "/ja/publications/";
          },
        },{id: "nav-研究内容",
          title: "研究内容",
          description: "当研究室で取り組む研究の紹介です。",
          section: "ナビゲーション",
          handler: () => {
            window.location.href = "/ja/projects/";
          },
        },{id: "nav-リソース",
          title: "リソース",
          description: "当研究室で提供している研究リソースの一覧です。",
          section: "ナビゲーション",
          handler: () => {
            window.location.href = "/ja/resources/";
          },
        },{id: "nav-アウトリーチ",
          title: "アウトリーチ",
          description: "福島研究室の書籍、講演、メディア出演などのアウトリーチ活動を紹介しています。",
          section: "ナビゲーション",
          handler: () => {
            window.location.href = "/ja/outreach/";
          },
        },{id: "nav-ブログ",
          title: "ブログ",
          description: "研究室の活動記録やお知らせを掲載しています。",
          section: "ナビゲーション",
          handler: () => {
            window.location.href = "/ja/blog/";
          },
        },{id: "nav-メンバー募集",
          title: "メンバー募集",
          description: "福島研究室への参加を希望する博士課程学生・博士研究員向けの案内です。",
          section: "ナビゲーション",
          handler: () => {
            window.location.href = "/ja/join/";
          },
        },{id: "nav-アクセス",
          title: "アクセス",
          description: "国立遺伝学研究所・植物進化研究室へのアクセスと連絡先の案内です。",
          section: "ナビゲーション",
          handler: () => {
            window.location.href = "/ja/access/";
          },
        },{
        id: 'social-email',
        title: 'メール送信',
        section: 'SNS',
        handler: () => {
          window.open("mailto:%6B%65%6E%6A%69.%66%75%6B%75%73%68%69%6D%61@%6E%69%67.%61%63.%6A%70", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'SNS',
        handler: () => {
          window.open("https://github.com/kfuku52", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'SNS',
        handler: () => {
          window.open("/ja/feed.xml", "_blank");
        },
      },{
        id: 'social-scholar',
        title: 'Google Scholar',
        section: 'SNS',
        handler: () => {
          window.open("https://scholar.google.com/citations?user=qYrrVuIEAAAAJ", "_blank");
        },
      },{
        id: 'social-x',
        title: 'X',
        section: 'SNS',
        handler: () => {
          window.open("https://twitter.com/kfuku0502", "_blank");
        },
      },{
          id: 'lang-en-us',
          title: 'en-us',
          section: '言語',
          handler: () => {
            window.location.href = "" + updatedUrl;
          },
        },{
      id: 'light-theme',
      title: 'ライトテーマ',
      description: 'ライトテーマに切り替える',
      section: 'テーマ',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'ダークテーマ',
      description: 'ダークテーマに切り替える',
      section: 'テーマ',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'システムテーマ',
      description: 'システムのテーマを使用',
      section: 'テーマ',
      handler: () => {
        setThemeSetting("system");
      },
    },];
