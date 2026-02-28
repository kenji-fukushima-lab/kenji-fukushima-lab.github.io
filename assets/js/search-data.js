
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
          description: "Publications from the Fukushima Lab. Authors who contributed as members of the Fukushima Lab are shown in bold. Preview images are attached to papers in which lab members are (co-)first or (co-)corresponding authors. †: co-first authors. *: (co-)corresponding authors.",
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
          description: "List of research resources developed by the Fukushima Lab",
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
        },{id: "post-仁木宏典博士の最終講義",
      
        title: "仁木宏典博士の最終講義",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2026/niki-final-lecture/";
        
      },
    },{id: "post-中学生の職場体験",
      
        title: "中学生の職場体験",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2026/junior-high-internship/";
        
      },
    },{id: "post-遺伝学講座-みしまで講演",
      
        title: "遺伝学講座・みしまで講演",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2026/iden-gaku-kouza-mishima/";
        
      },
    },{id: "post-サントリーsunriseに採択",
      
        title: "サントリーSunRiSEに採択",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2026/grant-awarded/";
        
      },
    },{id: "post-workshop-on-spatial-omics-in-plantsに参加",
      
        title: "Workshop on Spatial Omics in Plantsに参加",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2026/spatial-omics-in-plants/";
        
      },
    },{id: "post-イネ属近縁野生種研究会で講演",
      
        title: "イネ属近縁野生種研究会で講演",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/oryza-wild-species-meeting/";
        
      },
    },{id: "post-分子生物学会2025でシンポジウムを企画",
      
        title: "分子生物学会2025でシンポジウムを企画",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/mbsj2025-symposium/";
        
      },
    },{id: "post-ラボでサーバーラックを組み立て",
      
        title: "ラボでサーバーラックを組み立て",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/server-rack-assembly/";
        
      },
    },{id: "post-ラボミーティングでマツバランの実物",
      
        title: "ラボミーティングでマツバランの実物",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/matsubaran-lab-meeting/";
        
      },
    },{id: "post-食虫植物の形質転換実験で使う蛍光顕微鏡",
      
        title: "食虫植物の形質転換実験で使う蛍光顕微鏡",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/microscope-installed-clean-bench/";
        
      },
    },{id: "post-ガスボンベ式発電機を試運転",
      
        title: "ガスボンベ式発電機を試運転",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/generator-test-run/";
        
      },
    },{id: "post-福島和紀博士のセミナー",
      
        title: "福島和紀博士のセミナー",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/kazuki-fukushima-seminar/";
        
      },
    },{id: "post-第1384回nigコロキウムで講演",
      
        title: "第1384回NIGコロキウムで講演",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/nig-colloquium-1384/";
        
      },
    },{id: "post-遺伝研のルリマツリ",
      
        title: "遺伝研のルリマツリ",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/plumbago-auriculata/";
        
      },
    },{id: "post-dischidia-pectenoides-の実生",
      
        title: "Dischidia pectenoides の実生",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/dischidia-pectenoides-seedlings/";
        
      },
    },{id: "post-jst創発に採択",
      
        title: "JST創発に採択",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/jst-sohatsu-selected/";
        
      },
    },{id: "post-淺賀裕介博士が新天地へ",
      
        title: "淺賀裕介博士が新天地へ",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/yusuke-asaka-departure/";
        
      },
    },{id: "post-植物学会でシンポジウムを企画",
      
        title: "植物学会でシンポジウムを企画",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/botanical-society-symposium/";
        
      },
    },{id: "post-iibmp2025で発表",
      
        title: "IIBMP2025で発表",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/iibmp2025/";
        
      },
    },{id: "post-イソコツブムシ採集に同行",
      
        title: "イソコツブムシ採集に同行",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/isokotsubumushi-collection/";
        
      },
    },{id: "post-棟方涼介博士のセミナー",
      
        title: "棟方涼介博士のセミナー",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/ryosuke-munakata-seminar/";
        
      },
    },{id: "post-花序付きの-nepenthes-gracilis-cv-39-sport-39-を購入",
      
        title: "花序付きの Nepenthes gracilis cv. &#39;Sport&#39; を購入",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/nepenthes-gracilis-sport-male-inflorescence/";
        
      },
    },{id: "post-nig-internの受け入れ",
      
        title: "NIG-INTERNの受け入れ",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/nig-intern/";
        
      },
    },{id: "post-埼玉大学の国際シンポジウムに参加",
      
        title: "埼玉大学の国際シンポジウムに参加",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/international-erato-symposium/";
        
      },
    },{id: "post-陽川憲博士のセミナー",
      
        title: "陽川憲博士のセミナー",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/ken-yokawa-seminar/";
        
      },
    },{id: "post-nig-retreatに参加",
      
        title: "NIG Retreatに参加",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/nig-retreat/";
        
      },
    },{id: "post-triantha-japonicaに羽虫",
      
        title: "Triantha japonicaに羽虫",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/triantha-japonica-inflorescence/";
        
      },
    },{id: "post-liming-cai博士のセミナー",
      
        title: "Liming Cai博士のセミナー",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/liming-cai-seminar/";
        
      },
    },{id: "post-村田隆博士のセミナー",
      
        title: "村田隆博士のセミナー",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/murata-seminar/";
        
      },
    },{id: "post-栽培室の植物が増えてきました",
      
        title: "栽培室の植物が増えてきました",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/cultivation-room-plants/";
        
      },
    },{id: "post-ベンサミアナタバコが旺盛に生育",
      
        title: "ベンサミアナタバコが旺盛に生育",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/nicotiana-benthamiana-growth/";
        
      },
    },{id: "post-山田哲也さんのセミナー",
      
        title: "山田哲也さんのセミナー",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/yamada-tetsuya-heidelberg-seminar/";
        
      },
    },{id: "post-ふじのくに地球環境史ミュージアムで一般向け講演",
      
        title: "ふじのくに地球環境史ミュージアムで一般向け講演",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/fujinokuni-museum-public-lecture/";
        
      },
    },{id: "post-ゲノムサイズ推定用試料を発送",
      
        title: "ゲノムサイズ推定用試料を発送",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/flow-cytometry-genome-size-estimation/";
        
      },
    },{id: "post-bbqに参加",
      
        title: "BBQに参加",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/kanemaki-lab-bbq/";
        
      },
    },{id: "post-遺伝研前の桜並木",
      
        title: "遺伝研前の桜並木",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/cherry-blossom-petals-at-nig/";
        
      },
    },{id: "post-博士研究員３名が着任",
      
        title: "博士研究員３名が着任",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/postdocs-join/";
        
      },
    },{id: "post-角谷徹仁博士の最終講義",
      
        title: "角谷徹仁博士の最終講義",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/utokyo-final-lecture/";
        
      },
    },{id: "post-村上哲明博士の最終講義",
      
        title: "村上哲明博士の最終講義",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/tmu-final-lecture/";
        
      },
    },{id: "post-イシモチソウが開花",
      
        title: "イシモチソウが開花",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/ishimochisou-flowering/";
        
      },
    },{id: "post-omer-gokcumen博士のセミナー",
      
        title: "Omer Gokcumen博士のセミナー",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/omer-gokcumen-seminar/";
        
      },
    },{id: "post-昇降式デスクを導入",
      
        title: "昇降式デスクを導入",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/height-adjustable-desks/";
        
      },
    },{id: "post-低真空semを借りて実験",
      
        title: "低真空SEMを借りて実験",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/esem-training/";
        
      },
    },{id: "post-技術補佐員２名が着任",
      
        title: "技術補佐員２名が着任",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2025/technicians-join/";
        
      },
    },{id: "post-種生物学会第56回大会-岡山-に参加",
      
        title: "種生物学会第56回大会（岡山）に参加",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/sssb56-okayama/";
        
      },
    },{id: "post-エフエムみしま-かんなみ-ボイス-キューでラジオ収録",
      
        title: "エフエムみしま・かんなみ ボイス・キューでラジオ収録",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/voiceq-radio-recording/";
        
      },
    },{id: "post-分子生物学会年会シンポジウムに参加",
      
        title: "分子生物学会年会シンポジウムに参加",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/mbsj-symposium-plant-survival-strategy/";
        
      },
    },{id: "post-研究会-イネ分子遺伝学の深化-で発表",
      
        title: "研究会「イネ分子遺伝学の深化」で発表",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/rice-molecular-genetics/";
        
      },
    },{id: "post-遺伝研でラボミーティングを開始",
      
        title: "遺伝研でラボミーティングを開始",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/lab-meeting-start/";
        
      },
    },{id: "post-保坂碧さんのセミナー",
      
        title: "保坂碧さんのセミナー",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/hosaka-aoi-seminar/";
        
      },
    },{id: "post-yuhan-guoさんが参加",
      
        title: "Yuhan Guoさんが参加",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/yuhan-guo-join/";
        
      },
    },{id: "post-倍数性研究会-サイズ生物学研究会ジョイント研究会に参加",
      
        title: "倍数性研究会＋サイズ生物学研究会ジョイント研究会に参加",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/polyploidy-size-joint-meeting/";
        
      },
    },{id: "post-hector-montero博士が新天地へ",
      
        title: "Hector Montero博士が新天地へ",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/hector-montero-departure/";
        
      },
    },{id: "post-日本植物学会第88回大会-宇都宮-に参加",
      
        title: "日本植物学会第88回大会（宇都宮）に参加",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/bsj88-utsunomiya/";
        
      },
    },{id: "post-フクロユキノシタを箱詰めして共同研究先へ",
      
        title: "フクロユキノシタを箱詰めして共同研究先へ",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/hukuroyukinoshita-packing/";
        
      },
    },{id: "post-日本進化学会大会に参加",
      
        title: "日本進化学会大会に参加",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/sssj-annual-meeting/";
        
      },
    },{id: "post-咲くやこの花館で講演",
      
        title: "咲くやこの花館で講演",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/sakuyakonohana-talk/";
        
      },
    },{id: "post-生命科学を支える分子系統学-2024-に参加",
      
        title: "「生命科学を支える分子系統学 2024」に参加",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/molecular-phylogenetics-2024/";
        
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
    },{id: "post-文部科学大臣表彰若手科学者賞を受賞",
      
        title: "文部科学大臣表彰若手科学者賞を受賞",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/mext-young-scientist-award/";
        
      },
    },{id: "post-hector-montero博士が着任",
      
        title: "Hector Montero博士が着任",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/hector-join/";
        
      },
    },{id: "post-遺伝研の御衣黄",
      
        title: "遺伝研の御衣黄",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/gyoiko-cherry-blossom/";
        
      },
    },{id: "post-ゲノムシくん",
      
        title: "ゲノムシくん",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/nig-rotary-sotetsu-genomushi/";
        
      },
    },{id: "post-一般公開",
      
        title: "一般公開",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/open-campus/";
        
      },
    },{id: "post-遺伝研前の桜のアーチ",
      
        title: "遺伝研前の桜のアーチ",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/nig-cherry-arch/";
        
      },
    },{id: "post-植物進化研究室が発足",
      
        title: "植物進化研究室が発足",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/lab-start/";
        
      },
    },{id: "post-実験植物を日本へ",
      
        title: "実験植物を日本へ",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/plant-quarantine-import/";
        
      },
    },{id: "post-三島にやってきました",
      
        title: "三島にやってきました",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/arrival-mishima/";
        
      },
    },{id: "post-さらばヴュルツブルク大学",
      
        title: "さらばヴュルツブルク大学",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/farewell-wuerzburg/";
        
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
    },{id: "post-食虫植物コレクションを受け渡し",
      
        title: "食虫植物コレクションを受け渡し",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/carnivorous-plants-collection-transfer/";
        
      },
    },{id: "post-ヴュルツブルク大学で最後のセミナー発表",
      
        title: "ヴュルツブルク大学で最後のセミナー発表",
      
      description: "",
      section: "Posts",
      handler: () => {
        
          window.location.href = "/blog/2024/last-seminar-at-wuerzburg/";
        
      },
    },{id: "post-研究室ウェブサイトの制作を開始",
      
        title: "研究室ウェブサイトの制作を開始",
      
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
      title: 'Switch to light mode',
      description: 'Change the site theme to light mode',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Switch to dark mode',
      description: 'Change the site theme to dark mode',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use the system default theme',
      description: 'Change the site theme to the system default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
