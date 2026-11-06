(function () {
  'use strict';

  // 后续直接修改这里的第 2、3 题问题和答案。
  var riddles = [
    {
      question: '中国人会飞，为什么曹操不会飞？',
      answer: '因为孟德翅膀已经受了伤。'
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
  var questionModal = document.getElementById('riddle-question-modal');
  var answerModal = document.getElementById('riddle-answer-modal');
  var question = document.getElementById('riddle-question');
  var answer = document.getElementById('riddle-answer');
  var questionProgress = document.getElementById('riddle-question-progress');
  var answerProgress = document.getElementById('riddle-answer-progress');
  var unknownButton = document.getElementById('riddle-unknown');
  var nextButton = document.getElementById('riddle-next');
  var current = 0;

  function progress() {
    return String(current + 1).padStart(2, '0') + ' / ' +
      String(riddles.length).padStart(2, '0');
  }

  function show(modal, focusTarget) {
    backdrop.hidden = false;
    questionModal.hidden = modal !== questionModal;
    answerModal.hidden = modal !== answerModal;
    entry.setAttribute('aria-expanded', 'true');
    focusTarget.focus();
  }

  function showQuestion() {
    question.textContent = riddles[current].question;
    questionProgress.textContent = progress();
    show(questionModal, unknownButton);
  }

  function showAnswer() {
    answer.textContent = riddles[current].answer;
    answerProgress.textContent = progress();
    nextButton.textContent = current === riddles.length - 1 ? '再来一遍' : '下一题';
    show(answerModal, nextButton);
  }

  function close() {
    backdrop.hidden = true;
    questionModal.hidden = true;
    answerModal.hidden = true;
    entry.setAttribute('aria-expanded', 'false');
    entry.focus();
  }

  document.addEventListener('birthday-text-complete', function () {
    entry.hidden = false;
  });
  if (window.easterTextComplete) entry.hidden = false;

  entry.addEventListener('click', function () {
    current = 0;
    showQuestion();
  });
  unknownButton.addEventListener('click', showAnswer);
  nextButton.addEventListener('click', function () {
    current = (current + 1) % riddles.length;
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
