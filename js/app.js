/* FlatCircle · 应用入口：根组件 / 组件注册 / 挂载 */
window.FC = window.FC || {};
(function (FC) {
  'use strict';

  const { computed } = Vue;
  const store = FC.store;

  FC.App = {
    name: 'FcApp',
    setup() {
      const ui = store.state.ui;
      const me = computed(function () { return store.state.me; });
      const auth = computed(function () { return store.state.auth; });
      const views = {
        feed: 'FcFeed', explore: 'FcExplore', messages: 'FcMessages',
        notices: 'FcNotices', profile: 'FcProfile', friends: 'FcFriends'
      };
      const viewComp = computed(function () { return views[ui.route] || 'FcFeed'; });
      const navs = computed(function () {
        return [
          { route: 'feed', icon: 'home', label: '首页' },
          { route: 'explore', icon: 'compass', label: '探索' },
          { route: 'friends', icon: 'userPlus', label: '好友', badge: store.pendingFriendReqs().length },
          { route: 'messages', icon: 'message', label: '消息', badge: store.unreadChats() },
          { route: 'notices', icon: 'bell', label: '通知', badge: store.unreadNotices() },
          { route: 'profile', icon: 'user', label: '我的' }
        ];
      });
      function go(route) { store.navigate(route); }
      return { store, ui, me, auth, viewComp, navs, go };
    },
    template:
      '<div>' +
      /* 未登录：账号视图 */
      '<FcAuth v-if="!auth.authed" />' +
      /* 已登录：应用主体 */
      '<template v-else>' +
      /* 移动端顶栏 */
      '<header class="topbar">' +
      '<span class="brand-logo"><FcIcon name="zap" :size="18" /></span>' +
      '<b>FlatCircle</b>' +
      '<div class="bt">' +
      '<button class="iconbtn" :title="ui.theme === \'dark\' ? \'切换到浅色\' : \'切换到深色\'" @click="store.toggleTheme()">' +
      '<FcIcon :name="ui.theme === \'dark\' ? \'sun\' : \'moon\'" :size="18" />' +
      '</button>' +
      '</div>' +
      '</header>' +
      '<div class="shell">' +
      /* 左栏导航 */
      '<nav class="col-nav">' +
      '<div class="brand">' +
      '<span class="brand-logo"><FcIcon name="zap" :size="18" /></span>' +
      '<span class="brand-text">FlatCircle<small>扁平社交圈</small></span>' +
      '</div>' +
      '<div class="nav-list">' +
      '<button v-for="n in navs" :key="n.route" class="nav-item" :class="{ active: ui.route === n.route }" @click="go(n.route)">' +
      '<FcIcon :name="n.icon" :size="21" />' +
      '<span class="label">{{ n.label }}</span>' +
      '<span class="spacer"></span>' +
      '<span class="badge" v-if="n.badge">{{ n.badge }}</span>' +
      '</button>' +
      '</div>' +
      '<div class="nav-foot">' +
      '<button class="nav-item" @click="store.toggleTheme()">' +
      '<FcIcon :name="ui.theme === \'dark\' ? \'sun\' : \'moon\'" :size="21" />' +
      '<span class="label">{{ ui.theme === \'dark\' ? \'浅色模式\' : \'深色模式\' }}</span>' +
      '<span class="spacer"></span>' +
      '<span class="theme-track" :class="{ on: ui.theme === \'dark\' }"><i></i></span>' +
      '</button>' +
      '<button class="nav-me" @click="go(\'profile\')" title="查看我的主页">' +
      '<FcAvatar :user="me" :size="34" :clickable="false" />' +
      '<span class="nm-meta" style="display:flex;flex-direction:column;min-width:0">' +
      '<span class="nm-name">{{ me.name }}</span>' +
      '<span class="nm-handle">@{{ me.handle }}</span>' +
      '</span>' +
      '</button>' +
      '</div>' +
      '</nav>' +
      /* 中栏内容 */
      '<main class="col-main">' +
      '<Transition name="viewfade" mode="out-in">' +
      '<KeepAlive>' +
      '<component :is="viewComp" :key="ui.route" />' +
      '</KeepAlive>' +
      '</Transition>' +
      '</main>' +
      /* 右栏 */
      '<aside class="col-rail">' +
      '<FcTrends />' +
      '<FcSuggest />' +
      '<div class="rail-foot">FlatCircle 演示版 · Vue 3 零构建 · 数据仅保存在本浏览器</div>' +
      '</aside>' +
      '</div>' +
      /* 移动端底部标签栏 */
      '<nav class="tabbar">' +
      '<button v-for="n in navs" :key="n.route" :class="{ on: ui.route === n.route }" @click="go(n.route)">' +
      '<FcIcon :name="n.icon" :size="21" />' +
      '<span>{{ n.label }}</span>' +
      '<span class="badge" v-if="n.badge">{{ n.badge }}</span>' +
      '</button>' +
      '</nav>' +
      '</template>' +
      '<FcToasts />' +
      '<FcConfirm />' +
      '</div>'
  };

  /* ---------- 注册与挂载 ---------- */
  const app = Vue.createApp(FC.App);
  [
    FC.Icon, FC.Avatar, FC.IconButton, FC.EmptyState, FC.Modal, FC.Toasts,
    FC.ConfirmDialog, FC.FeedSkeleton, FC.UserRow, FC.TrendCard, FC.SuggestCard,
    FC.Composer, FC.PostCard, FC.FeedView, FC.ExploreView,
    FC.MessagesView, FC.NotificationsView, FC.EditProfileModal, FC.ProfileView,
    FC.AuthView, FC.FriendsView
  ].forEach(function (c) { app.component(c.name, c); });

  app.config.errorHandler = function (err, instance, info) {
    console.error('[FlatCircle]', info, err);
  };

  store.init();
  app.mount('#app');
})(window.FC);
