const DATA_FILE = "ERP_text.txt";

const els = {
  loadingState: document.querySelector("#loadingState"),
  questionCard: document.querySelector("#questionCard"),
  resultCard: document.querySelector("#resultCard"),
  questionNumber: document.querySelector("#questionNumber"),
  sourceNumber: document.querySelector("#sourceNumber"),
  questionText: document.querySelector("#questionText"),
  options: document.querySelector("#options"),
  feedback: document.querySelector("#feedback"),
  actions: document.querySelector(".actions"),
  nextButton: document.querySelector("#nextButton"),
  restartButton: document.querySelector("#restartButton"),
  retryButton: document.querySelector("#retryButton"),
  progressText: document.querySelector("#progressText"),
  scoreText: document.querySelector("#scoreText"),
  totalText: document.querySelector("#totalText"),
  progressBar: document.querySelector("#progressBar"),
  resultTitle: document.querySelector("#resultTitle"),
  resultDetail: document.querySelector("#resultDetail"),
  wrongReview: document.querySelector("#wrongReview"),
  wrongList: document.querySelector("#wrongList"),
};

let questionBank = [];
let quiz = [];
let currentIndex = 0;
let correctCount = 0;
let wrongAnswers = [];
let answered = false;

function normalizeText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\u3000/g, " ")
    .trim();
}

function cleanLine(line) {
  return line.replace(/\s+/g, " ").trim();
}

function parseQuestions(rawText) {
  const lines = normalizeText(rawText).split("\n");
  const questions = [];
  let current = null;
  let currentOption = null;

  const flush = () => {
    if (!current) return;
    const options = Object.entries(current.options).map(([key, value]) => ({
      key,
      text: cleanLine(value),
    }));

    if (current.text && options.length >= 2 && current.answer) {
      questions.push({
        id: current.id,
        text: cleanLine(current.text),
        answer: current.answer,
        options,
      });
    }
  };

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    if (!line || /^--- PAGE \d+ ---$/.test(line)) continue;
    if (/^\d+$/.test(line)) continue;
    if (line === "中華企業資源規劃學會 專業認證") continue;
    if (line === "ERP 基礎檢定考試(學科)-參考題型" || line === "ERP 基礎檢定考試(學科)-參考題型") continue;

    const questionMatch = line.match(/^\(([A-D])\)\s*(\d+)\.\s*(.*)$/);
    if (questionMatch) {
      flush();
      current = {
        answer: questionMatch[1],
        id: Number(questionMatch[2]),
        text: questionMatch[3],
        options: {},
      };
      currentOption = null;
      continue;
    }

    const optionMatch = line.match(/^\(([A-D])\)\s*(.+)$/);
    if (optionMatch && current) {
      currentOption = optionMatch[1];
      current.options[currentOption] = optionMatch[2];
      continue;
    }

    if (currentOption && current) {
      current.options[currentOption] += ` ${line}`;
    } else if (current) {
      current.text += ` ${line}`;
    }
  }

  flush();
  return questions.sort((a, b) => a.id - b.id);
}

function shuffle(items) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function startQuiz() {
  quiz = shuffle(questionBank).map((question) => ({
    ...question,
    shuffledOptions: shuffle(question.options),
  }));
  currentIndex = 0;
  correctCount = 0;
  wrongAnswers = [];
  answered = false;
  els.resultCard.hidden = true;
  els.questionCard.hidden = false;
  els.wrongReview.hidden = true;
  els.wrongList.innerHTML = "";
  renderQuestion();
}

function renderQuestion() {
  const question = quiz[currentIndex];
  answered = false;

  els.feedback.hidden = true;
  els.feedback.textContent = "";
  els.feedback.className = "feedback";
  els.nextButton.hidden = true;
  els.actions.classList.remove("is-visible");
  els.options.innerHTML = "";

  els.questionNumber.textContent = `第 ${currentIndex + 1} / ${quiz.length} 題`;
  els.sourceNumber.textContent = `原題號 ${question.id}`;
  els.questionText.textContent = question.text;

  question.shuffledOptions.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button";
    button.dataset.key = option.key;
    button.textContent = `${String.fromCharCode(65 + index)}. ${option.text}`;
    button.addEventListener("click", () => chooseAnswer(button, option));
    els.options.appendChild(button);
  });

  updateStatus();
}

function chooseAnswer(button, option) {
  if (answered) return;
  answered = true;

  const question = quiz[currentIndex];
  const correctOption = question.options.find((item) => item.key === question.answer);
  const buttons = [...els.options.querySelectorAll(".option-button")];

  buttons.forEach((item) => {
    item.disabled = true;
    if (item.dataset.key === question.answer) {
      item.classList.add("correct");
    }
  });

  if (option.key === question.answer) {
    correctCount += 1;
    els.feedback.textContent = "答對了。";
    els.feedback.classList.add("correct");
  } else {
    button.classList.add("wrong");
    wrongAnswers.push({
      id: question.id,
      text: question.text,
      selected: option.text,
      correct: correctOption.text,
    });
    els.feedback.textContent = `選到錯誤選項：${option.text}。正確選項為：${correctOption.text}`;
    els.feedback.classList.add("wrong");
  }

  els.feedback.hidden = false;
  els.nextButton.textContent = currentIndex === quiz.length - 1 ? "公布分數" : "下一題";
  els.nextButton.hidden = false;
  els.actions.classList.add("is-visible");
  updateStatus();
}

function updateStatus() {
  const answeredCount = answered ? currentIndex + 1 : currentIndex;
  els.progressText.textContent = quiz.length ? `${answeredCount} / ${quiz.length}` : "0 / 0";
  els.scoreText.textContent = String(correctCount);
  els.totalText.textContent = String(questionBank.length);
  els.progressBar.style.width = quiz.length ? `${(answeredCount / quiz.length) * 100}%` : "0%";
}

function goNext() {
  if (!answered) return;
  if (currentIndex < quiz.length - 1) {
    currentIndex += 1;
    renderQuestion();
    return;
  }
  showResult();
}

function showResult() {
  const percentage = Math.round((correctCount / quiz.length) * 100);
  els.questionCard.hidden = true;
  els.nextButton.hidden = true;
  els.actions.classList.remove("is-visible");
  els.resultCard.hidden = false;
  els.resultTitle.textContent = `${correctCount} / ${quiz.length} 分`;
  els.resultDetail.textContent = `本輪正確率 ${percentage}%`;
  els.progressText.textContent = `${quiz.length} / ${quiz.length}`;
  els.progressBar.style.width = "100%";
  renderWrongReview();
}

function renderWrongReview() {
  els.wrongList.innerHTML = "";

  if (!wrongAnswers.length) {
    els.wrongReview.hidden = false;
    const perfect = document.createElement("p");
    perfect.className = "perfect-message";
    perfect.textContent = "本輪沒有錯題。";
    els.wrongList.appendChild(perfect);
    return;
  }

  els.wrongReview.hidden = false;
  wrongAnswers.forEach((item, index) => {
    const article = document.createElement("article");
    article.className = "wrong-item";

    const title = document.createElement("h4");
    title.textContent = `${index + 1}. 原題號 ${item.id}`;

    const question = document.createElement("p");
    question.className = "wrong-question";
    question.textContent = item.text;

    const selected = document.createElement("p");
    selected.innerHTML = `<strong>你選：</strong>${escapeHtml(item.selected)}`;

    const correct = document.createElement("p");
    correct.innerHTML = `<strong>正解：</strong>${escapeHtml(item.correct)}`;

    article.append(title, question, selected, correct);
    els.wrongList.appendChild(article);
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

async function loadQuestionBank() {
  try {
    const response = await fetch(DATA_FILE, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rawText = await response.text();
    questionBank = parseQuestions(rawText);

    if (!questionBank.length) {
      throw new Error("沒有解析到題目");
    }

    els.loadingState.hidden = true;
    startQuiz();
  } catch (error) {
    els.loadingState.textContent = `題庫載入失敗：${error.message}。請確認 ${DATA_FILE} 和網頁檔案放在同一層。`;
    els.progressText.textContent = "載入失敗";
  }
}

els.nextButton.addEventListener("click", goNext);
els.restartButton.addEventListener("click", () => {
  if (questionBank.length) startQuiz();
});
els.retryButton.addEventListener("click", startQuiz);

loadQuestionBank();
