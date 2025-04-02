
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
    section: "Menu de navegação",
    handler: () => {
      window.location.href = "/ja/";
    },
  },{id: "nav-メンバー",
          title: "メンバー",
          description: "当研究室のメンバー一覧です。",
          section: "Menu de navegação",
          handler: () => {
            window.location.href = "/ja/people/";
          },
        },{id: "nav-論文",
          title: "論文",
          description: "当研究室から発表した論文を、最新のものからリストしています。",
          section: "Menu de navegação",
          handler: () => {
            window.location.href = "/ja/publications/";
          },
        },{id: "nav-研究内容",
          title: "研究内容",
          description: "当研究室で取り組む研究の紹介です。",
          section: "Menu de navegação",
          handler: () => {
            window.location.href = "/ja/projects/";
          },
        },{id: "nav-リソース",
          title: "リソース",
          description: "当研究室で提供している研究リソースの一覧です。",
          section: "Menu de navegação",
          handler: () => {
            window.location.href = "/ja/resources/";
          },
        },{id: "nav-アウトリーチ",
          title: "アウトリーチ",
          description: "",
          section: "Menu de navegação",
          handler: () => {
            window.location.href = "/ja/outreach/";
          },
        },{id: "nav-ブログ",
          title: "ブログ",
          description: "",
          section: "Menu de navegação",
          handler: () => {
            window.location.href = "/ja/blog/";
          },
        },{id: "nav-メンバー募集",
          title: "メンバー募集",
          description: "",
          section: "Menu de navegação",
          handler: () => {
            window.location.href = "/ja/join/";
          },
        },{id: "nav-アクセス",
          title: "アクセス",
          description: "",
          section: "Menu de navegação",
          handler: () => {
            window.location.href = "/ja/access/";
          },
        },{id: "post-ipmb2024で発表",
      
        title: "IPMB2024で発表",
      
      description: "",
      section: "Postagens",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/ipmb2024/";
        
      },
    },{id: "post-立教大学で講義",
      
        title: "立教大学で講義",
      
      description: "",
      section: "Postagens",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/rikkyo/";
        
      },
    },{id: "post-高分子dnaの抽出",
      
        title: "高分子DNAの抽出",
      
      description: "",
      section: "Postagens",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/hmw-dna-extraction/";
        
      },
    },{id: "post-福島のオフィス完成",
      
        title: "福島のオフィス完成",
      
      description: "",
      section: "Postagens",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/kf-office/";
        
      },
    },{id: "post-クリーンベンチの設置",
      
        title: "クリーンベンチの設置",
      
      description: "",
      section: "Postagens",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/equipment/";
        
      },
    },{id: "post-google-gemini-updates-flash-1-5-gemma-2-and-project-astra",
      
        title: 'Google Gemini updates: Flash 1.5, Gemma 2 and Project Astra <svg width="1.2rem" height="1.2rem" top=".5rem" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M17 13.5v6H5v-12h6m3-3h6v6m0-6-9 9" class="icon_svg-stroke" stroke="#999" stroke-width="1.5" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
      
      description: "We’re sharing updates across our Gemini family of models and a glimpse of Project Astra, our vision for the future of AI assistants.",
      section: "Postagens",
      handler: () => {
        
          window.open("https://blog.google/technology/ai/google-gemini-update-flash-ai-assistant-io-2024/", "_blank");
        
      },
    },{id: "post-遺伝研バドミントン部",
      
        title: "遺伝研バドミントン部",
      
      description: "",
      section: "Postagens",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/badminton/";
        
      },
    },{id: "post-大学院一日体験会",
      
        title: "大学院一日体験会",
      
      description: "",
      section: "Postagens",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/daigakuin-taiken/";
        
      },
    },{id: "post-hector-montero博士が着任",
      
        title: "Hector Montero博士が着任",
      
      description: "",
      section: "Postagens",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/hector-join/";
        
      },
    },{id: "post-一般公開",
      
        title: "一般公開",
      
      description: "",
      section: "Postagens",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/open-campus/";
        
      },
    },{id: "post-植物進化研究室が発足",
      
        title: "植物進化研究室が発足",
      
      description: "",
      section: "Postagens",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/lab-start/";
        
      },
    },{id: "post-新メンバーにお願いしたい手続き",
      
        title: "新メンバーにお願いしたい手続き",
      
      description: "",
      section: "Postagens",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/newcomer/";
        
      },
    },{id: "post-科研費-帰国発展研究に採択されました",
      
        title: "科研費・帰国発展研究に採択されました",
      
      description: "",
      section: "Postagens",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/kikokuhattenn/";
        
      },
    },{id: "post-ホームページの制作を始めました",
      
        title: "ホームページの制作を始めました",
      
      description: "",
      section: "Postagens",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/hp-start/";
        
      },
    },{id: "post-displaying-external-posts-on-your-al-folio-blog",
      
        title: 'Displaying External Posts on Your al-folio Blog <svg width="1.2rem" height="1.2rem" top=".5rem" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M17 13.5v6H5v-12h6m3-3h6v6m0-6-9 9" class="icon_svg-stroke" stroke="#999" stroke-width="1.5" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
      
      description: "",
      section: "Postagens",
      handler: () => {
        
          window.open("https://medium.com/@al-folio/displaying-external-posts-on-your-al-folio-blog-b60a1d241a0a?source=rss-17feae71c3c4------2", "_blank");
        
      },
    },{id: "news-a-simple-inline-announcement",
          title: 'A simple inline announcement.',
          description: "",
          section: "Novidades",},{id: "news-um-anúncio-simples-em-uma-linha",
          title: 'Um anúncio simples em uma linha.',
          description: "",
          section: "Novidades",},{id: "news-a-long-announcement-with-details",
          title: 'A long announcement with details',
          description: "",
          section: "Novidades",handler: () => {
              window.location.href = "/ja/news/announcement_2/";
            },},{id: "news-um-anúncio-longo-com-detalhes",
          title: 'Um anúncio longo com detalhes',
          description: "",
          section: "Novidades",handler: () => {
              window.location.href = "/ja/news/announcement_2.md-14-06-31-761/";
            },},{id: "news-um-anúncio-simples-em-uma-linha-com-markdown-emoji-sparkles-smile",
          title: 'Um anúncio simples em uma linha com Markdown emoji! :sparkles: :smile:',
          description: "",
          section: "Novidades",},{id: "projects-研究興味",
          title: '研究興味',
          description: "",
          section: "Projetos",handler: () => {
              window.location.href = "/ja/projects/1_project/";
            },},{id: "projects-アプローチ",
          title: 'アプローチ',
          description: "",
          section: "Projetos",handler: () => {
              window.location.href = "/ja/projects/2_project/";
            },},{id: "projects-実験生物",
          title: '実験生物',
          description: "",
          section: "Projetos",handler: () => {
              window.location.href = "/ja/projects/3_project/";
            },},{id: "projects-設備-環境",
          title: '設備・環境',
          description: "",
          section: "Projetos",handler: () => {
              window.location.href = "/ja/projects/4_project/";
            },},{
        id: 'social-email',
        title: 'Enviar um email',
        section: 'Redes sociais',
        handler: () => {
          window.open("mailto:%6B%65%6E%6A%69.%66%75%6B%75%73%68%69%6D%61@%6E%69%67.%61%63.%6A%70", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Redes sociais',
        handler: () => {
          window.open("https://github.com/kfuku52", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Redes sociais',
        handler: () => {
          window.open("/feed.xml", "_blank");
        },
      },{
        id: 'social-scholar',
        title: 'Google Scholar',
        section: 'Redes sociais',
        handler: () => {
          window.open("https://scholar.google.com/citations?user=qYrrVuIEAAAAJ", "_blank");
        },
      },{
        id: 'social-x',
        title: 'X',
        section: 'Redes sociais',
        handler: () => {
          window.open("https://twitter.com/kfuku0502", "_blank");
        },
      },{
          id: 'lang-en-us',
          title: 'en-us',
          section: 'Idiomas',
          handler: () => {
            window.location.href = "" + updatedUrl;
          },
        },{
      id: 'light-theme',
      title: 'Muda o tema para claro',
      description: 'Muda o tema do site para claro',
      section: 'Tema',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Muda o tema para escuro',
      description: 'Muda o tema do site para escuro',
      section: 'Tema',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Usa o tema padrão do sistema',
      description: 'Muda o tema do site para o padrão do sistema',
      section: 'Tema',
      handler: () => {
        setThemeSetting("system");
      },
    },];
