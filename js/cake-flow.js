(function (root) {
  'use strict';
  function createBirthdayFlow() {
    var state = 'choosing';
    return {
      get state() { return state; },
      like: function () {
        if (state !== 'choosing') return false;
        state = 'wishing';
        return true;
      },
      dislike: function () { return state === 'choosing'; },
      blow: function () {
        if (state !== 'wishing') return false;
        state = 'celebrating';
        return true;
      }
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createBirthdayFlow: createBirthdayFlow };
  else root.createBirthdayFlow = createBirthdayFlow;
}(typeof window !== 'undefined' ? window : globalThis));
