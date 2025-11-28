const LOG_KEY = "acidRainLogs"; // localStorage에 저장할 키

function logEvent(type, data = {}) {
    const payload = {
        type,                 // "page_enter", "game_start", "game_end" 같은 이벤트 이름
        time: new Date().toISOString(),
        ...data
    };

    console.log("[ACID-RAIN-LOG]", payload);

    try {
        const prev = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
        prev.push(payload);
        localStorage.setItem(LOG_KEY, JSON.stringify(prev));
    } catch (e) {
        console.error("log 저장 실패", e);
    }
}

let WORDS = [];

const difficultyConfig = {
    easy: { spawnInterval: 2200, speedMultiplier: 0.8, maxWords: 3 },
    normal: { spawnInterval: 1800, speedMultiplier: 1.0, maxWords: 4 },
    hard: { spawnInterval: 1400, speedMultiplier: 1.2, maxWords: 5 }
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

// 새로 추가: 맞춘 사자성어 표시용
let currentIdiomEl;
let currentMeaningEl;

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

function updateHearts() {
    if (!lifeHeartsEl) return;
    if (lives < 0) lives = 0;
    lifeHeartsEl.textContent = "♥".repeat(lives);
}

function spawnWord() {
    if (!isRunning) return;
    if (activeWords.length >= diffConf.maxWords) return;
    if (!WORDS || WORDS.length === 0) return;

    const item = WORDS[Math.floor(Math.random() * WORDS.length)];

    const el = document.createElement("div");
    el.className = "falling-word";
    el.dataset.idiom = item.idiom;
    el.dataset.hanja = item.hanja;
    el.dataset.meaning = item.meaning;

    // 실제로 화면에 보이는 건 간단한 뜻
    el.textContent = item.meaning;

    const x = Math.random() * (fallingArea.clientWidth - 120);

    el.style.left = `${x}px`;
    el.style.top = `-40px`;

    fallingArea.appendChild(el);

    activeWords.push({
        idiom: item.idiom,
        hanja: item.hanja,
        meaning: item.meaning,
        el,
        x,
        y: -40,
        speed: 30 * diffConf.speedMultiplier
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

// 맞춘 사자성어 + 한자 + 뜻 표시
function showIdiomInfo(word) {
    if (!currentIdiomEl || !currentMeaningEl) return;
    currentIdiomEl.textContent = `${word.idiom} (${word.hanja})`;
    currentMeaningEl.textContent = word.meaning;
}

function renderWrongTable() {
    wrongTableBody.innerHTML = "";

    if (wrongAnswers.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 4; // 사자성어/한자/뜻/내 답
        td.textContent = "오답 없음";
        tr.appendChild(td);
        wrongTableBody.appendChild(tr);
        return;
    }

    for (let i = 0; i < wrongAnswers.length; i++) {
        const w = wrongAnswers[i];
        const tr = document.createElement("tr");

        const idiomTd = document.createElement("td");
        idiomTd.textContent = w.idiom;

        const hanjaTd = document.createElement("td");
        hanjaTd.textContent = w.hanja;

        const meaningTd = document.createElement("td");
        meaningTd.textContent = w.meaning;

        const userTd = document.createElement("td");
        userTd.textContent = w.user;

        tr.appendChild(idiomTd);
        tr.appendChild(hanjaTd);
        tr.appendChild(meaningTd);
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
        // 사자성어(한글)로 비교
        if (activeWords[i].idiom === value) {
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

        // 맞춘 사자성어 정보 표시
        showIdiomInfo(obj);
    } else {
        // 틀린 경우: 화면에 떠 있는 단어 중 하나와 매칭해서 저장
        if (activeWords.length > 0) {
            const target = activeWords[0];
            wrongAnswers.push({
                idiom: target.idiom,
                hanja: target.hanja,
                meaning: target.meaning,
                user: value
            });
        } else {
            wrongAnswers.push({
                idiom: "-",
                hanja: "-",
                meaning: "-",
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

    logEvent("game_end", {
        score,
        bestScore,
        remainingTime,
        wrongCount: wrongAnswers.length,
        difficulty: difficultyKey,
        totalTime
    });

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

    logEvent("game_start", {
        difficulty: difficultyKey,
        totalTime
    });
}

document.addEventListener("DOMContentLoaded", function () {
    logEvent("page_enter");

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

    // 맞춘 사자성어 정보 표시 영역 (없으면 null이라 그냥 무시됨)
    currentIdiomEl = document.getElementById("current-idiom");
    currentMeaningEl = document.getElementById("current-meaning");

    fetch("assets/words.json")
        .then(res => res.json())
        .then(data => {
            WORDS = data;
            startGame();   // 단어 로드된 뒤 게임 시작
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
            window.location.href = "index.html";
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
            window.location.href = "index.html";
        });
    }

    // 시작 시 하트/베스트 스코어 UI만 맞춰두고 싶으면 여기서도 호출 가능
    updateHearts();
});