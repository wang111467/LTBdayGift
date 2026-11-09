(function () {
  var frosting = document.getElementById('crema');
  var candleShown = false;
  function showCandle() {
    if (candleShown) return;
    candleShown = true;
    document.body.classList.add('cake-ready');
  }
  if (frosting) frosting.addEventListener('endEvent', showCandle, { once: true });
  // A short fallback keeps the candle available if a browser skips SVG endEvent.
  window.setTimeout(showCandle, 4200);

  var preview = document.getElementById('choice-preview');
  var hideTimer;
  var requestId = 0;
  var choices = document.querySelector('.choice-actions');
  var wishStep = document.getElementById('wish-step');
  var wishPrompt = document.getElementById('wish-prompt');
  var blowButton = document.getElementById('blow-candle');
  var likeStarted = false;
  var memoryImages = [];

  function warmMemoryImages() {
    if (memoryImages.length) return;
    [
      'surprise', 'warm-grin', 'daydream', 'cheer',
      'blush', 'wink', 'wish', 'love'
    ].forEach(function (name) {
      var image = new Image();
      image.src = '../img/moods/' + name + '.webp';
      memoryImages.push(image);
    });
  }

  function showPreview(image, description, onFinished) {
    clearTimeout(hideTimer);
    var currentRequest = ++requestId;
    var shown = false;
    preview.hidden = true;
    preview.classList.remove('is-visible');

    function reveal() {
      if (shown || currentRequest !== requestId) return;
      shown = true;
      preview.alt = description;
      preview.hidden = false;
      void preview.offsetWidth;
      preview.classList.add('is-visible');

      hideTimer = setTimeout(function () {
        preview.hidden = true;
        preview.classList.remove('is-visible');
        if (onFinished) onFinished();
      }, 2000);
    }

    preview.onload = reveal;
    preview.onerror = function () {
      if (preview.src.indexOf('.webp') !== -1) {
        preview.src = image.replace('.webp', '.jpg');
      }
    };
    preview.src = image;
    if (preview.complete && preview.naturalWidth > 0) reveal();
  }

  document.getElementById('like-choice').addEventListener('click', function (event) {
    event.preventDefault();
    if (likeStarted) return;
    likeStarted = true;
    choices.hidden = true;
    showPreview('../img/choice-like.webp', '开心的照片', function () {
      wishStep.hidden = false;
    });
    setTimeout(warmMemoryImages, 100);
  });

  blowButton.addEventListener('click', function () {
    if (blowButton.disabled) return;
    blowButton.disabled = true;
    blowButton.hidden = true;
    wishPrompt.textContent = '愿你所愿，皆得圆满';
    document.body.classList.add('candle-extinguished');
    setTimeout(function () {
      window.location.href = 'Memories.html';
    }, 2000);
  });

  document.getElementById('dislike-choice').addEventListener('click', function (event) {
    event.preventDefault();
    if (likeStarted) return;
    showPreview('../img/choice-dislike.webp', '不开心的照片');
  });
}());
