/* FlatCircle · 信息流：发布器 / 帖子卡 / 首页 / 探索 */
window.FC = window.FC || {};
(function (FC) {
  'use strict';

  const { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } = Vue;
  const store = FC.store;

  const EMOJIS = ['😀', '😄', '😅', '😂', '🙂', '😉', '😍', '🤩', '😎', '🥳', '🤔', '🙃',
    '😴', '🥺', '😭', '😤', '😱', '🥰', '🤗', '👏', '👍', '🎉', '🔥', '✨',
    '💯', '🌿', '☕', '🍜', '🐱', '🌈', '📷', '🎨'];

  /* ---------- 发布器 ---------- */
  FC.Composer = {
    name: 'FcComposer',
    setup() {
      const me = computed(() => store.state.me);
      const text = ref('');
      const images = ref([]);
      const showEmoji = ref(false);
      const busy = ref(false);
      const rootEl = ref(null);
      const taEl = ref(null);

      const MAX = 280;
      const remaining = computed(() => MAX - text.value.length);
      const canPost = computed(() => !busy.value && text.value.length <= MAX && (text.value.trim().length > 0 || images.value.length > 0));

      function grow() {
        const el = taEl.value;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 240) + 'px';
      }
      function addEmoji(e) {
        text.value += e;
        nextTick(grow);
      }
      function onKeydown(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          submit();
        }
      }
      async function onFiles(e) {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;
        busy.value = true;
        try {
          for (const f of files) {
            if (images.value.length >= 4) { store.toast('最多上传 4 张图片', 'warn'); break; }
            try {
              const url = await FC.compressImage(f, 1100, 0.74);
              images.value.push(url);
            } catch (err) {
              store.toast(err.message || '图片处理失败', 'err');
            }
          }
        } finally {
          busy.value = false;
        }
      }
      function removeImage(i) { images.value.splice(i, 1); }
      function submit() {
        if (!canPost.value) return;
        const ok = store.publish(text.value, images.value.slice());
        if (ok) {
          text.value = '';
          images.value = [];
          showEmoji.value = false;
          nextTick(grow);
        }
      }
      function onDocClick(e) {
        if (!showEmoji.value || !rootEl.value) return;
        if (!rootEl.value.contains(e.target)) showEmoji.value = false;
      }
      onMounted(() => document.addEventListener('click', onDocClick));
      onBeforeUnmount(() => document.removeEventListener('click', onDocClick));

      return { me, text, images, showEmoji, busy, remaining, canPost, EMOJIS, rootEl, taEl, MAX,
        grow, addEmoji, onKeydown, onFiles, removeImage, submit };
    },
    template:
      '<div class="card composer" ref="rootEl">' +
      '<div class="composer-top">' +
      '<FcAvatar :user="me" :size="44" :clickable="false" />' +
      '<textarea ref="taEl" class="textarea" v-model="text" rows="2" :maxlength="MAX + 40" ' +
      'placeholder="分享点什么…（Ctrl + Enter 发布）" @input="grow" @keydown="onKeydown"></textarea>' +
      '</div>' +
      '<div class="img-previews" v-if="images.length">' +
      '<div class="img-preview" v-for="(img, i) in images" :key="i">' +
      '<img :src="img" alt="待发布图片" />' +
      '<button class="rm" title="移除图片" @click="removeImage(i)"><FcIcon name="x" :size="13" /></button>' +
      '</div></div>' +
      '<div class="composer-bar" style="position:relative">' +
      '<button class="iconbtn" title="插入图片" @click="$refs.picker.click()" :disabled="busy">' +
      '<FcIcon name="image" :size="18" /></button>' +
      '<input ref="picker" type="file" accept="image/*" multiple style="display:none" @change="onFiles" />' +
      '<button class="iconbtn" title="表情" @click.stop="showEmoji = !showEmoji"><FcIcon name="smile" :size="18" /></button>' +
      '<div class="emoji-pop" v-if="showEmoji" @click.stop>' +
      '<button v-for="e in EMOJIS" :key="e" @click="addEmoji(e)">{{ e }}</button>' +
      '</div>' +
      '<div class="spacer"></div>' +
      '<span class="counter" :class="{ warn: remaining <= 40 && remaining > 0, over: remaining < 0 }">' +
      '{{ remaining }}</span>' +
      '<button class="btn sm" :disabled="!canPost" @click="submit">' +
      '<FcIcon name="send" :size="15" /> 发布</button>' +
      '</div></div>'
  };

  /* ---------- 点赞飘心 ---------- */
  function spawnHearts(e) {
    const el = e && e.currentTarget ? e.currentTarget : null;
    if (!el) return;
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 4; i++) {
      const s = document.createElement('span');
      s.className = 'float-heart';
      s.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">' +
        '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
      s.style.left = (r.left + r.width / 2 - 8 + (Math.random() * 26 - 13)) + 'px';
      s.style.top = (r.top - 6) + 'px';
      s.style.setProperty('--fx', (Math.random() * 36 - 18).toFixed(0) + 'px');
      s.style.animationDelay = (i * 60) + 'ms';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1000 + i * 60);
    }
  }

  /* ---------- 帖子卡片 ---------- */
  FC.PostCard = {
    name: 'FcPostCard',
    props: { post: { type: Object, required: true }, focus: { type: Boolean, default: false } },
    setup(props) {
      const rootEl = ref(null);
      const showComments = ref(false);
      const commentText = ref('');
      const ring = ref(false);

      const author = computed(() => store.userById(props.post.authorId));
      const liked = computed(() => props.post.likes.indexOf('me') > -1);
      const faved = computed(() => props.post.favorites.indexOf('me') > -1);
      const mine = computed(() => props.post.authorId === 'me');
      const comments = computed(() => props.post.comments.slice().sort((a, b) => a.createdAt - b.createdAt));
      const rich = computed(() => FC.renderRich(props.post.content));
      const imgCls = computed(() => 'n' + Math.min(props.post.images.length, 4));
      const timeText = computed(() => FC.timeAgo(props.post.createdAt));

      function onLike(e) {
        const was = liked.value;
        store.toggleLike(props.post);
        if (!was) spawnHearts(e);
      }
      function onContentClick(e) {
        const t = e.target && e.target.dataset ? e.target.dataset.tag : null;
        if (t) store.navigate('explore', { tag: t });
      }
      function addComment() {
        if (!commentText.value.trim()) return;
        store.addComment(props.post, commentText.value);
        commentText.value = '';
      }
      function del() {
        store.confirm({ title: '删除这条帖子？', text: '删除后不可恢复。', okText: '删除', danger: true }, () => {
          store.removePost(props.post.id);
        });
      }
      function delComment(c) {
        store.confirm({ title: '删除这条评论？', okText: '删除', danger: true }, () => {
          store.removeComment(props.post, c.id);
        });
      }
      function share() {
        const u = author.value;
        const payload = u.name + '：' + props.post.content;
        FC.copyText(payload.trim()).then((ok) => {
          store.toast(ok ? '内容已复制到剪贴板' : '复制失败，请手动选择', ok ? 'ok' : 'err');
        });
      }
      function doFocus() {
        showComments.value = true;
        nextTick(() => {
          if (rootEl.value) rootEl.value.scrollIntoView({ block: 'center', behavior: 'smooth' });
          ring.value = false;
          requestAnimationFrame(() => { ring.value = true; });
          setTimeout(() => { ring.value = false; }, 1700);
        });
      }
      watch(() => props.focus, (nv) => { if (nv) doFocus(); });
      onMounted(() => { if (props.focus) doFocus(); });

      return { store, rootEl, showComments, commentText, ring, author, liked, faved, mine,
        comments, rich, imgCls, timeText,
        onLike, onContentClick, addComment, del, delComment, share,
        timeAgo: FC.timeAgo, initial: FC.initial };
    },
    template:
      '<article class="card post" :class="{ \'focus-ring\': ring }" ref="rootEl">' +
      /* 头部 */
      '<div class="post-head">' +
      '<FcAvatar :user="author" :size="44" />' +
      '<div class="meta">' +
      '<div class="nm" style="cursor:pointer" @click="store.openProfile(author.id)">{{ author.name }}' +
      '<span v-if="mine" class="chip" style="padding:1px 8px;font-size:11px">我</span>' +
      '</div>' +
      '<div class="hd">@{{ author.handle }} · {{ timeText }}</div>' +
      '</div>' +
      '<button v-if="mine" class="iconbtn" title="删除帖子" @click="del"><FcIcon name="trash" :size="17" /></button>' +
      '</div>' +
      /* 正文 */
      '<div class="rich post-body" v-if="post.content" v-html="rich" @click="onContentClick"></div>' +
      '<div class="post-imgs" :class="imgCls" v-if="post.images.length">' +
      '<img v-for="(img, i) in post.images" :key="i" :src="img" alt="帖子图片" loading="lazy" />' +
      '</div>' +
      /* 操作栏 */
      '<div class="post-actions">' +
      '<FcIconButton icon="comment" :count="post.comments.length" :active="showComments" ' +
      'active-cls="on-primary" title="评论" @click="showComments = !showComments" />' +
      '<FcIconButton icon="heart" :count="post.likes.length" :active="liked" active-cls="on-like" ' +
      'title="点赞" @click="onLike" />' +
      '<FcIconButton icon="bookmark" :active="faved" active-cls="on-primary" title="收藏" @click="store.toggleFav(post)" />' +
      '<div class="spacer"></div>' +
      '<FcIconButton icon="share" title="复制内容" @click="share" />' +
      '</div>' +
      /* 评论区 */
      '<div class="comments" v-if="showComments">' +
      '<div v-if="!comments.length" style="color:var(--text-3);font-size:13.5px;padding:2px 0 8px">还没有评论，来抢沙发～</div>' +
      '<TransitionGroup name="list" tag="div">' +
      '<div class="comment" v-for="c in comments" :key="c.id">' +
      '<FcAvatar :user="store.userById(c.authorId)" :size="30" />' +
      '<div class="c-body">' +
      '<div class="c-bubble">' +
      '<span class="c-name" style="cursor:pointer" @click="store.openProfile(c.authorId)">{{ store.userById(c.authorId).name }}</span>' +
      '<div class="c-text">{{ c.content }}</div>' +
      '</div>' +
      '<div class="c-foot">' +
      '<span>{{ timeAgo(c.createdAt) }}</span>' +
      '<button class="c-like" :class="{ on: c.likes.indexOf(\'me\') > -1 }" @click="store.toggleCommentLike(post, c)">' +
      '<FcIcon name="heart" :size="13" /> {{ c.likes.length || \'\' }}</button>' +
      '<button v-if="c.authorId === \'me\'" class="c-like" @click="delComment(c)">删除</button>' +
      '</div></div></div>' +
      '</TransitionGroup>' +
      '<div class="comment-form">' +
      '<FcAvatar :user="store.state.me" :size="30" :clickable="false" />' +
      '<input class="input" v-model="commentText" maxlength="200" placeholder="写下你的评论…" ' +
      '@keydown.enter.prevent="addComment" />' +
      '<button class="btn sm" :disabled="!commentText.trim()" @click="addComment">发送</button>' +
      '</div></div>' +
      '</article>'
  };

  /* ---------- 首页信息流 ---------- */
  FC.FeedView = {
    name: 'FcFeed',
    setup() {
      const posts = computed(() => store.feedPosts());
      const ui = store.state.ui;
      const focusId = computed(() => ui.focusPostId);
      watch(focusId, (v) => {
        if (v) setTimeout(() => { ui.focusPostId = null; }, 400);
      });
      return { store, ui, posts };
    },
    template:
      '<div>' +
      '<div class="view-head">首页<span class="sub">关注 {{ store.state.me.following.length }} 人 · {{ store.state.posts.length }} 条帖子</span></div>' +
      '<FcComposer />' +
      '<div style="display:flex;align-items:center;gap:8px;margin:14px 2px 12px" v-if="ui.tag">' +
      '<span class="chip active">#{{ ui.tag }}<button title="清除筛选" @click="ui.tag = null" style="display:inline-flex;color:inherit"><FcIcon name="x" :size="13" /></button></span>' +
      '<span style="color:var(--text-3);font-size:13px">正在按话题筛选</span>' +
      '</div>' +
      '<div v-if="ui.booting">' +
      '<FcSkeleton /><div style="height:12px"></div><FcSkeleton />' +
      '</div>' +
      '<TransitionGroup name="list" tag="div" v-else>' +
      '<FcPostCard v-for="p in posts" :key="p.id" :post="p" :focus="p.id === ui.focusPostId" />' +
      '</TransitionGroup>' +
      '</div>'
  };

  /* ---------- 探索 ---------- */
  FC.ExploreView = {
    name: 'FcExplore',
    setup() {
      const ui = store.state.ui;
      const tags = computed(() => store.trendingTags());
      const results = computed(() => store.searchPosts());
      const users = computed(() => store.searchUsers());
      const tagPosts = computed(() => {
        if (!ui.tag) return [];
        return store.feedPosts().filter((p) => p.content.indexOf('#' + ui.tag) > -1);
      });
      return { store, ui, tags, results, users, tagPosts, searchEl: ref(null) };
    },
    template:
      '<div>' +
      '<div class="view-head">探索<span class="sub">发现话题与同好</span></div>' +
      '<div class="card" style="padding:14px 16px">' +
      '<div class="searchbox">' +
      '<FcIcon name="search" :size="18" />' +
      '<input class="input" v-model="ui.search" placeholder="搜索帖子、用户…" />' +
      '</div>' +
      '<div class="chips" style="margin-top:14px">' +
      '<button class="chip" :class="{ active: !ui.tag }" @click="ui.tag = null">全部</button>' +
      '<button class="chip" v-for="t in tags" :key="t.tag" :class="{ active: ui.tag === t.tag }" ' +
      '@click="ui.tag = ui.tag === t.tag ? null : t.tag">#{{ t.tag }}</button>' +
      '</div>' +
      '</div>' +
      /* 搜索结果 */
      '<template v-if="ui.search.trim()">' +
      '<div class="view-head" style="font-size:15px;margin-top:18px">用户（{{ users.length }}）</div>' +
      '<div class="card" v-if="users.length"><FcUserRow v-for="u in users" :key="u.id" :user="u" /></div>' +
      '<div class="view-head" style="font-size:15px;margin-top:18px">帖子（{{ results.length }}）</div>' +
      '<div v-if="!results.length"><FcEmpty icon="search" title="没有找到相关帖子" text="换个关键词试试" /></div>' +
      '<FcPostCard v-for="p in results" :key="p.id" :post="p" />' +
      '</template>' +
      /* 话题筛选 */
      '<template v-else-if="ui.tag">' +
      '<div class="view-head" style="font-size:15px;margin-top:18px">#{{ ui.tag }} · {{ tagPosts.length }} 条帖子</div>' +
      '<div v-if="!tagPosts.length"><FcEmpty icon="flame" title="这个话题还没有帖子" /></div>' +
      '<FcPostCard v-for="p in tagPosts" :key="p.id" :post="p" />' +
      '</template>' +
      /* 默认：热门 + 推荐 */
      '<template v-else>' +
      '<div class="view-head" style="font-size:15px;margin-top:18px">热门话题</div>' +
      '<div class="card">' +
      '<button v-for="(t, i) in tags" :key="t.tag" class="trend-item" style="padding:13px 16px" @click="ui.tag = t.tag">' +
      '<span class="rank">{{ i + 1 }}</span>' +
      '<span class="tg">#{{ t.tag }}</span>' +
      '<span class="cnt">{{ t.count }} 条帖子</span>' +
      '</button>' +
      '</div>' +
      '<div class="view-head" style="font-size:15px;margin-top:18px">推荐关注</div>' +
      '<div class="card"><FcUserRow v-for="u in store.suggestUsers(6)" :key="u.id" :user="u" /></div>' +
      '</template>' +
      '</div>'
  };
})(window.FC);
