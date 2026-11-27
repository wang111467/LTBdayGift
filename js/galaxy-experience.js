(function () {
  'use strict';
  var flow = window.birthdayFlow = window.createBirthdayFlow();
  var preview = document.getElementById('choice-preview');
  var image = document.getElementById('reaction-image');
  var like = document.getElementById('like-choice');
  var dislike = document.getElementById('dislike-choice');
  var wishStep = document.getElementById('wish-step');
  var blow = document.getElementById('blow-candle');
  var prompt = document.getElementById('choice-prompt');
  var hideTimer;
  var navigating = false;
  var previewOrigin;
  var photoRequest = 0;
  var choices = document.getElementById('choice-actions');
  var choicesScheduled = false;

  // Reserve their layout space while waiting for the actual cake paint and intro exit.
  function revealChoicesAfterCake() {
    if (choicesScheduled || !window.__birthdayScenePainted || document.getElementById('intro')) return;
    choicesScheduled = true;
    setTimeout(function () {
      if (flow.state !== 'choosing') return;
      choices.classList.add('is-visible');
      choices.removeAttribute('inert');
      choices.removeAttribute('aria-hidden');
    }, 500);
  }
  document.addEventListener('birthday:painted', revealChoicesAfterCake);
  document.addEventListener('birthday:intro-finished', revealChoicesAfterCake);
  revealChoicesAfterCake();

  // The new scene supports both phone orientations inside the existing host frame.
  try {
    if (window.parent !== window) window.parent.document.body.classList.add('portrait-allowed');
    if (window.top.screen.orientation && window.top.screen.orientation.unlock) window.top.screen.orientation.unlock();
  } catch (error) {}

  function layout() { document.dispatchEvent(new CustomEvent('birthday:layout')); }
  function hidePreview(restoreFocus) {
    clearTimeout(hideTimer);
    preview.hidden = true;
    if (restoreFocus && preview.contains(document.activeElement)) {
      if (flow.state === 'wishing') blow.focus();
      else if (previewOrigin) previewOrigin.focus();
    }
  }
  function showPreview(kind) {
    clearTimeout(hideTimer);
    var happy = kind === 'like';
    var request = ++photoRequest;
    previewOrigin = happy ? like : dislike;
    preview.dataset.reaction = kind;
    preview.classList.remove('photo-missing');
    document.getElementById('reaction-title').textContent = happy ? '喜欢' : '不喜欢';
    image.alt = happy ? '送给你的开心照片' : '逗你开心的小表情';
    var url = '../img/choice-' + kind;
    image.onerror = function () {
      if (request !== photoRequest) return;
      if (image.getAttribute('src') === url + '.webp') image.src = url + '.jpg';
      else preview.classList.add('photo-missing');
    };
    image.src = url + '.webp';
    preview.hidden = false;
    // Reveal the wish controls independently of image loading or failure.
    hideTimer = setTimeout(function () { hidePreview(true); }, 3200);
  }
  like.addEventListener('click', function () {
    if (!flow.like()) return;
    document.getElementById('choice-actions').hidden = true;
    prompt.hidden = true;
    wishStep.hidden = false;
    showPreview('like');
    blow.disabled = !window.__bday;
    blow.focus({ preventScroll: true });
    layout();
  });
  dislike.addEventListener('click', function () {
    if (!flow.dislike()) return;
    showPreview('dislike');
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') hidePreview(true);
  });
  document.addEventListener('birthday:ready', function () {
    if (flow.state === 'wishing') blow.disabled = false;
  });
  blow.addEventListener('click', function () {
    if (!window.__bday || !flow.blow()) return;
    hidePreview(false);
    blow.disabled = true;
    blow.hidden = true;
    wishStep.hidden = true;
    document.body.classList.add('candle-extinguished');
    window.__bday.blow();
    layout();
  });
  document.addEventListener('birthday:extinguished', function () {
    if (navigating || flow.state !== 'celebrating') return;
    navigating = true;
    var message = document.getElementById('wishMsg');
    message.classList.add('show', 'vis');
    setTimeout(function () { document.body.classList.add('leaving-cake'); }, 2400);
    setTimeout(function () { window.location.href = 'Memories.html'; }, 3100);
  });
  // Opening the source directly at its cake entry keeps the same flow.
  if (window.__bday && flow.state === 'wishing') blow.disabled = false;
}());
