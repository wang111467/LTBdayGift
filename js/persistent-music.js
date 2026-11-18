(function () {
  var audio = document.getElementById('shared-page-music');
  if (!audio) return;
  var userPaused = false;
  var activated = false;
  var revealed = false;
  var context = null;
  var gain = null;

  // Unlock playback during the login gesture, but keep it silent until the cake page.
  function unlockSilently() {
    if (context || revealed) return;
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      try {
        context = new AudioContextClass();
        gain = context.createGain();
        gain.gain.setValueAtTime(0, context.currentTime);
        context.createMediaElementSource(audio).connect(gain);
        gain.connect(context.destination);
        var resumed = context.resume();
        if (resumed && resumed.catch) resumed.catch(function () {});
        return;
      } catch (error) {}
    }
    // Older browsers can still unlock a muted element for a later playback attempt.
    audio.muted = true;
  }

  function play() {
    if (userPaused || !audio.paused) return;
    activated = true;
    try {
      var attempt = audio.play();
      if (attempt && attempt.catch) attempt.catch(function () {});
    } catch (error) {}
  }

  window.birthdayMusic = {
    audio: audio,
    startFromLogin: function () {
      userPaused = false;
      unlockSilently();
      play();
    },
    revealSound: function () {
      if (revealed) return;
      revealed = true;
      // Match desktop timing: start the song from the beginning when the cake appears.
      try { audio.currentTime = 0; } catch (error) {}
      if (gain && context) {
        var resumed = context.resume();
        if (resumed && resumed.catch) resumed.catch(function () {});
        gain.gain.cancelScheduledValues(context.currentTime);
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(1, context.currentTime + 0.3);
      } else {
        audio.muted = false;
      }
      play();
    },
    start: play,
    setTrack: function (url) {
      if (audio.src === url) return;
      var resume = activated && !userPaused;
      audio.src = url;
      audio.load();
      if (resume) play();
    },
    toggle: function () {
      if (audio.paused) {
        userPaused = false;
        play();
      } else {
        userPaused = true;
        audio.pause();
      }
    },
    get isSilentBeforeCake() { return !revealed; }
  };
}());
