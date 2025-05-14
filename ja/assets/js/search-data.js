
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

// add the home and posts menu items
ninja.data = [{
    id: "nav-概要",
    title: "概要",
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
          description: "当研究室から発表した論文を、最新のものからリストしています。",
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
          description: "",
          section: "ナビゲーション",
          handler: () => {
            window.location.href = "/ja/outreach/";
          },
        },{id: "nav-ブログ",
          title: "ブログ",
          description: "",
          section: "ナビゲーション",
          handler: () => {
            window.location.href = "/ja/blog/";
          },
        },{id: "nav-メンバー募集",
          title: "メンバー募集",
          description: "",
          section: "ナビゲーション",
          handler: () => {
            window.location.href = "/ja/join/";
          },
        },{id: "nav-アクセス",
          title: "アクセス",
          description: "",
          section: "ナビゲーション",
          handler: () => {
            window.location.href = "/ja/access/";
          },
        },{id: "post-ipmb2024で発表",
      
        title: "IPMB2024で発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/ipmb2024/";
        
      },
    },{id: "post-立教大学で講義",
      
        title: "立教大学で講義",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/rikkyo/";
        
      },
    },{id: "post-高分子dnaの抽出",
      
        title: "高分子DNAの抽出",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/hmw-dna-extraction/";
        
      },
    },{id: "post-福島のオフィス完成",
      
        title: "福島のオフィス完成",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/kf-office/";
        
      },
    },{id: "post-クリーンベンチの設置",
      
        title: "クリーンベンチの設置",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/equipment/";
        
      },
    },{id: "post-遺伝研バドミントン部",
      
        title: "遺伝研バドミントン部",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/badminton/";
        
      },
    },{id: "post-大学院一日体験会",
      
        title: "大学院一日体験会",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/daigakuin-taiken/";
        
      },
    },{id: "post-hector-montero博士が着任",
      
        title: "Hector Montero博士が着任",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/hector-join/";
        
      },
    },{id: "post-一般公開",
      
        title: "一般公開",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/open-campus/";
        
      },
    },{id: "post-植物進化研究室が発足",
      
        title: "植物進化研究室が発足",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/lab-start/";
        
      },
    },{id: "post-新メンバーにお願いしたい手続き",
      
        title: "新メンバーにお願いしたい手続き",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/newcomer/";
        
      },
    },{id: "post-科研費-帰国発展研究に採択されました",
      
        title: "科研費・帰国発展研究に採択されました",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/kikokuhattenn/";
        
      },
    },{id: "post-ホームページの制作を始めました",
      
        title: "ホームページの制作を始めました",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/hp-start/";
        
      },
    },{id: "news-a-simple-inline-announcement",
          title: 'A simple inline announcement.',
          description: "",
          section: "ニュース",},{id: "news-um-anúncio-simples-em-uma-linha",
          title: 'Um anúncio simples em uma linha.',
          description: "",
          section: "ニュース",},{id: "news-a-long-announcement-with-details",
          title: 'A long announcement with details',
          description: "",
          section: "ニュース",handler: () => {
              window.location.href = "/ja/news/announcement_2/";
            },},{id: "news-um-anúncio-longo-com-detalhes",
          title: 'Um anúncio longo com detalhes',
          description: "",
          section: "ニュース",handler: () => {
              window.location.href = "/ja/news/announcement_2.md-14-06-31-761/";
            },},{id: "news-um-anúncio-simples-em-uma-linha-com-markdown-emoji-sparkles-smile",
          title: 'Um anúncio simples em uma linha com Markdown emoji! :sparkles: :smile:',
          description: "",
          section: "ニュース",},{id: "profiles-katsuhiro-yoneoka",
          title: 'Katsuhiro_yoneoka',
          description: "",
          section: "",handler: () => {
              window.location.href = "/ja/profiles/katsuhiro_yoneoka/";
            },},{id: "profiles-kenji-fukushima",
          title: 'Kenji_fukushima',
          description: "",
          section: "",handler: () => {
              window.location.href = "/ja/profiles/kenji_fukushima/";
            },},{id: "profiles-naoto-inui",
          title: 'Naoto_inui',
          description: "",
          section: "",handler: () => {
              window.location.href = "/ja/profiles/naoto_inui/";
            },},{id: "profiles-sakiko-teramoto",
          title: 'Sakiko_teramoto',
          description: "",
          section: "",handler: () => {
              window.location.href = "/ja/profiles/sakiko_teramoto/";
            },},{id: "profiles-sayoko-shirai",
          title: 'Sayoko_shirai',
          description: "",
          section: "",handler: () => {
              window.location.href = "/ja/profiles/sayoko_shirai/";
            },},{id: "profiles-shunsuke-kanamori",
          title: 'Shunsuke_kanamori',
          description: "",
          section: "",handler: () => {
              window.location.href = "/ja/profiles/shunsuke_kanamori/";
            },},{id: "profiles-template",
          title: 'Template',
          description: "",
          section: "",handler: () => {
              window.location.href = "/ja/profiles/template/";
            },},{id: "profiles-tomoya-nishiguchi",
          title: 'Tomoya_nishiguchi',
          description: "",
          section: "",handler: () => {
              window.location.href = "/ja/profiles/tomoya_nishiguchi/";
            },},{id: "profiles-yoshino-hashimoto",
          title: 'Yoshino_hashimoto',
          description: "",
          section: "",handler: () => {
              window.location.href = "/ja/profiles/yoshino_hashimoto/";
            },},{id: "profiles-yuhan-guo",
          title: 'Yuhan_guo',
          description: "",
          section: "",handler: () => {
              window.location.href = "/ja/profiles/yuhan_guo/";
            },},{id: "profiles-yusuke-asaka",
          title: 'Yusuke_asaka',
          description: "",
          section: "",handler: () => {
              window.location.href = "/ja/profiles/yusuke_asaka/";
            },},{id: "projects-研究興味",
          title: '研究興味',
          description: "",
          section: "プロジェクト",handler: () => {
              window.location.href = "/ja/projects/1_project/";
            },},{id: "projects-アプローチ",
          title: 'アプローチ',
          description: "",
          section: "プロジェクト",handler: () => {
              window.location.href = "/ja/projects/2_project/";
            },},{id: "projects-実験生物",
          title: '実験生物',
          description: "",
          section: "プロジェクト",handler: () => {
              window.location.href = "/ja/projects/3_project/";
            },},{id: "projects-設備-環境",
          title: '設備・環境',
          description: "",
          section: "プロジェクト",handler: () => {
              window.location.href = "/ja/projects/4_project/";
            },},{
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
          window.open("/feed.xml", "_blank");
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
