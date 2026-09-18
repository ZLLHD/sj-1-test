/* FlatCircle · 种子数据（首次启动注入，之后走 localStorage） */
window.FC = window.FC || {};
(function (FC) {
  'use strict';

  const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const ago = (ms) => Date.now() - ms;

  /* 机器人语料：私信自动回复 */
  FC.PERSONAS = {
    u1: ['哈哈，正好我也在画这个！', '等我几分钟，草稿发你看看～', '你这句话说得我灵感来了', '刚画完一只猫，回头给你看', '配色我再调一版，明天给你'],
    u2: ['这个我熟，上周刚踩过坑', '我看看……嗯，多半是缓存问题', '行，我记下了，下午处理', '在的，说', '接口我加个超时重试吧'],
    u3: ['需求文档我更新了，你瞅瞅', '先喝杯咖啡再说', '这个优先级不高，排下期吧', '同意！那就这么定', '下午三点开会前同步一下'],
    u4: ['好耶！', '哈哈哈笑死', '在图书馆，小声说话', '作业还没写完呢……', '等会儿去食堂，一起？'],
    u5: ['光线不错，改天带你去拍', '我把原片修好发你', '这组片子我自己挺满意的', '镜头借你玩几天', '周末去扫街吗？'],
    u6: ['今天试了个新方子，超好吃', '给你留了一份，快来', '吃了吗？没吃我教你做', '这个必须趁热吃', '下次教你做溏心蛋'],
    u7: ['今晚练腿，来不来？', '记得拉伸', '今天打卡了吗？', '我刚跑完十公里', '少吃点夜宵啊朋友']
  };

  /* 机器人语料：评论别人的新帖 */
  FC.BOT_COMMENTS = ['说得好！', '哈哈哈真实', '学到了，谢谢分享 👏', '同感，我也这么觉得', '这个我喜欢', '顶一个', '已转发给朋友了 😄', '拍得真好看', '收藏了，回头细看'];

  /* 机器人语料：私信开场白（被关注后回关时不用，仅用于自动回复首句之外的备用） */
  FC.BOT_GREET = ['在呢', '哈喽～', '刚看到消息', '怎么啦？'];

  /* 机器人语料：通过好友请求后的打招呼 */
  FC.BOT_FRIEND_GREET = ['我们已经是好友啦，随时找我聊天～', '通过啦！以后常联系 🎉', '交个朋友，握爪 🤝', '嗨，好友列表里见 👋'];

  FC.seed = function () {
    const users = [
      { id: 'u1', name: '林小满', handle: 'xiaoman', bio: '插画师 · 画猫和一切可爱的东西', color: '#D9538E', followers: ['u3', 'u4', 'u5', 'u6'], following: ['u5', 'u6'], friends: [] },
      { id: 'u2', name: '陈野', handle: 'chenye', bio: '后端工程师 · 分布式与咖啡因', color: '#3D6DF2', followers: ['u3', 'u4', 'u7'], following: ['u1', 'u3'], friends: [] },
      { id: 'u3', name: '苏黎', handle: 'suli', bio: '产品经理 · 咖啡因驱动型选手', color: '#E8A13A', followers: ['u1', 'u2', 'u4'], following: ['u2', 'u4', 'u6'], friends: [] },
      { id: 'u4', name: '周舟', handle: 'zhouzhou', bio: '大学生 · 在图书馆和床之间反复横跳', color: '#22A06B', followers: ['u1', 'u7'], following: ['u1', 'u3', 'u6'], friends: [] },
      { id: 'u5', name: '顾青', handle: 'guqing', bio: '摄影师 · 城市与光影收集者', color: '#2AA8C4', followers: ['u1', 'u6'], following: ['u1', 'u6'], friends: [] },
      { id: 'u6', name: '白露', handle: 'bailu', bio: '美食博主 · 认真吃饭，好好生活', color: '#E1543A', followers: ['u1', 'u3', 'u4', 'u5'], following: ['u1', 'u5'], friends: [] },
      { id: 'u7', name: '江辰', handle: 'jiangchen', bio: '健身教练 · 自律使我自由', color: '#7C5CFC', followers: ['u4'], following: ['u2', 'u4'], friends: [] }
    ];

    const me = {
      id: 'me', name: '阿泽', handle: 'aze', color: '#3D6DF2',
      bio: '在 FlatCircle 记录日常 ✨ 喜欢咖啡、代码和傍晚的风',
      followers: ['u1', 'u3'], following: ['u1', 'u6'],
      friends: [], friendReqOut: []
    };

    const posts = [
      {
        id: 'p1', authorId: 'u1', createdAt: ago(38 * MIN),
        content: '今天把工作室的窗台重新布置了一遍，阳光刚好落在画板上。\n新系列准备叫《午后的猫》🐱 #手绘 #日常',
        images: [FC.flatArt('studio-cat'), FC.flatArt('window-light')],
        likes: ['u3', 'u5', 'u6', 'u4'], favorites: ['u5'], comments: [
          { id: 'c1', authorId: 'u5', content: '光太好了，改天去你工作室拍一组', createdAt: ago(30 * MIN), likes: ['u1'] },
          { id: 'c2', authorId: 'u3', content: '期待新系列！', createdAt: ago(22 * MIN), likes: [] }
        ]
      },
      {
        id: 'p2', authorId: 'u2', createdAt: ago(2 * HOUR + 12 * MIN),
        content: '线上一个诡异 bug：只在周三下午出现。最后发现是某个定时任务和报表查询撞了锁。\n结论：玄学 bug 背后往往是最朴素的并发问题 #编程 #踩坑',
        images: [], likes: ['me', 'u3', 'u7'], favorites: [], comments: [
          { id: 'c3', authorId: 'u3', content: '这个我可以写进事故复盘模板了', createdAt: ago(1 * HOUR), likes: ['u2'] },
          { id: 'c4', authorId: 'u7', content: '看不懂但觉得很厉害', createdAt: ago(50 * MIN), likes: [] }
        ]
      },
      {
        id: 'p3', authorId: 'u6', createdAt: ago(4 * HOUR),
        content: '深夜食堂营业🎏 今天做的是番茄牛腩面，汤底炖了两个小时。\n你们夜宵都吃什么？ #夜宵 #美食',
        images: [FC.flatArt('noodle-bowl')],
        likes: ['u1', 'u3', 'u4', 'u5', 'me'], favorites: ['me'], comments: [
          { id: 'c5', authorId: 'u4', content: '救命，正在减肥的我为什么要刷到这个', createdAt: ago(3 * HOUR), likes: ['u6', 'u1'] },
          { id: 'c6', authorId: 'u1', content: '面看着好劲道！', createdAt: ago(2 * HOUR + 40 * MIN), likes: [] }
        ]
      },
      {
        id: 'p4', authorId: 'u4', createdAt: ago(6 * HOUR),
        content: '期末周进度：3/7。在图书馆坐了一整天，感觉自己像一株光合作用的植物🌱 #学习打卡',
        images: [], likes: ['u1', 'u7'], favorites: [], comments: [
          { id: 'c7', authorId: 'u7', content: '坐一天也不行，起来拉伸十分钟', createdAt: ago(5 * HOUR), likes: ['u4'] }
        ]
      },
      {
        id: 'p5', authorId: 'u5', createdAt: ago(9 * HOUR),
        content: '清晨六点的老城区，扫街一小时的成果。\n选了三张最喜欢的，光影真的会说话。 #摄影 #城市漫步',
        images: [FC.flatArt('city-morning-1'), FC.flatArt('city-morning-2'), FC.flatArt('city-morning-3')],
        likes: ['u1', 'u2', 'u3', 'u6', 'me'], favorites: ['u1'], comments: [
          { id: 'c8', authorId: 'u1', content: '第二张的构图绝了', createdAt: ago(8 * HOUR), likes: ['u5'] }
        ]
      },
      {
        id: 'p6', authorId: 'u3', createdAt: ago(11 * HOUR),
        content: '开了三个小时的会，最后决定：不做。\n有时候最好的产品决策就是敢于说“不” #职场 #产品',
        images: [], likes: ['u2', 'u5'], favorites: [], comments: [
          { id: 'c9', authorId: 'u2', content: '同意，砍需求比加需求更需要勇气', createdAt: ago(10 * HOUR), likes: ['u3'] }
        ]
      },
      {
        id: 'p7', authorId: 'u7', createdAt: ago(1 * DAY + 2 * HOUR),
        content: '今日训练：深蹲 5×5，卧推 5×5，硬拉 1×5。\n新手朋友记住：动作质量永远大于重量 #健身 #力量训练',
        images: [FC.flatArt('gym-bars')],
        likes: ['u4', 'u2'], favorites: [], comments: []
      },
      {
        id: 'p8', authorId: 'u1', createdAt: ago(1 * DAY + 8 * HOUR),
        content: '接上条，猫画完了。它本人对作品表示满意（并没有）🐈 #手绘',
        images: [FC.flatArt('cat-final')],
        likes: ['u3', 'u5', 'u6', 'me'], favorites: [], comments: [
          { id: 'c10', authorId: 'u6', content: '太可爱了吧！求头像授权', createdAt: ago(1 * DAY + 6 * HOUR), likes: ['u1'] }
        ]
      },
      {
        id: 'p9', authorId: 'u6', createdAt: ago(2 * DAY),
        content: '整理了最近做的便当合集，工作日带饭第 47 天。\n坚持下来最大的感受：省钱是其次，是胃真的舒服了 #美食 #便当',
        images: [FC.flatArt('bento-1'), FC.flatArt('bento-2')],
        likes: ['u1', 'u3', 'u4'], favorites: ['u3'], comments: []
      },
      {
        id: 'p10', authorId: 'u2', createdAt: ago(2 * DAY + 5 * HOUR),
        content: '周末把博客从 Hexo 迁到了自己写的静态站点，顺手接了个 RSS。\n折腾的意义就在于折腾本身 #编程 #博客',
        images: [], likes: ['u3'], favorites: [], comments: [
          { id: 'c11', authorId: 'u4', content: '大佬，等一个搭建教程', createdAt: ago(2 * DAY + 3 * HOUR), likes: [] }
        ]
      },
      {
        id: 'p11', authorId: 'u5', createdAt: ago(3 * DAY),
        content: '胶片洗出来了，柯达金 200 的暖调果然不会让人失望。\n暗房待了一下午，值得。 #摄影 #胶片',
        images: [FC.flatArt('film-warm-1'), FC.flatArt('film-warm-2')],
        likes: ['u1', 'u6', 'me'], favorites: [], comments: []
      },
      {
        id: 'p12', authorId: 'u4', createdAt: ago(4 * DAY),
        content: '考完啦！！！！！解放！！！！！\n先睡 12 个小时，剩下的明天再说 😴 #期末周',
        images: [], likes: ['u1', 'u3', 'u7', 'me'], favorites: [], comments: [
          { id: 'c12', authorId: 'u7', content: '恭喜！明天球场见', createdAt: ago(4 * DAY - 2 * HOUR), likes: [] }
        ]
      },
      {
        id: 'p13', authorId: 'u3', createdAt: ago(5 * DAY),
        content: '重读了《纳瓦尔宝典》，划了一句话：「用判断力赚钱，而不是用时间换钱。」\n值得每年读一遍 #读书',
        images: [], likes: ['u2', 'u5'], favorites: ['me'], comments: []
      },
      {
        id: 'p14', authorId: 'u6', createdAt: ago(6 * DAY),
        content: '新买了手冲壶，练习了一周的注水。\n终于能稳定冲出一杯甜感明显的耶加了☕ #今日咖啡',
        images: [FC.flatArt('pour-over')],
        likes: ['u1', 'u3', 'me'], favorites: [], comments: [
          { id: 'c13', authorId: 'u2', content: '甜感明显说明萃取稳了，厉害', createdAt: ago(5 * DAY), likes: ['u6'] }
        ]
      }
    ];

    const chats = [
      {
        id: 'ch1', userId: 'u1', messages: [
          { id: 'm1', from: 'u1', text: '在吗？帮我看个配色', createdAt: ago(2 * HOUR + 30 * MIN), read: true },
          { id: 'm2', from: 'me', text: '在的，发来看看', createdAt: ago(2 * HOUR + 25 * MIN), read: true },
          { id: 'm3', from: 'u1', text: '就是新系列那张，蓝色和米白怎么搭都觉得闷', createdAt: ago(2 * HOUR + 20 * MIN), read: true },
          { id: 'm4', from: 'u1', text: '等我几分钟，草稿发你看看～', createdAt: ago(26 * MIN), read: false }
        ]
      },
      {
        id: 'ch2', userId: 'u2', messages: [
          { id: 'm5', from: 'me', text: '周三那个 bug 和定时任务有关？', createdAt: ago(1 * HOUR + 40 * MIN), read: true },
          { id: 'm6', from: 'u2', text: '对，报表查询把行锁住了，任务在等锁超时', createdAt: ago(1 * HOUR + 35 * MIN), read: true },
          { id: 'm7', from: 'u2', text: '已经加了重试和隔离级别调整，观察两天', createdAt: ago(1 * HOUR + 30 * MIN), read: true }
        ]
      },
      {
        id: 'ch3', userId: 'u6', messages: [
          { id: 'm8', from: 'u6', text: '今晚试了新方子，番茄牛腩面', createdAt: ago(4 * HOUR + 10 * MIN), read: true },
          { id: 'm9', from: 'me', text: '深夜放毒是吧！', createdAt: ago(4 * HOUR + 5 * MIN), read: true },
          { id: 'm10', from: 'u6', text: '给你留了一份，快来 🍜', createdAt: ago(3 * HOUR + 55 * MIN), read: false }
        ]
      },
      {
        id: 'ch4', userId: 'u4', messages: [
          { id: 'm11', from: 'u4', text: '考完啦！！！', createdAt: ago(4 * DAY + 20 * MIN), read: true },
          { id: 'm12', from: 'me', text: '恭喜解放，请你喝奶茶', createdAt: ago(4 * DAY + 10 * MIN), read: true }
        ]
      }
    ];

    const notices = [
      { id: 'n1', type: 'like', actorId: 'u5', postId: 'p2', text: '', createdAt: ago(18 * MIN), read: false },
      { id: 'n2', type: 'comment', actorId: 'u3', postId: 'p2', text: '这个我可以写进事故复盘模板了', createdAt: ago(1 * HOUR), read: false },
      { id: 'n3', type: 'follow', actorId: 'u1', postId: '', text: '', createdAt: ago(3 * HOUR), read: true },
      { id: 'n4', type: 'like', actorId: 'u6', postId: 'p2', text: '', createdAt: ago(5 * HOUR), read: true }
    ];

    return { me, users, posts, chats, notices };
  };
})(window.FC);
