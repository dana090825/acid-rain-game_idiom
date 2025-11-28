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

    const infoBtn = document.getElementById("infoBtn");
    const infoModal = document.getElementById("infoModal");
    const infoOverlay = document.getElementById("infoOverlay");
    const infoClose = document.getElementById("infoClose");

    const openModal = () => {
        infoModal.classList.add("open");
    };

    const closeModal = () => {
        infoModal.classList.remove("open");
    };

    infoBtn.addEventListener("click", openModal);
    infoClose.addEventListener("click", closeModal);
    infoOverlay.addEventListener("click", closeModal);

    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && infoModal.classList.contains("open")) {
            closeModal();
        }
    });
});
