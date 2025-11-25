function startGame() {
    window.location.href = "./game.html";
    timeRemainingEl.textContent = remainingTime;
}

document.addEventListener("DOMContentLoaded", function () {
    const timeInput = document.getElementById("game-time-input");
    const diffSelect = document.getElementById("difficulty-select");
    const startBtn = document.getElementById("start-btn");

    startBtn.addEventListener("click", function () {
        const time = parseInt(timeInput.value, 10);
        const diff = diffSelect.value;

        localStorage.setItem("acidRainGameTime", time);
        localStorage.setItem("acidRainDifficulty", diff);

        window.location.href = "./game.html";
    });
});
