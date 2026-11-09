(function () {
  var sections = Array.prototype.slice.call(document.querySelectorAll('#dowebok > .section'));
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = window.matchMedia('(max-width: 960px)').matches;

  function revealCard(card, delay) {
    if (card.dataset.revealStarted) return;
    card.dataset.revealStarted = 'true';
    var lines = Array.prototype.slice.call(card.querySelectorAll('p:not(.video-eyebrow)'));
    setTimeout(function () {
      card.classList.add('is-visible');
      lines.forEach(function (line, index) {
        setTimeout(function () { line.classList.add('line-visible'); }, reduceMotion ? 0 : 230 + index * 220);
      });
    }, reduceMotion ? 0 : delay);
  }

  function revealSection(section) {
    if (section.dataset.revealStarted) return;
    section.dataset.revealStarted = 'true';
    var delay = 0;
    Array.prototype.forEach.call(section.querySelectorAll('.memory-card'), function (card) {
      revealCard(card, delay);
      var count = card.querySelectorAll('p:not(.video-eyebrow)').length;
      delay += Math.max(700, 350 + count * 220);
    });
  }

  if (mobile && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          revealCard(entry.target, 0);
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px 80px 0px', threshold: .05 });
    Array.prototype.forEach.call(document.querySelectorAll('.memory-card'), function (card) { observer.observe(card); });
  } else if (mobile) {
    sections.forEach(revealSection);
  } else {
    var watch = new MutationObserver(function () {
      sections.forEach(function (section) { if (section.classList.contains('active')) revealSection(section); });
    });
    sections.forEach(function (section) { watch.observe(section, { attributes: true, attributeFilter: ['class'] }); });
    sections.forEach(function (section) { if (section.classList.contains('active')) revealSection(section); });
  }

  var tiles = Array.prototype.slice.call(document.querySelectorAll('.video-tile'));
  var viewer = document.getElementById('video-viewer');
  var player = document.getElementById('video-player');
  var stage = viewer.querySelector('.video-viewer-stage');
  var unavailable = document.getElementById('video-unavailable');
  var counter = document.getElementById('video-counter');
  var previousButton = viewer.querySelector('.video-viewer-prev');
  var nextButton = viewer.querySelector('.video-viewer-next');
  var closeButton = viewer.querySelector('.video-viewer-close');
  var music = document.getElementById('page-music');
  var currentIndex = 0;
  var focusedBeforeOpen = null;
  var musicWasPlaying = false;

  function resizeStage() {
    if (!player.videoWidth || !player.videoHeight) return;
    var ratio = player.videoWidth / player.videoHeight;
    var sideSpace = window.innerWidth <= 600 ? 96 : 150;
    var maxWidth = Math.min(window.innerWidth - sideSpace, 1050);
    var maxHeight = window.innerHeight - (window.innerWidth <= 600 ? 132 : 104);
    var width = Math.max(160, Math.min(maxWidth, maxHeight * ratio));
    stage.style.width = width + 'px';
    stage.style.height = width / ratio + 'px';
  }

  function setFullPageScrolling(allow) {
    if (!window.jQuery || !window.jQuery.fn.fullpage) return;
    var fullpage = window.jQuery.fn.fullpage;
    if (typeof fullpage.setAllowScrolling === 'function') fullpage.setAllowScrolling(allow);
    if (typeof fullpage.setKeyboardScrolling === 'function') fullpage.setKeyboardScrolling(allow);
  }

  function showVideo(index) {
    currentIndex = (index + tiles.length) % tiles.length;
    var source = tiles[currentIndex].querySelector('.video-thumb').getAttribute('data-src');
    player.pause();
    player.hidden = false;
    player.src = source;
    player.load();
    stage.style.width = '';
    stage.style.height = '';
    unavailable.hidden = true;
    counter.textContent = (currentIndex + 1) + ' / ' + tiles.length;
    player.setAttribute('aria-label', '视频 ' + (currentIndex + 1));
    var attempt = player.play();
    if (attempt && attempt.catch) attempt.catch(function () {});
  }

  function openVideo(index) {
    focusedBeforeOpen = document.activeElement;
    musicWasPlaying = !!(music && !music.paused);
    if (musicWasPlaying) music.pause();
    viewer.hidden = false;
    document.body.classList.add('video-viewer-open');
    setFullPageScrolling(false);
    showVideo(index);
    closeButton.focus();
  }

  function closeVideo() {
    if (viewer.hidden) return;
    player.pause();
    player.removeAttribute('src');
    player.load();
    viewer.hidden = true;
    document.body.classList.remove('video-viewer-open');
    setFullPageScrolling(true);
    if (musicWasPlaying && music) {
      var attempt = music.play();
      if (attempt && attempt.catch) attempt.catch(function () {});
    }
    musicWasPlaying = false;
    if (focusedBeforeOpen && focusedBeforeOpen.focus) focusedBeforeOpen.focus();
  }

  tiles.forEach(function (tile, index) {
    var preview = tile.querySelector('.video-thumb');
    tile.addEventListener('click', function () { openVideo(index); });
    preview.addEventListener('loadeddata', function () {
      tile.classList.add('is-ready');
      tile.querySelector('.video-status').textContent = '点击播放';
    });
    preview.addEventListener('error', function () {
      tile.classList.remove('is-ready');
      tile.querySelector('.video-status').textContent = '等待上传';
    });
  });

  // Begin buffering while the visitor reads the earlier cards, not on arrival at this page.
  setTimeout(function () {
    tiles.forEach(function (tile, index) {
      setTimeout(function () {
        var preview = tile.querySelector('.video-thumb');
        preview.preload = navigator.connection && navigator.connection.saveData ? 'metadata' : 'auto';
        preview.src = preview.getAttribute('data-src');
        preview.load();
      }, index * 900);
    });
  }, 1500);

  player.addEventListener('loadedmetadata', resizeStage);
  player.addEventListener('error', function () {
    player.hidden = true;
    unavailable.textContent = '视频 ' + String(currentIndex + 1).padStart(2, '0') + ' 还没上传';
    unavailable.hidden = false;
  });
  window.addEventListener('resize', resizeStage);
  previousButton.addEventListener('click', function () { showVideo(currentIndex - 1); });
  nextButton.addEventListener('click', function () { showVideo(currentIndex + 1); });
  closeButton.addEventListener('click', closeVideo);
  viewer.querySelector('.video-viewer-shade').addEventListener('click', closeVideo);
  document.addEventListener('keydown', function (event) {
    if (viewer.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeVideo(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); event.stopPropagation(); showVideo(currentIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); showVideo(currentIndex + 1); }
  }, true);
}());
