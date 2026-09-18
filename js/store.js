/* FlatCircle · 状态层（响应式单例 + localStorage 持久化 + 互动机器人） */
window.FC = window.FC || {};
(function (FC) {
  'use strict';

  const ACCOUNTS_KEY = 'flatcircle:accounts:v1';
  const SESSION_KEY = 'flatcircle:session:v1';
  const LEGACY_KEY = 'flatcircle:data:v1';
  const THEME_KEY = 'flatcircle:theme';
  const DEMO_PASS = '123456';

  const dataKey = function (id) { return LEGACY_KEY + ':' + id; };

  const state = Vue.reactive({
    me: null,
    users: [],
    posts: [],
    chats: [],
    notices: [],
    meta: { friendSeeded: false },
    auth: { authed: false, accountId: null },
    ui: {
      route: 'feed',        // feed | explore | messages | notices | profile | friends
      profileId: 'me',
      profileTab: 'posts',  // posts | favorites
      friendTab: 'friends', // friends | requests | sent
      chatId: null,         // 当前会话的用户 id
      typingUser: null,     // 正在输入的用户 id
      search: '',
      tag: null,
      focusPostId: null,
      theme: 'light',
      booting: true,
      toasts: [],
      confirm: null
    }
  });

  /* ---------- 持久化（按账号隔离） ---------- */
  function snapshot() {
    return JSON.stringify({
      v: 1, me: state.me, users: state.users, posts: state.posts,
      chats: state.chats, notices: state.notices, meta: state.meta
    });
  }

  let quotaWarned = false;
  let persistTimer = null;
  let epoch = 0;
  const persistNow = function () {
    const id = state.auth.accountId;
    if (!id || !state.me) return;
    try {
      localStorage.setItem(dataKey(id), snapshot());
    } catch (e) {
      if (!quotaWarned) {
        quotaWarned = true;
        toast('本地存储空间不足，图片可能未保存', 'err');
      }
    }
  };
  const persist = function () {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(function () { persistTimer = null; persistNow(); }, 350);
  };
  const flushPersist = function () {
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
    persistNow();
  };

  /* ---------- 账号注册表 ---------- */
  const normalizeHandle = function (h) {
    return String(h || '').trim().replace(/^@+/, '').toLowerCase();
  };
  const hashPass = function (handle, pass) {
    return 'h' + FC.hash(normalizeHandle(handle) + '::' + pass + '::flatcircle').toString(36);
  };
  function readAccounts() {
    let raw = null;
    try { raw = localStorage.getItem(ACCOUNTS_KEY); } catch (e) { raw = null; }
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (Array.isArray(d)) return d;
      } catch (e) { /* 损坏则重建 */ }
    }
    return [];
  }
  function writeAccounts(list) {
    try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function readLegacy() {
    let raw = null;
    try { raw = localStorage.getItem(LEGACY_KEY); } catch (e) { raw = null; }
    if (!raw) return null;
    try {
      const d = JSON.parse(raw);
      if (d && d.v === 1 && d.me && Array.isArray(d.users) && Array.isArray(d.posts)) return d;
    } catch (e) {}
    return null;
  }
  function ensureDemoAccount() {
    const list = readAccounts();
    let demo = list.find(function (a) { return a.demo; });
    if (!demo) {
      const legacy = readLegacy();
      const lm = legacy && legacy.me ? legacy.me : null;
      demo = {
        id: 'demo',
        name: lm && lm.name ? lm.name : '阿泽',
        handle: lm && lm.handle ? normalizeHandle(lm.handle) : 'aze',
        color: lm && lm.color ? lm.color : '#3D6DF2',
        pass: hashPass(lm && lm.handle ? lm.handle : 'aze', DEMO_PASS),
        demo: true,
        createdAt: Date.now()
      };
      list.unshift(demo);
      writeAccounts(list);
    }
    return demo;
  }
  const listAccounts = function () { return readAccounts(); };
  const currentAccount = function () {
    return readAccounts().find(function (a) { return a.id === state.auth.accountId; }) || null;
  };

  /* ---------- 数据世界（按账号） ---------- */
  function validWorld(d) {
    return !!d && d.v === 1 && d.me && Array.isArray(d.users) && Array.isArray(d.posts);
  }
  function normalizeWorld(d) {
    if (!validWorld(d)) return null;
    if (!Array.isArray(d.chats)) d.chats = [];
    if (!Array.isArray(d.notices)) d.notices = [];
    if (!d.meta || typeof d.meta !== 'object') d.meta = { friendSeeded: false };
    if (typeof d.meta.friendSeeded !== 'boolean') d.meta.friendSeeded = false;
    if (!d.me || typeof d.me !== 'object') return null;
    if (!Array.isArray(d.me.friends)) d.me.friends = [];
    if (!Array.isArray(d.me.friendReqOut)) d.me.friendReqOut = [];
    if (!Array.isArray(d.me.following)) d.me.following = [];
    if (!Array.isArray(d.me.followers)) d.me.followers = [];
    for (const u of d.users) {
      if (!Array.isArray(u.friends)) u.friends = [];
      if (!Array.isArray(u.following)) u.following = [];
      if (!Array.isArray(u.followers)) u.followers = [];
    }
    for (const n of d.notices) {
      if (n.type === 'friend_request' && n.reqStatus !== 'accepted' && n.reqStatus !== 'declined') n.reqStatus = 'pending';
    }
    return d;
  }
  function seedWorldFor(acc) {
    const s = FC.seed();
    if (acc && acc.demo) {
      s.me.name = acc.name;
      s.me.handle = acc.handle;
      s.me.color = acc.color;
    } else {
      const meName = acc ? acc.name : '我';
      s.posts.forEach(function (p) {
        const li = p.likes.indexOf('me'); if (li > -1) p.likes.splice(li, 1);
        const fi = p.favorites.indexOf('me'); if (fi > -1) p.favorites.splice(fi, 1);
        p.comments.forEach(function (c) {
          const ci = c.likes.indexOf('me'); if (ci > -1) c.likes.splice(ci, 1);
          if (c.authorId === 'me') c.authorId = 'u4';
        });
      });
      s.posts = s.posts.filter(function (p) { return p.authorId !== 'me'; });
      s.me = {
        id: 'me', name: meName, handle: acc ? acc.handle : 'me',
        color: acc && acc.color ? acc.color : FC.pickColor(meName),
        bio: '刚加入 FlatCircle，到处逛逛～',
        followers: [], following: [], friends: [], friendReqOut: []
      };
      s.chats = [];
      s.notices = [];
    }
    s.meta = { friendSeeded: false };
    return s;
  }
  function worldFor(acc) {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(dataKey(acc.id)) || 'null'); } catch (e) { d = null; }
    let w = normalizeWorld(d);
    if (!w && acc.demo) {
      const legacy = readLegacy();
      if (legacy) {
        w = normalizeWorld(legacy);
        try { localStorage.removeItem(LEGACY_KEY); } catch (e) {}
      }
    }
    if (!w) w = seedWorldFor(acc);
    try { localStorage.setItem(dataKey(acc.id), JSON.stringify(w)); } catch (e) {}
    return w;
  }
  function applyWorld(w) {
    state.me = w.me;
    state.users = w.users;
    state.posts = w.posts;
    state.chats = w.chats;
    state.notices = w.notices;
    state.meta = w.meta || { friendSeeded: false };
  }
  function resetUi() {
    state.ui.route = 'feed';
    state.ui.profileId = 'me';
    state.ui.profileTab = 'posts';
    state.ui.friendTab = 'friends';
    state.ui.chatId = null;
    state.ui.typingUser = null;
    state.ui.search = '';
    state.ui.tag = null;
    state.ui.focusPostId = null;
    state.ui.confirm = null;
  }

  /* ---------- 会话：进入 / 登录 / 注册 / 退出 ---------- */
  function enter(acc) {
    epoch++;
    state.auth.accountId = acc.id;
    try { localStorage.setItem(SESSION_KEY, acc.id); } catch (e) {}
    applyWorld(worldFor(acc));
    state.auth.authed = true;
    resetUi();
    state.ui.toasts = [];
    state.ui.booting = true;
    const myEpoch = epoch;
    setTimeout(function () {
      if (epoch !== myEpoch) return;
      state.ui.booting = false;
    }, 420);
    seedFriendRequests();
  }
  function login(handle, pass) {
    const h = normalizeHandle(handle);
    const acc = readAccounts().find(function (a) { return a.handle === h; });
    if (!acc) return { ok: false, error: '账号不存在，请先注册' };
    if (acc.pass !== hashPass(acc.handle === h ? h : acc.handle, pass)) return { ok: false, error: '密码不正确' };
    enter(acc);
    return { ok: true };
  }
  function register(patch) {
    const name = String(patch.name || '').trim();
    const handle = normalizeHandle(patch.handle);
    const pass = String(patch.pass || '');
    if (!name) return { ok: false, error: '请填写昵称' };
    if (!/^[a-z0-9_]{3,16}$/.test(handle)) return { ok: false, error: '账号需 3-16 位小写字母 / 数字 / 下划线' };
    if (pass.length < 6) return { ok: false, error: '密码至少 6 位' };
    const list = readAccounts();
    if (list.some(function (a) { return a.handle === handle; })) return { ok: false, error: '该账号已被注册' };
    const acc = {
      id: FC.uid('acc'), name: name.slice(0, 20), handle: handle,
      color: FC.pickColor(handle), pass: hashPass(handle, pass), createdAt: Date.now()
    };
    list.push(acc);
    writeAccounts(list);
    enter(acc);
    return { ok: true };
  }
  function logout() {
    flushPersist();
    epoch++;
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
    state.auth.authed = false;
    state.auth.accountId = null;
    state.me = null;
    state.users = [];
    state.posts = [];
    state.chats = [];
    state.notices = [];
    state.meta = { friendSeeded: false };
    resetUi();
    state.ui.toasts = [];
    state.ui.booting = false;
    toast('已退出登录');
  }

  /* ---------- 主题 ---------- */
  function setTheme(t) {
    state.ui.theme = t;
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  }
  function toggleTheme() {
    setTheme(state.ui.theme === 'dark' ? 'light' : 'dark');
  }

  /* ---------- 查询 ---------- */
  const userById = function (id) {
    if (id === 'me') return state.me;
    return state.users.find(function (u) { return u.id === id; }) || state.me;
  };
  const postById = function (id) {
    return state.posts.find(function (p) { return p.id === id; });
  };
  const chatByUser = function (userId) {
    return state.chats.find(function (c) { return c.userId === userId; });
  };
  const sortDesc = function (arr) {
    return arr.slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
  };
  const feedPosts = function () { return sortDesc(state.posts); };
  const postsOf = function (userId) {
    return sortDesc(state.posts.filter(function (p) { return p.authorId === userId; }));
  };
  const favoritePosts = function () {
    return sortDesc(state.posts.filter(function (p) { return p.favorites.indexOf('me') > -1; }));
  };
  const unreadNotices = function () {
    let n = 0;
    for (const x of state.notices) if (!x.read) n++;
    return n;
  };
  const chatUnreadOf = function (chat) {
    let n = 0;
    for (const m of chat.messages) if (m.from !== 'me' && !m.read) n++;
    return n;
  };
  const unreadChats = function () {
    let n = 0;
    for (const c of state.chats) n += chatUnreadOf(c);
    return n;
  };
  const chatList = function () {
    return state.chats.slice().sort(function (a, b) {
      const la = a.messages.length ? a.messages[a.messages.length - 1].createdAt : 0;
      const lb = b.messages.length ? b.messages[b.messages.length - 1].createdAt : 0;
      return lb - la;
    });
  };
  const trendingTags = function () {
    const map = {};
    for (const p of state.posts) {
      for (const t of FC.extractTags(p.content)) map[t] = (map[t] || 0) + 1;
    }
    return Object.keys(map)
      .map(function (t) { return { tag: t, count: map[t] }; })
      .filter(function (x) { return x.count > 0; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 6);
  };
  const suggestUsers = function (limit) {
    if (!state.me) return [];
    return state.users
      .filter(function (u) { return state.me.following.indexOf(u.id) === -1; })
      .slice(0, limit || 3);
  };
  const searchPosts = function () {
    const q = state.ui.search.trim().toLowerCase();
    if (!q) return [];
    return sortDesc(state.posts.filter(function (p) {
      const u = userById(p.authorId);
      return p.content.toLowerCase().indexOf(q) > -1 ||
        u.name.toLowerCase().indexOf(q) > -1 ||
        u.handle.toLowerCase().indexOf(q) > -1;
    }));
  };
  const searchUsers = function () {
    const q = state.ui.search.trim().toLowerCase();
    if (!q) return [];
    const list = state.users.filter(function (u) {
      return u.name.toLowerCase().indexOf(q) > -1 || u.handle.toLowerCase().indexOf(q) > -1;
    });
    if (state.me && state.me.name.toLowerCase().indexOf(q) > -1) list.unshift(state.me);
    return list;
  };
  const isFollowing = function (userId) {
    if (!state.me) return false;
    return state.me.following.indexOf(userId) > -1;
  };

  /* ---------- 好友 ---------- */
  const isFriend = function (userId) {
    return !!state.me && state.me.friends.indexOf(userId) > -1;
  };
  const hasFriendOut = function (userId) {
    return !!state.me && state.me.friendReqOut.indexOf(userId) > -1;
  };
  const pendingFriendReqs = function () {
    return state.notices.filter(function (n) {
      return n.type === 'friend_request' && n.reqStatus === 'pending';
    });
  };
  const friendsList = function () {
    if (!state.me) return [];
    return state.me.friends.slice();
  };
  const friendReqOutList = function () {
    if (!state.me) return [];
    return state.me.friendReqOut.slice();
  };
  function addFriendPair(userId) {
    if (state.me.friends.indexOf(userId) === -1) state.me.friends.push(userId);
    const u = userById(userId);
    if (u && u.id !== 'me' && u.friends.indexOf('me') === -1) u.friends.push('me');
    const oi = state.me.friendReqOut.indexOf(userId);
    if (oi > -1) state.me.friendReqOut.splice(oi, 1);
  }
  function sendFriendReq(userId) {
    const u = userById(userId);
    if (!u || u.id === 'me') return;
    if (isFriend(userId)) { toast('你们已经是好友了'); return; }
    if (hasFriendOut(userId)) { toast('好友申请已发送，等待对方通过'); return; }
    const incoming = state.notices.find(function (n) {
      return n.type === 'friend_request' && n.actorId === userId && n.reqStatus === 'pending';
    });
    if (incoming) {
      incoming.reqStatus = 'accepted';
      incoming.read = true;
      addFriendPair(userId);
      persist();
      toast('已添加 ' + u.name + ' 为好友', 'ok');
      scheduleFriendGreet(userId);
      return;
    }
    state.me.friendReqOut.push(userId);
    persist();
    toast('好友申请已发送给 ' + u.name, 'ok');
    scheduleFriendAccept(userId);
  }
  function cancelFriendReq(userId) {
    const i = state.me.friendReqOut.indexOf(userId);
    if (i > -1) state.me.friendReqOut.splice(i, 1);
    persist();
    toast('已撤回好友申请');
  }
  function acceptFriendReq(notice) {
    if (!notice || notice.reqStatus !== 'pending') return;
    notice.reqStatus = 'accepted';
    notice.read = true;
    addFriendPair(notice.actorId);
    persist();
    const u = userById(notice.actorId);
    toast('已添加 ' + u.name + ' 为好友', 'ok');
    scheduleFriendGreet(notice.actorId);
  }
  function declineFriendReq(notice) {
    if (!notice) return;
    notice.reqStatus = 'declined';
    notice.read = true;
    persist();
    toast('已忽略该好友请求');
  }
  function removeFriend(userId) {
    const u = userById(userId);
    if (!u || u.id === 'me') return;
    const i = state.me.friends.indexOf(userId);
    if (i > -1) state.me.friends.splice(i, 1);
    const j = u.friends.indexOf('me');
    if (j > -1) u.friends.splice(j, 1);
    persist();
    toast('已删除好友 ' + u.name);
  }

  /* ---------- Toast / Confirm ---------- */
  function toast(text, type) {
    const id = FC.uid('t');
    state.ui.toasts.push({ id: id, text: text, type: type || '' });
    setTimeout(function () {
      const i = state.ui.toasts.findIndex(function (t) { return t.id === id; });
      if (i > -1) state.ui.toasts.splice(i, 1);
    }, 2600);
  }
  function confirm(opts, onOk) {
    state.ui.confirm = {
      title: opts.title || '确认操作',
      text: opts.text || '',
      okText: opts.okText || '确定',
      danger: !!opts.danger,
      onOk: onOk
    };
  }
  function closeConfirm() { state.ui.confirm = null; }

  /* ---------- 导航 ---------- */
  function navigate(route, opts) {
    opts = opts || {};
    state.ui.route = route;
    if (route === 'profile') state.ui.profileId = opts.profileId || 'me';
    if (route === 'messages') state.ui.chatId = opts.chatId || null;
    if (route !== 'explore') { state.ui.search = ''; state.ui.tag = null; }
    if (opts.tag) state.ui.tag = opts.tag;
    if (opts.focusPostId) state.ui.focusPostId = opts.focusPostId;
    window.scrollTo({ top: 0 });
  }
  const openProfile = function (id) { state.ui.profileTab = 'posts'; navigate('profile', { profileId: id }); };
  const openChat = function (userId) {
    state.ui.chatId = userId;
    const c = chatByUser(userId);
    if (c) {
      for (const m of c.messages) m.read = true;
      persist();
    }
  };
  const backToChatList = function () { state.ui.chatId = null; };

  /* ---------- 帖子 ---------- */
  function toggleLike(post) {
    const i = post.likes.indexOf('me');
    if (i > -1) post.likes.splice(i, 1);
    else post.likes.push('me');
    persist();
  }
  function toggleFav(post) {
    const i = post.favorites.indexOf('me');
    if (i > -1) {
      post.favorites.splice(i, 1);
      toast('已取消收藏');
    } else {
      post.favorites.push('me');
      toast('已收藏', 'ok');
    }
    persist();
  }
  function toggleCommentLike(post, comment) {
    const i = comment.likes.indexOf('me');
    if (i > -1) comment.likes.splice(i, 1);
    else comment.likes.push('me');
    persist();
  }
  function publish(text, images) {
    const content = String(text || '').trim();
    if (!content && (!images || !images.length)) return false;
    const post = {
      id: FC.uid('p'),
      authorId: 'me',
      content: content,
      images: images || [],
      createdAt: Date.now(),
      likes: [], favorites: [], comments: []
    };
    state.posts.push(post);
    persist();
    toast('发布成功', 'ok');
    schedulePostBots(post);
    return true;
  }
  function removePost(id) {
    const i = state.posts.findIndex(function (p) { return p.id === id; });
    if (i > -1) state.posts.splice(i, 1);
    state.notices = state.notices.filter(function (n) { return n.postId !== id; });
    persist();
    toast('已删除');
  }
  function addComment(post, text) {
    const content = String(text || '').trim();
    if (!content) return;
    post.comments.push({ id: FC.uid('c'), authorId: 'me', content: content, createdAt: Date.now(), likes: [] });
    persist();
    if (post.authorId !== 'me') scheduleAuthorReply(post);
  }
  function removeComment(post, commentId) {
    const i = post.comments.findIndex(function (c) { return c.id === commentId; });
    if (i > -1) post.comments.splice(i, 1);
    persist();
  }

  /* ---------- 关注 / 资料 ---------- */
  function toggleFollow(userId) {
    const u = userById(userId);
    if (!u || u.id === 'me') return;
    const i = state.me.following.indexOf(userId);
    if (i > -1) {
      state.me.following.splice(i, 1);
      const j = u.followers.indexOf('me');
      if (j > -1) u.followers.splice(j, 1);
      toast('已取消关注');
    } else {
      state.me.following.push(userId);
      if (u.followers.indexOf('me') === -1) u.followers.push('me');
      toast('已关注 ' + u.name, 'ok');
      scheduleFollowBack(userId);
    }
    persist();
  }
  function syncAccountIdentity() {
    const acc = currentAccount();
    if (!acc || !state.me) return;
    acc.name = state.me.name;
    acc.color = state.me.color;
    writeAccounts(readAccounts().map(function (a) { return a.id === acc.id ? acc : a; }));
  }
  function saveProfile(patch) {
    state.me.name = String(patch.name || state.me.name).trim().slice(0, 20) || state.me.name;
    state.me.bio = String(patch.bio || '').trim().slice(0, 80);
    if (patch.color) state.me.color = patch.color;
    syncAccountIdentity();
    persist();
    toast('资料已更新', 'ok');
  }

  /* ---------- 私信 ---------- */
  function sendMessage(userId, text) {
    const content = String(text || '').trim();
    if (!content) return;
    let chat = chatByUser(userId);
    if (!chat) {
      chat = { id: FC.uid('ch'), userId: userId, messages: [] };
      state.chats.unshift(chat);
    }
    chat.messages.push({ id: FC.uid('m'), from: 'me', text: content.slice(0, 500), createdAt: Date.now(), read: true });
    persist();
    scheduleReply(userId);
  }
  function markChatRead(userId) {
    const c = chatByUser(userId);
    if (!c) return;
    for (const m of c.messages) m.read = true;
    persist();
  }

  /* ---------- 通知 ---------- */
  function markAllNoticesRead() {
    for (const n of state.notices) n.read = true;
    persist();
    toast('已全部标为已读');
  }
  function openNotice(n) {
    n.read = true;
    persist();
    if (n.type === 'follow') {
      openProfile(n.actorId);
    } else if (n.type === 'friend_request') {
      state.ui.friendTab = 'requests';
      state.ui.route = 'friends';
      window.scrollTo({ top: 0 });
    } else if (n.type === 'friend_accept') {
      openProfile(n.actorId);
    } else if (n.postId && postById(n.postId)) {
      state.ui.focusPostId = n.postId;
      navigate('feed', { focusPostId: n.postId });
    } else {
      toast('原帖已被删除');
    }
  }
  function pushNotice(notice) {
    state.notices.unshift(Object.assign({ id: FC.uid('n'), read: false, createdAt: Date.now(), text: '', postId: '' }, notice));
    if (state.notices.length > 60) state.notices.length = 60;
  }

  /* ---------- 模拟互动机器人 ---------- */
  function botPool() {
    return state.users.filter(function (u) { return u.id !== 'me'; });
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function schedulePostBots(post) {
    const myEpoch = epoch;
    const pool = shuffle(botPool());
    const likers = pool.slice(0, FC.randInt(2, 3));
    likers.forEach(function (u, i) {
      setTimeout(function () {
        if (epoch !== myEpoch) return;
        if (!postById(post.id)) return;
        if (post.likes.indexOf(u.id) === -1) post.likes.push(u.id);
        pushNotice({ type: 'like', actorId: u.id, postId: post.id });
        persist();
      }, 2400 + i * FC.randInt(1400, 2800));
    });
    if (Math.random() < 0.75) {
      const commenter = pool[0];
      const delay = FC.randInt(5000, 9000);
      setTimeout(function () {
        if (epoch !== myEpoch) return;
        if (!postById(post.id)) return;
        const text = FC.pick(FC.BOT_COMMENTS);
        post.comments.push({ id: FC.uid('c'), authorId: commenter.id, content: text, createdAt: Date.now(), likes: [] });
        pushNotice({ type: 'comment', actorId: commenter.id, postId: post.id, text: text });
        persist();
      }, delay);
    }
  }
  function scheduleAuthorReply(post) {
    if (Math.random() < 0.45) return;
    const myEpoch = epoch;
    const authorId = post.authorId;
    setTimeout(function () {
      if (epoch !== myEpoch) return;
      if (!postById(post.id)) return;
      const lines = FC.PERSONAS[authorId] || ['收到～'];
      const text = FC.pick(lines);
      post.comments.push({ id: FC.uid('c'), authorId: authorId, content: text, createdAt: Date.now(), likes: [] });
      pushNotice({ type: 'comment', actorId: authorId, postId: post.id, text: text });
      persist();
    }, FC.randInt(4000, 9000));
  }
  function scheduleReply(userId) {
    const myEpoch = epoch;
    state.ui.typingUser = userId;
    setTimeout(function () {
      if (epoch !== myEpoch) return;
      if (state.ui.typingUser === userId) state.ui.typingUser = null;
      const chat = chatByUser(userId);
      if (!chat) return;
      const lines = FC.PERSONAS[userId] || FC.BOT_GREET;
      const viewing = state.ui.route === 'messages' && state.ui.chatId === userId;
      chat.messages.push({
        id: FC.uid('m'), from: userId, text: FC.pick(lines),
        createdAt: Date.now(), read: viewing
      });
      persist();
    }, FC.randInt(1300, 2800));
  }
  function scheduleFollowBack(userId) {
    const myEpoch = epoch;
    setTimeout(function () {
      if (epoch !== myEpoch) return;
      const u = userById(userId);
      if (!u) return;
      if (u.followers.indexOf('me') === -1) u.followers.push('me');
      pushNotice({ type: 'follow', actorId: userId });
      persist();
    }, FC.randInt(3000, 8000));
  }
  function scheduleFriendAccept(userId) {
    const myEpoch = epoch;
    setTimeout(function () {
      if (epoch !== myEpoch) return;
      if (!state.me || state.me.friendReqOut.indexOf(userId) === -1) return;
      addFriendPair(userId);
      pushNotice({ type: 'friend_accept', actorId: userId });
      persist();
      const u = userById(userId);
      toast(u.name + ' 通过了你的好友请求', 'ok');
      scheduleFriendGreet(userId);
    }, FC.randInt(2500, 6200));
  }
  function scheduleFriendGreet(userId) {
    const myEpoch = epoch;
    setTimeout(function () {
      if (epoch !== myEpoch) return;
      let chat = chatByUser(userId);
      if (!chat) {
        chat = { id: FC.uid('ch'), userId: userId, messages: [] };
        state.chats.unshift(chat);
      }
      const text = FC.pick(FC.BOT_FRIEND_GREET);
      if (chat.messages.some(function (m) { return m.text === text; })) return;
      const viewing = state.ui.route === 'messages' && state.ui.chatId === userId;
      chat.messages.push({ id: FC.uid('m'), from: userId, text: text, createdAt: Date.now(), read: viewing });
      persist();
    }, FC.randInt(1000, 2400));
  }
  function seedFriendRequests() {
    if (!state.me || state.meta.friendSeeded) return;
    state.meta.friendSeeded = true;
    const myEpoch = epoch;
    const pool = shuffle(botPool()).filter(function (u) { return !isFriend(u.id); });
    const actors = pool.slice(0, 2);
    actors.forEach(function (u, i) {
      setTimeout(function () {
        if (epoch !== myEpoch) return;
        if (!state.me || isFriend(u.id)) return;
        const has = state.notices.some(function (n) {
          return n.type === 'friend_request' && n.actorId === u.id && n.reqStatus === 'pending';
        });
        if (has) return;
        pushNotice({ type: 'friend_request', actorId: u.id, reqStatus: 'pending' });
        persist();
        toast(u.name + ' 请求加你为好友', 'warn');
      }, i === 0 ? FC.randInt(6000, 11000) : FC.randInt(16000, 24000));
    });
    persist();
  }

  /* ---------- 初始化 ---------- */
  function init() {
    setTheme((function () {
      try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; }
    })());
    ensureDemoAccount();
    let sid = null;
    try { sid = localStorage.getItem(SESSION_KEY); } catch (e) { sid = null; }
    const acc = sid ? readAccounts().find(function (a) { return a.id === sid; }) : null;
    if (acc) {
      enter(acc);
    } else {
      state.ui.booting = false;
    }
  }

  FC.store = {
    state: state,
    init: init,
    persist: persist,
    resetDemo: function () {
      epoch++;
      const acc = currentAccount();
      if (!acc || !state.me) return;
      applyWorld(normalizeWorld(seedWorldFor(acc)));
      flushPersist();
      navigate('feed');
      toast('演示数据已重置', 'ok');
      seedFriendRequests();
    },
    userById: userById, postById: postById, chatByUser: chatByUser,
    feedPosts: feedPosts, postsOf: postsOf, favoritePosts: favoritePosts,
    unreadNotices: unreadNotices, unreadChats: unreadChats, chatUnreadOf: chatUnreadOf, chatList: chatList,
    trendingTags: trendingTags, suggestUsers: suggestUsers,
    searchPosts: searchPosts, searchUsers: searchUsers, isFollowing: isFollowing,
    isFriend: isFriend, hasFriendOut: hasFriendOut, pendingFriendReqs: pendingFriendReqs,
    friendsList: friendsList, friendReqOutList: friendReqOutList,
    sendFriendReq: sendFriendReq, cancelFriendReq: cancelFriendReq,
    acceptFriendReq: acceptFriendReq, declineFriendReq: declineFriendReq, removeFriend: removeFriend,
    listAccounts: listAccounts, DEMO_PASS: DEMO_PASS,
    login: login, register: register, logout: logout,
    toast: toast, confirm: confirm, closeConfirm: closeConfirm,
    navigate: navigate, openProfile: openProfile, openChat: openChat, backToChatList: backToChatList,
    toggleLike: toggleLike, toggleFav: toggleFav, toggleCommentLike: toggleCommentLike,
    publish: publish, removePost: removePost, addComment: addComment, removeComment: removeComment,
    toggleFollow: toggleFollow, saveProfile: saveProfile,
    sendMessage: sendMessage, markChatRead: markChatRead,
    markAllNoticesRead: markAllNoticesRead, openNotice: openNotice,
    toggleTheme: toggleTheme
  };
})(window.FC);
