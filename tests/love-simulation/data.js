export const DIMENSIONS = [
  { key: "empathy", name: "情绪感知", low: "先看事实", high: "先接情绪" },
  { key: "expression", name: "直接表达", low: "观察等待", high: "清楚说出" },
  { key: "boundary", name: "边界意识", low: "关系融合", high: "尊重空间" },
  { key: "reliability", name: "稳定投入", low: "跟随当下", high: "持续兑现" },
  { key: "repair", name: "冲突修复", low: "暂时搁置", high: "主动收口" },
  { key: "growth", name: "未来共建", low: "享受此刻", high: "一起规划" }
];

export const TIERS = [
  { min: 0, max: 4, title: "开局即劝退", tag: "FIRST EPISODE EXIT" },
  { min: 5, max: 8, title: "暧昧区迷路", tag: "MIXED SIGNALS" },
  { min: 9, max: 12, title: "关系试训生", tag: "LOVE TRAINEE" },
  { min: 13, max: 15, title: "心动通关者", tag: "HEART PASS" },
  { min: 16, max: 18, title: "长期关系高配玩家", tag: "LONG-TERM PLAYER" },
  { min: 19, max: 20, title: "隐藏结局·双向奔赴", tag: "TRUE ENDING" }
];

function punchUpOption(text) {
  const openers = [
    [/^故意/, "胜负欲上线：故意"],
    [/^假装/, "表面稳如老狗：假装"],
    [/^直接/, "不绕弯子：直接"],
    [/^马上/, "一秒上头：马上"],
    [/^立刻/, "当场开大：立刻"],
    [/^要求/, "直接上强度：要求"],
    [/^坚持/, "态度焊死：坚持"],
    [/^默认/, "脑补结局：默认"],
    [/^认为/, "当场下判断：认为"],
    [/^觉得/, "心里警铃大作：觉得"],
    [/^嘴上/, "嘴上一套：嘴上"],
    [/^表面/, "表面风平浪静：表面"],
    [/^先/, "先别上头：先"],
    [/^接受/, "接住这球：接受"],
    [/^尊重/, "边界感上线：尊重"],
    [/^同意/, "认真派上线：同意"],
    [/^明确/, "把底牌亮出来：明确"],
    [/^告诉/, "把话挑明：告诉"],
    [/^说明/, "有话直说：说明"],
    [/^问/, "当场问清：问"],
    [/^回/, "消息框里打下：回"],
    [/^说/, "嘴比脑子快：说"],
    [/^承诺/, "承诺先拉满：承诺"],
    [/^给/, "行动派出手：给"],
    [/^陪/, "陪伴模式开启：陪"],
    [/^不说/, "沉默流打法：不说"],
    [/^不预设/, "先收起剧本：不预设"],
    [/^如果/, "看情况出牌：如果"],
    [/^这次/, "这一局这样打：这次"],
    [/^各自/, "成年人模式：各自"],
    [/^把/, "直接动手处理：把"],
    [/^为了/, "保护欲过载：为了"],
    [/^担心/, "风险雷达启动：担心"],
    [/^允许/, "留条活路：允许"],
    [/^确认/, "先把底线框住：确认"],
    [/^选择/, "折中派出场：选择"],
    [/^提供/, "只递工具不抢方向盘：提供"],
    [/^支持/, "热血派拍板：支持"],
    [/^帮/, "行动比嘴快：帮"],
    [/^取消/, "直接撤退：取消"],
    [/^全部/, "干脆全押：全部"],
    [/^不/, "本能拒绝：不"]
  ];
  const matched = openers.find(([pattern]) => pattern.test(text));
  if (matched) return text.replace(matched[0], matched[1]);
  const fallbackLabels = [
    "看似体面，实则很会：",
    "恋爱脑警报：",
    "不演了，直接：",
    "这一步很容易翻车：",
    "先把心里的算盘亮出来：",
    "表面云淡风轻：",
    "修罗场选择：",
    "你可能会脱口而出："
  ];
  const hash = [...text].reduce((sum, char) => (sum * 33 + char.charCodeAt(0)) >>> 0, 5381);
  return `${fallbackLabels[hash % fallbackLabels.length]}${text}`;
}

const option = (text, points, primary, secondary) => ({ text: punchUpOption(text), points, primary, secondary });
const question = (stage, scene, prompt, options) => ({ stage, scene, prompt, options });

function scatterQuestions(questions, salt) {
  return questions.map((item, questionIndex) => {
    let seed = [...`${salt}:${questionIndex}:${item.prompt}`].reduce((hash, char) => ((hash * 31) ^ char.charCodeAt(0)) >>> 0, 2166136261);
    const options = [...item.options];
    for (let index = options.length - 1; index > 0; index -= 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const target = seed % (index + 1);
      [options[index], options[target]] = [options[target], options[index]];
    }
    return { ...item, options };
  });
}

const guYanQuestions = [
  question("第一章 · 初见试探", "临时改约", "顾言在见面前两小时说项目临时加班，改天再约。你最自然的回复是？", [
    option("直接说有点失望，但理解突发工作，让他今晚给出新的具体时间", 5, "expression", "reliability"),
    option("回一句‘没事你忙’，之后等他自己想起这件事", 1, "boundary", "expression"),
    option("问清是不是工作比你重要，不说清楚就别再约", 0, "expression", "empathy"),
    option("先答应改期，第二天再确认一个双方都能兑现的时间", 3, "reliability", "boundary")
  ]),
  question("第一章 · 初见试探", "慢速回复", "聊天正热时，顾言隔了六小时才回：‘刚开完会。’你会？", [
    option("故意也晾他六小时，让节奏重新平衡", 0, "boundary", "repair"),
    option("继续原来的话题，同时问他通常什么时间方便聊天", 5, "expression", "boundary"),
    option("先按自己的节奏生活，等下次见面再聊彼此的回复习惯", 3, "boundary", "reliability"),
    option("连发几条问他是不是对你没兴趣", 1, "empathy", "expression")
  ]),
  question("第一章 · 初见试探", "安静饭局", "第一次吃饭，顾言话不多，但会认真听完你的每句话。你怎么推进气氛？", [
    option("快速抛很多问题，避免任何一秒冷场", 1, "expression", "empathy"),
    option("判断他太无趣，提前结束这次见面", 0, "boundary", "growth"),
    option("分享一件具体小事，再给他留时间接话", 5, "empathy", "expression"),
    option("接受短暂安静，挑一个他明显感兴趣的话题慢慢聊", 3, "empathy", "boundary")
  ]),
  question("第一章 · 初见试探", "私人领地", "顾言说不喜欢别人没打招呼就翻他的桌面和手机。你会怎么接？", [
    option("说恋爱后就不该有秘密，提前把规矩讲明", 0, "expression", "boundary"),
    option("表示理解，也说清自己希望重要事情不要刻意隐瞒", 5, "boundary", "expression"),
    option("嘴上答应，心里决定以后悄悄观察", 1, "empathy", "boundary"),
    option("先尊重他的习惯，关系确定后再共同讨论隐私边界", 3, "boundary", "growth")
  ]),
  question("第二章 · 暧昧升温", "出差礼物", "顾言出差回来送你一本你提过的书，却没准备浪漫花束。你会？", [
    option("认真告诉他你注意到了这份用心，并分享读完想和他聊什么", 5, "empathy", "growth"),
    option("收下书，但暗示别人追人都会送花", 1, "expression", "empathy"),
    option("认为他只是顺手买的，不给任何特别回应", 0, "empathy", "reliability"),
    option("表达喜欢，同时坦白自己偶尔也会期待有仪式感的惊喜", 3, "expression", "empathy")
  ]),
  question("第二章 · 暧昧升温", "关系确认", "暧昧一个月后，顾言仍没主动定义关系。你准备怎么做？", [
    option("继续等，先开口的人看起来更在意", 1, "boundary", "expression"),
    option("发一条长消息，要求他立刻给结论", 0, "expression", "repair"),
    option("约一次当面谈，说明自己的期待并询问他的真实计划", 5, "expression", "growth"),
    option("先确认彼此是否排他，再约定一周内聊清关系方向", 3, "reliability", "growth")
  ]),
  question("第二章 · 暧昧升温", "前任来信", "顾言告诉你，前任因工作问题联系了他，他已经简短回复。你会？", [
    option("感谢他主动说明，再确认这次联系的边界是否已经结束", 5, "boundary", "expression"),
    option("要求看完整聊天记录，证明没有隐瞒", 1, "reliability", "boundary"),
    option("说自己不介意，但之后反复拿这件事试探他", 0, "repair", "expression"),
    option("先听他说明原因，再告诉他哪些后续情况需要同步", 3, "empathy", "boundary")
  ]),
  question("第二章 · 暧昧升温", "工作低谷", "顾言的方案被否定，回家后只说想安静一会儿。你会？", [
    option("立刻帮他分析方案哪里出了问题", 1, "growth", "empathy"),
    option("觉得他拒绝交流，转身也不再理他", 0, "boundary", "repair"),
    option("告诉他你在，问他想独处多久，晚点是否需要陪伴", 5, "empathy", "boundary"),
    option("先给他空间，约好睡前用十分钟确认彼此状态", 3, "boundary", "reliability")
  ]),
  question("第三章 · 正式相处", "周末独处", "你期待了一周的周末，顾言却说想一个人在家充电。你会？", [
    option("说明自己的失落，一起保留半天约会，另外半天各自安排", 5, "boundary", "expression"),
    option("答应后发朋友圈暗示自己被冷落", 0, "expression", "repair"),
    option("坚持恋爱就该优先陪伴，不接受他的独处安排", 1, "reliability", "boundary"),
    option("这次各自休息，同时把下次约会时间提前定下来", 3, "reliability", "growth")
  ]),
  question("第三章 · 正式相处", "朋友评价", "朋友说顾言‘太冷了，你以后肯定辛苦’，你会怎么处理？", [
    option("回去让顾言证明朋友看错了", 1, "expression", "reliability"),
    option("把朋友的话当提醒，观察真实相处，不替任何人先下结论", 5, "boundary", "empathy"),
    option("为了维护他，直接和朋友翻脸", 0, "reliability", "boundary"),
    option("记下自己在意的具体问题，合适时只讨论事实和需要", 3, "expression", "repair")
  ]),
  question("第三章 · 正式相处", "共同支出", "旅行订房时，顾言提出把预算和分工先列清楚。你第一反应是？", [
    option("觉得太计较，恋爱不该算得这么细", 0, "empathy", "growth"),
    option("同意先定总预算，再各自选择愿意承担的项目", 5, "growth", "boundary"),
    option("让他全安排，自己到时候配合就好", 1, "reliability", "expression"),
    option("说清自己的上限，保留一小部分临时体验预算", 3, "expression", "growth")
  ]),
  question("第三章 · 正式相处", "习惯摩擦", "顾言习惯所有东西归位，你却常把衣服放在椅背上。争执后你会？", [
    option("承诺以后绝不乱放，但过两天又恢复原样", 1, "reliability", "repair"),
    option("说他控制欲太强，谁也别管谁", 0, "boundary", "expression"),
    option("一起定一个双方能做到的区域规则，试行一周再调整", 5, "repair", "reliability"),
    option("把最影响他的两个习惯先改掉，其余继续协商", 3, "empathy", "repair")
  ]),
  question("第四章 · 冲突压力", "事实争执", "你们对同一件事记忆不同，顾言开始逐条复盘细节。你会？", [
    option("先说明自己此刻的感受，再和他一起核对真正需要解决的事实", 5, "empathy", "repair"),
    option("认为他只想赢，停止沟通让他自己反省", 0, "boundary", "repair"),
    option("找聊天记录证明自己没错", 1, "reliability", "empathy"),
    option("暂停十分钟，各自写下事实、感受和诉求后再谈", 3, "repair", "expression")
  ]),
  question("第四章 · 冲突压力", "公开分歧", "聚会中顾言当众纠正了你的一个说法，你感觉被拆台。你会？", [
    option("当场讽刺回去，让他也难堪一次", 0, "expression", "repair"),
    option("先把聚会过完，回家明确说出被冒犯的点和下次边界", 5, "boundary", "repair"),
    option("假装没事，以后减少带他见朋友", 1, "boundary", "expression"),
    option("当场简短说‘这个我们之后聊’，私下再说明感受", 3, "expression", "boundary")
  ]),
  question("第四章 · 冲突压力", "失约一次", "顾言忘了你们约好的纪念日晚餐，直到很晚才想起。你会？", [
    option("让他自己猜哪里错了，猜不到就算了", 0, "empathy", "expression"),
    option("马上说分手，忘记纪念日就是不爱", 1, "expression", "growth"),
    option("直接说这件事对你的意义，要求他提出具体补救和避免复发的方法", 5, "repair", "reliability"),
    option("先处理当晚情绪，第二天约定一次不被打断的复盘", 3, "empathy", "repair")
  ]),
  question("第四章 · 冲突压力", "冷静时限", "争吵后顾言说需要冷静，但没有说要多久。你会？", [
    option("尊重暂停，同时要求约定最晚明晚继续谈", 5, "boundary", "repair"),
    option("不停追问，必须现在把问题解决", 1, "expression", "boundary"),
    option("也消失，谁先联系谁就输了", 0, "repair", "reliability"),
    option("发一条简短信息说明底线，24小时内不继续轰炸", 3, "boundary", "expression")
  ]),
  question("第五章 · 长期选择", "异地机会", "顾言得到外地一年的重要项目机会，你的工作无法立刻搬走。你会？", [
    option("要求他放弃，真正爱你就不该去", 0, "growth", "boundary"),
    option("先各自列出收益和代价，再共同设计三个月试运行方案", 5, "growth", "reliability"),
    option("说随便他，反正未来谁也说不准", 1, "boundary", "expression"),
    option("确认关系底线和见面频率，一个月后复盘是否继续", 3, "reliability", "growth")
  ]),
  question("第五章 · 长期选择", "家庭边界", "顾言的家人开始频繁询问你们何时结婚，他没有及时制止。你会？", [
    option("当面顶回去，让所有人一次记住", 1, "expression", "boundary"),
    option("私下和顾言统一口径，请他负责向自己的家人说明边界", 5, "boundary", "reliability"),
    option("为了不破坏关系，先答应一个模糊时间", 0, "empathy", "expression"),
    option("说明你能接受被问到什么程度，并约定下次由他回应", 3, "expression", "boundary")
  ]),
  question("第五章 · 长期选择", "同居试运行", "顾言提出同居前先列家务、费用和独处时间。你会？", [
    option("觉得太像合同，住进去自然就知道了", 1, "empathy", "growth"),
    option("同意先写最小规则，试住一个月后按真实情况修改", 5, "growth", "repair"),
    option("全部照他的规则，避免刚开始就争执", 0, "boundary", "expression"),
    option("先讨论最容易冲突的三项，其他问题发生时再补充", 3, "reliability", "repair")
  ]),
  question("第五章 · 长期选择", "未来时间表", "顾言问你：‘你希望三年后的生活是什么样？’你会？", [
    option("说计划赶不上变化，现在开心就好", 1, "boundary", "growth"),
    option("给出自己真正想要的生活，也问他哪些部分可以共同建设", 5, "growth", "expression"),
    option("先猜他期待什么，再按他的答案调整自己", 0, "empathy", "boundary"),
    option("说清三个确定方向和两个暂时无法承诺的部分", 3, "expression", "growth")
  ])
];

const zhouYeQuestions = [
  question("第一章 · 初见试探", "午夜邀约", "周野晚上十点发来消息：‘天气很好，要不要现在去江边？’你会？", [
    option("想去就直接答应，同时确认回程和安全安排", 5, "expression", "boundary"),
    option("故意说没空，看他会不会再邀请", 0, "expression", "reliability"),
    option("拒绝临时出门，但主动约一个自己舒服的时间", 3, "boundary", "expression"),
    option("答应后一路抱怨他完全没计划", 1, "growth", "empathy")
  ]),
  question("第一章 · 初见试探", "直球夸奖", "第一次见面，周野看着你说：‘你比照片里更有意思。’你会？", [
    option("笑着接住，也具体说出你欣赏他的地方", 5, "expression", "empathy"),
    option("怀疑他对所有人都这么说，当场追问情史", 0, "boundary", "empathy"),
    option("说‘还好吧’，把话题快速岔开", 1, "expression", "boundary"),
    option("坦然道谢，继续观察他的行动是否和表达一致", 3, "reliability", "empathy")
  ]),
  question("第一章 · 初见试探", "拍照边界", "周野举起相机想拍你，但你今天并不想入镜。你会？", [
    option("勉强配合，之后再闷闷不乐", 1, "empathy", "boundary"),
    option("直接挡住镜头并指责他不尊重人", 0, "expression", "repair"),
    option("清楚说今天不想拍，也可以让他拍别的风景", 5, "boundary", "expression"),
    option("请他先放下相机，解释你什么时候会愿意被拍", 3, "boundary", "empathy")
  ]),
  question("第一章 · 初见试探", "社交热场", "朋友聚会上，周野和每个人都聊得很热络，你有些被晾在一边。你会？", [
    option("直接加入他正在聊的话题，之后再说你希望得到照顾", 5, "expression", "repair"),
    option("提前离场，让他自己发现你不高兴", 0, "boundary", "expression"),
    option("先和其他人交流，聚会后说明自己的真实感受", 3, "boundary", "empathy"),
    option("整晚盯着他和谁说话，回家逐个盘问", 1, "reliability", "boundary")
  ]),
  question("第二章 · 暧昧升温", "冒险计划", "周野提议周末去一个没做攻略的小镇，说到了再决定。你会？", [
    option("如果感兴趣就一起去，只提前确认交通、住宿和预算底线", 5, "growth", "boundary"),
    option("要求把每小时安排都定好，否则不去", 1, "reliability", "growth"),
    option("嘴上说随便，途中任何变化都怪他", 0, "repair", "expression"),
    option("选择半自由方案，只订住处，其他现场决定", 3, "growth", "reliability")
  ]),
  question("第二章 · 暧昧升温", "突然失联", "周野外拍一整天没信号，晚上才报平安。你会？", [
    option("告诉他你担心过，并约定以后出发前发一下行程", 5, "expression", "reliability"),
    option("也关机一天，让他感受你的担心", 0, "repair", "boundary"),
    option("确认人安全就好，不再多问", 3, "empathy", "boundary"),
    option("要求以后实时共享定位", 1, "reliability", "boundary")
  ]),
  question("第二章 · 暧昧升温", "前任作品", "你发现周野仍保留着为前任拍的一组得意作品。你会？", [
    option("要求他立刻删除，过去不该影响现在", 1, "boundary", "expression"),
    option("假装不知道，之后反复比较自己和照片里的人", 0, "empathy", "repair"),
    option("问他作品对他的意义，再说清哪些公开方式会让你不舒服", 5, "empathy", "boundary"),
    option("接受作品属于创作经历，但约定不拿前任评价现在的关系", 3, "boundary", "growth")
  ]),
  question("第二章 · 暧昧升温", "公开关系", "周野想发一张你们的合照，你还没准备好公开。你会？", [
    option("先答应，发出后再偷偷设为仅自己可见", 0, "reliability", "boundary"),
    option("明确说现在不想公开，并给出你愿意重新讨论的时间点", 5, "boundary", "expression"),
    option("问他是不是非要靠朋友圈证明感情", 1, "expression", "empathy"),
    option("允许发不露脸的照片，同时继续确认彼此关系节奏", 3, "growth", "boundary")
  ]),
  question("第三章 · 正式相处", "兴趣不同", "周野想去音乐节，你更想在家休息。他很期待你陪同。你会？", [
    option("勉强去，回来后强调自己为他牺牲很多", 0, "reliability", "repair"),
    option("这次说清不去，但帮他找同行朋友，另约你们都喜欢的活动", 5, "boundary", "growth"),
    option("要求他也别去，情侣就该一起行动", 1, "empathy", "boundary"),
    option("只参加半天，提前约好疲惫时可以先离开", 3, "expression", "boundary")
  ]),
  question("第三章 · 正式相处", "消费冲动", "周野看中一台超预算的相机，想先买再想办法。你会？", [
    option("直接说他不成熟，替他把订单取消", 0, "boundary", "empathy"),
    option("问清现金流和使用计划，让他自己承担选择结果", 5, "growth", "boundary"),
    option("支持梦想，钱不够可以先借给他", 1, "empathy", "reliability"),
    option("建议等48小时，再比较租用、二手和购买三个方案", 3, "reliability", "growth")
  ]),
  question("第三章 · 正式相处", "临时朋友局", "你们约好二人晚餐，周野临时想叫朋友一起。你会？", [
    option("当场拒绝所有朋友，二人约会绝不许变", 1, "expression", "boundary"),
    option("先说今晚想保留二人时间，再另外约一场朋友局", 5, "expression", "reliability"),
    option("答应后全程不说话，让他知道你不满意", 0, "repair", "empathy"),
    option("如果自己状态允许就接受，但约定下次改计划要提前确认", 3, "boundary", "repair")
  ]),
  question("第三章 · 正式相处", "热情降温", "热恋期后，周野的消息明显没有以前密集。你会？", [
    option("增加消息频率，直到他恢复原来的热情", 1, "reliability", "boundary"),
    option("把注意力拉回自己的生活，再当面讨论彼此舒服的联系节奏", 5, "boundary", "expression"),
    option("默认他变心，提前结束关系", 0, "empathy", "repair"),
    option("观察一周行动是否稳定，再用具体事实询问变化", 3, "reliability", "empathy")
  ]),
  question("第四章 · 冲突压力", "玩笑越界", "周野在朋友面前拿你的糗事开玩笑，大家都笑了。你会？", [
    option("现场用他的糗事还击", 0, "expression", "repair"),
    option("当场简短说这件事不适合继续，回家再谈具体边界", 5, "boundary", "repair"),
    option("陪着笑，之后几天都不理他", 1, "empathy", "expression"),
    option("私下告诉他你被刺痛的部分，并约定哪些内容不公开", 3, "empathy", "boundary")
  ]),
  question("第四章 · 冲突压力", "说走就走", "争吵中周野摔门出去，只说‘我去透气’。你会？", [
    option("追出去拦住他，今天必须说完", 1, "expression", "boundary"),
    option("发消息确认安全，并约定两小时后回来继续谈", 5, "repair", "reliability"),
    option("把门反锁，今晚谁也别回来", 0, "repair", "boundary"),
    option("先停止争吵，要求他最晚睡前报平安和给出沟通时间", 3, "boundary", "repair")
  ]),
  question("第四章 · 冲突压力", "承诺落空", "周野答应整理旅行照片，却拖了一个月还没动。你会？", [
    option("不再提醒，等他哪天自己愧疚", 0, "expression", "reliability"),
    option("指出具体承诺和影响，和他一起重定一个可完成的截止日", 5, "reliability", "repair"),
    option("自己全部做完，再说他靠不住", 1, "growth", "boundary"),
    option("把任务缩小为先选20张，三天后检查进度", 3, "growth", "reliability")
  ]),
  question("第四章 · 冲突压力", "情绪爆发", "周野因为工作受挫语气很冲，事后说自己只是压力大。你会？", [
    option("理解他的压力，这次就不提了", 1, "empathy", "boundary"),
    option("先确认他难受，再明确压力不能成为伤人的免责理由", 5, "empathy", "boundary"),
    option("以后他发火时你也加倍发火", 0, "repair", "expression"),
    option("暂停当下交流，等双方稳定后要求一次道歉和补救", 3, "repair", "reliability")
  ]),
  question("第五章 · 长期选择", "自由职业", "周野想辞职做自由摄影，收入可能半年不稳定。你会？", [
    option("支持他立刻辞职，热爱最重要", 1, "empathy", "reliability"),
    option("一起核算六个月底线资金和试运行指标，再决定离职时间", 5, "growth", "reliability"),
    option("坚决反对，不稳定的人不适合长期关系", 0, "boundary", "growth"),
    option("建议先兼职接单三个月，用真实收入验证计划", 3, "reliability", "growth")
  ]),
  question("第五章 · 长期选择", "长期旅行", "周野想一起用三个月自驾，你担心工作和储蓄。你会？", [
    option("为了证明合拍，先答应再说", 0, "expression", "boundary"),
    option("说清现实限制，先设计两周版本验证相处和预算", 5, "growth", "boundary"),
    option("直接说这种想法不切实际", 1, "empathy", "growth"),
    option("列出必须满足的工作、资金和安全条件，再讨论日期", 3, "reliability", "expression")
  ]),
  question("第五章 · 长期选择", "城市选择", "你得到外地晋升机会，周野的创作资源却集中在本地。你会？", [
    option("期待他自然跟着你走，不必把关系算太细", 1, "empathy", "boundary"),
    option("分别写下不可放弃和可调整项，比较三种生活方案", 5, "growth", "expression"),
    option("为了不争吵直接放弃机会，但以后记在心里", 0, "repair", "boundary"),
    option("先异地三个月，设定见面频率和最终决策日期", 3, "reliability", "growth")
  ]),
  question("第五章 · 长期选择", "平淡日常", "周野问：‘以后没有那么多新鲜事，你还会觉得我们合适吗？’你会？", [
    option("承认新鲜感会变，但愿意一起建立可持续的日常仪式", 5, "growth", "reliability"),
    option("保证永远不会腻，让他不要想太多", 1, "empathy", "expression"),
    option("说感情变淡就说明不爱了", 0, "repair", "growth"),
    option("讨论各自需要保留的自由，以及每月一次共同新体验", 3, "boundary", "growth")
  ])
];

const linWanQuestions = [
  question("第一章 · 初见试探", "一句没事", "约会结束后，林晚轻声说‘今天挺好的’，神情却有点失落。你会？", [
    option("相信她说的没事，不继续追问", 1, "boundary", "empathy"),
    option("指出她表情不对，要求现在说清楚", 0, "expression", "boundary"),
    option("说你感觉她有点失落，愿意听，但她可以决定什么时候讲", 5, "empathy", "boundary"),
    option("回家后发消息问今天是否有哪个瞬间让她不舒服", 3, "empathy", "expression")
  ]),
  question("第一章 · 初见试探", "作品分享", "林晚给你看一张还没完成的画，先说‘可能有点奇怪’。你会？", [
    option("立刻给出三个修改建议，证明你认真看了", 1, "growth", "expression"),
    option("先说出一个具体打动你的细节，再问她想听感受还是建议", 5, "empathy", "expression"),
    option("夸‘很好看’，然后马上换话题", 0, "reliability", "expression"),
    option("认真听她讲创作想法，等她明确需要时再反馈", 3, "boundary", "expression")
  ]),
  question("第一章 · 初见试探", "人群疲惫", "热闹聚会进行到一半，林晚明显安静下来。你会？", [
    option("替她宣布累了，马上带她离开", 1, "empathy", "boundary"),
    option("小声确认她想休息、离开，还是继续待一会儿", 5, "boundary", "empathy"),
    option("鼓励她再活跃一点，别扫大家兴", 0, "expression", "empathy"),
    option("陪她去安静处待十分钟，让她自己决定下一步", 3, "boundary", "reliability")
  ]),
  question("第一章 · 初见试探", "细节记忆", "林晚记得你随口提过的口味，却发现你忘了她不吃香菜。你会？", [
    option("说这种小事没必要上纲上线", 0, "boundary", "expression"),
    option("承认自己没记住，马上帮她换掉，并记进下次点单习惯", 5, "reliability", "empathy"),
    option("解释自己最近太忙，希望她理解", 1, "expression", "repair"),
    option("先处理眼前的问题，再问还有哪些饮食习惯需要知道", 3, "repair", "reliability")
  ]),
  question("第二章 · 暧昧升温", "情绪回音", "林晚发来一段很长的语音，说今天被同事否定得很难受。你会？", [
    option("回复一套解决职场问题的方法", 1, "growth", "empathy"),
    option("先复述你听到的委屈，问她想被陪伴还是一起想办法", 5, "empathy", "expression"),
    option("回一个抱抱表情，等她自己消化", 0, "reliability", "boundary"),
    option("告诉她你现在有十分钟能专心听，之后约时间继续聊", 3, "boundary", "reliability")
  ]),
  question("第二章 · 暧昧升温", "纪念小事", "林晚把第一次见面的电影票留了下来，你其实没这种习惯。你会？", [
    option("说她太容易感动，留这些没什么用", 0, "expression", "boundary"),
    option("尊重这份意义，并和她商量一种双方都舒服的纪念方式", 5, "empathy", "growth"),
    option("以后强迫自己保存所有票根，免得她失望", 1, "reliability", "boundary"),
    option("帮她给票根拍照存档，实物由她决定是否保留", 3, "growth", "boundary")
  ]),
  question("第二章 · 暧昧升温", "确认心意", "林晚问：‘你是真的喜欢我，还是只是觉得我适合？’你会？", [
    option("说喜欢就是喜欢，没必要分析那么多", 1, "expression", "empathy"),
    option("具体告诉她你被哪些瞬间打动，也承认关系仍需要时间验证", 5, "expression", "reliability"),
    option("反问她为什么总是不相信你", 0, "repair", "empathy"),
    option("先确认她最近为何不安，再说出你能承诺和不能承诺的部分", 3, "empathy", "boundary")
  ]),
  question("第二章 · 暧昧升温", "前任阴影", "林晚坦白，上一段关系让她很怕突然被冷落。你会？", [
    option("保证自己绝不会像前任，让她完全放心", 1, "expression", "reliability"),
    option("理解她的担心，同时约定有变化直接沟通，不用靠反复确认", 5, "boundary", "reliability"),
    option("觉得她还没放下前任，暂时拉开距离", 0, "boundary", "repair"),
    option("问清哪些行为最容易触发不安，并说明自己的联系边界", 3, "empathy", "boundary")
  ]),
  question("第三章 · 正式相处", "独处沉默", "林晚情绪低落时不想说话，只想有人陪着。你会？", [
    option("陪她待一会儿，提前说好你什么时候需要离开", 5, "empathy", "boundary"),
    option("不停找话题逗她，直到她开心起来", 1, "expression", "empathy"),
    option("觉得既然不说话就没必要陪", 0, "boundary", "reliability"),
    option("给她水和毯子，安静陪伴十分钟后再确认需要", 3, "reliability", "boundary")
  ]),
  question("第三章 · 正式相处", "消息语气", "你忙时回了一个‘嗯’，林晚问你是不是生气了。你会？", [
    option("解释自己在忙，并告诉她什么时候能认真回复", 5, "expression", "reliability"),
    option("说她想太多，一个字也能脑补", 0, "expression", "repair"),
    option("马上发很多甜言蜜语证明没生气", 1, "reliability", "boundary"),
    option("简短澄清没有生气，忙完后再补充当天状态", 3, "expression", "empathy")
  ]),
  question("第三章 · 正式相处", "社交电量", "你很想带林晚参加公司聚餐，她担心陌生人太多。你会？", [
    option("告诉她大家都很好相处，不去显得不合群", 0, "expression", "boundary"),
    option("说明你希望她出现的原因，并允许她只待一小时或不去", 5, "boundary", "expression"),
    option("取消聚餐，以后都不让她为难", 1, "boundary", "growth"),
    option("提前介绍关键人物和离场信号，让她自己选择", 3, "reliability", "boundary")
  ]),
  question("第三章 · 正式相处", "礼物落差", "你送了实用的降噪耳机，林晚却期待一封手写信。你会？", [
    option("说耳机更贵更有用，她不该挑剔", 0, "expression", "repair"),
    option("听懂她想要的是被表达，下次把实用和情感两部分都准备", 5, "empathy", "growth"),
    option("马上买更多礼物补偿", 1, "reliability", "expression"),
    option("补写一段真实的话，也请她以后提前表达仪式感期待", 3, "expression", "repair")
  ]),
  question("第四章 · 冲突压力", "旧事重提", "争吵时，林晚又提起三个月前一次相似的失望。你会？", [
    option("说旧账翻来翻去永远没完", 0, "repair", "empathy"),
    option("先确认旧事是否真的修复，再把这次共同模式说清楚", 5, "repair", "empathy"),
    option("把她之前的错误也全部列出来", 1, "expression", "boundary"),
    option("允许讨论相同模式，但约定这次只解决一个核心问题", 3, "boundary", "repair")
  ]),
  question("第四章 · 冲突压力", "眼泪时刻", "争执中林晚哭了，但你认为自己的观点没有错。你会？", [
    option("停止讨论，先接住情绪，再约定冷静后继续谈事实", 5, "empathy", "repair"),
    option("为了不让她哭，立刻承认所有问题都是你的", 1, "repair", "boundary"),
    option("强调哭不能改变事实，继续把道理说完", 0, "expression", "empathy"),
    option("问她需要拥抱还是空间，同时保留稍后继续讨论的边界", 3, "boundary", "empathy")
  ]),
  question("第四章 · 冲突压力", "需要确认", "林晚连续问了三次‘你还爱我吗’，你已经有些疲惫。你会？", [
    option("再保证一次，以后她问多少次都回答", 1, "reliability", "boundary"),
    option("回应当下不安，同时约定不用重复提问来验证关系", 5, "empathy", "boundary"),
    option("拒绝回答，让她自己学会安全感", 0, "boundary", "repair"),
    option("问清今天发生了什么，再共同设计一种固定确认方式", 3, "growth", "reliability")
  ]),
  question("第四章 · 冲突压力", "沉默误解", "你需要半天冷静，林晚却把沉默理解为要分手。你会？", [
    option("先明确关系没有结束，再给出恢复沟通的准确时间", 5, "reliability", "repair"),
    option("觉得解释会助长依赖，继续不回复", 0, "boundary", "empathy"),
    option("放弃冷静，马上回来陪她直到情绪稳定", 1, "reliability", "boundary"),
    option("发一条简短状态说明，并在约定时间准时出现", 3, "reliability", "expression")
  ]),
  question("第五章 · 长期选择", "创作低收入", "林晚想减少商业项目，用半年完成个人画册。你会？", [
    option("支持梦想，经济问题以后再想", 1, "growth", "reliability"),
    option("一起算清最低生活成本、阶段目标和退出条件", 5, "growth", "reliability"),
    option("认为不赚钱的爱好不值得冒险", 0, "growth", "empathy"),
    option("先试三个月，每月固定复盘时间和收入底线", 3, "reliability", "growth")
  ]),
  question("第五章 · 长期选择", "照顾家人", "林晚可能需要长期照顾生病的家人，生活安排会被打乱。你会？", [
    option("承诺所有压力都由你承担", 1, "reliability", "boundary"),
    option("先了解真实需求，再分清她、你和其他家人的责任", 5, "boundary", "reliability"),
    option("担心拖累自己，劝她交给其他家人", 0, "boundary", "growth"),
    option("提供一项明确可持续的帮助，每两周重新评估", 3, "reliability", "boundary")
  ]),
  question("第五章 · 长期选择", "婚礼期待", "林晚很看重婚礼细节，你更在意简单省钱。你会？", [
    option("告诉她婚礼只是形式，没必要投入太多", 0, "expression", "growth"),
    option("分别列出最重要的三项，在总预算内优先满足共同意义", 5, "growth", "empathy"),
    option("全部交给她决定，自己只负责付钱", 1, "reliability", "expression"),
    option("各保留一项不可妥协，其余寻找更轻量的替代方案", 3, "boundary", "growth")
  ]),
  question("第五章 · 长期选择", "安全感来源", "林晚问：‘以后很忙的时候，我们靠什么确定彼此还在？’你会？", [
    option("说真正相爱就不需要这些形式", 0, "growth", "reliability"),
    option("共同约定低成本但稳定的联系、见面和冲突修复机制", 5, "reliability", "growth"),
    option("保证每天随时回复，绝不让她等待", 1, "boundary", "expression"),
    option("先定每周一次完整交流，忙碌期再按情况调整", 3, "growth", "reliability")
  ])
];

const shenZhixiaQuestions = [
  question("第一章 · 初见试探", "会议迟到", "沈知夏因为会议晚到二十分钟，提前发了消息并道歉。你会？", [
    option("说明你等候的感受，也认可她提前通知，继续这次约会", 5, "expression", "empathy"),
    option("冷着脸让她猜自己有多生气", 0, "repair", "expression"),
    option("说没关系，但之后反复提她第一次就迟到", 1, "reliability", "repair"),
    option("接受这次突发，同时约定超过十五分钟就重新安排", 3, "boundary", "reliability")
  ]),
  question("第一章 · 初见试探", "工作电话", "约会中沈知夏接了一个紧急工作电话，回来后说可以继续。你会？", [
    option("问她是否真的能放下工作，再决定继续还是改天", 5, "empathy", "boundary"),
    option("说工作永远比你重要，提前结束", 0, "expression", "empathy"),
    option("装作不介意，但整晚减少回应", 1, "boundary", "repair"),
    option("给她五分钟收尾，再重新开始你们的时间", 3, "reliability", "boundary")
  ]),
  question("第一章 · 初见试探", "观点交锋", "沈知夏直接反驳了你的一个观点，但没有人身攻击。你会？", [
    option("把不同意见当成不尊重，立刻反击", 0, "expression", "repair"),
    option("追问她的依据，也清楚说明自己不同意的部分", 5, "expression", "growth"),
    option("表面附和，之后不再谈重要话题", 1, "boundary", "expression"),
    option("承认其中合理部分，同时保留自己的判断", 3, "empathy", "boundary")
  ]),
  question("第一章 · 初见试探", "行程独立", "沈知夏说周末已有自己的安排，不能临时见面。你会？", [
    option("觉得她没有为恋爱留位置，降低联系热情", 1, "reliability", "empathy"),
    option("尊重原计划，并一起确定下一次见面时间", 5, "boundary", "reliability"),
    option("临时出现在她活动附近制造惊喜", 0, "expression", "boundary"),
    option("各自过周末，约好之后分享有趣的事", 3, "boundary", "growth")
  ]),
  question("第二章 · 暧昧升温", "资源建议", "沈知夏聊到业务难题，你恰好认识能帮忙的人。你会？", [
    option("直接替她联系，给她一个惊喜", 1, "reliability", "boundary"),
    option("先问她是否需要引荐，再说明你能提供到哪一步", 5, "boundary", "growth"),
    option("担心利益混进感情，完全不提", 0, "expression", "empathy"),
    option("提供联系人信息，由她决定是否使用和如何推进", 3, "growth", "boundary")
  ]),
  question("第二章 · 暧昧升温", "忙碌生日", "沈知夏生日当天要路演，只能晚上见一小时。你会？", [
    option("要求她取消工作，生日一年只有一次", 0, "empathy", "boundary"),
    option("把一小时安排得专注有意义，另约完整庆祝时间", 5, "reliability", "empathy"),
    option("说自己不在意生日，以后也不再准备", 1, "expression", "repair"),
    option("先确认她当天真正需要什么，再准备轻量庆祝", 3, "empathy", "boundary")
  ]),
  question("第二章 · 暧昧升温", "关系节奏", "沈知夏说很喜欢你，但暂时不想让恋爱占据全部生活。你会？", [
    option("接受彼此有独立生活，同时讨论最低投入和关系边界", 5, "boundary", "reliability"),
    option("觉得她只想享受暧昧，不愿承担责任", 1, "expression", "empathy"),
    option("假装同意，之后不断增加见面频率", 0, "boundary", "repair"),
    option("先试行一个月双方舒服的节奏，再复盘是否调整", 3, "growth", "reliability")
  ]),
  question("第二章 · 暧昧升温", "收入差距", "你发现沈知夏收入明显高于你，她并没有主动谈论。你会？", [
    option("用玩笑贬低她的工作，降低自己的不适", 0, "empathy", "repair"),
    option("不预设谁该多付，合适时坦诚讨论消费能力和分担方式", 5, "expression", "boundary"),
    option("以后所有约会都抢着买单证明自己", 1, "reliability", "boundary"),
    option("先按双方都轻松的预算约会，涉及大额支出再谈", 3, "boundary", "growth")
  ]),
  question("第三章 · 正式相处", "公开支持", "沈知夏要参加重要演讲，希望你到场，但那天你也很忙。你会？", [
    option("答应到场，即使自己的工作全部推迟", 1, "empathy", "boundary"),
    option("说明冲突，尽量参加关键部分，并提前准备替代支持", 5, "reliability", "expression"),
    option("认为她独立，不需要你特别出现", 0, "empathy", "reliability"),
    option("无法到场就提前说清，并在当天约定时间单独祝贺", 3, "reliability", "repair")
  ]),
  question("第三章 · 正式相处", "决策习惯", "旅行时沈知夏快速定好了大部分安排，你觉得没有参与感。你会？", [
    option("旅行中处处挑问题，证明她安排得不好", 0, "repair", "expression"),
    option("直接说自己希望参与，把剩余两项决定拿回来共同做", 5, "expression", "growth"),
    option("既然她能干，就全部让她负责", 1, "reliability", "boundary"),
    option("肯定已完成的工作，再约定下一次先分配决策范围", 3, "empathy", "repair")
  ]),
  question("第三章 · 正式相处", "异性伙伴", "沈知夏经常和一位异性合伙人出差，你感到不安。你会？", [
    option("要求她更换搭档，避免一切可能", 0, "boundary", "empathy"),
    option("说清具体担心，共同确认出差沟通和职业边界", 5, "expression", "boundary"),
    option("不说，但开始检查她的社交动态", 1, "reliability", "boundary"),
    option("先了解真实合作方式，再提出一项能增加确定感的约定", 3, "empathy", "reliability")
  ]),
  question("第三章 · 正式相处", "低能量夜晚", "一向能干的沈知夏回家后说今天什么都不想决定。你会？", [
    option("替她把所有事情决定好，不让她再费心", 1, "reliability", "boundary"),
    option("给出两个简单选项，确认她想被陪伴还是独处", 5, "empathy", "boundary"),
    option("提醒她成年人不能逃避问题", 0, "growth", "empathy"),
    option("先接手今晚一件具体小事，其余明天再处理", 3, "reliability", "empathy")
  ]),
  question("第四章 · 冲突压力", "被安排感", "沈知夏替你规划了一项职业选择，语气像已经替你决定。你会？", [
    option("直接说她控制欲强，以后别管你的事", 1, "expression", "repair"),
    option("肯定她的用心，同时明确最终决定属于你，并说明需要何种支持", 5, "boundary", "expression"),
    option("先照做，失败后再怪她", 0, "reliability", "boundary"),
    option("请她把方案当建议讲完，给自己24小时独立判断", 3, "growth", "boundary")
  ]),
  question("第四章 · 冲突压力", "取消纪念日", "重要融资临时撞上纪念日，沈知夏希望改期。你会？", [
    option("接受改期，但要求她在当天留出十分钟，并马上确定补过时间", 5, "reliability", "expression"),
    option("同意后故意不回消息，让她感到愧疚", 0, "repair", "empathy"),
    option("要求她二选一，看事业和你谁更重要", 1, "expression", "boundary"),
    option("先确认融资不可替代，再约一个不会被工作占用的时间", 3, "growth", "reliability")
  ]),
  question("第四章 · 冲突压力", "高压语气", "沈知夏压力大时用命令式语气和你说话，事后没意识到。你会？", [
    option("当场停止配合，要求她用正常方式重新表达", 5, "boundary", "expression"),
    option("理解她太累，先把事情做完再说", 1, "empathy", "boundary"),
    option("同样用命令语气回击", 0, "repair", "expression"),
    option("先完成真正紧急的一步，随后明确指出语气边界", 3, "reliability", "boundary")
  ]),
  question("第四章 · 冲突压力", "输赢争论", "一次争执里，沈知夏不断拿事实证明自己的方案更有效。你会？", [
    option("承认有效性，同时把关系中被忽略的感受和代价说出来", 5, "empathy", "expression"),
    option("既然她总是对的，以后什么都不参与", 0, "boundary", "repair"),
    option("找更多证据证明她也有错", 1, "growth", "empathy"),
    option("把‘谁对’改成‘下一次怎样合作’，约定一个新规则", 3, "repair", "growth")
  ]),
  question("第五章 · 长期选择", "事业城市", "沈知夏的公司必须留在深圳，你更想回家乡发展。你会？", [
    option("默认感情稳定后她自然会跟你走", 1, "empathy", "boundary"),
    option("比较两地的事业、照护和生活成本，设定明确决策期限", 5, "growth", "expression"),
    option("避免谈未来，先过好现在", 0, "boundary", "growth"),
    option("先试行异地半年，每月复盘关系和个人发展", 3, "reliability", "growth")
  ]),
  question("第五章 · 长期选择", "家务分工", "同居后沈知夏工作更忙，但收入也更高。家务怎么分？", [
    option("收入高的人负责出钱，另一方自然多做家务", 1, "reliability", "boundary"),
    option("按时间、能力和可外包程度分配，每月调整一次", 5, "growth", "reliability"),
    option("谁看不下去谁做，不必定规则", 0, "repair", "expression"),
    option("先保证每人固定负责两项，其余忙时用外包解决", 3, "boundary", "reliability")
  ]),
  question("第五章 · 长期选择", "风险投资", "沈知夏想把大部分积蓄投入新项目，可能影响共同购房计划。你会？", [
    option("支持她的判断，成功后什么都有了", 1, "empathy", "reliability"),
    option("分开个人风险资金和共同目标资金，再讨论可承受上限", 5, "boundary", "growth"),
    option("要求她放弃项目，家庭必须优先", 0, "expression", "empathy"),
    option("保留共同计划的最低资金，其余分阶段投入并设止损点", 3, "reliability", "growth")
  ]),
  question("第五章 · 长期选择", "伴侣位置", "沈知夏问：‘你希望我在关系里是什么角色？’你会？", [
    option("希望她在外能干，回家后多照顾关系", 0, "empathy", "boundary"),
    option("希望彼此是独立的合伙人，能支持也能清楚拒绝", 5, "boundary", "growth"),
    option("说只要相爱，角色并不重要", 1, "expression", "reliability"),
    option("描述你能承担的责任，也邀请她说出同样具体的期待", 3, "expression", "reliability")
  ])
];

const makeEndings = (items) => items.map(([comment, risk, reminder]) => ({ comment, risk, reminder }));

export const ROLES = {
  guyan: {
    name: "顾言", role: "冷静克制的建筑师", pronoun: "他", accent: "#2864ff", portrait: "assets/guyan.png",
    quote: "他不靠热闹证明喜欢，更在意你能否把话说清、把承诺做实。",
    tags: ["慢热", "边界清晰", "长期主义"],
    profile: "你面对克制型伴侣时，既要识别安静里的在意，也要避免把所有沉默都替对方解释。真正的适配来自清楚表达、尊重空间和持续兑现。",
    strength: "你最容易赢得他的地方，是愿意把情绪变成可讨论的需要，而不是把猜测变成审判。",
    fit: "适合节奏稳定、彼此有独处空间、重要问题当面说清的长期关系。",
    specialAdvice: "当顾言再次沉默时，先用一句话说出你的观察和需要，再给出最晚继续沟通的时间，不追问超过两轮。",
    questions: scatterQuestions(guYanQuestions, "guyan"),
    endings: makeEndings([
      ["你们目前更像两个谨慎的陌生人。他会礼貌回应，却不会把你放进自己的生活结构。", "你常把失望变成试探，把边界当成冷淡，容易在关系开始前就耗尽信任。", "顾言不会追着破解暗示。下一次想确认心意时，请直接说出一件事实和一个请求，不用消失来测试他。"],
      ["偶尔能接住他的节奏，但关键时刻仍容易把克制误读成不在意。关系有火花，稳定性还不够。", "一焦虑就追问、一失望就沉默，会让他把这段关系判断为高成本沟通。", "顾言愿意解释，但不擅长无限证明。下次不安时，请先给问题加上时间和边界，再听完他的完整回答。"],
      ["你已经能进入他的舒适区，只是在情绪和事实打架时，仍会偶尔用力过猛。", "你能尊重空间，却可能在真正需要表达时退回‘算了’，让问题留到下一次爆发。", "顾言会把明确当成信任。下一次说‘没事’之前，请先补一句你真实在意什么，并约定何时解决。"],
      ["你们有机会把心动变成稳定关系。你能给空间，也能在重要节点把话落到行动。", "你的理性处理很有效，但过度追求正确流程时，可能漏掉对方当下真正需要的情绪回应。", "顾言欣赏你的分寸，也需要被看见。下一次复盘事实前，先用一句话确认他的压力，再进入解决方案。"],
      ["你已经读懂他多数沉默背后的边界，也能让重要承诺真正落地。你们很像可靠的长期搭档。", "配合度很高时，你可能习惯替关系维持秩序，忘了让自己的期待也占据同等位置。", "顾言愿意和你共建生活，但不会自动发现全部需要。每月留一次不解决任务的对话，只谈彼此最近的感受。"],
      ["你没有试图改造他的安静，也没有牺牲自己的表达。对他而言，你是可以一起规划未来的人。", "满分默契也可能让关系变成高效项目，浪漫和偶然性会被安排表慢慢挤掉。", "顾言会认真执行共同计划。下一次约会，请刻意留出一小时没有目标的相处，让喜欢不只存在于完成事项里。"]
    ])
  },
  zhouye: {
    name: "周野", role: "直球热烈的摄影师", pronoun: "他", accent: "#ff5a6f", portrait: "assets/zhouye.png",
    quote: "他喜欢把心动变成行动，也需要有人在热烈之外帮关系守住方向。",
    tags: ["直球", "行动派", "需要自由"],
    profile: "面对热烈型伴侣，你需要能接住真诚，也能在临时起意和情绪冲动中守住自己的边界。适配不是陪他一直冒险，而是敢一起出发，也敢及时说停。",
    strength: "你最能打动他的，是不玩猜心游戏：喜欢就回应，不舒服就指出，承诺则用行动验证。",
    fit: "适合有共同体验、允许各自探索、冲突后能迅速修复的活力型关系。",
    specialAdvice: "周野临时改变计划时，先判断自己是否真愿意，再用一个明确条件接受或拒绝；不要答应后用抱怨追讨成本。",
    questions: scatterQuestions(zhouYeQuestions, "zhouye"),
    endings: makeEndings([
      ["你们的火花来得快，熄得也快。他会觉得每一次靠近都要先通过一场情绪考试。", "你容易用控制对抗他的自由，用冷淡测试他的热情，双方很快进入追逃循环。", "周野能接受直接拒绝，不能长期猜暗示。下一次不想配合时，请当场说不，并给出一个你愿意的替代方案。"],
      ["你会被他的热烈吸引，却常在节奏变化时失去安全感。暧昧很上头，落地还差规则。", "你可能先迎合再抱怨，把本来可以协商的边界变成事后的牺牲账单。", "周野喜欢真实反应。下次答应一场临时冒险前，请先说清时间、预算或体力中的一条底线。"],
      ["你们已经能制造很多快乐，只是当新鲜感下降或承诺落空时，修复动作还不够稳定。", "你能接住热情，却可能在他拖延时自己收尾，久了会让责任分配越来越失衡。", "周野需要具体截止日，不需要反复提醒。下一次承诺落空时，请缩小任务并让他亲自给出完成时间。"],
      ["你既能陪他往前冲，也知道什么时候踩刹车。关系有活力，同时开始具备稳定骨架。", "你们都偏好快速行动，容易把情绪处理推到以后，积累到下一次突然爆发。", "周野愿意马上解决问题。争执结束前，请共同留下一个24小时内能完成的补救动作，而不只说已经翻篇。"],
      ["你能让他的热烈不被压制，也能把承诺从一句漂亮话变成可兑现的安排。", "太擅长陪他探索时，你可能忽略自己的恢复节奏，直到某次突然厌倦。", "周野会尊重清楚的边界。每次大型计划前，请先保留一段只属于你的时间，不要等耗尽后才退出。"],
      ["你们既有说走就走的默契，也有回到日常继续负责的能力。你是他愿意一起看更远风景的人。", "高匹配容易让你们依赖刺激维持心动，平淡期反而不知如何相处。", "周野擅长创造高光时刻。接下来请一起建立一个无需花钱、每周可重复的日常仪式，让关系不靠兴奋续命。"]
    ])
  },
  linwan: {
    name: "林晚", role: "细腻高敏的插画师", pronoun: "她", accent: "#55d6be", portrait: "assets/linwan.png",
    quote: "她听得见话语里的停顿，也希望自己的细腻被认真回应，而不是被简单安抚。",
    tags: ["高敏感", "重细节", "情绪诚实"],
    profile: "面对高敏型伴侣，你需要区分共情和兜底：看见她的情绪，不代表替她承担全部情绪。稳定回应、具体表达和清晰边界缺一不可。",
    strength: "你最能给她安全感的地方，是不急着否定感受，也不靠空洞保证换取短暂平静。",
    fit: "适合能谈感受、重视细节、允许脆弱也尊重彼此恢复节奏的深度关系。",
    specialAdvice: "林晚说‘没事’但状态明显变化时，只指出一次观察并给选择；她暂时不说，就约定稍后再确认，不连续逼问。",
    questions: scatterQuestions(linWanQuestions, "linwan-v3"),
    endings: makeEndings([
      ["她会觉得自己的情绪不断被纠正，却很少被真正听见。关系还没开始，防御已经先出现。", "你容易把敏感当麻烦，把解决问题当成回应，最终让她在你面前越来越沉默。", "林晚需要的不是立刻被修好。下一次她难受时，请先复述你听到的感受，再问她要陪伴还是办法。"],
      ["你有心照顾她，却常在过度安抚和突然抽离之间摇摆。她能感到喜欢，也会担心它不够稳定。", "为了避免她失望而承诺过多，短期很甜，长期会让每次做不到都变成新的不安。", "林晚记得承诺里的细节。下一次无法做到时，请提前说明真实能力，并给一个你确定能兑现的小动作。"],
      ["你已经能看见她的大部分情绪，只是在自己疲惫时，边界和解释容易一起消失。", "你可能把照顾放在前面，把自己的负荷藏起来，最后用一次突然爆发结算全部成本。", "林晚能理解你的有限。下一次没有精力陪伴时，请说明你还能给多少时间，并约好恢复联系的节点。"],
      ["你能接住她的细腻，也开始学会不替她包办情绪。你们有能力建立真正的安全感。", "你对情绪很敏锐，却可能为了照顾气氛推迟必要分歧，让问题换个形式回来。", "林晚害怕的是失联，不是不同意见。下一次需要反对时，请先确认关系仍在，再清楚说出你的立场。"],
      ["她可以在你面前脆弱，因为你既不会嘲笑，也不会用无限迎合换取和平。", "高共情可能让你们长时间沉浸在感受中，真正需要落实的决定反而被拖延。", "林晚愿意和你一起面对现实。每次深聊结束时，请共同确定一个48小时内能完成的具体动作。"],
      ["你能听见她没说出口的部分，也能守住自己的节奏。她愿意把最柔软的地方交给你。", "高度默契也可能让你们默认对方应该懂，慢慢减少直接表达。", "林晚很会捕捉暗示，但长期关系不能靠猜。每周选一件小事，明确说出感谢、失望或期待中的一种。"]
    ])
  },
  shenzhixia: {
    name: "沈知夏", role: "独立清醒的创业者", pronoun: "她", accent: "#f3c849", portrait: "assets/shenzhixia.png",
    quote: "她不需要被拯救，更在意你能否并肩前进，同时尊重彼此完整的人生。",
    tags: ["独立", "高执行", "平等共建"],
    profile: "面对事业型伴侣，你需要既不把独立误读成不需要爱，也不把支持变成介入和控制。真正的适配是平等协商、责任清楚、各自成长。",
    strength: "你最能获得她尊重的地方，是有自己的判断和生活，同时在重要节点真实出现。",
    fit: "适合目标清晰、财务与责任透明、双方都保有成长空间的合伙人式关系。",
    specialAdvice: "沈知夏进入工作模式时，先区分真正紧急和习惯性侵占；支持紧急事项，但要当场确认被挪走的关系时间如何补回。",
    questions: scatterQuestions(shenZhixiaQuestions, "shenzhixia"),
    endings: makeEndings([
      ["她会觉得你更想拥有一个配合自己的伴侣，而不是认识真实的她。关系很难越过礼貌合作。", "你容易把她的独立当成挑战，用牺牲、控制或冷淡证明自己的重要性。", "沈知夏不会用放弃人生证明爱。下一次她选择事业时，请讨论影响和补偿，不要要求她在目标和你之间二选一。"],
      ["你欣赏她的能力，却还没完全适应一段不以依赖证明亲密的关系。吸引很强，权力拉扯也明显。", "你可能过度证明自己，或把她的高效率理解为对你不耐烦，继而进入竞争。", "沈知夏尊重清楚的能力边界。下次感到被压过时，请提出你要负责的具体部分，而不是抢着承担全部。"],
      ["你们已经能并肩处理不少事情，只是在利益、时间和决策权发生冲突时，还需要更明确的规则。", "为了维持平等，你可能刻意回避被照顾，也不愿承认自己需要支持。", "沈知夏不怕你有需要，只怕需求变成隐形账单。下一次需要她出现时，请直接说明时间、方式和优先级。"],
      ["你既看得见她的锋利，也允许她有卸下盔甲的时刻。关系开始具备真正的伙伴感。", "你们都擅长解决问题，可能把每次争执都变成项目复盘，却遗漏情绪上的道歉。", "沈知夏接受高效协商，也需要关系温度。下一次达成方案后，请再补一句你理解她付出了什么。"],
      ["你不会因为她强大就退出，也不会用支持之名接管她的人生。她愿意为你留出长期位置。", "合伙感太强时，亲密可能只剩任务、预算和日程，彼此的脆弱没有入口。", "沈知夏平时很少主动示弱。每两周安排一次没有目标的相处，不讨论工作进度，只交换最近最真实的感受。"],
      ["你们都能独立站稳，也愿意把重要资源、风险和未来放到同一张桌上讨论。这是她认可的双向奔赴。", "高匹配不代表永远同步，两个强目标的人仍可能在关键节点走向不同方向。", "沈知夏愿意共同承担未来。每季度重谈一次城市、资金和时间优先级，允许答案变化，不用旧承诺绑住新现实。"]
    ])
  }
};

export const DIMENSION_ADVICE = {
  empathy: "当对方语气和状态不一致时，先说出你观察到的变化，再问‘你想让我听，还是一起想办法？’，不要连续追问超过两次。",
  expression: "当你想说‘算了’时，改成‘刚才发生了什么、我有什么感受、我希望下一次怎样’，把讨论控制在一个具体问题内。",
  boundary: "当临时安排打乱你的节奏时，先判断自己真正愿意到哪里，再给出可接受条件；不要先答应、事后用情绪追讨。",
  reliability: "对重要承诺同时写下负责人和截止时间；如果做不到，至少提前24小时说明并给出新的可兑现时间。",
  repair: "争执暂停时明确恢复沟通的时间，最长不超过24小时；重新开始后先确认伤害，再讨论谁的方案更合理。",
  growth: "涉及城市、事业或共同资金时，各自先写三条不可放弃项，再用一个月到三个月的小规模方案验证，不靠口头乐观下注。"
};
