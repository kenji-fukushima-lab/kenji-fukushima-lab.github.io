
const currentUrl = window.location.href;
const siteUrl = "https://kenji-fukushima-lab.github.io"; 
let updatedUrl = currentUrl.replace("https://kenji-fukushima-lab.github.io", "");
if (currentUrl.length == updatedUrl.length && currentUrl.startsWith("http://127.0.0.1")) {
  const otherSiteUrl = siteUrl.replace("localhost", "127.0.0.1");
  updatedUrl = currentUrl.replace(otherSiteUrl + "", "");
}
if ("".length > 0) {
  updatedUrl = updatedUrl.replace("/", "");
}
// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation menu",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-people",
          title: "people",
          description: "Current lab members",
          section: "Navigation menu",
          handler: () => {
            window.location.href = "/people/";
          },
        },{id: "nav-publications",
          title: "publications",
          description: "Publications from Fukushima lab. Authors who contributed as a Fukushima lab member are indicated in bold. Preview images are attached to papers in which members of our laboratory serve as either the lead or corresponding authors. †: co-first authors. *: (co-)corresponding authors.",
          section: "Navigation menu",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "nav-research",
          title: "research",
          description: "Our research",
          section: "Navigation menu",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-resources",
          title: "resources",
          description: "List of research resources developed by Fukushima lab",
          section: "Navigation menu",
          handler: () => {
            window.location.href = "/resources/";
          },
        },{id: "nav-join-us",
          title: "join us",
          description: "",
          section: "Navigation menu",
          handler: () => {
            window.location.href = "/join/";
          },
        },{id: "nav-access",
          title: "access",
          description: "",
          section: "Navigation menu",
          handler: () => {
            window.location.href = "/access/";
          },
        },{id: "post-ipmb2024で発表",
      
        title: "IPMB2024で発表",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/ipmb2024/";
        
      },
    },{id: "post-立教大学で講義",
      
        title: "立教大学で講義",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/rikkyo/";
        
      },
    },{id: "post-高分子dnaの抽出",
      
        title: "高分子DNAの抽出",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/hmw-dna-extraction/";
        
      },
    },{id: "post-福島のオフィス完成",
      
        title: "福島のオフィス完成",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/kf-office/";
        
      },
    },{id: "post-クリーンベンチの設置",
      
        title: "クリーンベンチの設置",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/equipment/";
        
      },
    },{id: "post-遺伝研バドミントン部",
      
        title: "遺伝研バドミントン部",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/badminton/";
        
      },
    },{id: "post-大学院一日体験会",
      
        title: "大学院一日体験会",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/daigakuin-taiken/";
        
      },
    },{id: "post-hector-montero博士が着任",
      
        title: "Hector Montero博士が着任",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/hector-join/";
        
      },
    },{id: "post-一般公開",
      
        title: "一般公開",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/open-campus/";
        
      },
    },{id: "post-植物進化研究室が発足",
      
        title: "植物進化研究室が発足",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/lab-start/";
        
      },
    },{id: "post-新メンバーにお願いしたい手続き",
      
        title: "新メンバーにお願いしたい手続き",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/newcomer/";
        
      },
    },{id: "post-科研費-帰国発展研究に採択されました",
      
        title: "科研費・帰国発展研究に採択されました",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/kikokuhattenn/";
        
      },
    },{id: "post-ホームページの制作を始めました",
      
        title: "ホームページの制作を始めました",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/hp-start/";
        
      },
    },{id: "news-a-simple-inline-announcement",
          title: 'A simple inline announcement.',
          description: "",
          section: "News",},{id: "profiles-katsuhiro-yoneoka",
          title: 'Katsuhiro_yoneoka',
          description: "",
          section: "",handler: () => {
              window.location.href = "/profiles/katsuhiro_yoneoka/";
            },},{id: "profiles-kenji-fukushima",
          title: 'Kenji_fukushima',
          description: "",
          section: "",handler: () => {
              window.location.href = "/profiles/kenji_fukushima/";
            },},{id: "profiles-naoto-inui",
          title: 'Naoto_inui',
          description: "",
          section: "",handler: () => {
              window.location.href = "/profiles/naoto_inui/";
            },},{id: "profiles-jiawei-li",
          title: 'Jiawei_li',
          description: "",
          section: "",handler: () => {
              window.location.href = "/profiles/prospective_members/jiawei_li/";
            },},{id: "profiles-yukiho-toyama",
          title: 'Yukiho_toyama',
          description: "",
          section: "",handler: () => {
              window.location.href = "/profiles/prospective_members/yukiho_toyama/";
            },},{id: "profiles-sakiko-teramoto",
          title: 'Sakiko_teramoto',
          description: "",
          section: "",handler: () => {
              window.location.href = "/profiles/sakiko_teramoto/";
            },},{id: "profiles-sayoko-shirai",
          title: 'Sayoko_shirai',
          description: "",
          section: "",handler: () => {
              window.location.href = "/profiles/sayoko_shirai/";
            },},{id: "profiles-shunsuke-kanamori",
          title: 'Shunsuke_kanamori',
          description: "",
          section: "",handler: () => {
              window.location.href = "/profiles/shunsuke_kanamori/";
            },},{id: "profiles-template",
          title: 'Template',
          description: "",
          section: "",handler: () => {
              window.location.href = "/profiles/template/";
            },},{id: "profiles-tomoya-nishiguchi",
          title: 'Tomoya_nishiguchi',
          description: "",
          section: "",handler: () => {
              window.location.href = "/profiles/tomoya_nishiguchi/";
            },},{id: "profiles-yoshino-hashimoto",
          title: 'Yoshino_hashimoto',
          description: "",
          section: "",handler: () => {
              window.location.href = "/profiles/yoshino_hashimoto/";
            },},{id: "profiles-yuhan-guo",
          title: 'Yuhan_guo',
          description: "",
          section: "",handler: () => {
              window.location.href = "/profiles/yuhan_guo/";
            },},{id: "projects-interests",
          title: 'interests',
          description: "",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_project/";
            },},{id: "projects-approaches",
          title: 'approaches',
          description: "",
          section: "Projects",handler: () => {
              window.location.href = "/projects/2_project/";
            },},{id: "projects-organisms",
          title: 'organisms',
          description: "",
          section: "Projects",handler: () => {
              window.location.href = "/projects/3_project/";
            },},{id: "projects-facilities",
          title: 'facilities',
          description: "",
          section: "Projects",handler: () => {
              window.location.href = "/projects/4_project/";
            },},{
        id: 'social-email',
        title: 'Send an email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%6B%65%6E%6A%69.%66%75%6B%75%73%68%69%6D%61@%6E%69%67.%61%63.%6A%70", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/kfuku52", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("/feed.xml", "_blank");
        },
      },{
        id: 'social-scholar',
        title: 'Google Scholar',
        section: 'Socials',
        handler: () => {
          window.open("https://scholar.google.com/citations?user=qYrrVuIEAAAAJ", "_blank");
        },
      },{
        id: 'social-x',
        title: 'X',
        section: 'Socials',
        handler: () => {
          window.open("https://twitter.com/kfuku0502", "_blank");
        },
      },{
          id: 'lang-ja',
          title: 'ja',
          section: 'Languages',
          handler: () => {
            window.location.href = "/ja" + updatedUrl;
          },
        },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
