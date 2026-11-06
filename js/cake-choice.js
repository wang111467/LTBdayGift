(function () {
  var preview = document.getElementById('choice-preview');
  var hideTimer;
  var requestId = 0;

  function showPreview(image, description, continueAfter) {
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
        if (continueAfter) window.location.href = 'Memories.html';
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
    showPreview('../img/choice-like.webp', '开心的照片', true);
  });

  document.getElementById('dislike-choice').addEventListener('click', function (event) {
    event.preventDefault();
    showPreview('../img/choice-dislike.webp', '不开心的照片', false);
  });
}());
