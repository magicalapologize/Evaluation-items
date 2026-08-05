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

const option = (text, points, primary, secondary) => ({ text, points, primary, secondary });
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
    option("有点失望，不过临时加班能理解。你今晚告诉我下次哪天见。", 5, "expression", "reliability"),
    option("回一句‘没事你忙’，之后等他自己想起这件事", 1, "boundary", "expression"),
    option("所以还是工作更重要？这次不说清楚就别约了。", 0, "expression", "empathy"),
    option("行，你先忙。明天我们再挑个都不会放鸽子的时间。", 3, "reliability", "boundary")
  ]),
  question("第一章 · 初见试探", "慢速回复", "聊天正热时，顾言隔了六小时才回：‘刚开完会。’你会？", [
    option("那我也隔六小时再回，不能只有我等。", 0, "boundary", "repair"),
    option("接着聊刚才的话题，顺便问他一般几点有空看消息。", 5, "expression", "boundary"),
    option("先忙自己的，下次见面时再问问他平时回消息是什么节奏。", 3, "boundary", "reliability"),
    option("忍不住连发几条，问他是不是突然对我没兴趣了。", 1, "empathy", "expression")
  ]),
  question("第一章 · 初见试探", "安静饭局", "第一次吃饭，顾言话不多，但会认真听完你的每句话。你怎么推进气氛？", [
    option("不停换话题，怎么也不能让第一次见面冷下来。", 1, "expression", "empathy"),
    option("太闷了，吃完这顿就别有下次了。", 0, "boundary", "growth"),
    option("讲一件今天遇到的小事，说完看看他想不想接。", 5, "empathy", "expression"),
    option("安静一会儿也没事，再聊聊他刚才明显感兴趣的东西。", 3, "empathy", "boundary")
  ]),
  question("第一章 · 初见试探", "私人领地", "顾言说不喜欢别人没打招呼就翻他的桌面和手机。你会怎么接？", [
    option("谈恋爱还分什么你的我的？没秘密才叫信任。", 0, "expression", "boundary"),
    option("我不会乱翻，但真有重要的事，也别故意瞒着我。", 5, "boundary", "expression"),
    option("嘴上答应，心里决定以后悄悄观察", 1, "empathy", "boundary"),
    option("先按他的习惯来，真在一起后再聊哪些东西能不能碰。", 3, "boundary", "growth")
  ]),
  question("第二章 · 暧昧升温", "出差礼物", "顾言出差回来送你一本你提过的书，却没准备浪漫花束。你会？", [
    option("原来你还记得我提过这本书。等我看完，第一个找你聊。", 5, "empathy", "growth"),
    option("收下书，但暗示别人追人都会送花", 1, "expression", "empathy"),
    option("认为他只是顺手买的，不给任何特别回应", 0, "empathy", "reliability"),
    option("书我很喜欢，不过偶尔收到一次花，我应该也会很开心。", 3, "expression", "empathy")
  ]),
  question("第二章 · 暧昧升温", "关系确认", "暧昧一个月后，顾言仍没主动定义关系。你准备怎么做？", [
    option("再等等吧，先问的人好像就输了。", 1, "boundary", "expression"),
    option("发一大段消息过去，今天必须告诉我，我们到底算什么。", 0, "expression", "repair"),
    option("约他当面聊，告诉他我想认真在一起，再问他是怎么打算的。", 5, "expression", "growth"),
    option("先问清现在是不是只和彼此约会，再说好这周内把关系聊明白。", 3, "reliability", "growth")
  ]),
  question("第二章 · 暧昧升温", "前任来信", "顾言告诉你，前任因工作问题联系了他，他已经简短回复。你会？", [
    option("谢谢你主动告诉我。她这次找你的事已经聊完了吗？", 5, "boundary", "expression"),
    option("要求看完整聊天记录，证明没有隐瞒", 1, "reliability", "boundary"),
    option("说自己不介意，但之后反复拿这件事试探他", 0, "repair", "expression"),
    option("先听他把来龙去脉说完，再告诉他以后出现什么情况要跟我说。", 3, "empathy", "boundary")
  ]),
  question("第二章 · 暧昧升温", "工作低谷", "顾言的方案被否定，回家后只说想安静一会儿。你会？", [
    option("立刻帮他分析方案哪里出了问题", 1, "growth", "empathy"),
    option("觉得他拒绝交流，转身也不再理他", 0, "boundary", "repair"),
    option("好，你先静一会儿。我就在这儿，晚点想不想我陪你？", 5, "empathy", "boundary"),
    option("先不打扰他，但说好睡前聊十分钟，别让这件事悬一整晚。", 3, "boundary", "reliability")
  ]),
  question("第三章 · 正式相处", "周末独处", "你期待了一周的周末，顾言却说想一个人在家充电。你会？", [
    option("我确实有点失落。要不半天见面，另外半天你自己充电？", 5, "boundary", "expression"),
    option("答应后发朋友圈暗示自己被冷落", 0, "expression", "repair"),
    option("坚持恋爱就该优先陪伴，不接受他的独处安排", 1, "reliability", "boundary"),
    option("这周各自休息可以，但先把下次见面的时间定下来。", 3, "reliability", "growth")
  ]),
  question("第三章 · 正式相处", "朋友评价", "朋友说顾言‘太冷了，你以后肯定辛苦’，你会怎么处理？", [
    option("回去让顾言证明朋友看错了", 1, "expression", "reliability"),
    option("先听着，但冷不冷得看我和他怎么相处，不让朋友替我下结论。", 5, "boundary", "empathy"),
    option("为了维护他，直接和朋友翻脸", 0, "reliability", "boundary"),
    option("想想朋友说中了哪件具体的事，有机会只和顾言聊那一件。", 3, "expression", "repair")
  ]),
  question("第三章 · 正式相处", "共同支出", "旅行订房时，顾言提出把预算和分工先列清楚。你第一反应是？", [
    option("觉得太计较，恋爱不该算得这么细", 0, "empathy", "growth"),
    option("可以，先说最多花多少，再看订房、吃饭分别谁来付。", 5, "growth", "boundary"),
    option("让他全安排，自己到时候配合就好", 1, "reliability", "expression"),
    option("先告诉他我最多能花多少，再留一点钱给临时想玩的项目。", 3, "expression", "growth")
  ]),
  question("第三章 · 正式相处", "习惯摩擦", "顾言习惯所有东西归位，你却常把衣服放在椅背上。争执后你会？", [
    option("承诺以后绝不乱放，但过两天又恢复原样", 1, "reliability", "repair"),
    option("说他控制欲太强，谁也别管谁", 0, "boundary", "expression"),
    option("那椅子附近归我，公共区域用完就收，一周后看看行不行。", 5, "repair", "reliability"),
    option("先改掉最让他难受的两处，剩下的慢慢磨。", 3, "empathy", "repair")
  ]),
  question("第四章 · 冲突压力", "事实争执", "你们对同一件事记忆不同，顾言开始逐条复盘细节。你会？", [
    option("我知道你想把事情捋清，但我现在很难受。先看看我们到底要解决什么。", 5, "empathy", "repair"),
    option("认为他只想赢，停止沟通让他自己反省", 0, "boundary", "repair"),
    option("找聊天记录证明自己没错", 1, "reliability", "empathy"),
    option("先停十分钟，各自想清楚自己记得什么、到底想要什么，再回来谈。", 3, "repair", "expression")
  ]),
  question("第四章 · 冲突压力", "公开分歧", "聚会中顾言当众纠正了你的一个说法，你感觉被拆台。你会？", [
    option("当场讽刺回去，让他也难堪一次", 0, "expression", "repair"),
    option("先把聚会过完，回家告诉他，刚才那样当众纠正我真的很难堪。", 5, "boundary", "repair"),
    option("假装没事，以后减少带他见朋友", 1, "boundary", "expression"),
    option("当场简短说‘这个我们之后聊’，私下再说明感受", 3, "expression", "boundary")
  ]),
  question("第四章 · 冲突压力", "失约一次", "顾言忘了你们约好的纪念日晚餐，直到很晚才想起。你会？", [
    option("让他自己猜哪里错了，猜不到就算了", 0, "empathy", "expression"),
    option("马上说分手，忘记纪念日就是不爱", 1, "expression", "growth"),
    option("直接告诉他我为什么这么难过，再问他准备怎么补、以后怎么记住。", 5, "repair", "reliability"),
    option("今晚先别硬谈，明天找个不被打断的时间把这件事说清楚。", 3, "empathy", "repair")
  ]),
  question("第四章 · 冲突压力", "冷静时限", "争吵后顾言说需要冷静，但没有说要多久。你会？", [
    option("可以冷静，但别无限消失。最晚明晚，我们把话说完。", 5, "boundary", "repair"),
    option("不停追问，必须现在把问题解决", 1, "expression", "boundary"),
    option("也消失，谁先联系谁就输了", 0, "repair", "reliability"),
    option("只发一条，告诉他我等他冷静，但24小时内得说什么时候聊。", 3, "boundary", "expression")
  ]),
  question("第五章 · 长期选择", "异地机会", "顾言得到外地一年的重要项目机会，你的工作无法立刻搬走。你会？", [
    option("要求他放弃，真正爱你就不该去", 0, "growth", "boundary"),
    option("先把各自会得到和失去的东西摊开说，再试三个月异地看看。", 5, "growth", "reliability"),
    option("说随便他，反正未来谁也说不准", 1, "boundary", "expression"),
    option("先说好多久见一次、哪些事不能碰，一个月后再看还要不要继续。", 3, "reliability", "growth")
  ]),
  question("第五章 · 长期选择", "家庭边界", "顾言的家人开始频繁询问你们何时结婚，他没有及时制止。你会？", [
    option("当面顶回去，让所有人一次记住", 1, "expression", "boundary"),
    option("私下跟顾言把话说一致，再让他去跟自己家里讲清楚。", 5, "boundary", "reliability"),
    option("为了不破坏关系，先答应一个模糊时间", 0, "empathy", "expression"),
    option("告诉他我能接受问到哪一步，下次再被催婚，由他来回答。", 3, "expression", "boundary")
  ]),
  question("第五章 · 长期选择", "同居试运行", "顾言提出同居前先列家务、费用和独处时间。你会？", [
    option("觉得太像合同，住进去自然就知道了", 1, "empathy", "growth"),
    option("可以，先写几条最容易吵架的，住一个月后不合适再改。", 5, "growth", "repair"),
    option("全部照他的规则，避免刚开始就争执", 0, "boundary", "expression"),
    option("先聊家务、钱和独处这三件事，其他的遇到了再说。", 3, "reliability", "repair")
  ]),
  question("第五章 · 长期选择", "未来时间表", "顾言问你：‘你希望三年后的生活是什么样？’你会？", [
    option("说计划赶不上变化，现在开心就好", 1, "boundary", "growth"),
    option("说出我真正想过的日子，再问他这里面有多少也是他想要的。", 5, "growth", "expression"),
    option("先猜他期待什么，再按他的答案调整自己", 0, "empathy", "boundary"),
    option("告诉他哪些事我已经想定了，哪些事现在真的还给不了答案。", 3, "expression", "growth")
  ])
];

const zhouYeQuestions = [
  question("第一章 · 初见试探", "午夜邀约", "周野晚上十点发来消息：‘天气很好，要不要现在去江边？’你会？", [
    option("想去就去，不过先问清几点回、怎么回。", 5, "expression", "boundary"),
    option("故意说没空，看他会不会再邀请", 0, "expression", "reliability"),
    option("今晚不想临时出门，但可以约明天下午。", 3, "boundary", "expression"),
    option("答应后一路抱怨他完全没计划", 1, "growth", "empathy")
  ]),
  question("第一章 · 初见试探", "直球夸奖", "第一次见面，周野看着你说：‘你比照片里更有意思。’你会？", [
    option("笑着回他一句，你本人也比照片里更会聊天。", 5, "expression", "empathy"),
    option("怀疑他对所有人都这么说，当场追问情史", 0, "boundary", "empathy"),
    option("说‘还好吧’，把话题快速岔开", 1, "expression", "boundary"),
    option("大方说声谢谢，先不急着上头，看看他之后怎么做。", 3, "reliability", "empathy")
  ]),
  question("第一章 · 初见试探", "拍照边界", "周野举起相机想拍你，但你今天并不想入镜。你会？", [
    option("勉强配合，之后再闷闷不乐", 1, "empathy", "boundary"),
    option("直接挡住镜头并指责他不尊重人", 0, "expression", "repair"),
    option("今天不想入镜，你拍风景吧，我可以帮你挑角度。", 5, "boundary", "expression"),
    option("先别拍我，等哪天状态好一点，我会主动告诉你。", 3, "boundary", "empathy")
  ]),
  question("第一章 · 初见试探", "社交热场", "朋友聚会上，周野和每个人都聊得很热络，你有些被晾在一边。你会？", [
    option("先走过去一起聊，回去再告诉他下次别把我一个人晾这么久。", 5, "expression", "repair"),
    option("提前离场，让他自己发现你不高兴", 0, "boundary", "expression"),
    option("先找其他人聊天，散场后再说刚才确实有点被冷落。", 3, "boundary", "empathy"),
    option("整晚盯着他和谁说话，回家逐个盘问", 1, "reliability", "boundary")
  ]),
  question("第二章 · 暧昧升温", "冒险计划", "周野提议周末去一个没做攻略的小镇，说到了再决定。你会？", [
    option("可以去，别的随缘，但车票、住哪和最多花多少钱得先定。", 5, "growth", "boundary"),
    option("要求把每小时安排都定好，否则不去", 1, "reliability", "growth"),
    option("嘴上说随便，途中任何变化都怪他", 0, "repair", "expression"),
    option("先把住处订了，到了以后想去哪儿再现场决定。", 3, "growth", "reliability")
  ]),
  question("第二章 · 暧昧升温", "突然失联", "周野外拍一整天没信号，晚上才报平安。你会？", [
    option("人没事就好，但我今天真担心了。以后出发前发我一声。", 5, "expression", "reliability"),
    option("也关机一天，让他感受你的担心", 0, "repair", "boundary"),
    option("确认人安全就好，不再多问", 3, "empathy", "boundary"),
    option("要求以后实时共享定位", 1, "reliability", "boundary")
  ]),
  question("第二章 · 暧昧升温", "前任作品", "你发现周野仍保留着为前任拍的一组得意作品。你会？", [
    option("要求他立刻删除，过去不该影响现在", 1, "boundary", "expression"),
    option("假装不知道，之后反复比较自己和照片里的人", 0, "empathy", "repair"),
    option("先问这组照片对他意味着什么，再说哪些展示方式我接受不了。", 5, "empathy", "boundary"),
    option("作品可以留，但别拿照片里的人和现在的我比较。", 3, "boundary", "growth")
  ]),
  question("第二章 · 暧昧升温", "公开关系", "周野想发一张你们的合照，你还没准备好公开。你会？", [
    option("先答应，发出后再偷偷设为仅自己可见", 0, "reliability", "boundary"),
    option("我现在还不想公开，等我们确定关系满一个月再聊，可以吗？", 5, "boundary", "expression"),
    option("问他是不是非要靠朋友圈证明感情", 1, "expression", "empathy"),
    option("可以发一张不露脸的，但公开到什么程度我们得慢慢来。", 3, "growth", "boundary")
  ]),
  question("第三章 · 正式相处", "兴趣不同", "周野想去音乐节，你更想在家休息。他很期待你陪同。你会？", [
    option("勉强去，回来后强调自己为他牺牲很多", 0, "reliability", "repair"),
    option("这次我真不想去，你找朋友一起吧。我们改天再约个都喜欢的。", 5, "boundary", "growth"),
    option("要求他也别去，情侣就该一起行动", 1, "empathy", "boundary"),
    option("只参加半天，提前约好疲惫时可以先离开", 3, "expression", "boundary")
  ]),
  question("第三章 · 正式相处", "消费冲动", "周野看中一台超预算的相机，想先买再想办法。你会？", [
    option("直接说他不成熟，替他把订单取消", 0, "boundary", "empathy"),
    option("先问他买完还剩多少钱、到底会用几次，最后让他自己决定。", 5, "growth", "boundary"),
    option("支持梦想，钱不够可以先借给他", 1, "empathy", "reliability"),
    option("先别急着下单，等两天，再看看租一台或买二手划不划算。", 3, "reliability", "growth")
  ]),
  question("第三章 · 正式相处", "临时朋友局", "你们约好二人晚餐，周野临时想叫朋友一起。你会？", [
    option("当场拒绝所有朋友，二人约会绝不许变", 1, "expression", "boundary"),
    option("今晚我就想和你两个人吃。朋友局我们另外约一次。", 5, "expression", "reliability"),
    option("答应后全程不说话，让他知道你不满意", 0, "repair", "empathy"),
    option("今天我状态还行，可以一起吃，但下次加人要先问我。", 3, "boundary", "repair")
  ]),
  question("第三章 · 正式相处", "热情降温", "热恋期后，周野的消息明显没有以前密集。你会？", [
    option("增加消息频率，直到他恢复原来的热情", 1, "reliability", "boundary"),
    option("先过好自己的日子，见面时直接问他最近怎么突然安静了。", 5, "boundary", "expression"),
    option("默认他变心，提前结束关系", 0, "empathy", "repair"),
    option("先看一周他见面和答应的事有没有变，再拿具体变化去问。", 3, "reliability", "empathy")
  ]),
  question("第四章 · 冲突压力", "玩笑越界", "周野在朋友面前拿你的糗事开玩笑，大家都笑了。你会？", [
    option("现场用他的糗事还击", 0, "expression", "repair"),
    option("当场说一句‘这个不好笑，别讲了’，回家再告诉他为什么。", 5, "boundary", "repair"),
    option("陪着笑，之后几天都不理他", 1, "empathy", "expression"),
    option("私下告诉他刚才哪句话让我难受，以后这些事别拿到人前讲。", 3, "empathy", "boundary")
  ]),
  question("第四章 · 冲突压力", "说走就走", "争吵中周野摔门出去，只说‘我去透气’。你会？", [
    option("追出去拦住他，今天必须说完", 1, "expression", "boundary"),
    option("发消息问他人是否安全，再让他两小时后回来继续谈。", 5, "repair", "reliability"),
    option("把门反锁，今晚谁也别回来", 0, "repair", "boundary"),
    option("先不追，但告诉他睡前必须报平安，也得说什么时候回来聊。", 3, "boundary", "repair")
  ]),
  question("第四章 · 冲突压力", "承诺落空", "周野答应整理旅行照片，却拖了一个月还没动。你会？", [
    option("不再提醒，等他哪天自己愧疚", 0, "expression", "reliability"),
    option("你答应整理，拖一个月让我很失望。现在挑个真的做得到的日期。", 5, "reliability", "repair"),
    option("自己全部做完，再说他靠不住", 1, "growth", "boundary"),
    option("别一次全整理了，先挑20张，三天后给我看。", 3, "growth", "reliability")
  ]),
  question("第四章 · 冲突压力", "情绪爆发", "周野因为工作受挫语气很冲，事后说自己只是压力大。你会？", [
    option("理解他的压力，这次就不提了", 1, "empathy", "boundary"),
    option("我知道你今天很难受，但压力大也不能拿我出气。", 5, "empathy", "boundary"),
    option("以后他发火时你也加倍发火", 0, "repair", "expression"),
    option("现在先别说了，等都冷静下来，他得为刚才的话道歉。", 3, "repair", "reliability")
  ]),
  question("第五章 · 长期选择", "自由职业", "周野想辞职做自由摄影，收入可能半年不稳定。你会？", [
    option("支持他立刻辞职，热爱最重要", 1, "empathy", "reliability"),
    option("先算够不够撑半年，再定三个月要接到多少单，之后再辞。", 5, "growth", "reliability"),
    option("坚决反对，不稳定的人不适合长期关系", 0, "boundary", "growth"),
    option("先兼职接三个月单，看看收入到底能不能撑住。", 3, "reliability", "growth")
  ]),
  question("第五章 · 长期选择", "长期旅行", "周野想一起用三个月自驾，你担心工作和储蓄。你会？", [
    option("为了证明合拍，先答应再说", 0, "expression", "boundary"),
    option("三个月我真扛不住。先自驾两周，看看人和钱包受不受得了。", 5, "growth", "boundary"),
    option("直接说这种想法不切实际", 1, "empathy", "growth"),
    option("先把工作、钱和安全这三关过了，再挑出发日期。", 3, "reliability", "expression")
  ]),
  question("第五章 · 长期选择", "城市选择", "你得到外地晋升机会，周野的创作资源却集中在本地。你会？", [
    option("期待他自然跟着你走，不必把关系算太细", 1, "empathy", "boundary"),
    option("各自写下绝对不能放弃的东西，再看看留在本地、搬走或异地哪种能过。", 5, "growth", "expression"),
    option("为了不争吵直接放弃机会，但以后记在心里", 0, "repair", "boundary"),
    option("先异地三个月，说好多久见一次，也定好哪天必须做决定。", 3, "reliability", "growth")
  ]),
  question("第五章 · 长期选择", "平淡日常", "周野问：‘以后没有那么多新鲜事，你还会觉得我们合适吗？’你会？", [
    option("当然会有平淡的时候，但我想和你把普通日子也过出点意思。", 5, "growth", "reliability"),
    option("保证永远不会腻，让他不要想太多", 1, "empathy", "expression"),
    option("说感情变淡就说明不爱了", 0, "repair", "growth"),
    option("各自该玩的照样玩，每个月再一起去试一件没做过的事。", 3, "boundary", "growth")
  ])
];

const linWanQuestions = [
  question("第一章 · 初见试探", "一句没事", "约会结束后，林晚轻声说‘今天挺好的’，神情却有点失落。你会？", [
    option("相信她说的没事，不继续追问", 1, "boundary", "empathy"),
    option("指出她表情不对，要求现在说清楚", 0, "expression", "boundary"),
    option("我感觉你没有嘴上说的那么开心。想说的话，我现在听。", 5, "empathy", "boundary"),
    option("回家后问她，今天是不是有哪个瞬间让她不太舒服。", 3, "empathy", "expression")
  ]),
  question("第一章 · 初见试探", "作品分享", "林晚给你看一张还没完成的画，先说‘可能有点奇怪’。你会？", [
    option("立刻给出三个修改建议，证明你认真看了", 1, "growth", "expression"),
    option("先说最喜欢画里的哪个细节，再问她想听夸奖还是想听建议。", 5, "empathy", "expression"),
    option("夸‘很好看’，然后马上换话题", 0, "reliability", "expression"),
    option("先听她讲为什么这么画，等她真的问意见时再说。", 3, "boundary", "expression")
  ]),
  question("第一章 · 初见试探", "人群疲惫", "热闹聚会进行到一半，林晚明显安静下来。你会？", [
    option("替她宣布累了，马上带她离开", 1, "empathy", "boundary"),
    option("小声问她想出去透气、先回家，还是再待一会儿。", 5, "boundary", "empathy"),
    option("鼓励她再活跃一点，别扫大家兴", 0, "expression", "empathy"),
    option("陪她去安静的地方待十分钟，接下来走不走让她选。", 3, "boundary", "reliability")
  ]),
  question("第一章 · 初见试探", "细节记忆", "林晚记得你随口提过的口味，却发现你忘了她不吃香菜。你会？", [
    option("说这种小事没必要上纲上线", 0, "boundary", "expression"),
    option("是我忘了，先把这份换掉。下次点菜我会记得。", 5, "reliability", "empathy"),
    option("解释自己最近太忙，希望她理解", 1, "expression", "repair"),
    option("先把香菜挑掉或换一份，再问问她还有什么是真的不吃。", 3, "repair", "reliability")
  ]),
  question("第二章 · 暧昧升温", "情绪回音", "林晚发来一段很长的语音，说今天被同事否定得很难受。你会？", [
    option("回复一套解决职场问题的方法", 1, "growth", "empathy"),
    option("听起来你准备那么久却被一句否定，真的很委屈。你想让我陪你骂两句，还是一起想办法？", 5, "empathy", "expression"),
    option("回一个抱抱表情，等她自己消化", 0, "reliability", "boundary"),
    option("我现在能认真听十分钟，剩下的等我忙完继续，你别一个人憋着。", 3, "boundary", "reliability")
  ]),
  question("第二章 · 暧昧升温", "纪念小事", "林晚把第一次见面的电影票留了下来，你其实没这种习惯。你会？", [
    option("说她太容易感动，留这些没什么用", 0, "expression", "boundary"),
    option("原来这张票对你这么重要。以后我们挑几样真的想留下的东西吧。", 5, "empathy", "growth"),
    option("以后强迫自己保存所有票根，免得她失望", 1, "reliability", "boundary"),
    option("帮她给票根拍照存档，实物由她决定是否保留", 3, "growth", "boundary")
  ]),
  question("第二章 · 暧昧升温", "确认心意", "林晚问：‘你是真的喜欢我，还是只是觉得我适合？’你会？", [
    option("说喜欢就是喜欢，没必要分析那么多", 1, "expression", "empathy"),
    option("说出几个真正心动的瞬间，也坦白我喜欢她，但还得慢慢相处。", 5, "expression", "reliability"),
    option("反问她为什么总是不相信你", 0, "repair", "empathy"),
    option("先问她最近为什么突然不安，再把我现在做得到和做不到的说清楚。", 3, "empathy", "boundary")
  ]),
  question("第二章 · 暧昧升温", "前任阴影", "林晚坦白，上一段关系让她很怕突然被冷落。你会？", [
    option("保证自己绝不会像前任，让她完全放心", 1, "expression", "reliability"),
    option("我知道你怕被突然丢下。以后有变化我会直说，你不用一遍遍猜。", 5, "boundary", "reliability"),
    option("觉得她还没放下前任，暂时拉开距离", 0, "boundary", "repair"),
    option("问问她什么情况最容易胡思乱想，也告诉她我不可能随时都回消息。", 3, "empathy", "boundary")
  ]),
  question("第三章 · 正式相处", "独处沉默", "林晚情绪低落时不想说话，只想有人陪着。你会？", [
    option("不逼她说话，就坐在旁边陪着，也提前告诉她我几点得走。", 5, "empathy", "boundary"),
    option("不停找话题逗她，直到她开心起来", 1, "expression", "empathy"),
    option("觉得既然不说话就没必要陪", 0, "boundary", "reliability"),
    option("给她倒杯水、拿条毯子，安静待十分钟后再问要不要我留下。", 3, "reliability", "boundary")
  ]),
  question("第三章 · 正式相处", "消息语气", "你忙时回了一个‘嗯’，林晚问你是不是生气了。你会？", [
    option("没生气，刚才真的在忙。等我七点结束再好好回你。", 5, "expression", "reliability"),
    option("说她想太多，一个字也能脑补", 0, "expression", "repair"),
    option("赶紧补一串甜言蜜语，先把她哄住再说。", 1, "reliability", "boundary"),
    option("先回一句‘真没生气’，忙完后再告诉她今天为什么话少。", 3, "expression", "empathy")
  ]),
  question("第三章 · 正式相处", "社交电量", "你很想带林晚参加公司聚餐，她担心陌生人太多。你会？", [
    option("告诉她大家都很好相处，不去显得不合群", 0, "expression", "boundary"),
    option("告诉她我为什么希望她来，但只待一小时也行，实在不想去也行。", 5, "boundary", "expression"),
    option("取消聚餐，以后都不让她为难", 1, "boundary", "growth"),
    option("先告诉她会见到谁，再约个撤退暗号，去不去由她决定。", 3, "reliability", "boundary")
  ]),
  question("第三章 · 正式相处", "礼物落差", "你送了实用的降噪耳机，林晚却期待一封手写信。你会？", [
    option("说耳机更贵更有用，她不该挑剔", 0, "expression", "repair"),
    option("明白她不是嫌礼物，是想听见我的心里话。下次耳机和信都准备。", 5, "empathy", "growth"),
    option("马上买更多礼物补偿", 1, "reliability", "expression"),
    option("现在补写一段真心话，也告诉她下次想要仪式感可以提前说。", 3, "expression", "repair")
  ]),
  question("第四章 · 冲突压力", "旧事重提", "争吵时，林晚又提起三个月前一次相似的失望。你会？", [
    option("说旧账翻来翻去永远没完", 0, "repair", "empathy"),
    option("先问清上次那件事她是不是一直没过去，再看看为什么这次又重演了。", 5, "repair", "empathy"),
    option("把她之前的错误也全部列出来", 1, "expression", "boundary"),
    option("可以聊上次，但今天只挑最要紧的一件解决，别越扯越远。", 3, "boundary", "repair")
  ]),
  question("第四章 · 冲突压力", "眼泪时刻", "争执中林晚哭了，但你认为自己的观点没有错。你会？", [
    option("先停下来陪她缓一缓，但也说好冷静后这件事还要继续谈。", 5, "empathy", "repair"),
    option("为了不让她哭，立刻承认所有问题都是你的", 1, "repair", "boundary"),
    option("强调哭不能改变事实，继续把道理说完", 0, "expression", "empathy"),
    option("问她现在想抱一下还是想自己待着，等缓过来再把话说完。", 3, "boundary", "empathy")
  ]),
  question("第四章 · 冲突压力", "需要确认", "林晚连续问了三次‘你还爱我吗’，你已经有些疲惫。你会？", [
    option("再保证一次，以后她问多少次都回答", 1, "reliability", "boundary"),
    option("认真回答这一次，也告诉她可以说哪里不安，别一直用同一句话考我。", 5, "empathy", "boundary"),
    option("拒绝回答，让她自己学会安全感", 0, "boundary", "repair"),
    option("先问今天到底发生了什么，再商量以后不安时换一种说法告诉我。", 3, "growth", "reliability")
  ]),
  question("第四章 · 冲突压力", "沉默误解", "你需要半天冷静，林晚却把沉默理解为要分手。你会？", [
    option("我没想分手，只是需要安静半天。晚上八点我会回来找你。", 5, "reliability", "repair"),
    option("觉得解释会助长依赖，继续不回复", 0, "boundary", "empathy"),
    option("放弃冷静，马上回来陪她直到情绪稳定", 1, "reliability", "boundary"),
    option("发一句‘我还在，晚点聊’，然后到说好的时间真的出现。", 3, "reliability", "expression")
  ]),
  question("第五章 · 长期选择", "创作低收入", "林晚想减少商业项目，用半年完成个人画册。你会？", [
    option("支持梦想，经济问题以后再想", 1, "growth", "reliability"),
    option("先算半年最少要花多少钱，再说每个月画到哪，撑不住时怎么办。", 5, "growth", "reliability"),
    option("认为不赚钱的爱好不值得冒险", 0, "growth", "empathy"),
    option("先试三个月，每月看看进度和收入，低过底线就及时调整。", 3, "reliability", "growth")
  ]),
  question("第五章 · 长期选择", "照顾家人", "林晚可能需要长期照顾生病的家人，生活安排会被打乱。你会？", [
    option("承诺所有压力都由你承担", 1, "reliability", "boundary"),
    option("先弄清到底需要照顾到什么程度，再看她、我和家里其他人各做什么。", 5, "boundary", "reliability"),
    option("担心拖累自己，劝她交给其他家人", 0, "boundary", "growth"),
    option("先固定帮她做一件我能长期坚持的事，过两周再看够不够。", 3, "reliability", "boundary")
  ]),
  question("第五章 · 长期选择", "婚礼期待", "林晚很看重婚礼细节，你更在意简单省钱。你会？", [
    option("告诉她婚礼只是形式，没必要投入太多", 0, "expression", "growth"),
    option("各自挑出婚礼最不能省的三样，再看看预算里怎么都保住。", 5, "growth", "empathy"),
    option("全部交给她决定，自己只负责付钱", 1, "reliability", "expression"),
    option("一人保留一项绝对不能省的，其他地方能简就简。", 3, "boundary", "growth")
  ]),
  question("第五章 · 长期选择", "安全感来源", "林晚问：‘以后很忙的时候，我们靠什么确定彼此还在？’你会？", [
    option("说真正相爱就不需要这些形式", 0, "growth", "reliability"),
    option("再忙也每天报声平安、每周见一次，吵架也不能一声不响地消失。", 5, "reliability", "growth"),
    option("保证每天随时回复，绝不让她等待", 1, "boundary", "expression"),
    option("先保证每周有一次不看手机、好好聊天的时间，忙起来再调整。", 3, "growth", "reliability")
  ])
];

const shenZhixiaQuestions = [
  question("第一章 · 初见试探", "会议迟到", "沈知夏因为会议晚到二十分钟，提前发了消息并道歉。你会？", [
    option("等二十分钟确实有点烦，不过你提前说了，这次就继续约会。", 5, "expression", "empathy"),
    option("冷着脸让她猜自己有多生气", 0, "repair", "expression"),
    option("说没关系，但之后反复提她第一次就迟到", 1, "reliability", "repair"),
    option("这次算突发情况。下次要晚超过十五分钟，我们就直接改天。", 3, "boundary", "reliability")
  ]),
  question("第一章 · 初见试探", "工作电话", "约会中沈知夏接了一个紧急工作电话，回来后说可以继续。你会？", [
    option("你现在真的能放下工作吗？不行的话我们改天，别两边都硬撑。", 5, "empathy", "boundary"),
    option("说工作永远比你重要，提前结束", 0, "expression", "empathy"),
    option("装作不介意，但整晚减少回应", 1, "boundary", "repair"),
    option("再给她五分钟把工作收完，之后这段时间就只留给我们。", 3, "reliability", "boundary")
  ]),
  question("第一章 · 初见试探", "观点交锋", "沈知夏直接反驳了你的一个观点，但没有人身攻击。你会？", [
    option("把不同意见当成不尊重，立刻反击", 0, "expression", "repair"),
    option("问她为什么这么想，也直接说出我到底不同意哪一点。", 5, "expression", "growth"),
    option("表面附和，之后不再谈重要话题", 1, "boundary", "expression"),
    option("她说得有道理的地方我认，但不代表整件事我都同意。", 3, "empathy", "boundary")
  ]),
  question("第一章 · 初见试探", "行程独立", "沈知夏说周末已有自己的安排，不能临时见面。你会？", [
    option("觉得她没有为恋爱留位置，降低联系热情", 1, "reliability", "empathy"),
    option("好，你先按原计划来。我们现在把下次见面的时间定一下。", 5, "boundary", "reliability"),
    option("临时出现在她活动附近制造惊喜", 0, "expression", "boundary"),
    option("各自过周末，约好之后分享有趣的事", 3, "boundary", "growth")
  ]),
  question("第二章 · 暧昧升温", "资源建议", "沈知夏聊到业务难题，你恰好认识能帮忙的人。你会？", [
    option("直接替她联系，给她一个惊喜", 1, "reliability", "boundary"),
    option("我刚好认识一个人可能帮得上。你要我介绍吗？我只负责牵线。", 5, "boundary", "growth"),
    option("担心利益混进感情，完全不提", 0, "expression", "empathy"),
    option("把对方的信息发给她，要不要联系、怎么谈都让她自己决定。", 3, "growth", "boundary")
  ]),
  question("第二章 · 暧昧升温", "忙碌生日", "沈知夏生日当天要路演，只能晚上见一小时。你会？", [
    option("要求她取消工作，生日一年只有一次", 0, "empathy", "boundary"),
    option("这一小时就好好陪她过，再马上挑一天补一场完整的。", 5, "reliability", "empathy"),
    option("说自己不在意生日，以后也不再准备", 1, "expression", "repair"),
    option("先问她那天最想要什么，再准备一个不让她更累的小庆祝。", 3, "empathy", "boundary")
  ]),
  question("第二章 · 暧昧升温", "关系节奏", "沈知夏说很喜欢你，但暂时不想让恋爱占据全部生活。你会？", [
    option("我也不想一天到晚绑在一起，但至少多久见一次、什么事要说，得聊清楚。", 5, "boundary", "reliability"),
    option("觉得她只想享受暧昧，不愿承担责任", 1, "expression", "empathy"),
    option("假装同意，之后不断增加见面频率", 0, "boundary", "repair"),
    option("先按现在的节奏相处一个月，到时再问彼此舒不舒服。", 3, "growth", "reliability")
  ]),
  question("第二章 · 暧昧升温", "收入差距", "你发现沈知夏收入明显高于你，她并没有主动谈论。你会？", [
    option("用玩笑贬低她的工作，降低自己的不适", 0, "empathy", "repair"),
    option("不硬装谁养谁，聊到花钱时直接说各自负担得起多少。", 5, "expression", "boundary"),
    option("以后所有约会都抢着买单证明自己", 1, "reliability", "boundary"),
    option("平时就选两个人都付得轻松的地方，大笔花费再单独聊。", 3, "boundary", "growth")
  ]),
  question("第三章 · 正式相处", "公开支持", "沈知夏要参加重要演讲，希望你到场，但那天你也很忙。你会？", [
    option("答应到场，即使自己的工作全部推迟", 1, "empathy", "boundary"),
    option("告诉她我那天也卡着工作，但会尽量赶上最重要的部分；赶不上也提前准备好支持。", 5, "reliability", "expression"),
    option("认为她独立，不需要你特别出现", 0, "empathy", "reliability"),
    option("真去不了就早点说，当天演讲结束后留出时间单独给她庆祝。", 3, "reliability", "repair")
  ]),
  question("第三章 · 正式相处", "决策习惯", "旅行时沈知夏快速定好了大部分安排，你觉得没有参与感。你会？", [
    option("旅行中处处挑问题，证明她安排得不好", 0, "repair", "expression"),
    option("直接说我也想参与，剩下的吃饭和行程我们一人决定一项。", 5, "expression", "growth"),
    option("既然她能干，就全部让她负责", 1, "reliability", "boundary"),
    option("先谢谢她做了这么多，再说下次出发前我们一人负责一部分。", 3, "empathy", "repair")
  ]),
  question("第三章 · 正式相处", "异性伙伴", "沈知夏经常和一位异性合伙人出差，你感到不安。你会？", [
    option("要求她更换搭档，避免一切可能", 0, "boundary", "empathy"),
    option("直接说我担心什么，再聊聊出差时怎么联系、工作之外怎么相处才合适。", 5, "expression", "boundary"),
    option("不说，但开始检查她的社交动态", 1, "reliability", "boundary"),
    option("先弄清他们平时到底怎么合作，再提一个能让我踏实些的做法。", 3, "empathy", "reliability")
  ]),
  question("第三章 · 正式相处", "低能量夜晚", "一向能干的沈知夏回家后说今天什么都不想决定。你会？", [
    option("替她把所有事情决定好，不让她再费心", 1, "reliability", "boundary"),
    option("只问她今晚想让我陪着，还是想自己安静。", 5, "empathy", "boundary"),
    option("提醒她成年人不能逃避问题", 0, "growth", "empathy"),
    option("先替她搞定今晚最急的一件事，剩下的睡醒再说。", 3, "reliability", "empathy")
  ]),
  question("第四章 · 冲突压力", "被安排感", "沈知夏替你规划了一项职业选择，语气像已经替你决定。你会？", [
    option("直接说她控制欲强，以后别管你的事", 1, "expression", "repair"),
    option("我知道你是为我好，但这件事最后得我自己定。你可以帮我看看风险。", 5, "boundary", "expression"),
    option("先照做，失败后再怪她", 0, "reliability", "boundary"),
    option("先把她的想法听完，但告诉她我需要一天时间自己想。", 3, "growth", "boundary")
  ]),
  question("第四章 · 冲突压力", "取消纪念日", "重要融资临时撞上纪念日，沈知夏希望改期。你会？", [
    option("可以改，但当天留十分钟给我，也现在就把补过的日子定下来。", 5, "reliability", "expression"),
    option("同意后故意不回消息，让她感到愧疚", 0, "repair", "empathy"),
    option("要求她二选一，看事业和你谁更重要", 1, "expression", "boundary"),
    option("先确认融资确实挪不了，再挑一个她能彻底关掉工作的日子补过。", 3, "growth", "reliability")
  ]),
  question("第四章 · 冲突压力", "高压语气", "沈知夏压力大时用命令式语气和你说话，事后没意识到。你会？", [
    option("先停下来，告诉她可以着急，但别用这种口气跟我说，请她重说一遍。", 5, "boundary", "expression"),
    option("理解她太累，先把事情做完再说", 1, "empathy", "boundary"),
    option("同样用命令语气回击", 0, "repair", "expression"),
    option("真着急的那一步先做完，之后马上告诉她，刚才那种口气我不接受。", 3, "reliability", "boundary")
  ]),
  question("第四章 · 冲突压力", "输赢争论", "一次争执里，沈知夏不断拿事实证明自己的方案更有效。你会？", [
    option("你的办法也许更有效，但你一路替我做决定，我真的很不舒服。", 5, "empathy", "expression"),
    option("既然她总是对的，以后什么都不参与", 0, "boundary", "repair"),
    option("找更多证据证明她也有错", 1, "growth", "empathy"),
    option("先别争谁赢。下次再遇到这件事，我们一人负责哪一步？", 3, "repair", "growth")
  ]),
  question("第五章 · 长期选择", "事业城市", "沈知夏的公司必须留在深圳，你更想回家乡发展。你会？", [
    option("默认感情稳定后她自然会跟你走", 1, "empathy", "boundary"),
    option("把两边的工作、家人和生活成本都算一遍，再定个必须做决定的日期。", 5, "growth", "expression"),
    option("避免谈未来，先过好现在", 0, "boundary", "growth"),
    option("先异地半年，每个月认真聊一次感情和各自的发展还撑不撑得住。", 3, "reliability", "growth")
  ]),
  question("第五章 · 长期选择", "家务分工", "同居后沈知夏工作更忙，但收入也更高。家务怎么分？", [
    option("收入高的人负责出钱，另一方自然多做家务", 1, "reliability", "boundary"),
    option("看谁有时间、谁更擅长，实在忙不过来就花钱请人，每月再调。", 5, "growth", "reliability"),
    option("谁看不下去谁做，不必定规则", 0, "repair", "expression"),
    option("一人先固定包两样家务，忙不过来的部分就请人做。", 3, "boundary", "reliability")
  ]),
  question("第五章 · 长期选择", "风险投资", "沈知夏想把大部分积蓄投入新项目，可能影响共同购房计划。你会？", [
    option("支持她的判断，成功后什么都有了", 1, "empathy", "reliability"),
    option("先把买房的钱单独留下，再看她自己的钱最多能拿多少去冒险。", 5, "boundary", "growth"),
    option("要求她放弃项目，家庭必须优先", 0, "expression", "empathy"),
    option("共同计划的钱至少留够底线，剩下的分几次投，亏到哪一步就停。", 3, "reliability", "growth")
  ]),
  question("第五章 · 长期选择", "伴侣位置", "沈知夏问：‘你希望我在关系里是什么角色？’你会？", [
    option("希望她在外能干，回家后多照顾关系", 0, "empathy", "boundary"),
    option("我希望我们都能独立做自己，也能互相撑一把，不愿意时敢说不。", 5, "boundary", "growth"),
    option("说只要相爱，角色并不重要", 1, "expression", "reliability"),
    option("先告诉她我愿意为这段关系做什么，再问她希望自己做到什么。", 3, "expression", "reliability")
  ])
];

const makeEndings = (items) => items.map(([comment, risk, reminder]) => ({ comment, risk, reminder }));

export const ROLES = {
  guyan: {
    name: "顾言", role: "冷静克制的建筑师", pronoun: "他", accent: "#2864ff", portrait: "assets/guyan.webp",
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
    name: "周野", role: "直球热烈的摄影师", pronoun: "他", accent: "#ff5a6f", portrait: "assets/zhouye.webp",
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
    name: "林晚", role: "细腻高敏的插画师", pronoun: "她", accent: "#55d6be", portrait: "assets/linwan.webp",
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
    name: "沈知夏", role: "独立清醒的创业者", pronoun: "她", accent: "#f3c849", portrait: "assets/shenzhixia.webp",
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
