/* FlatCircle · 通用组件（头像 / 图标按钮 / 空状态 / 弹窗 / Toast / 骨架屏 / 用户行） */
window.FC = window.FC || {};
(function (FC) {
  'use strict';

  const { computed, ref, watch } = Vue;
  const store = FC.store;

  /* ---------- 头像 ---------- */
  FC.Avatar = {
    name: 'FcAvatar',
    props: {
      user: { type: Object, required: true },
      size: { type: [Number, String], default: 40 },
      clickable: { type: Boolean, default: true }
    },
    setup(props) {
      const style = computed(() => {
        const s = Number(props.size) || 40;
        return {
          width: s + 'px', height: s + 'px',
          background: props.user.color || FC.pickColor(props.user.name),
          fontSize: Math.max(11, Math.round(s * 0.42)) + 'px'
        };
      });
      const initial = computed(() => FC.initial(props.user.name));
      const go = () => { if (props.clickable) store.openProfile(props.user.id); };
      return { style, initial, go };
    },
    template:
      '<div class="avatar" :class="{ clickable }" :style="style" :title="user.name" @click="go">{{ initial }}</div>'
  };

  /* ---------- 图标按钮 ---------- */
  FC.IconButton = {
    name: 'FcIconButton',
    props: {
      icon: { type: String, required: true },
      count: { type: Number, default: null },
      active: { type: Boolean, default: false },
      activeCls: { type: String, default: 'on-primary' },
      title: { type: String, default: '' }
    },
    emits: ['click'],
    setup(props) {
      const popping = ref(false);
      watch(() => props.active, (nv, ov) => {
        if (nv && !ov) {
          popping.value = false;
          requestAnimationFrame(() => { popping.value = true; });
          setTimeout(() => { popping.value = false; }, 440);
        }
      });
      const showCount = computed(() => props.count !== null && props.count > 0);
      const countText = computed(() => FC.formatCount(props.count || 0));
      return { popping, showCount, countText };
    },
    template:
      '<button class="iconbtn" :class="[active ? activeCls : \'\', { pop: popping }]" :title="title" ' +
      '@click="$emit(\'click\', $event)">' +
      '<FcIcon :name="icon" :size="18" />' +
      '<span v-if="showCount">{{ countText }}</span>' +
      '</button>'
  };

  /* ---------- 空状态 ---------- */
  FC.EmptyState = {
    name: 'FcEmpty',
    props: {
      icon: { type: String, default: 'info' },
      title: { type: String, default: '这里空空如也' },
      text: { type: String, default: '' }
    },
    template:
      '<div class="empty">' +
      '<div><FcIcon :name="icon" :size="40" :sw="1.4" /></div>' +
      '<div class="ttl">{{ title }}</div>' +
      '<div class="dsc" v-if="text">{{ text }}</div>' +
      '</div>'
  };

  /* ---------- 模态框 ---------- */
  FC.Modal = {
    name: 'FcModal',
    props: { title: { type: String, default: '' } },
    emits: ['close'],
    template:
      '<div class="mask" @click.self="$emit(\'close\')" @keydown.esc="$emit(\'close\')">' +
      '<div class="modal" role="dialog" aria-modal="true">' +
      '<div class="modal-head">' +
      '<h3>{{ title }}</h3>' +
      '<button class="iconbtn" title="关闭" @click="$emit(\'close\')"><FcIcon name="x" :size="18" /></button>' +
      '</div>' +
      '<div class="modal-body"><slot /></div>' +
      '<div class="modal-foot" v-if="$slots.footer"><slot name="footer" /></div>' +
      '</div></div>'
  };

  /* ---------- Toast 容器 ---------- */
  FC.Toasts = {
    name: 'FcToasts',
    setup() {
      return { ui: store.state.ui };
    },
    template:
      '<TransitionGroup name="toast" tag="div" class="toasts">' +
      '<div v-for="t in ui.toasts" :key="t.id" class="toast" :class="t.type">' +
      '<FcIcon :name="t.type === \'err\' ? \'info\' : t.type === \'ok\' ? \'check\' : \'zap\'" :size="15" />' +
      '<span>{{ t.text }}</span>' +
      '</div>' +
      '</TransitionGroup>'
  };

  /* ---------- 确认对话框 ---------- */
  FC.ConfirmDialog = {
    name: 'FcConfirm',
    setup() {
      const ui = store.state.ui;
      const run = () => {
        const c = ui.confirm;
        ui.confirm = null;
        if (c && c.onOk) c.onOk();
      };
      return { ui, run, close: store.closeConfirm };
    },
    template:
      '<div class="mask" v-if="ui.confirm" @click.self="close">' +
      '<div class="modal" style="max-width:380px" role="alertdialog" aria-modal="true">' +
      '<div class="modal-head"><h3>{{ ui.confirm.title }}</h3></div>' +
      '<div class="modal-body" style="padding-top:12px;padding-bottom:12px">' +
      '<div style="color:var(--text-2);font-size:14px">{{ ui.confirm.text }}</div>' +
      '</div>' +
      '<div class="modal-foot">' +
      '<button class="btn ghost sm" @click="close">取消</button>' +
      '<button class="btn sm" :class="{ danger: ui.confirm.danger }" @click="run">{{ ui.confirm.okText }}</button>' +
      '</div></div></div>'
  };

  /* ---------- 骨架屏 ---------- */
  FC.FeedSkeleton = {
    name: 'FcSkeleton',
    template:
      '<div class="card fade-up">' +
      '<div class="sk-row">' +
      '<div class="sk" style="width:44px;height:44px;border-radius:50%;flex:none"></div>' +
      '<div style="flex:1">' +
      '<div class="sk" style="height:13px;width:34%;margin-bottom:9px"></div>' +
      '<div class="sk" style="height:12px;width:56%"></div>' +
      '<div class="sk" style="height:12px;width:88%;margin-top:14px"></div>' +
      '<div class="sk" style="height:12px;width:72%;margin-top:8px"></div>' +
      '</div></div></div>'
  };

  /* ---------- 用户行 ---------- */
  FC.UserRow = {
    name: 'FcUserRow',
    props: { user: { type: Object, required: true }, withFollow: { type: Boolean, default: true } },
    setup(props) {
      const isFriend = computed(() => store.isFriend(props.user.id));
      const hasOut = computed(() => store.hasFriendOut(props.user.id));
      const friendTitle = computed(() => {
        if (isFriend.value) return '已是好友';
        if (hasOut.value) return '好友申请已发送';
        return '加好友';
      });
      function friendAct() {
        if (isFriend.value) return;
        if (hasOut.value) return;
        store.sendFriendReq(props.user.id);
      }
      return {
        store,
        isMe: computed(() => props.user.id === 'me'),
        isFriend, hasOut, friendTitle, friendAct
      };
    },
    template:
      '<div class="user-row">' +
      '<FcAvatar :user="user" :size="40" />' +
      '<div class="meta" style="cursor:pointer" @click="store.openProfile(user.id)">' +
      '<div class="nm">{{ user.name }}</div>' +
      '<div class="hd">@{{ user.handle }} · {{ user.bio }}</div>' +
      '</div>' +
      '<span class="row-act">' +
      '<button v-if="withFollow && !isMe" class="btn sm" :class="store.isFollowing(user.id) ? \'ghost\' : \'\'" ' +
      '@click="store.toggleFollow(user.id)">{{ store.isFollowing(user.id) ? \'已关注\' : \'关注\' }}</button>' +
      '<button v-if="withFollow && !isMe" class="iconbtn" :class="{ \'on-primary\': isFriend }" ' +
      ':disabled="isFriend || hasOut" :title="friendTitle" @click="friendAct">' +
      '<FcIcon :name="isFriend ? \'userCheck\' : \'userPlus\'" :size="17" /></button>' +
      '</span>' +
      '</div>'
  };

  /* ---------- 右栏：热门话题 ---------- */
  FC.TrendCard = {
    name: 'FcTrends',
    setup() {
      return { store, tags: computed(() => store.trendingTags()) };
    },
    template:
      '<div class="rail-card">' +
      '<div class="rail-title"><FcIcon name="flame" :size="17" /><span>热门话题</span></div>' +
      '<button v-for="(t, i) in tags" :key="t.tag" class="trend-item" @click="store.navigate(\'explore\', { tag: t.tag })">' +
      '<span class="rank">{{ i + 1 }}</span>' +
      '<span class="tg">#{{ t.tag }}</span>' +
      '<span class="cnt">{{ t.count }} 条帖子</span>' +
      '</button>' +
      '</div>'
  };

  /* ---------- 右栏：推荐关注 ---------- */
  FC.SuggestCard = {
    name: 'FcSuggest',
    setup() {
      return {
        store,
        users: computed(() => store.suggestUsers(3))
      };
    },
    template:
      '<div class="rail-card" v-if="users.length">' +
      '<div class="rail-title"><FcIcon name="users" :size="17" /><span>推荐关注</span></div>' +
      '<FcUserRow v-for="u in users" :key="u.id" :user="u" />' +
      '<div style="height:8px"></div>' +
      '</div>'
  };
})(window.FC);
