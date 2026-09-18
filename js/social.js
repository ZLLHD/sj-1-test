/* FlatCircle · 社交模块：私信 / 通知 / 个人主页 */
window.FC = window.FC || {};
(function (FC) {
  'use strict';

  const { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } = Vue;
  const store = FC.store;

  /* ---------- 私信 ---------- */
  FC.MessagesView = {
    name: 'FcMessages',
    setup() {
      const ui = store.state.ui;
      const scrollEl = ref(null);
      const draft = ref('');
      const narrow = ref(false);
      const mq = window.matchMedia('(max-width: 767px)');
      const onMq = (e) => { narrow.value = e.matches; };
      narrow.value = mq.matches;
      onMounted(() => mq.addEventListener('change', onMq));
      onBeforeUnmount(() => mq.removeEventListener('change', onMq));

      const list = computed(() => store.chatList());
      const chat = computed(() => (ui.chatId ? store.chatByUser(ui.chatId) : null));
      const peer = computed(() => (ui.chatId ? store.userById(ui.chatId) : null));
      const typing = computed(() => ui.typingUser && ui.typingUser === ui.chatId);

      function scrollBottom() {
        nextTick(() => {
          if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight;
        });
      }
      function lastOf(c) {
        return c.messages.length ? c.messages[c.messages.length - 1] : null;
      }
      function open(userId) {
        store.openChat(userId);
        scrollBottom();
      }
      function send() {
        const t = draft.value.trim();
        if (!t) return;
        store.sendMessage(ui.chatId, t);
        draft.value = '';
        scrollBottom();
      }
      watch(() => ui.chatId, (id) => {
        if (id) { store.markChatRead(id); scrollBottom(); }
      }, { immediate: true });
      watch(() => chat.value && chat.value.messages.length, scrollBottom);
      watch(() => ui.typingUser, scrollBottom);
      onMounted(scrollBottom);

      return { store, ui, scrollEl, draft, list, chat, peer, typing, open, send, lastOf, narrow,
        timeAgo: FC.timeAgo, clock: FC.clockTime };
    },
    template:
      '<div>' +
      '<div class="view-head">消息<span class="sub">{{ list.length }} 个对话</span></div>' +
      '<div class="card" style="overflow:hidden">' +
      '<div class="msg-wrap">' +
      /* 会话列表（仅移动端在打开会话时隐藏） */
      '<div class="msg-list" v-show="!narrow || !ui.chatId" style="display:block">' +
      '<div class="msg-list-head">全部会话</div>' +
      '<div v-if="!list.length"><FcEmpty icon="message" title="还没有对话" text="去别人的主页打个招呼吧" /></div>' +
      '<button class="chat-row" :class="{ on: ui.chatId === c.userId, unread: store.chatUnreadOf(c) > 0 }" ' +
      'v-for="c in list" :key="c.id" @click="open(c.userId)">' +
      '<FcAvatar :user="store.userById(c.userId)" :size="42" :clickable="false" />' +
      '<div class="meta">' +
      '<div class="top">' +
      '<span class="nm">{{ store.userById(c.userId).name }}</span>' +
      '<span class="tm">{{ lastOf(c) ? timeAgo(lastOf(c).createdAt) : \'\' }}</span>' +
      '</div>' +
      '<div class="pv">{{ lastOf(c) ? (lastOf(c).from === \'me\' ? \'我：\' : \'\') + lastOf(c).text : \'开始聊天吧\' }}</div>' +
      '</div>' +
      '<span class="dot" v-if="store.chatUnreadOf(c) > 0"></span>' +
      '</button>' +
      '</div>' +
      /* 聊天窗 */
      '<div class="msg-pane" v-if="chat" style="display:flex">' +
      '<div class="msg-pane-head">' +
      '<button class="iconbtn back" title="返回会话列表" @click="store.backToChatList()"><FcIcon name="arrowLeft" :size="18" /></button>' +
      '<FcAvatar :user="peer" :size="38" />' +
      '<div>' +
      '<div class="nm">{{ peer.name }}</div>' +
      '<div class="hd">@{{ peer.handle }}</div>' +
      '</div>' +
      '<button class="btn ghost sm" style="margin-left:auto" @click="store.openProfile(peer.id)">主页</button>' +
      '</div>' +
      '<div class="msg-scroll" ref="scrollEl">' +
      '<div class="bubble-row" v-for="m in chat.messages" :key="m.id" :class="m.from === \'me\' ? \'mine\' : \'theirs\'">' +
      '<span class="bubble">{{ m.text }}</span>' +
      '<span class="bubble-time">{{ clock(m.createdAt) }}</span>' +
      '</div>' +
      '<div class="bubble-row theirs" v-if="typing">' +
      '<span class="bubble"><span class="typing"><i></i><i></i><i></i></span></span>' +
      '</div>' +
      '</div>' +
      '<div class="msg-input">' +
      '<input class="input" v-model="draft" maxlength="500" :placeholder="\'发消息给 \' + peer.name + \'…（Enter 发送）\'" ' +
      '@keydown.enter.prevent="send" />' +
      '<button class="btn" :disabled="!draft.trim()" @click="send"><FcIcon name="send" :size="16" /></button>' +
      '</div></div>' +
      /* 桌面端未选会话的占位（移动端只显示会话列表） */
      '<div class="msg-pane" v-else-if="!narrow" style="display:flex;align-items:center;justify-content:center">' +
      '<FcEmpty icon="message" title="选择一个会话" text="从左侧列表选择对话，或去主页发起私信" />' +
      '</div>' +
      '</div></div>' +
      '</div>'
  };

  /* ---------- 通知 ---------- */
  FC.NotificationsView = {
    name: 'FcNotices',
    setup() {
      const notices = computed(() => store.state.notices);
      const unread = computed(() => store.unreadNotices());
      const typeIcon = { like: 'heart', comment: 'comment', follow: 'user', friend_request: 'userPlus', friend_accept: 'userCheck' };
      const typeText = { like: '赞了你的帖子', comment: '评论了你的帖子', follow: '关注了你', friend_request: '请求加你为好友', friend_accept: '接受了你的好友请求' };
      return { store, notices, unread, typeIcon, typeText, timeAgo: FC.timeAgo };
    },
    template:
      '<div>' +
      '<div class="view-head">通知' +
      '<span class="sub" v-if="unread">{{ unread }} 条未读</span>' +
      '</div>' +
      '<div class="card" style="overflow:hidden">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--line)">' +
      '<span style="font-weight:700;font-size:14px">全部通知</span>' +
      '<button class="btn ghost sm" :disabled="!unread" @click="store.markAllNoticesRead()">' +
      '<FcIcon name="check" :size="14" /> 全部已读</button>' +
      '</div>' +
      '<div v-if="!notices.length"><FcEmpty icon="bell" title="暂无通知" text="别人点赞、评论或关注你时会显示在这里" /></div>' +
      '<TransitionGroup name="list" tag="div">' +
      '<div class="notice" v-for="n in notices" :key="n.id" :class="{ unread: !n.read }" @click="store.openNotice(n)">' +
      '<FcAvatar :user="store.userById(n.actorId)" :size="40" :clickable="false" />' +
      '<span class="n-type" :class="n.type"><FcIcon :name="typeIcon[n.type]" :size="15" /></span>' +
      '<div class="n-meta">' +
      '<div class="n-top">' +
      '<span class="n-name">{{ store.userById(n.actorId).name }}</span>' +
      '<span style="font-size:13.5px;color:var(--text-2)">{{ typeText[n.type] }}</span>' +
      '<span class="n-time">{{ timeAgo(n.createdAt) }}</span>' +
      '</div>' +
      '<div class="n-quote" v-if="n.text">{{ n.text }}</div>' +
      '<div class="n-act" v-if="n.type === \'friend_request\'">' +
      '<template v-if="n.reqStatus === \'pending\'">' +
      '<button class="btn sm" @click.stop="store.acceptFriendReq(n)"><FcIcon name="check" :size="14" /> 接受</button>' +
      '<button class="btn ghost sm" @click.stop="store.declineFriendReq(n)">忽略</button>' +
      '</template>' +
      '<span v-else class="n-chip" :class="n.reqStatus">{{ n.reqStatus === \'accepted\' ? \'已添加好友\' : \'已忽略\' }}</span>' +
      '</div>' +
      '<span class="n-chip ok" v-else-if="n.type === \'friend_accept\'">已成为好友</span>' +
      '</div>' +
      '</div>' +
      '</TransitionGroup>' +
      '</div></div>'
  };

  /* ---------- 编辑资料弹窗 ---------- */
  FC.EditProfileModal = {
    name: 'FcEditProfileModal',
    emits: ['close'],
    setup(props, { emit }) {
      const me = store.state.me;
      const name = ref(me.name);
      const bio = ref(me.bio);
      const color = ref(me.color);
      const colors = FC.AVATAR_COLORS;
      function save() {
        store.saveProfile({ name: name.value, bio: bio.value, color: color.value });
        emit('close');
      }
      function resetDemo() {
        store.confirm({
          title: '重置演示数据？',
          text: '将清除你的发帖、消息与通知，恢复到初始演示状态。',
          okText: '重置', danger: true
        }, () => {
          store.resetDemo();
          emit('close');
        });
      }
      return { name, bio, color, colors, save, resetDemo };
    },
    template:
      '<FcModal title="编辑资料" @close="$emit(\'close\')">' +
      '<div class="field"><label>昵称（最多 20 字）</label>' +
      '<input class="input" v-model="name" maxlength="20" placeholder="你的昵称" /></div>' +
      '<div class="field"><label>简介（最多 80 字）</label>' +
      '<textarea class="textarea" v-model="bio" maxlength="80" rows="3" placeholder="介绍一下自己"></textarea></div>' +
      '<div class="field"><label>头像颜色</label>' +
      '<div class="color-swatches">' +
      '<button v-for="c in colors" :key="c" class="swatch" :class="{ on: color === c }" :style="{ background: c }" ' +
      ':title="c" @click="color = c"></button>' +
      '</div></div>' +
      '<div style="border-top:1px solid var(--line);margin-top:4px;padding-top:14px">' +
      '<button class="btn danger-ghost sm block" @click="resetDemo">' +
      '<FcIcon name="refresh" :size="15" /> 重置演示数据</button>' +
      '</div>' +
      '<template #footer>' +
      '<button class="btn ghost" @click="$emit(\'close\')">取消</button>' +
      '<button class="btn" @click="save"><FcIcon name="check" :size="16" /> 保存</button>' +
      '</template>' +
      '</FcModal>'
  };

  /* ---------- 个人主页 ---------- */
  FC.ProfileView = {
    name: 'FcProfile',
    setup() {
      const ui = store.state.ui;
      const editing = ref(false);
      const user = computed(() => store.userById(ui.profileId));
      const mine = computed(() => ui.profileId === 'me');
      const isMeUser = computed(() => user.value.id === 'me');
      const posts = computed(() => store.postsOf(user.value.id));
      const favs = computed(() => store.favoritePosts());
      const tab = computed({
        get: () => ui.profileTab,
        set: (v) => { ui.profileTab = v; }
      });
      const shown = computed(() => (mine.value && tab.value === 'favorites' ? favs.value : posts.value));
      function message() {
        store.openChat(user.value.id);
        store.navigate('messages', { chatId: user.value.id });
      }
      const friend = computed(() => store.isFriend(user.value.id));
      const friendOut = computed(() => store.hasFriendOut(user.value.id));
      function friendAct() {
        if (friend.value) {
          store.confirm({
            title: '删除好友？',
            text: '将把 ' + user.value.name + ' 从你的好友列表中移除。',
            okText: '删除', danger: true
          }, () => { store.removeFriend(user.value.id); });
        } else if (friendOut.value) {
          store.cancelFriendReq(user.value.id);
        } else {
          store.sendFriendReq(user.value.id);
        }
      }
      function logout() {
        store.confirm({
          title: '退出登录？',
          text: '将返回登录界面，本地数据不会丢失。',
          okText: '退出'
        }, () => { store.logout(); });
      }
      return { store, ui, editing, user, mine, isMeUser, posts, favs, tab, shown, message, friend, friendOut, friendAct, logout };
    },
    template:
      '<div>' +
      '<div class="view-head">个人主页<span class="sub" v-if="mine">这是你</span></div>' +
      '<div class="card" style="overflow:hidden">' +
      '<div class="profile-cover" :style="{ background: user.color }"></div>' +
      '<div class="profile-main">' +
      '<div class="profile-top">' +
      '<FcAvatar :user="user" :size="84" :clickable="false" />' +
      '<div class="act">' +
      '<template v-if="isMeUser">' +
      '<button class="btn ghost" @click="editing = true">' +
      '<FcIcon name="edit" :size="15" /> 编辑资料</button>' +
      '<button class="btn danger-ghost" @click="logout">' +
      '<FcIcon name="logout" :size="15" /> 退出登录</button>' +
      '</template>' +
      '<template v-else>' +
      '<button class="btn" :class="{ ghost: store.isFollowing(user.id) }" @click="store.toggleFollow(user.id)">' +
      '<FcIcon :name="store.isFollowing(user.id) ? \'check\' : \'plus\'" :size="15" />' +
      '{{ store.isFollowing(user.id) ? \'已关注\' : \'关注\' }}</button>' +
      '<button class="btn" :class="friend ? \'ghost\' : \'soft\'" :disabled="friendOut" @click="friendAct">' +
      '<FcIcon :name="friend ? \'userCheck\' : \'userPlus\'" :size="15" />' +
      '{{ friend ? \'已是好友\' : (friendOut ? \'已申请\' : \'加好友\') }}</button>' +
      '<button class="btn soft" @click="message">' +
      '<FcIcon name="message" :size="15" /> 私信</button>' +
      '</template>' +
      '</div></div>' +
      '<div class="profile-name">{{ user.name }}</div>' +
      '<div class="profile-handle">@{{ user.handle }}</div>' +
      '<div class="profile-bio" v-if="user.bio">{{ user.bio }}</div>' +
      '<div class="profile-stats">' +
      '<span><b>{{ posts.length }}</b>帖子</span>' +
      '<span><b>{{ user.following.length }}</b>关注</span>' +
      '<span><b>{{ user.followers.length }}</b>粉丝</span>' +
      '<span v-if="isMeUser"><b>{{ user.friends.length }}</b>好友</span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="card" style="margin-top:12px;overflow:hidden">' +
      '<div class="seg">' +
      '<button :class="{ on: tab === \'posts\' }" @click="tab = \'posts\'">帖子</button>' +
      '<button v-if="mine" :class="{ on: tab === \'favorites\' }" @click="tab = \'favorites\'">我的收藏</button>' +
      '</div>' +
      '<div v-if="!shown.length">' +
      '<FcEmpty icon="edit" :title="tab === \'favorites\' ? \'还没有收藏\' : \'还没有发布帖子\'" ' +
      ':text="tab === \'favorites\' ? \'收藏感兴趣的帖子后会出现在这里\' : \'去首页发布第一条动态吧\'" />' +
      '</div>' +
      '</div>' +
      '<FcPostCard v-for="p in shown" :key="p.id" :post="p" />' +
      '<FcEditProfileModal v-if="editing" @close="editing = false" />' +
      '</div>'
  };

  /* ---------- 好友页 ---------- */
  FC.FriendsView = {
    name: 'FcFriends',
    setup() {
      const ui = store.state.ui;
      const tab = computed({
        get: () => ui.friendTab,
        set: (v) => { ui.friendTab = v; }
      });
      const friends = computed(() => store.friendsList().map(function (id) { return store.userById(id); }));
      const reqs = computed(() => store.pendingFriendReqs());
      const sent = computed(() => store.friendReqOutList().map(function (id) { return store.userById(id); }));
      function chat(u) {
        store.openChat(u.id);
        store.navigate('messages', { chatId: u.id });
      }
      function unfriend(u) {
        store.confirm({
          title: '删除好友？',
          text: '将把 ' + u.name + ' 从你的好友列表中移除。',
          okText: '删除', danger: true
        }, () => { store.removeFriend(u.id); });
      }
      function openUser(id) { store.openProfile(id); }
      return {
        store, ui, tab, friends, reqs, sent, chat, unfriend, openUser,
        accept: store.acceptFriendReq, decline: store.declineFriendReq, cancel: store.cancelFriendReq
      };
    },
    template:
      '<div>' +
      '<div class="view-head">好友<span class="sub" v-if="friends.length">{{ friends.length }} 位好友</span></div>' +
      '<div class="card" style="overflow:hidden">' +
      '<div class="seg">' +
      '<button :class="{ on: tab === \'friends\' }" @click="tab = \'friends\'">我的好友' +
      '<span class="num" v-if="friends.length">{{ friends.length }}</span></button>' +
      '<button :class="{ on: tab === \'requests\' }" @click="tab = \'requests\'">好友请求' +
      '<span class="num warn" v-if="reqs.length">{{ reqs.length }}</span></button>' +
      '<button :class="{ on: tab === \'sent\' }" @click="tab = \'sent\'">已发送' +
      '<span class="num" v-if="sent.length">{{ sent.length }}</span></button>' +
      '</div>' +
      '<div class="f-pane" v-if="tab === \'friends\'">' +
      '<div v-if="!friends.length"><FcEmpty icon="userPlus" title="还没有好友" text="去探索页或在别人主页点击「加好友」发起申请" /></div>' +
      '<div class="user-row" v-for="u in friends" :key="u.id">' +
      '<FcAvatar :user="u" :size="40" />' +
      '<div class="meta" style="cursor:pointer" @click="openUser(u.id)">' +
      '<div class="nm">{{ u.name }}</div>' +
      '<div class="hd">@{{ u.handle }} · {{ u.bio }}</div>' +
      '</div>' +
      '<div class="row-act">' +
      '<button class="btn sm soft" @click="chat(u)"><FcIcon name="message" :size="14" /> 聊天</button>' +
      '<button class="btn sm ghost" @click="unfriend(u)">删除</button>' +
      '</div></div></div>' +
      '<div class="f-pane" v-else-if="tab === \'requests\'">' +
      '<div v-if="!reqs.length"><FcEmpty icon="userPlus" title="暂无好友请求" text="别人向你发起好友申请时会显示在这里" /></div>' +
      '<div class="user-row" v-for="n in reqs" :key="n.id">' +
      '<FcAvatar :user="store.userById(n.actorId)" :size="40" />' +
      '<div class="meta" style="cursor:pointer" @click="openUser(n.actorId)">' +
      '<div class="nm">{{ store.userById(n.actorId).name }}</div>' +
      '<div class="hd">@{{ store.userById(n.actorId).handle }}</div>' +
      '</div>' +
      '<div class="row-act">' +
      '<button class="btn sm" @click="accept(n)"><FcIcon name="check" :size="14" /> 接受</button>' +
      '<button class="btn sm ghost" @click="decline(n)">忽略</button>' +
      '</div></div></div>' +
      '<div class="f-pane" v-else>' +
      '<div v-if="!sent.length"><FcEmpty icon="send" title="没有发送中的申请" text="在别人主页点击「加好友」即可发送好友申请" /></div>' +
      '<div class="user-row" v-for="u in sent" :key="u.id">' +
      '<FcAvatar :user="u" :size="40" />' +
      '<div class="meta" style="cursor:pointer" @click="openUser(u.id)">' +
      '<div class="nm">{{ u.name }}</div>' +
      '<div class="hd">@{{ u.handle }} · 等待对方通过</div>' +
      '</div>' +
      '<div class="row-act">' +
      '<button class="btn sm ghost" @click="cancel(u.id)">撤回</button>' +
      '</div></div></div>' +
      '</div></div>'
  };

  /* ---------- 账号视图（登录 / 注册） ---------- */
  FC.AuthView = {
    name: 'FcAuth',
    setup() {
      const ui = store.state.ui;
      const accounts = computed(() => store.listAccounts());
      const demoAcc = computed(() => accounts.value.find(function (a) { return a.demo; }) || null);
      const mode = ref('login');   // login | register
      const err = ref('');
      const lHandle = ref('');
      const lPass = ref('');
      const rName = ref('');
      const rHandle = ref('');
      const rPass = ref('');
      const rPass2 = ref('');

      function switchMode(m) {
        mode.value = m;
        err.value = '';
      }
      function doLogin() {
        err.value = '';
        const r = store.login(lHandle.value, lPass.value);
        if (!r.ok) err.value = r.error;
      }
      function doRegister() {
        err.value = '';
        if (rPass.value !== rPass2.value) { err.value = '两次输入的密码不一致'; return; }
        const r = store.register({ name: rName.value, handle: rHandle.value, pass: rPass.value });
        if (!r.ok) err.value = r.error;
      }
      function fillDemo() {
        mode.value = 'login';
        err.value = '';
        if (demoAcc.value) {
          lHandle.value = demoAcc.value.handle;
          lPass.value = store.DEMO_PASS;
        }
      }
      function pick(a) {
        mode.value = 'login';
        err.value = '';
        lHandle.value = a.handle;
        lPass.value = a.demo ? store.DEMO_PASS : '';
      }
      return {
        store, ui, accounts, demoAcc, mode, err,
        lHandle, lPass, rName, rHandle, rPass, rPass2,
        switchMode, doLogin, doRegister, fillDemo, pick
      };
    },
    template:
      '<div class="auth-wrap">' +
      '<div class="auth-card">' +
      '<button class="iconbtn auth-theme" :title="ui.theme === \'dark\' ? \'切换到浅色\' : \'切换到深色\'" @click="store.toggleTheme()">' +
      '<FcIcon :name="ui.theme === \'dark\' ? \'sun\' : \'moon\'" :size="18" /></button>' +
      '<div class="auth-brand">' +
      '<span class="brand-logo lg"><FcIcon name="zap" :size="26" /></span>' +
      '<div>' +
      '<div class="auth-title">FlatCircle</div>' +
      '<div class="auth-sub">扁平社交圈 · 本地演示版</div>' +
      '</div></div>' +
      '<div class="auth-tabs">' +
      '<button :class="{ on: mode === \'login\' }" @click="switchMode(\'login\')">登录</button>' +
      '<button :class="{ on: mode === \'register\' }" @click="switchMode(\'register\')">注册</button>' +
      '</div>' +
      '<div class="form-err" v-if="err"><FcIcon name="info" :size="14" /><span>{{ err }}</span></div>' +
      '<div v-if="mode === \'login\'">' +
      '<div class="field"><label>账号</label>' +
      '<input class="input" v-model="lHandle" placeholder="小写字母 / 数字 / 下划线" @keydown.enter="doLogin" /></div>' +
      '<div class="field"><label>密码</label>' +
      '<input class="input" type="password" v-model="lPass" placeholder="请输入密码" @keydown.enter="doLogin" /></div>' +
      '<button class="btn block" @click="doLogin"><FcIcon name="logout" :size="16" /> 登录</button>' +
      '<div class="auth-tip" v-if="demoAcc">' +
      '<div class="auth-note"><b>演示账号</b> @{{ demoAcc.handle }} · 密码 {{ store.DEMO_PASS }}</div>' +
      '<button class="btn ghost sm" @click="fillDemo">一键填入</button>' +
      '</div>' +
      '</div>' +
      '<div v-else>' +
      '<div class="field"><label>昵称（最多 20 字）</label>' +
      '<input class="input" v-model="rName" maxlength="20" placeholder="展示给其他用户的名字" /></div>' +
      '<div class="field"><label>账号</label>' +
      '<input class="input" v-model="rHandle" maxlength="16" placeholder="3-16 位小写字母 / 数字 / 下划线" /></div>' +
      '<div class="field"><label>密码</label>' +
      '<input class="input" type="password" v-model="rPass" placeholder="至少 6 位" /></div>' +
      '<div class="field"><label>确认密码</label>' +
      '<input class="input" type="password" v-model="rPass2" placeholder="再输入一次" @keydown.enter="doRegister" /></div>' +
      '<button class="btn block" @click="doRegister"><FcIcon name="userPlus" :size="16" /> 创建账号并进入</button>' +
      '</div>' +
      '<div class="auth-accs" v-if="accounts.length">' +
      '<div class="auth-note">本机已有账号（点击填入）</div>' +
      '<div class="acc-list">' +
      '<button class="acc-chip" v-for="a in accounts" :key="a.id" @click="pick(a)">' +
      '<FcAvatar :user="a" :size="22" :clickable="false" />' +
      '<span>@{{ a.handle }}</span>' +
      '<span class="acc-demo" v-if="a.demo">演示</span>' +
      '</button>' +
      '</div></div>' +
      '<div class="auth-foot">数据仅保存在本浏览器（localStorage）· 演示应用，密码仅用于本地体验，非真实安全存储</div>' +
      '</div></div>'
  };
})(window.FC);
