(function () {
  var audio = document.getElementById('page-music');
  var button = document.getElementById('music-toggle');
  if (!audio || !button) return;

  function update() {
    var playing = !audio.paused;
    button.textContent = playing ? '♫ 暂停音乐' : '♫ 播放音乐';
    button.setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
    button.setAttribute('aria-pressed', String(playing));
    button.classList.toggle('is-playing', playing);
  }

  function start() {
    if (!audio.paused) return;
    try {
      var attempt = audio.play();
      if (attempt && attempt.catch) attempt.catch(update);
    } catch (error) {
      update();
    }
  }

  button.addEventListener('click', function () {
    if (audio.paused) start();
    else audio.pause();
  });
  // On phones a real touch grants playback permission even when autoplay was blocked.
  document.addEventListener('pointerup', function (event) {
    if (event.target.closest && event.target.closest('#music-toggle')) return;
    start();
  }, { once: true, capture: true });
  audio.addEventListener('play', update);
  audio.addEventListener('pause', update);
  update();
  start();
}());
