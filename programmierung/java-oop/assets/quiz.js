/* ============================================================
   Quiz-Widget · Integralrechnung-Kurs
   Verwendung in einer Lektion:

   <div class="quiz" data-quiz="mein-quiz"></div>
   <script type="application/json" data-for="mein-quiz">
   {
     "title": "Schnelltest",
     "questions": [
       {
         "q": "HTML-Frage (Mathematik mit <sup> etc.)",
         "options": ["Option A", "Option B", ...],
         "correct": 0,
         "explainOk": "Text bei richtiger Antwort.",
         "explainErr": "Hinweis bei falscher Antwort."
       }
     ]
   }
   </script>
   ============================================================ */
(function () {
  'use strict';

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function Quiz(container, data) {
    this.root = container;
    this.data = data;
    this.order = shuffle(data.questions.map(function (_, i) { return i; }));
    this.index = 0;
    this.score = 0;
    this.answered = false;
    this.render();
  }

  Quiz.prototype.render = function () {
    var self = this;
    if (this.index < 0 || this.index >= this.order.length) {
      this.index = 0;
      this.answered = false;
    }
    var q = this.data.questions[this.order[this.index]];
    var total = this.order.length;

    this.root.innerHTML = '';

    var header = document.createElement('div');
    header.className = 'quiz-header';
    header.innerHTML =
      '<span>' + this.data.title + '</span>' +
      '<span class="quiz-progress">Aufgabe ' + (this.index + 1) + '/' + total +
      ' &middot; ' + this.score + ' richtig</span>';
    this.root.appendChild(header);

    var question = document.createElement('div');
    question.className = 'quiz-question';
    question.innerHTML = q.q;
    this.root.appendChild(question);

    var optionsBox = document.createElement('div');
    optionsBox.className = 'quiz-options';
    optionsBox.setAttribute('role', 'group');

    var feedback = document.createElement('div');
    feedback.className = 'quiz-feedback';
    feedback.setAttribute('role', 'status');

    var nextBtn = document.createElement('button');
    nextBtn.className = 'quiz-next';
    nextBtn.textContent = (this.index + 1 < total) ? 'Weiter →' : 'Ergebnis ansehen';

    // Optionen mischen – korrekte Antwort steht nie immer an derselben Stelle
    shuffle(q.options.map(function (_, i) { return i; })).forEach(function (origIdx) {
      var btn = document.createElement('button');
      btn.className = 'quiz-option';
      btn.type = 'button';
      btn.dataset.origIdx = String(origIdx);
      btn.innerHTML = q.options[origIdx];
      btn.addEventListener('click', function () { self.answer(btn, origIdx === q.correct, q, optionsBox, feedback); });
      optionsBox.appendChild(btn);
    });

    this.root.appendChild(optionsBox);
    this.root.appendChild(feedback);
    this.root.appendChild(nextBtn);

    nextBtn.addEventListener('click', function () {
      if (!self.answered) return;
      self.index += 1;
      if (self.index < total) {
        self.answered = false;
        self.render();
      } else {
        self.summary();
      }
    });

    this.nextBtn = nextBtn;
  };

  Quiz.prototype.answer = function (btn, isCorrect, q, optionsBox, feedback) {
    if (this.answered) return;
    this.answered = true;

    var buttons = optionsBox.querySelectorAll('.quiz-option');
    Array.prototype.forEach.call(buttons, function (b) { b.disabled = true; });

    if (isCorrect) {
      btn.classList.add('is-correct');
      this.score += 1;
      feedback.className = 'quiz-feedback ok show';
      feedback.innerHTML = '<strong>Richtig.</strong> ' + (q.explainOk || '');
    } else {
      btn.classList.add('is-wrong');
      var correctBtn = optionsBox.querySelector('.quiz-option[data-origIdx="' + q.correct + '"]');
      if (correctBtn) correctBtn.classList.add('is-correct');
      feedback.className = 'quiz-feedback err show';
      feedback.innerHTML = '<strong>Nicht ganz.</strong> ' + (q.explainErr || '');
    }

    this.updateProgress();
    this.nextBtn.classList.add('show');
    this.nextBtn.focus();
  };

  Quiz.prototype.updateProgress = function () {
    var prog = this.root.querySelector('.quiz-progress');
    if (prog) {
      prog.textContent = 'Aufgabe ' + (this.index + 1) + '/' + this.order.length +
        ' \u00B7 ' + this.score + ' richtig';
    }
  };

  Quiz.prototype.summary = function () {
    var total = this.order.length;
    var s = this.score;
    var msg;
    if (s === total) {
      msg = 'Perfekt! Das sitzt. Nächste Lektion kann kommen.';
    } else if (s >= Math.ceil(total * 0.7)) {
      msg = 'Solide! Schau dir die verpassten Aufgaben noch einmal an.';
    } else {
      msg = 'Kein Problem – lies den Beispielteil noch einmal und versuch es gleich erneut.';
    }
    this.root.innerHTML =
      '<div class="quiz-header"><span>' + this.data.title + '</span><span>Abschluss</span></div>' +
      '<div class="quiz-summary">' +
      '<div class="score-line">' + s + ' von ' + total + ' richtig.</div>' +
      '<p>' + msg + '</p>' +
      '<button class="quiz-next show">Nochmal üben</button>' +
      '</div>';
    var self = this;
    this.root.querySelector('.quiz-next').addEventListener('click', function () {
      self.order = shuffle(self.order);
      self.index = 0;
      self.score = 0;
      self.answered = false;
      self.render();
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-quiz]').forEach(function (container) {
      var name = container.getAttribute('data-quiz');
      var script = document.querySelector('script[type="application/json"][data-for="' + name + '"]');
      if (!script) return;
      try {
        new Quiz(container, JSON.parse(script.textContent));
      } catch (e) {
        console.error('Quiz "' + name + '" konnte nicht geladen werden:', e);
      }
    });
  });
})();
