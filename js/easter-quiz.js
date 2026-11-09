(function () {
  'use strict';

  // 后续直接修改这里的第 2、3 题问题和答案。
  var riddles = [
    {
      question: '中国人会飞，为什么曹操不会飞？',
      answer: '因为 孟德翅膀已经受了伤～'
    },
    {
      question: '第 2 题：问题待填写',
      answer: '第 2 题：答案待填写'
    },
    {
      question: '第 3 题：问题待填写',
      answer: '第 3 题：答案待填写'
    }
  ];

  var entry = document.getElementById('easter-entry');
  var backdrop = document.getElementById('riddle-backdrop');
  var modal = document.getElementById('riddle-question-modal');
  var question = document.getElementById('riddle-question');
  var answerPanel = document.getElementById('riddle-answer-panel');
  var answer = document.getElementById('riddle-answer');
  var questionProgress = document.getElementById('riddle-question-progress');
  var revealButton = document.getElementById('riddle-reveal');
  var previousButton = document.getElementById('riddle-previous');
  var nextButton = document.getElementById('riddle-next');
  var current = 0;

  function progress() {
    return String(current + 1).padStart(2, '0') + ' / ' +
      String(riddles.length).padStart(2, '0');
  }

  function showQuestion() {
    question.textContent = riddles[current].question;
    questionProgress.textContent = progress();
    answer.textContent = '';
    answerPanel.hidden = true;
    revealButton.hidden = false;
    previousButton.hidden = current === 0;
    nextButton.hidden = current === riddles.length - 1;
    backdrop.hidden = false;
    modal.hidden = false;
    entry.setAttribute('aria-expanded', 'true');
    revealButton.focus();
  }

  function showAnswer() {
    answer.textContent = riddles[current].answer;
    answerPanel.hidden = false;
    revealButton.hidden = true;
    (nextButton.hidden ? previousButton : nextButton).focus();
  }

  function close() {
    backdrop.hidden = true;
    modal.hidden = true;
    entry.setAttribute('aria-expanded', 'false');
    entry.focus();
  }

  function revealEntry() { entry.hidden = false; }
  document.addEventListener('birthday-text-nearly-complete', revealEntry);
  document.addEventListener('birthday-text-complete', revealEntry);
  if (window.easterEntryReady || window.easterTextComplete) revealEntry();

  entry.addEventListener('click', function () {
    current = 0;
    showQuestion();
  });
  revealButton.addEventListener('click', showAnswer);
  previousButton.addEventListener('click', function () {
    if (current === 0) return;
    current -= 1;
    showQuestion();
  });
  nextButton.addEventListener('click', function () {
    if (current === riddles.length - 1) return;
    current += 1;
    showQuestion();
  });
  backdrop.addEventListener('click', close);
  Array.prototype.forEach.call(document.querySelectorAll('.riddle-close'), function (button) {
    button.addEventListener('click', close);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !backdrop.hidden) close();
  });
})();
