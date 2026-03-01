
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
        },{id: "post-仁木宏典博士の最終講義",
      
        title: "仁木宏典博士の最終講義",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2026/niki-final-lecture/";
        
      },
    },{id: "post-中学生の職場体験",
      
        title: "中学生の職場体験",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2026/junior-high-internship/";
        
      },
    },{id: "post-遺伝学講座-みしまで発表",
      
        title: "遺伝学講座・みしまで発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2026/iden-gaku-kouza-mishima/";
        
      },
    },{id: "post-サントリーsunriseに採択",
      
        title: "サントリーSunRiSEに採択",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2026/grant-awarded/";
        
      },
    },{id: "post-workshop-on-spatial-omics-in-plantsに参加",
      
        title: "Workshop on Spatial Omics in Plantsに参加",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2026/spatial-omics-in-plants/";
        
      },
    },{id: "post-総研大-発生生物学1-で講義",
      
        title: "総研大「発生生物学1」で講義",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/developmental-biology-1-sokendai/";
        
      },
    },{id: "post-静岡大学で講義",
      
        title: "静岡大学で講義",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/shizuoka-frontier-science-lecture/";
        
      },
    },{id: "post-イネ属近縁野生種研究会で発表",
      
        title: "イネ属近縁野生種研究会で発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/oryza-wild-species-meeting/";
        
      },
    },{id: "post-分子生物学会2025でシンポジウムを企画",
      
        title: "分子生物学会2025でシンポジウムを企画",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/mbsj2025-symposium/";
        
      },
    },{id: "post-ラボでサーバーラックを組み立て",
      
        title: "ラボでサーバーラックを組み立て",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/server-rack-assembly/";
        
      },
    },{id: "post-ラボミーティングでマツバランの実物",
      
        title: "ラボミーティングでマツバランの実物",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/matsubaran-lab-meeting/";
        
      },
    },{id: "post-食虫植物の形質転換実験で使う蛍光顕微鏡",
      
        title: "食虫植物の形質転換実験で使う蛍光顕微鏡",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/microscope-installed-clean-bench/";
        
      },
    },{id: "post-ガスボンベ式発電機を試運転",
      
        title: "ガスボンベ式発電機を試運転",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/generator-test-run/";
        
      },
    },{id: "post-福島和紀博士のセミナー",
      
        title: "福島和紀博士のセミナー",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/kazuki-fukushima-seminar/";
        
      },
    },{id: "post-名古屋大学農学部で集中講義",
      
        title: "名古屋大学農学部で集中講義",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/nagoya-intensive-lectures-macroevolution/";
        
      },
    },{id: "post-第1384回nigコロキウムで発表",
      
        title: "第1384回NIGコロキウムで発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/nig-colloquium-1384/";
        
      },
    },{id: "post-遺伝研のルリマツリ",
      
        title: "遺伝研のルリマツリ",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/plumbago-auriculata/";
        
      },
    },{id: "post-dischidia-pectenoides-の実生",
      
        title: "Dischidia pectenoides の実生",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/dischidia-pectenoides-seedlings/";
        
      },
    },{id: "post-かずさdna研究所でセミナー発表",
      
        title: "かずさDNA研究所でセミナー発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/kazusa-dna-seminar/";
        
      },
    },{id: "post-jst創発に採択",
      
        title: "JST創発に採択",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/jst-sohatsu-selected/";
        
      },
    },{id: "post-淺賀裕介博士が新天地へ",
      
        title: "淺賀裕介博士が新天地へ",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/yusuke-asaka-departure/";
        
      },
    },{id: "post-千葉大学理学部で集中講義",
      
        title: "千葉大学理学部で集中講義",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/chiba-intensive-lectures-systematics-a/";
        
      },
    },{id: "post-symposium-on-molecular-plant-biotic-interactions-2025で発表",
      
        title: "Symposium on Molecular Plant-Biotic Interactions 2025で発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/symposium-molecular-plant-biotic-interactions-2025/";
        
      },
    },{id: "post-植物学会でシンポジウムを企画",
      
        title: "植物学会でシンポジウムを企画",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/botanical-society-symposium/";
        
      },
    },{id: "post-iibmp2025で発表",
      
        title: "IIBMP2025で発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/iibmp2025/";
        
      },
    },{id: "post-イソコツブムシ採集に同行",
      
        title: "イソコツブムシ採集に同行",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/isokotsubumushi-collection/";
        
      },
    },{id: "post-棟方涼介博士のセミナー",
      
        title: "棟方涼介博士のセミナー",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/ryosuke-munakata-seminar/";
        
      },
    },{id: "post-花序付きの-nepenthes-gracilis-cv-39-sport-39-を購入",
      
        title: "花序付きの Nepenthes gracilis cv. &#39;Sport&#39; を購入",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/nepenthes-gracilis-sport-male-inflorescence/";
        
      },
    },{id: "post-nig-internの受け入れ",
      
        title: "NIG-INTERNの受け入れ",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/nig-intern/";
        
      },
    },{id: "post-東北大学-2025-fris-ti-frisリトリートで発表",
      
        title: "東北大学 2025 FRIS/TI-FRISリトリートで発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/tohoku-fris-ti-fris-retreat/";
        
      },
    },{id: "post-the-1st-international-erato-symposiumで発表",
      
        title: "The 1st International ERATO symposiumで発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/international-erato-symposium/";
        
      },
    },{id: "post-陽川憲博士のセミナー",
      
        title: "陽川憲博士のセミナー",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/ken-yokawa-seminar/";
        
      },
    },{id: "post-遺伝研リトリートに参加",
      
        title: "遺伝研リトリートに参加",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/nig-retreat/";
        
      },
    },{id: "post-triantha-japonicaに羽虫",
      
        title: "Triantha japonicaに羽虫",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/triantha-japonica-inflorescence/";
        
      },
    },{id: "post-liming-cai博士のセミナー",
      
        title: "Liming Cai博士のセミナー",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/liming-cai-seminar/";
        
      },
    },{id: "post-村田隆博士のセミナー",
      
        title: "村田隆博士のセミナー",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/murata-seminar/";
        
      },
    },{id: "post-栽培室の植物が増えてきました",
      
        title: "栽培室の植物が増えてきました",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/cultivation-room-plants/";
        
      },
    },{id: "post-ベンサミアナタバコが旺盛に生育",
      
        title: "ベンサミアナタバコが旺盛に生育",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/nicotiana-benthamiana-growth/";
        
      },
    },{id: "post-山田哲也さんのセミナー",
      
        title: "山田哲也さんのセミナー",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/yamada-tetsuya-heidelberg-seminar/";
        
      },
    },{id: "post-ふじのくに地球環境史ミュージアムで一般向け発表",
      
        title: "ふじのくに地球環境史ミュージアムで一般向け発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/fujinokuni-museum-public-lecture/";
        
      },
    },{id: "post-ゲノムサイズ推定用試料を発送",
      
        title: "ゲノムサイズ推定用試料を発送",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/flow-cytometry-genome-size-estimation/";
        
      },
    },{id: "post-bbqに参加",
      
        title: "BBQに参加",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/kanemaki-lab-bbq/";
        
      },
    },{id: "post-遺伝研前の桜並木",
      
        title: "遺伝研前の桜並木",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/cherry-blossom-petals-at-nig/";
        
      },
    },{id: "post-博士研究員３名が着任",
      
        title: "博士研究員３名が着任",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/postdocs-join/";
        
      },
    },{id: "post-角谷徹仁博士の最終講義",
      
        title: "角谷徹仁博士の最終講義",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/utokyo-final-lecture/";
        
      },
    },{id: "post-村上哲明博士の最終講義",
      
        title: "村上哲明博士の最終講義",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/tmu-final-lecture/";
        
      },
    },{id: "post-第1回植物異分野勉強会で発表",
      
        title: "第1回植物異分野勉強会で発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/plant-ibunya-study-group-1/";
        
      },
    },{id: "post-イシモチソウが開花",
      
        title: "イシモチソウが開花",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/ishimochisou-flowering/";
        
      },
    },{id: "post-omer-gokcumen博士のセミナー",
      
        title: "Omer Gokcumen博士のセミナー",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/omer-gokcumen-seminar/";
        
      },
    },{id: "post-東北大学-独眼竜講話会でセミナー発表",
      
        title: "東北大学・独眼竜講話会でセミナー発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/tohoku-dokuganryu-kowakai-seminar/";
        
      },
    },{id: "post-昇降式デスクを導入",
      
        title: "昇降式デスクを導入",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/height-adjustable-desks/";
        
      },
    },{id: "post-低真空semを借りて実験",
      
        title: "低真空SEMを借りて実験",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/esem-training/";
        
      },
    },{id: "post-技術補佐員２名が着任",
      
        title: "技術補佐員２名が着任",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2025/technicians-join/";
        
      },
    },{id: "post-第5回木村資生記念進化学セミナーで発表",
      
        title: "第5回木村資生記念進化学セミナーで発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/kimura-motoo-evolution-seminar-5/";
        
      },
    },{id: "post-種生物学会第56回大会-岡山-で発表",
      
        title: "種生物学会第56回大会（岡山）で発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/sssb56-okayama/";
        
      },
    },{id: "post-エフエムみしま-かんなみ-ボイス-キューでラジオ収録",
      
        title: "エフエムみしま・かんなみ ボイス・キューでラジオ収録",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/voiceq-radio-recording/";
        
      },
    },{id: "post-分子生物学会年会シンポジウムに参加",
      
        title: "分子生物学会年会シンポジウムに参加",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/mbsj-symposium-plant-survival-strategy/";
        
      },
    },{id: "post-基礎生物学研究所でセミナー発表",
      
        title: "基礎生物学研究所でセミナー発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/nibb-seminar/";
        
      },
    },{id: "post-研究会-イネ分子遺伝学の深化-で発表",
      
        title: "研究会「イネ分子遺伝学の深化」で発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/rice-molecular-genetics/";
        
      },
    },{id: "post-遺伝研でラボミーティングを開始",
      
        title: "遺伝研でラボミーティングを開始",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/lab-meeting-start/";
        
      },
    },{id: "post-保坂碧さんのセミナー",
      
        title: "保坂碧さんのセミナー",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/hosaka-aoi-seminar/";
        
      },
    },{id: "post-yuhan-guoさんが参加",
      
        title: "Yuhan Guoさんが参加",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/yuhan-guo-join/";
        
      },
    },{id: "post-倍数性研究会-サイズ生物学研究会ジョイント研究会に参加",
      
        title: "倍数性研究会＋サイズ生物学研究会ジョイント研究会に参加",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/polyploidy-size-joint-meeting/";
        
      },
    },{id: "post-hector-montero博士が新天地へ",
      
        title: "Hector Montero博士が新天地へ",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/hector-montero-departure/";
        
      },
    },{id: "post-日本植物学会第88回大会-宇都宮-に参加",
      
        title: "日本植物学会第88回大会（宇都宮）に参加",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/bsj88-utsunomiya/";
        
      },
    },{id: "post-三菱財団自然科学研究助成-若手助成-に採択",
      
        title: "三菱財団自然科学研究助成（若手助成）に採択",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/mitsubishi-foundation-grant/";
        
      },
    },{id: "post-フクロユキノシタを箱詰めして共同研究先へ",
      
        title: "フクロユキノシタを箱詰めして共同研究先へ",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/hukuroyukinoshita-packing/";
        
      },
    },{id: "post-日本進化学会大会に参加",
      
        title: "日本進化学会大会に参加",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/sssj-annual-meeting/";
        
      },
    },{id: "post-咲くやこの花館で発表",
      
        title: "咲くやこの花館で発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/sakuyakonohana-talk/";
        
      },
    },{id: "post-生命科学を支える分子系統学-2024-に参加",
      
        title: "「生命科学を支える分子系統学 2024」に参加",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/molecular-phylogenetics-2024/";
        
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
    },{id: "post-文部科学大臣表彰若手科学者賞を受賞",
      
        title: "文部科学大臣表彰若手科学者賞を受賞",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/mext-young-scientist-award/";
        
      },
    },{id: "post-hector-montero博士が着任",
      
        title: "Hector Montero博士が着任",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/hector-join/";
        
      },
    },{id: "post-遺伝研の御衣黄",
      
        title: "遺伝研の御衣黄",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/gyoiko-cherry-blossom/";
        
      },
    },{id: "post-ゲノムシくん",
      
        title: "ゲノムシくん",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/nig-rotary-sotetsu-genomushi/";
        
      },
    },{id: "post-一般公開",
      
        title: "一般公開",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/open-campus/";
        
      },
    },{id: "post-遺伝研前の桜のアーチ",
      
        title: "遺伝研前の桜のアーチ",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/nig-cherry-arch/";
        
      },
    },{id: "post-植物進化研究室が発足",
      
        title: "植物進化研究室が発足",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/lab-start/";
        
      },
    },{id: "post-実験植物を日本へ",
      
        title: "実験植物を日本へ",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/plant-quarantine-import/";
        
      },
    },{id: "post-三島にやってきました",
      
        title: "三島にやってきました",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/arrival-mishima/";
        
      },
    },{id: "post-さらばヴュルツブルク大学",
      
        title: "さらばヴュルツブルク大学",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/farewell-wuerzburg/";
        
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
    },{id: "post-食虫植物コレクションを受け渡し",
      
        title: "食虫植物コレクションを受け渡し",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/carnivorous-plants-collection-transfer/";
        
      },
    },{id: "post-ヴュルツブルク大学で最後のセミナー発表",
      
        title: "ヴュルツブルク大学で最後のセミナー発表",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/last-seminar-at-wuerzburg/";
        
      },
    },{id: "post-研究室ウェブサイトの制作を開始",
      
        title: "研究室ウェブサイトの制作を開始",
      
      description: "",
      section: "記事",
      handler: () => {
        
          window.location.href = "/ja/blog/2024/hp-start/";
        
      },
    },{id: "news-a-simple-inline-announcement",
          title: 'A simple inline announcement.',
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
            },},{id: "profiles-jiawei-li",
          title: 'Jiawei_li',
          description: "",
          section: "",handler: () => {
              window.location.href = "/ja/profiles/prospective_members/jiawei_li/";
            },},{id: "profiles-yukiho-toyama",
          title: 'Yukiho_toyama',
          description: "",
          section: "",handler: () => {
              window.location.href = "/ja/profiles/prospective_members/yukiho_toyama/";
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
