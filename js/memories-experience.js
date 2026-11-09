(function () {
  var sections = Array.prototype.slice.call(document.querySelectorAll('#dowebok > .section'));
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = window.matchMedia('(max-width: 960px)').matches;

  var lineInterval = 1000;
  var firstLineDelay = 680;
  var lineFadeDuration = 650;
  var betweenCardsDelay = 450;
  var revealEnds = new WeakMap();

  function visibleLines(card) {
    return Array.prototype.filter.call(card.querySelectorAll('p:not(.video-eyebrow)'), function (line) {
      return line.getClientRects().length > 0;
    });
  }

  function cardDuration(card) {
    var lines = visibleLines(card).length;
    if (!lines) return firstLineDelay + betweenCardsDelay;
    return firstLineDelay + (lines - 1) * lineInterval + lineFadeDuration + betweenCardsDelay;
  }

  function revealCard(card, delay) {
    if (card.dataset.revealStarted) return revealEnds.get(card) || Date.now();
    card.dataset.revealStarted = 'true';
    var lines = visibleLines(card);
    var startDelay = reduceMotion ? 0 : delay;
    var end = Date.now() + startDelay + (reduceMotion ? 0 : cardDuration(card));
    revealEnds.set(card, end);
    setTimeout(function () {
      card.classList.add('is-visible');
      lines.forEach(function (line, index) {
        setTimeout(function () {
          line.classList.add('line-visible');
        }, reduceMotion ? 0 : firstLineDelay + index * lineInterval);
      });
    }, startDelay);
    return end;
  }

  function revealSection(section) {
    if (section.dataset.revealStarted) return;
    section.dataset.revealStarted = 'true';
    var delay = 0;
    Array.prototype.forEach.call(section.querySelectorAll('.memory-card'), function (card) {
      revealCard(card, delay);
      delay += reduceMotion ? 0 : cardDuration(card);
    });
  }

  if (mobile && 'IntersectionObserver' in window) {
    var cards = Array.prototype.slice.call(document.querySelectorAll('.memory-card'));
    var observer = new IntersectionObserver(function (entries) {
      entries.sort(function (a, b) { return cards.indexOf(a.target) - cards.indexOf(b.target); });
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var card = entry.target;
        if (card.classList.contains('video-memory-card') && entry.intersectionRatio < .3) return;
        var siblings = Array.prototype.slice.call(card.parentElement.querySelectorAll('.memory-card'));
        var previous = siblings[siblings.indexOf(card) - 1];
        var previousEnd = previous ? revealEnds.get(previous) || 0 : 0;
        revealCard(card, Math.max(0, previousEnd - Date.now()));
        observer.unobserve(card);
      });
    }, { rootMargin: '0px 0px 80px 0px', threshold: [.05, .3] });
    cards.forEach(function (card) { observer.observe(card); });
  } else if (mobile) {
    sections.forEach(revealSection);
  } else {
    // fullPage calls this after a desktop section has finished moving into view.
    window.revealBirthdaySection = function (index) {
      var section = sections[index - 1];
      if (section) revealSection(section);
    };
    // fullPage does not call afterLoad for the initially active section.
    window.jQuery(function () {
      window.setTimeout(function () {
        sections.forEach(function (section) {
          if (section.classList.contains('active')) revealSection(section);
        });
      }, 0);
    });
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
    var viewport = window.visualViewport;
    var viewportWidth = viewport ? viewport.width : window.innerWidth;
    var viewportHeight = viewport ? viewport.height : window.innerHeight;
    var compact = viewportWidth <= 600;
    var maxWidth = Math.min(viewportWidth - (compact ? 96 : 150), 1050);
    var maxHeight = viewportHeight - (compact ? 150 : 120);
    var width = Math.max(120, Math.min(maxWidth, maxHeight * ratio));
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
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resizeStage);
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
