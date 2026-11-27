# LTBdayGift

静态生日祝福网站，打开 `index.html`，完成原有登录后默认进入新版便签开场与星河蛋糕。

- 新版开场：`html/index1.html`
- 直接查看新版蛋糕：`html/BirthdayCake.html`
- 旧版倒计时：`html/index1-legacy.html`
- 旧版蛋糕：`html/BirthdayCake-legacy.html`

新版右上角“旧版回味”可进入旧版，旧版左上角“体验新版”可返回。

新版交互：喜欢／不喜欢展示照片反馈；只有喜欢后才出现许愿和吹蜡烛按钮。吹灭后播放庆祝效果，再进入原有回忆页。照片加载失败不影响许愿。蛋糕保留拖动旋转、星河、小雪、流星雨和光环开关，并支持不具备 WebGL 的浏览器使用 2D 蛋糕。

新版画面与字体来自提供的 HTML，资源已提取到 `img/galaxy-cake/`、`css/galaxy-cake.css` 和 `js/galaxy-*.js`；Three.js 依赖保存在 `js/vendor/`，不依赖外部 CDN。蛋糕侧面贴图继续以内嵌数据保存在 `js/galaxy-cake-assets.js`，以兼容直接打开本地 HTML 的 WebGL 预览。背景音乐沿用项目原有播放器。

本地预览：`python3 -m http.server 8765`，访问 `http://localhost:8765`。

交互状态测试：`node --test tests/*.test.cjs`。
