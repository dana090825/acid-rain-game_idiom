let WORDS = [];

const difficultyConfig = {
    easy: { spawnInterval: 1600, speedMultiplier: 0.8, maxWords: 3 },
    normal: { spawnInterval: 1200, speedMultiplier: 1, maxWords: 4 },
    hard: { spawnInterval: 800, speedMultiplier: 1.3, maxWords: 5 }
};

let fallingArea;
let timeRemainingEl;
let currentScoreEl;
let bestScoreEl;
let answerInput;
let submitBtn;

let modalOverlay;
let modalScoreEl;
let modalBestScoreEl;
let restartBtn;
let quitBtn;
let resultModal;
let wrongModal;
let wrongTableBody;
let openWrongBtn;
let wrongBackBtn;
let lifeHeartsEl;

let activeWords = [];
let wrongAnswers = [];
let totalTime = 60;
let remainingTime = 60;

let score = 0;
let bestScore = 0;
let lives = 5;
let isRunning = false;
let animId = null;
let timerId = null;
let spawnIntervalId = null;
let difficultyKey = "normal";
let diffConf = difficultyConfig.normal;

function loadSettings() {
    const storedTime = parseInt(localStorage.getItem("acidRainGameTime"), 10);
    if (!isNaN(storedTime) && storedTime > 0) {
        totalTime = storedTime;
    } else {
        totalTime = 60;
    }

    const storedDiff = localStorage.getItem("acidRainDifficulty");
    if (storedDiff && difficultyConfig[storedDiff]) {
        difficultyKey = storedDiff;
    } else {
        difficultyKey = "normal";
    }
    diffConf = difficultyConfig[difficultyKey];
}

function loadBestScore() {
    const saved = localStorage.getItem("acidRainBestScore");
    bestScore = saved ? parseInt(saved, 10) : 0;
    bestScoreEl.textContent = bestScore;
}

function saveBestScore() {
    localStorage.setItem("acidRainBestScore", bestScore.toString());
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateHearts() {
    if (!lifeHeartsEl) return;
    if (lives < 0) lives = 0;
    lifeHeartsEl.textContent = "♥".repeat(lives);
}

function spawnWord() {
    if (!isRunning) return;
    if (activeWords.length >= diffConf.maxWords) return;

    const idx = Math.floor(Math.random() * WORDS.length);
    const wordObj = WORDS[idx];

    const span = document.createElement("span");
    span.className = "falling-word jp-text";
    span.textContent = wordObj.jp;

    const len = wordObj.jp.length;
    const fontSize = 26 + (4 - len) * 2;
    span.style.fontSize = fontSize + "px";

    const areaWidth = fallingArea.clientWidth;
    const approxWidth = fontSize * len;
    const maxX = Math.max(areaWidth - approxWidth - 20, 0);
    const x = randomInt(10, maxX > 10 ? maxX : 10);

    span.style.left = x + "px";
    span.style.top = "-40px";

    fallingArea.appendChild(span);

    const baseSpeed = fontSize * 0.05;
    const speed = baseSpeed * diffConf.speedMultiplier;

    activeWords.push({
        el: span,
        word: wordObj,
        x: x,
        y: -40,
        speed: speed
    });
}

function step() {
    if (!isRunning) return;

    const areaHeight = fallingArea.clientHeight;

    for (let i = activeWords.length - 1; i >= 0; i--) {
        const obj = activeWords[i];
        obj.y += obj.speed;
        obj.el.style.top = obj.y + "px";

        if (obj.y > areaHeight) {
            if (obj.el.parentNode === fallingArea) {
                fallingArea.removeChild(obj.el);
            }
            activeWords.splice(i, 1);

            lives -= 1;
            updateHearts();
            if (lives <= 0) {
                endGame();
                return;
            }
        }
    }

    animId = requestAnimationFrame(step);
}

function clearActiveWords() {
    for (let i = 0; i < activeWords.length; i++) {
        if (activeWords[i].el.parentNode === fallingArea) {
            fallingArea.removeChild(activeWords[i].el);
        }
    }
    activeWords = [];
}

function renderWrongTable() {
    wrongTableBody.innerHTML = "";

    if (wrongAnswers.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 3;
        td.textContent = "오답 없음";
        tr.appendChild(td);
        wrongTableBody.appendChild(tr);
        return;
    }

    for (let i = 0; i < wrongAnswers.length; i++) {
        const w = wrongAnswers[i];
        const tr = document.createElement("tr");

        const jpTd = document.createElement("td");
        jpTd.textContent = w.jp;

        const krTd = document.createElement("td");
        krTd.textContent = w.kr;

        const userTd = document.createElement("td");
        userTd.textContent = w.user;

        tr.appendChild(jpTd);
        tr.appendChild(krTd);
        tr.appendChild(userTd);

        wrongTableBody.appendChild(tr);
    }
}

function checkAnswer() {
    if (!isRunning) return;
    const value = answerInput.value.trim();
    if (value === "") return;

    let foundIndex = -1;
    for (let i = 0; i < activeWords.length; i++) {
        if (activeWords[i].word.kr === value) {
            foundIndex = i;
            break;
        }
    }

    if (foundIndex !== -1) {
        const obj = activeWords[foundIndex];
        if (obj.el.parentNode === fallingArea) {
            fallingArea.removeChild(obj.el);
        }
        activeWords.splice(foundIndex, 1);

        score += 1;
        currentScoreEl.textContent = score;

        if (score > bestScore) {
            bestScore = score;
            bestScoreEl.textContent = bestScore;
            saveBestScore();
        }
    } else {
        if (activeWords.length > 0) {
            const target = activeWords[0];
            wrongAnswers.push({
                jp: target.word.jp,
                kr: target.word.kr,
                user: value
            });
        } else {
            wrongAnswers.push({
                jp: "-",
                kr: "-",
                user: value
            });
        }
    }

    answerInput.value = "";
}

function startTimer() {
    if (timerId) clearInterval(timerId);

    timerId = setInterval(function () {
        remainingTime -= 1;
        timeRemainingEl.textContent = remainingTime;

        if (remainingTime <= 0) {
            endGame();
        }
    }, 1000);
}

function showModal() {
    modalScoreEl.textContent = score;
    modalBestScoreEl.textContent = bestScore;

    renderWrongTable();

    resultModal.classList.remove("hidden");
    wrongModal.classList.add("hidden");
    modalOverlay.classList.remove("hidden");
}

function endGame() {
    if (!isRunning) return;
    isRunning = false;

    clearInterval(timerId);
    clearInterval(spawnIntervalId);
    cancelAnimationFrame(animId);

    answerInput.blur();
    showModal();
}

function startGame() {
    if (animId) cancelAnimationFrame(animId);
    if (timerId) clearInterval(timerId);
    if (spawnIntervalId) clearInterval(spawnIntervalId);

    clearActiveWords();
    wrongAnswers = [];

    loadSettings();
    loadBestScore();

    remainingTime = totalTime;
    timeRemainingEl.textContent = remainingTime;

    score = 0;
    currentScoreEl.textContent = score;

    lives = 5;
    updateHearts();

    isRunning = true;
    answerInput.value = "";
    answerInput.focus();

    spawnWord();
    spawnWord();

    spawnIntervalId = setInterval(spawnWord, diffConf.spawnInterval);
    startTimer();
    step();
}

document.addEventListener("DOMContentLoaded", function () {
    fallingArea = document.getElementById("falling-area");
    timeRemainingEl = document.getElementById("time-remaining");
    currentScoreEl = document.getElementById("current-score");
    bestScoreEl = document.getElementById("best-score");
    answerInput = document.getElementById("answer-input");
    submitBtn = document.getElementById("submit-answer");

    modalOverlay = document.getElementById("game-modal-overlay");
    modalScoreEl = document.getElementById("modal-score");
    modalBestScoreEl = document.getElementById("modal-best-score");

    resultModal = document.getElementById("result-modal");
    wrongModal = document.getElementById("wrong-modal");
    wrongTableBody = document.getElementById("wrong-table-body");

    openWrongBtn = document.getElementById("open-wrong-btn");
    wrongBackBtn = document.getElementById("wrong-back-btn");

    restartBtn = document.getElementById("restart-btn");
    quitBtn = document.getElementById("quit-btn");
    lifeHeartsEl = document.getElementById("life-hearts");

    const exitBtn = document.getElementById("exit-btn");

    fetch("../assets/words.json")
        .then(res => res.json())
        .then(data => {
            WORDS = data;
            startGame();   // ★ 단어 로드된 뒤 게임 시작
        });

    if (submitBtn) {
        submitBtn.addEventListener("click", checkAnswer);
    }
    if (answerInput) {
        answerInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                checkAnswer();
            }
        });
    }

    if (exitBtn) {
        exitBtn.addEventListener("click", function () {
            window.location.href = "../index.html";
        });
    }

    if (openWrongBtn) {
        openWrongBtn.addEventListener("click", function () {
            if (!wrongModal || !resultModal) return;
            resultModal.classList.add("hidden");
            wrongModal.classList.remove("hidden");
        });
    }

    if (wrongBackBtn) {
        wrongBackBtn.addEventListener("click", function () {
            if (!wrongModal || !resultModal) return;
            wrongModal.classList.add("hidden");
            resultModal.classList.remove("hidden");
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener("click", function () {
            if (modalOverlay) modalOverlay.classList.add("hidden");
            startGame();
        });
    }

    if (quitBtn) {
        quitBtn.addEventListener("click", function () {
            window.location.href = "../index.html";
        });
    }

    loadSettings();
    loadBestScore();
    updateHearts();
    startGame();
});
