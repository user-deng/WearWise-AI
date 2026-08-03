/**
 * All editorial copy, photography and mock data for 「穿搭处方」.
 * Photography credits live in ATTRIBUTIONS.md.
 */

const u = (id: string, w = 1080) =>
  `https://images.unsplash.com/${id}?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=${w}`;

export const photos = {
  coverPortrait: u("photo-1504275490777-45f30792f13f"),
  coverDetail: u("photo-1536180838057-b604200e6f36"),
  auditionMood: u("photo-1674932668403-33398b81c92f"),
  ootdToday: u("photo-1626097116434-6ff6fc801433"),
  ootdAlt: u("photo-1568948318964-3d7ea7778df0"),
  teaser: u("photo-1601324389523-cb9bd3853025"),
  /** 首页顶部：柔和面料 / 纸张纹理局部裁切 */
  fabricLinen: u("photo-1686806374120-e7ae3f19801d", 900),
  fabricParchment: u("photo-1686806372892-6a18b402bcef", 900),
  fabricGrid: u("photo-1776278515617-09ab61ec1eb8", 900),
  /** 「我的形象」白底全身形象图 */
  avatarFullBody: u("photo-1770182022670-2b7325d7f092", 900),
  profileAvatar: u("photo-1760552069633-c05f246a5d8c", 300),
};

export type Poster = {
  id: string;
  headline: string;
  scene: string;
  narration: string;
  tags: string[];
  image: string;
  /** 正面主视觉视频（有则正面播放视频，替代静态大图） */
  video?: string;
  /** 卡片背面：穿上完整造型后的全身效果 */
  lookImage: string;
  song: { title: string; artist: string; source: string };
  tone: "ink" | "sage" | "blush" | "wine";
  episode: string;
  outfit: OutfitSlot[];
  /** 送花推荐专用：翻面直接展示这张排版图（有则背面只显示它，不显示造型档案） */
  layoutImage?: string;
  /** 送花推荐专用：风格名（如「昭和复古风」） */
  styleName?: string;
};

/** 衣橱大类：与后端数据库（result_生成图.json 的 category.major）对齐。 */
export type ClosetCategory = "上装" | "下装" | "连身" | "鞋履" | "内衣家居";

export type ClosetItem = {
  id: string;
  name: string;
  category: ClosetCategory;
  color: string;
  swatch: string;
  wears: number;
  idleDays: number;
  image: string;
  /** 以下为后端真实标签明细（可选），供编辑弹层展示 */
  sub?: string;
  season?: string;
  scene?: string;
  material?: string;
  style?: string;
  silhouette?: string;
  pattern?: string;
  description?: string;
};

export type OutfitSlot = {
  slot: string;
  options: { id: string; name: string; note: string; owned: boolean; image: string }[];
};

const flat = {
  knit: u("photo-1621198059871-0d5f9b449233", 800),
  denimJacket: u("photo-1708523842501-1619478cea1f", 800),
  stripeShirt: u("photo-1708523842501-800cd1c7505e", 800),
  jeans: u("photo-1637069585336-827b298fe84a", 800),
  necklace: u("photo-1580841831267-17e30b6b4a8b", 800),
  hat: u("photo-1623875286835-cebe5e49e224", 800),
  stack: u("photo-1674572228409-67e576e7d993", 800),
  blueShirt: u("photo-1626497764746-6dc36546b388", 800),
  redJeans: u("photo-1666640920118-3c2de1bfb943", 800),
  blanket: u("photo-1729525292997-b7ed08572551", 800),
};

export const posters: Poster[] = [
  {
    id: "p-lead",
    headline: "明天，成为自己的大女主。",
    scene: "一身冰蓝套装，站在清水混凝土前，任风吹起长发。",
    narration: "气场不必张扬，只要站定，光自然会落到你身上。",
    tags: ["#气场", "#冷调", "#都会感"],
    image: u("photo-1681860317538-12f5b396c1bf", 1400),
    video: "https://fe-video-qc.xhscdn.com/fe-platform-file/104101b8323adshbfg206k9h5igjp20000000006r2g6u6.mp4",
    lookImage: u("photo-1775532101275-4248aa94ee23", 1000),
    layoutImage: "https://fe-video-qc.xhscdn.com/fe-platform-file/104101b8323adshbh7u06k9h5igjp20000000001c87cse.png",
    song: { title: "Bad Guy Slowed", artist: "Léa V.", source: "Apple Music" },
    tone: "ink",
    episode: "EP.018",
    outfit: [
      {
        slot: "外套",
        options: [
          { id: "o1", name: "墨黑挺身西装", note: "垫肩收腰，气场来自结构", owned: true, image: flat.denimJacket },
          { id: "o2", name: "长版风衣", note: "走动时有裙摆感", owned: false, image: flat.stack },
          { id: "o3", name: "灰粉短外套", note: "柔化锋利的轮廓", owned: true, image: flat.knit },
        ],
      },
      {
        slot: "上衣",
        options: [
          { id: "t1", name: "象牙白丝质衬衫", note: "领口敞两颗", owned: true, image: flat.blueShirt },
          { id: "t2", name: "细条纹衬衫", note: "都会的、准确的", owned: true, image: flat.stripeShirt },
        ],
      },
      {
        slot: "下装",
        options: [
          { id: "b1", name: "直筒长裤", note: "落地长度，步伐更稳", owned: true, image: flat.jeans },
          { id: "b2", name: "深色牛仔", note: "把正式感降半档", owned: false, image: flat.redJeans },
        ],
      },
      {
        slot: "配饰",
        options: [
          { id: "a1", name: "细银链", note: "一点冷光", owned: true, image: flat.necklace },
          { id: "a2", name: "宽檐帽", note: "需要一点遮挡时", owned: false, image: flat.hat },
        ],
      },
    ],
  },
  {
    id: "p-breathe",
    headline: "明天，做全场最亮的那束光。",
    scene: "蓝色亮片裙外披薄荷绿长衫，转身时笑得毫无保留。",
    narration: "别怕耀眼，你的闪光本来就该被人看见。",
    tags: ["#闪耀", "#大胆", "#派对感"],
    image: u("photo-1560226494-1906a2134dcc", 1400),
    video: "https://fe-video-qc.xhscdn.com/fe-platform-file/104101b8323adshbm0206k9h5igjp20000000006hjbjno.mp4",
    lookImage: u("photo-1762833069613-c414a893dd1a", 1000),
    layoutImage: "https://fe-video-qc.xhscdn.com/fe-platform-file/104101b8323adshbonu06k9h5igjp20000000002pn8eos.jpg",
    song: { title: "Shine On", artist: "Aya Sato", source: "Spotify" },
    tone: "ink",
    episode: "EP.019",
    outfit: [
      {
        slot: "上衣",
        options: [
          { id: "t3", name: "鼠尾草绿针织", note: "宽松两个码", owned: true, image: flat.knit },
          { id: "t4", name: "白棉 T", note: "最安全的底色", owned: true, image: flat.blueShirt },
        ],
      },
      {
        slot: "下装",
        options: [
          { id: "b3", name: "浅色阔腿裤", note: "留一点风的位置", owned: true, image: flat.jeans },
          { id: "b4", name: "亚麻长裙", note: "走路会有声音", owned: false, image: flat.blanket },
        ],
      },
      {
        slot: "配饰",
        options: [
          { id: "a3", name: "米白帆布包", note: "装得下不确定", owned: true, image: flat.stack },
          { id: "a4", name: "编织草帽", note: "树荫不够时", owned: false, image: flat.hat },
        ],
      },
    ],
  },
  {
    id: "p-soft",
    headline: "明天，用利落赢下这一场。",
    scene: "利落灰西装配黑色手包，倚着栏杆望向远处。",
    narration: "从容不是没有硬仗，是你早已准备好去打。",
    tags: ["#干练", "#通勤", "#笃定"],
    image: u("photo-1632693217835-b482d9ca9ba0", 1400),
    video: "https://fe-video-qc.xhscdn.com/fe-platform-file/104101b8323adshbh7k06k9h5igjp200000000076bmrau.mp4",
    lookImage: u("photo-1770182022670-2b7325d7f092", 1000),
    layoutImage: "https://fe-video-qc.xhscdn.com/fe-platform-file/104101b8323adshbpga06k9h5igjp200000000024jaeme.png",
    song: { title: "Power Move", artist: "Noir Ensemble", source: "网易云音乐" },
    tone: "ink",
    episode: "EP.020",
    outfit: [
      {
        slot: "外套",
        options: [
          { id: "o4", name: "灰粉羊毛长外套", note: "包住肩膀", owned: true, image: flat.knit },
          { id: "o5", name: "厚牛仔外套", note: "更硬一点的保护", owned: true, image: flat.denimJacket },
        ],
      },
      {
        slot: "上衣",
        options: [
          { id: "t5", name: "象牙白高领", note: "贴着脖子的安静", owned: true, image: flat.stripeShirt },
          { id: "t6", name: "细软棉衬衫", note: "袖口卷起", owned: false, image: flat.blueShirt },
        ],
      },
      {
        slot: "鞋子",
        options: [
          { id: "s1", name: "深色乐福鞋", note: "湿地也稳", owned: true, image: flat.stack },
          { id: "s2", name: "白色球鞋", note: "随时可以走远", owned: true, image: flat.jeans },
        ],
      },
    ],
  },
];

/** 兜底假数据：仅在后端不可用时展示；category 已对齐数据库大类。 */
export const closet: ClosetItem[] = [
  { id: "c1", name: "象牙白丝质衬衫", category: "上装", color: "象牙白", swatch: "#efe7d8", wears: 24, idleDays: 2, image: flat.blueShirt },
  { id: "c2", name: "鼠尾草绿针织", category: "上装", color: "鼠尾草绿", swatch: "#8b9a82", wears: 11, idleDays: 9, image: flat.knit },
  { id: "c3", name: "细条纹衬衫", category: "上装", color: "灰白", swatch: "#dcd6cb", wears: 6, idleDays: 41, image: flat.stripeShirt },
  { id: "c4", name: "墨黑针织", category: "上装", color: "墨黑", swatch: "#191614", wears: 31, idleDays: 1, image: flat.stack },
  { id: "c5", name: "直筒长裤", category: "下装", color: "墨黑", swatch: "#191614", wears: 28, idleDays: 3, image: flat.jeans },
  { id: "c6", name: "浅色阔腿裤", category: "下装", color: "浅米", swatch: "#e3dac6", wears: 14, idleDays: 6, image: flat.redJeans },
  { id: "c7", name: "亚麻长裙", category: "连身", color: "灰粉", swatch: "#d6bdb8", wears: 3, idleDays: 96, image: flat.blanket },
  { id: "c8", name: "深色乐福鞋", category: "鞋履", color: "墨黑", swatch: "#191614", wears: 37, idleDays: 1, image: flat.stack },
  { id: "c9", name: "白色球鞋", category: "鞋履", color: "白", swatch: "#f6f4ef", wears: 42, idleDays: 4, image: flat.jeans },
  { id: "c10", name: "灰粉羊毛长外套", category: "上装", color: "灰粉", swatch: "#d6bdb8", wears: 9, idleDays: 12, image: flat.knit },
  { id: "c11", name: "墨黑挺身西装", category: "上装", color: "墨黑", swatch: "#191614", wears: 17, idleDays: 5, image: flat.denimJacket },
  { id: "c12", name: "厚牛仔外套", category: "上装", color: "靛蓝", swatch: "#4a5a72", wears: 4, idleDays: 73, image: flat.denimJacket },
  { id: "c13", name: "细银链", category: "内衣家居", color: "银", swatch: "#c9c6bf", wears: 22, idleDays: 2, image: flat.necklace },
  { id: "c14", name: "米白帆布包", category: "内衣家居", color: "米白", swatch: "#ece4d4", wears: 30, idleDays: 1, image: flat.stack },
  { id: "c15", name: "宽檐帽", category: "内衣家居", color: "驼", swatch: "#a98b6b", wears: 2, idleDays: 118, image: flat.hat },
];

export const closetInsights = [
  {
    kind: "断舍离" as const,
    title: "有 3 件在等一个不会来的场合",
    body: "亚麻长裙、宽檐帽、厚牛仔外套 闲置均超过 70 天。要不要先移到「观察区」，30 天后再决定？",
    accent: "var(--rx-wine)",
  },
  {
    kind: "焕新搭配" as const,
    title: "细条纹衬衫 × 浅色阔腿裤",
    body: "两件都在你的衣橱里，却从没同时出现过。它刚好能演「松弛」这个角色。",
    accent: "var(--rx-sage-deep)",
  },
  {
    kind: "重复度" as const,
    title: "墨黑占了近 40%",
    body: "本月 12 套里有 7 套以墨黑为主。加入灰粉或鼠尾草绿，画面会呼吸。",
    accent: "var(--rx-blush-deep)",
  },
];

export const beatQuestion = {
  title: "跟着节拍，点 5 秒。",
  hint: "不用准，只要跟着你自己的速度。",
};

export const intuitionPairs = [
  {
    id: "q-color",
    label: "凭直觉选一边",
    prompt: "明天的底色是？",
    left: { name: "墨黑 × 象牙白", swatches: ["#14110f", "#f2ede3"], read: "结构、边界" },
    right: { name: "灰粉 × 鼠尾草绿", swatches: ["#d6bdb8", "#8b9a82"], read: "柔软、呼吸" },
  },
  {
    id: "q-fabric",
    label: "凭直觉选一边",
    prompt: "想被什么样的触感包着？",
    left: { name: "挺身羊毛", swatches: ["#3a3431", "#6b6259"], read: "被撑住" },
    right: { name: "水洗棉麻", swatches: ["#e6dece", "#c9bfa9"], read: "被放开" },
  },
];

export const feelings = [
  { id: "f-ease", name: "松弛", line: "把肩膀放下来", swatch: "#8b9a82" },
  { id: "f-courage", name: "勇气", line: "推开那扇门", swatch: "#6b2233" },
  { id: "f-energy", name: "能量", line: "想快一点", swatch: "#c08a3e" },
  { id: "f-safe", name: "安全感", line: "先被自己接住", swatch: "#d6bdb8" },
];

export const schedule = [
  { time: "09:30", title: "季度复盘会", note: "你要开场的那一场" },
  { time: "14:00", title: "跨部门对齐", note: "会有分歧" },
  { time: "19:30", title: "和 L 吃饭", note: "很久没见了" },
];

export const weather = { city: "上海", temp: "24°", cond: "多云转晴", wind: "东南风 2 级" };

export const guessCopy = {
  primary: "我猜你今天有点紧绷，对吗？",
  because: ["节拍偏快，且越点越快", "你两次都选了「被撑住」的那一边", "明天 09:30 有一场要你开口的会"],
  alt: {
    primary: "也可能不是紧绷，是你把标准放得太高了。",
    because: ["你想被结构撑住，不是想被保护", "选择很快，说明你其实已经决定了", "紧绷之下更像一种蓄势"],
  },
};

export const reviewOptions = [
  { id: "r-in", label: "完全进入状态", after: "稳定", tone: "sage" as const },
  { id: "r-half", label: "偶尔有点出戏", after: "起伏", tone: "blush" as const },
  { id: "r-no", label: "这个角色不适合我", after: "松开", tone: "wine" as const },
];

/* ─────────── 首页｜今日的自己 ─────────── */

export const ootdMoodLines = [
  "今天的你看起来松弛又坚定，像是在忙碌里为自己留了一点呼吸。",
  "今天的你有一点疲惫，但依然把生活整理得很体面。",
  "今天的你把颜色压得很低，像在给自己留一点安静的余地。",
];

export const ootdShots = [photos.ootdToday, photos.ootdAlt];

/* ─────────── 首页｜送自己一束花 ─────────── */

export const flowerGame = {
  title: "今天选一束花送给自己",
  subtitle: "给依然认真穿搭的你。",
  entryNote: "选一束你最喜欢的。",
  cta: "去挑一束",
  stepOne: {
    title: "今天，选一束花送给自己吧。",
    note: "不用想太久，选下第一眼喜欢的那束。",
  },
  result: {
    title: "今天，这束花想对你说——",
    primary: "收下这束花",
    secondary: "再选一次",
  },
  disclaimer: "这是一段属于此刻的花语，不是心理诊断。",
};

/** 花朵适生的天气氛围 */
export type WeatherKey =
  | "sun"
  | "spring"
  | "rain"
  | "mist"
  | "breeze"
  | "desert"
  | "tropical"
  | "dusk";

export type WeatherMood = {
  label: string;
  latin: string;
  /** 与花的生长环境相扣的一句话 */
  habitat: string;
};

/** 每种天气氛围的文案与拉丁标注（配色见 WeatherScene 组件） */
export const weatherMoods: Record<WeatherKey, WeatherMood> = {
  sun: { label: "盛夏的烈日", latin: "Full Sun", habitat: "它在灼热的阳光里长大，越晒越精神。" },
  spring: { label: "微凉的春日", latin: "Spring Light", habitat: "它在乍暖的春光里慢慢舒展开来。" },
  rain: { label: "连绵的细雨", latin: "Gentle Rain", habitat: "它喝着一场又一场的雨，长得水灵。" },
  mist: { label: "清晨的薄雾", latin: "Morning Mist", habitat: "它生在潮湿的水边，被雾气轻轻裹着。" },
  breeze: { label: "开阔的清风", latin: "Open Breeze", habitat: "它在辽阔的原野上，随风轻轻摇。" },
  desert: { label: "干燥的旷野", latin: "Arid Plains", habitat: "它在干旱的土地里扎根，耐得住寂寞。" },
  tropical: { label: "湿热的热带", latin: "Tropics", habitat: "它来自终年温热的南方，浓烈而张扬。" },
  dusk: { label: "秋日的暮色", latin: "Autumn Dusk", habitat: "它在转凉的秋光里，开得沉静而深。" },
};

export type Bouquet = {
  id: string;
  no: string;
  photo: string;
  /** 花的名字（真实对应图片里的花种） */
  flower: string;
  /** 一句花语 */
  word: string;
  /** 这束花想对你说的话（花语解释） */
  meaning: string;
  /** 情绪关键词：用于后端做情绪判断与 query 推荐 */
  emotions: string[];
  weather: WeatherKey;
};

const flowerImg = (n: number) =>
  `/bouquets/bouquet-vector-${String(n).padStart(2, "0")}.png`;

/**
 * 12 束手绘花束 —— 花名 / 花语 / 解释 / 情绪关键词。
 * 每束对应真实图片里的花种，花语与情绪关键词据此撰写，供选花后做情绪分析。
 */
export const bouquets: Bouquet[] = [
  {
    id: "f01", no: "01", photo: flowerImg(1), flower: "粉色郁金香",
    word: "今天也要温柔地爱自己。",
    meaning: "粉郁金香代表体贴与关怀。你今天更想被温柔对待，也愿意先对自己好一点。",
    emotions: ["温柔", "被爱", "松弛", "治愈"], weather: "spring",
  },
  {
    id: "f02", no: "02", photo: flowerImg(2), flower: "橙色非洲菊",
    word: "你身上有藏不住的元气。",
    meaning: "橙色非洲菊象征热情与活力。你此刻元气满满，想把好状态穿在身上。",
    emotions: ["元气", "活力", "明亮", "自信"], weather: "sun",
  },
  {
    id: "f03", no: "03", photo: flowerImg(3), flower: "红色郁金香",
    word: "勇敢一点，你值得被看见。",
    meaning: "红郁金香是热烈的告白。你想被看见、想更笃定地表达自己。",
    emotions: ["勇气", "热烈", "笃定", "气场"], weather: "spring",
  },
  {
    id: "f04", no: "04", photo: flowerImg(4), flower: "蓝色鸢尾",
    word: "保持清醒，也保持优雅。",
    meaning: "蓝鸢尾代表智慧与沉静。你今天想要清爽、克制、不动声色的体面。",
    emotions: ["冷静", "清醒", "优雅", "克制"], weather: "mist",
  },
  {
    id: "f05", no: "05", photo: flowerImg(5), flower: "向日葵",
    word: "朝着光的方向就好。",
    meaning: "向日葵永远向阳。你想被温暖包围，也想把这份积极带给别人。",
    emotions: ["阳光", "积极", "温暖", "能量"], weather: "sun",
  },
  {
    id: "f06", no: "06", photo: flowerImg(6), flower: "红色虞美人",
    word: "别怕，你比想象中更有力量。",
    meaning: "虞美人是安慰，也是坚韧。你在柔软里藏着一股不服输的劲儿。",
    emotions: ["坚韧", "勇气", "安慰", "锋利"], weather: "breeze",
  },
  {
    id: "f07", no: "07", photo: flowerImg(7), flower: "粉百合",
    word: "你本来就很好，无需证明。",
    meaning: "百合象征纯净与优雅。你想要一点体面又松弛的高级感。",
    emotions: ["优雅", "高级感", "松弛", "温柔"], weather: "sun",
  },
  {
    id: "f08", no: "08", photo: flowerImg(8), flower: "紫色绣球",
    word: "慢下来，好好抱抱自己。",
    meaning: "绣球代表守护与团聚。你今天需要一点安全感，想被稳稳接住。",
    emotions: ["安全感", "治愈", "低能量", "安静"], weather: "rain",
  },
  {
    id: "f09", no: "09", photo: flowerImg(9), flower: "缤纷野花",
    word: "做点让自己开心的事吧。",
    meaning: "一整袋野花是随性的快乐。你想跳出常规，玩一点新鲜的搭配。",
    emotions: ["自由", "俏皮", "创意", "活力"], weather: "breeze",
  },
  {
    id: "f10", no: "10", photo: flowerImg(10), flower: "粉色香水百合",
    word: "你值得所有的浪漫。",
    meaning: "香水百合甜而不腻。你今天想要一点甜、一点浪漫的心动感。",
    emotions: ["浪漫", "甜美", "温柔", "心动"], weather: "sun",
  },
  {
    id: "f11", no: "11", photo: flowerImg(11), flower: "珊瑚色牡丹",
    word: "大方地耀眼一次吧。",
    meaning: "牡丹是雍容与富贵。你想要一点隆重、一点被瞩目的高光时刻。",
    emotions: ["华丽", "隆重", "气场", "自信"], weather: "spring",
  },
  {
    id: "f12", no: "12", photo: flowerImg(12), flower: "蓝色飞燕草",
    word: "自由自在，才是今天的你。",
    meaning: "飞燕草迎风生长，代表轻盈与自由。你想要清爽、不被束缚的一天。",
    emotions: ["自由", "清爽", "轻盈", "松弛"], weather: "breeze",
  },
];

/* ─────────── 首页｜全国用户穿搭 ─────────── */

export type LookItem = {
  slot: string;
  name: string;
  note: string;
  owned: boolean;
  image: string;
};

export type CityLook = {
  id: string;
  city: string;
  nickname: string;
  avatar: string;
  photo: string;
  caption: string;
  likes: number;
  /** 卡片翻面后的单品清单 */
  items: LookItem[];
};

export const cityLooks: CityLook[] = [
  {
    id: "cl1",
    city: "上海",
    nickname: "阿鹿",
    avatar: u("photo-1760552069633-c05f246a5d8c", 200),
    photo: u("photo-1770182022670-2b7325d7f092", 900),
    caption: "今天没有精心打扮，只是想让自己舒服一点。",
    likes: 268,
    items: [
      { slot: "上衣", name: "奶白粗针织衫", note: "落肩 · 微阔", owned: true, image: flat.knit },
      { slot: "下装", name: "浅色直筒牛仔裤", note: "九分 · 不修身", owned: true, image: flat.jeans },
      { slot: "鞋子", name: "米白皮革平底鞋", note: "圆头 · 软底", owned: false, image: flat.stack },
      { slot: "配饰", name: "细链条项链", note: "两指长度", owned: true, image: flat.necklace },
    ],
  },
  {
    id: "cl2",
    city: "成都",
    nickname: "小满",
    avatar: u("photo-1583318605147-8e52610d9c75", 200),
    photo: u("photo-1762833069613-c414a893dd1a", 900),
    caption: "下雨也没关系，我把好心情穿在了身上。",
    likes: 431,
    items: [
      { slot: "外套", name: "水洗牛仔外套", note: "宽肩 · 略硬挺", owned: true, image: flat.denimJacket },
      { slot: "上衣", name: "细条纹衬衫", note: "内搭 · 露一点领", owned: true, image: flat.stripeShirt },
      { slot: "下装", name: "砖红直筒长裤", note: "全身唯一的亮色", owned: false, image: flat.redJeans },
      { slot: "包袋", name: "帆布托特包", note: "装得下一天", owned: true, image: flat.stack },
    ],
  },
  {
    id: "cl3",
    city: "北京",
    nickname: "Yun",
    avatar: u("photo-1764384700065-304c92b11e9c", 200),
    photo: u("photo-1775532101275-4248aa94ee23", 900),
    caption: "今天要开一场重要的会，所以穿得像自己已经准备好了。",
    likes: 512,
    items: [
      { slot: "上衣", name: "浅蓝丝质衬衫", note: "扣到第二颗", owned: true, image: flat.blueShirt },
      { slot: "下装", name: "深色高腰长裤", note: "压住上半身的量", owned: true, image: flat.jeans },
      { slot: "鞋子", name: "黑色尖头低跟", note: "只加两厘米", owned: false, image: flat.stack },
      { slot: "配饰", name: "宽檐羊毛帽", note: "会议前摘下", owned: true, image: flat.hat },
    ],
  },
  {
    id: "cl4",
    city: "杭州",
    nickname: "小野",
    avatar: u("photo-1770748034186-6d6e5738cddf", 200),
    photo: u("photo-1746155885896-ee78ae9e9dd7", 900),
    caption: "沿着河边走了很久，衣服很轻，心也跟着轻。",
    likes: 189,
    items: [
      { slot: "上衣", name: "米色棉麻长衫", note: "袖口卷一折", owned: true, image: flat.knit },
      { slot: "下装", name: "浅灰阔腿裤", note: "走路会飘", owned: false, image: flat.jeans },
      { slot: "鞋子", name: "白色帆布鞋", note: "旧一点更好", owned: true, image: flat.stack },
      { slot: "配饰", name: "薄棉围巾", note: "傍晚风大时", owned: true, image: flat.blanket },
    ],
  },
  {
    id: "cl5",
    city: "广州",
    nickname: "阿May",
    avatar: u("photo-1638661711467-e6280d54cce0", 200),
    photo: u("photo-1769103638533-eb73b58b610b", 900),
    caption: "热得不想讲话，就让棉麻替我说吧。",
    likes: 224,
    items: [
      { slot: "上衣", name: "白色棉麻短袖", note: "宽松 · 不贴身", owned: true, image: flat.stripeShirt },
      { slot: "下装", name: "深蓝薄牛仔裤", note: "薄到像没穿", owned: true, image: flat.jeans },
      { slot: "鞋子", name: "皮革凉拖", note: "露脚背降温", owned: false, image: flat.stack },
      { slot: "包袋", name: "小号斜挎包", note: "只带必需品", owned: true, image: flat.stack },
    ],
  },
];

/* ─────────── 衣橱｜我的形象 ─────────── */

export const profile = {
  nickname: "林一格",
  height: "166 cm",
  weight: "52 kg",
  bodyNotes: "肩线偏窄、腰线明显、下半身量感较强",
  fullBody: photos.avatarFullBody,
  avatar: photos.profileAvatar,
  fileNo: "NO. 0417",
};

/* ─────────── 首页｜今日的自己（刊物版） ─────────── */

export type Reading = { line: string; keywords: string[]; signature: string };

export const ootdReadings: Reading[] = [
  {
    line: "今天的你看起来松弛又坚定，像是在忙碌里为自己留了一点呼吸。",
    keywords: ["松弛", "坚定", "留白"],
    signature: "松弛的坚定",
  },
  {
    line: "今天的你有一点疲惫，但依然把生活整理得很体面。",
    keywords: ["疲惫", "体面", "整理"],
    signature: "体面的疲惫",
  },
  {
    line: "今天的你把颜色压得很低，像在给自己留一点安静的余地。",
    keywords: ["安静", "低饱和", "余地"],
    signature: "低声的一天",
  },
];

/** 往期日记 — 底部胶片条 */
export type DiaryEntry = {
  id: string;
  ep: string;
  /** 7 月的第几天 */
  day: number;
  date: string;
  /** 两个字的当日总结 */
  word: string;
  photo: string;
  /** 当日上传照片后生成的那段情绪价值记录 */
  line: string;
};

const shotPool = [
  photos.ootdAlt,
  photos.coverDetail,
  photos.ootdToday,
  photos.auditionMood,
  photos.coverPortrait,
  photos.teaser,
];

const rawArchive: [number, string, string][] = [
  [30, "紧绷", "今天的你把自己扣得很紧，连袖口都不肯松开一折。"],
  [29, "轻快", "今天的你走得比平时快一点，衣服跟着风一起替你笑了。"],
  [28, "钝感", "今天的你没什么情绪，穿得也很安静，这样也很好。"],
  [27, "克制", "今天的你把所有颜色都收了起来，只留下一条干净的线。"],
  [26, "松弛", "今天的你终于允许自己不好看一点，于是反而好看了。"],
  [25, "锋利", "今天的你把肩线立起来，像替自己挡了一整天的风。"],
  [24, "温和", "今天的你选了最柔的那件，像在给自己一个不出声的拥抱。"],
  [23, "疲惫", "今天的你有一点撑不住，但还是把自己整理得很体面。"],
  [22, "明亮", "今天的你在袖口留了一点亮色，那是你偷藏的好心情。"],
  [21, "笃定", "今天的你穿得像已经准备好了，其实准备好的是你自己。"],
  [20, "潮湿", "今天的你和天气一起沉了一点，棉麻替你吸走了多余的重量。"],
  [18, "轻盈", "今天的你什么都没多穿，也什么都没多想。"],
  [17, "混乱", "今天的你在混乱里保持漂亮，这件事本身就值得记一笔。"],
  [15, "安静", "今天的你把声音调低了，衣服也跟着轻声说话。"],
  [14, "倔强", "今天的你选了最不方便的那双鞋，只因为它像你。"],
  [12, "柔软", "今天的你允许自己被照顾，这不是退让，是聪明。"],
  [10, "清醒", "今天的你把腰线露出来，像给自己划了一条清楚的界。"],
  [8, "缓慢", "今天的你走得很慢，衣服的褶皱都跟着你慢下来。"],
  [6, "干净", "今天的你只用了两个颜色，把一天过得很清楚。"],
  [3, "勇敢", "今天的你把紧张穿成了力量，没有人看得出来。"],
];

/**
 * 往期日记数据源。
 * 往期与日历只展示「记录图」里真实署名过的日子（后端 ootd_diary.json），
 * 因此这里的 mock 兜底置空；断网/后端不可用时，往期会显示为空。
 * 如需恢复占位演示数据，把下面改回 rawArchive.map(...) 即可（rawArchive 保留在上方）。
 */
export const diaryArchive: DiaryEntry[] = [];

/** 首页往期条：最多 10 张 */
export const pastDiaries = diaryArchive.slice(0, 10);

/** 取一条日记的可排序日期键：优先真实 iso(YYYY-MM-DD)，否则用 date(MM.DD) 兜底。 */
function diaryKey(e: DiaryEntry): string {
  const iso = (e as { iso?: string }).iso;
  return iso || e.date; // date 形如 "08.01"，字符串比较即可正确排新旧
}

/**
 * 合并「往期日记」：真实署名条目按日期覆盖 mock 数据，再按真实日期降序（最新在最前）。
 * 用于日历总览与往期胶片条：让今天新署名的那张排在往期最前面。
 */
export function mergeDiary(base: DiaryEntry[], real: DiaryEntry[]): DiaryEntry[] {
  const byDate = new Map<string, DiaryEntry>();
  for (const e of base) byDate.set(diaryKey(e), e);
  for (const e of real) byDate.set(diaryKey(e), e); // 真实条目覆盖同一天的 mock
  return [...byDate.values()].sort((a, b) => diaryKey(b).localeCompare(diaryKey(a)));
}

export const archiveMonth = { year: 2026, month: 7, label: "2026 年 7 月", latin: "July 2026" };
