(function () {
  var preview = document.getElementById('choice-preview');
  var hideTimer;

  function showPreview(image, description, continueAfter) {
    clearTimeout(hideTimer);
    preview.src = image;
    preview.alt = description;
    preview.hidden = false;
    preview.classList.remove('is-visible');
    void preview.offsetWidth;
    preview.classList.add('is-visible');

    hideTimer = setTimeout(function () {
      preview.hidden = true;
      preview.classList.remove('is-visible');
      if (continueAfter) window.location.href = 'Memories.html';
    }, 2000);
  }

  document.getElementById('like-choice').addEventListener('click', function (event) {
    event.preventDefault();
    showPreview('../img/choice-like.jpg', '开心的照片', true);
  });

  document.getElementById('dislike-choice').addEventListener('click', function (event) {
    event.preventDefault();
    showPreview('../img/choice-dislike.jpg', '不开心的照片', false);
  });
}());
