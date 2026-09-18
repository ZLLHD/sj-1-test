/* FlatCircle · 工具函数 */
window.FC = window.FC || {};
(function (FC) {
  'use strict';

  FC.uid = function (prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  };

  FC.escapeHtml = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* 内容渲染：#话题 与 @提及 高亮（先转义，防注入） */
  FC.renderRich = function (text) {
    let html = FC.escapeHtml(text);
    html = html.replace(/#([\u4e00-\u9fa5A-Za-z0-9_]{1,24})/g, '<span class="tag" data-tag="$1">#$1</span>');
    html = html.replace(/@([\u4e00-\u9fa5A-Za-z0-9_]{1,24})/g, '<span class="mention">@$1</span>');
    return html.replace(/\n/g, '<br>');
  };

  FC.extractTags = function (text) {
    const out = [];
    const re = /#([\u4e00-\u9fa5A-Za-z0-9_]{1,24})/g;
    let m;
    while ((m = re.exec(text || ''))) out.push(m[1]);
    return out;
  };

  FC.timeAgo = function (ts) {
    const diff = Date.now() - ts;
    const s = Math.floor(diff / 1000);
    if (s < 45) return '刚刚';
    const m = Math.floor(s / 60);
    if (m < 60) return m + '分钟前';
    const h = Math.floor(m / 60);
    if (h < 24) return h + '小时前';
    const days = Math.floor(h / 24);
    if (days < 2) return '昨天';
    if (days < 7) return days + '天前';
    const d = new Date(ts);
    const now = new Date();
    if (d.getFullYear() === now.getFullYear()) return (d.getMonth() + 1) + '月' + d.getDate() + '日';
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  };

  FC.clockTime = function (ts) {
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  FC.AVATAR_COLORS = ['#3D6DF2', '#7C5CFC', '#E1543A', '#E8A13A', '#22A06B', '#2AA8C4', '#D9538E', '#5B6B7C'];

  FC.hash = function (str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  };

  FC.pickColor = function (seed) {
    return FC.AVATAR_COLORS[FC.hash(String(seed)) % FC.AVATAR_COLORS.length];
  };

  FC.initial = function (name) {
    const n = String(name || '?').trim();
    return n ? n.slice(0, 1).toUpperCase() : '?';
  };

  FC.formatCount = function (n) {
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + 'w';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  };

  /* 确定性伪随机，用于生成种子插画 */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const ART_PALETTES = [
    ['#3D6DF2', '#EAF0FE', '#14161A', '#F59E0B'],
    ['#E1543A', '#FDECEC', '#14161A', '#3D6DF2'],
    ['#22A06B', '#E6F6EF', '#14161A', '#E8A13A'],
    ['#7C5CFC', '#EFEAFE', '#14161A', '#2AA8C4'],
    ['#E8A13A', '#FEF3E2', '#14161A', '#D9538E'],
    ['#2AA8C4', '#E4F5F8', '#14161A', '#E1543A']
  ];

  /* 生成扁平几何风 SVG 插画（data URI），无外部图片依赖 */
  FC.flatArt = function (seed, w, h) {
    w = w || 800; h = h || 600;
    const rnd = mulberry32(FC.hash(String(seed)));
    const pal = ART_PALETTES[Math.floor(rnd() * ART_PALETTES.length)];
    const bg = pal[1], c1 = pal[0], c2 = pal[2], c3 = pal[3];
    let shapes = '<rect width="' + w + '" height="' + h + '" fill="' + bg + '"/>';

    const style = Math.floor(rnd() * 3);
    if (style === 0) {
      const cx = w * (0.3 + rnd() * 0.4), cy = h * (0.3 + rnd() * 0.4), r = Math.min(w, h) * (0.22 + rnd() * 0.12);
      shapes += '<circle cx="' + cx.toFixed(0) + '" cy="' + cy.toFixed(0) + '" r="' + r.toFixed(0) + '" fill="' + c1 + '"/>';
      shapes += '<rect x="' + (w * 0.08).toFixed(0) + '" y="' + (h * (0.62 + rnd() * 0.08)).toFixed(0) + '" width="' + (w * 0.3).toFixed(0) + '" height="' + (h * 0.09).toFixed(0) + '" fill="' + c2 + '"/>';
      shapes += '<circle cx="' + (w * (0.74 + rnd() * 0.12)).toFixed(0) + '" cy="' + (h * 0.3).toFixed(0) + '" r="' + (Math.min(w, h) * 0.07).toFixed(0) + '" fill="' + c3 + '"/>';
    } else if (style === 1) {
      const half = h * 0.5;
      shapes += '<rect x="0" y="' + half + '" width="' + w + '" height="' + half + '" fill="' + c1 + '"/>';
      shapes += '<circle cx="' + (w * 0.32).toFixed(0) + '" cy="' + (h * 0.42).toFixed(0) + '" r="' + (Math.min(w, h) * 0.18).toFixed(0) + '" fill="' + c3 + '"/>';
      shapes += '<rect x="' + (w * 0.6).toFixed(0) + '" y="' + (h * 0.18).toFixed(0) + '" width="' + (w * 0.26).toFixed(0) + '" height="' + (h * 0.26).toFixed(0) + '" fill="' + c2 + '"/>';
    } else {
      const step = w / 4;
      for (let i = 0; i < 4; i++) {
        const bh = h * (0.24 + rnd() * 0.5);
        shapes += '<rect x="' + (i * step + step * 0.14).toFixed(0) + '" y="' + (h - bh).toFixed(0) + '" width="' + (step * 0.72).toFixed(0) + '" height="' + bh.toFixed(0) + '" fill="' + (i % 2 ? c2 : c1) + '"/>';
      }
      shapes += '<circle cx="' + (w * (0.2 + rnd() * 0.6)).toFixed(0) + '" cy="' + (h * 0.24).toFixed(0) + '" r="' + (Math.min(w, h) * 0.12).toFixed(0) + '" fill="' + c3 + '"/>';
    }
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '">' + shapes + '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };

  /* 图片压缩：最长边 maxDim，优先 webp */
  FC.compressImage = function (file, maxDim, quality) {
    maxDim = maxDim || 1100;
    quality = quality || 0.74;
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) return reject(new Error('请选择图片文件'));
      const reader = new FileReader();
      reader.onerror = function () { reject(new Error('图片读取失败')); };
      reader.onload = function () {
        const img = new Image();
        img.onerror = function () { reject(new Error('图片解析失败')); };
        img.onload = function () {
          let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
          if (!w || !h) return reject(new Error('图片尺寸异常'));
          const scale = Math.min(1, maxDim / Math.max(w, h));
          w = Math.max(1, Math.round(w * scale));
          h = Math.max(1, Math.round(h * scale));
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          const ctx = cv.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          let out = '';
          try { out = cv.toDataURL('image/webp', quality); } catch (e) { out = ''; }
          if (!out || out.indexOf('data:image/webp') !== 0) {
            try { out = cv.toDataURL('image/jpeg', quality); } catch (e2) { out = ''; }
          }
          if (!out) return reject(new Error('图片处理失败'));
          resolve(out);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  FC.debounce = function (fn, wait) {
    let t = null;
    return function () {
      const args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  };

  FC.copyText = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    return Promise.resolve(false);
  };

  FC.randInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  FC.pick = function (arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  };
})(window.FC);
