"use strict";

const lexicalWordsContainingNo = new Set([
  "日の出",
  "日の入り",
  "絵の具",
  "のり",
  "のこぎり",
  "いのしし",
  "なまけもの",
  "菜の花",
  "木の実",
  "きのこ",
  "えのき",
]);

const descriptivePhraseStart =
  /^(赤い|青い|白い|黒い|黄色い|小さな|大きな|古い|新しい|静かな|見知らぬ)/;
const descriptivePhrases = new Set(["寝る前", "起きた直後"]);
const initialNames = [
  "友だち",
  "岡山",
  "図書館",
  "夕立",
  "鉛筆",
  "らくだ",
  "わさび",
  "特急",
  "出会い",
];

const grid = document.querySelector("#seed-grid");
const makeButton = document.querySelector("#make-button");
const buttonLabel = document.querySelector("#button-label");
const announcement = document.querySelector("#announcement");
const loadError = document.querySelector("#load-error");
const tooltip = document.querySelector("#meaning-tooltip");
const meaningText = document.querySelector("#meaning-text");

let words = [];
let categories = [];
let reels = [];
let cells = [];
let wordButtons = [];
let pinButtons = [];
let cellBackButtons = [];
let cellForwardButtons = [];
let pinned = [];
let isSpinning = false;
let openIndex = null;
let cellHistories = [];
let cellHistoryIndexes = [];
const MAX_CELL_HISTORY = 4; // 現在＋3つ前まで

function initializeCellHistories() {
  cellHistories = reels.map((reel) => [reel.current]);
  cellHistoryIndexes = reels.map(() => 0);
}

function pushCellHistory(index, item) {
  let history = cellHistories[index] || [];
  let pointer = cellHistoryIndexes[index] ?? -1;

  // 戻った状態から新しい言葉を出した場合は、その先の履歴を捨てる。
  if (pointer < history.length - 1) {
    history = history.slice(0, pointer + 1);
  }

  history.push(item);
  if (history.length > MAX_CELL_HISTORY) history.shift();
  cellHistories[index] = history;
  cellHistoryIndexes[index] = history.length - 1;
  updateCellHistoryControls(index);
}

function restoreCellHistory(index, direction) {
  if (isSpinning) return;
  const history = cellHistories[index] || [];
  const nextPointer = (cellHistoryIndexes[index] ?? 0) + direction;
  if (nextPointer < 0 || nextPointer >= history.length) return;

  hideMeaning();
  cellHistoryIndexes[index] = nextPointer;
  const item = history[nextPointer];
  reels[index] = { previous: item, current: item };
  renderReel(index, false, 0);
  updatePinButton(index);
  updateCellHistoryControls(index);
  announcement.textContent = `${item.word}に${direction < 0 ? "戻しました" : "進めました"}。`;
}

function updateCellHistoryControls(index) {
  const history = cellHistories[index] || [];
  const pointer = cellHistoryIndexes[index] ?? 0;
  const backButton = cellBackButtons[index];
  const forwardButton = cellForwardButtons[index];
  if (!backButton || !forwardButton) return;

  const canGoBack = !isSpinning && pointer > 0;
  const canGoForward = !isSpinning && pointer < history.length - 1;
  backButton.hidden = !canGoBack;
  backButton.disabled = !canGoBack;
  forwardButton.hidden = !canGoForward;
  forwardButton.disabled = !canGoForward;
}

function updateAllCellHistoryControls() {
  reels.forEach((_, index) => updateCellHistoryControls(index));
}

function isStandaloneWord(item) {
  const hasJoinedNouns =
    item.word.includes("の") && !lexicalWordsContainingNo.has(item.word);
  return (
    !hasJoinedNouns &&
    !descriptivePhraseStart.test(item.word) &&
    !descriptivePhrases.has(item.word)
  );
}

function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function randomFrom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function initialWords() {
  return categories.map((category, index) => {
    return (
      words.find(
        (item) =>
          item.word === initialNames[index] && item.category === category,
      ) || words.find((item) => item.category === category)
    );
  });
}

function createFinalWords() {
  const pinnedCategories = new Set(
    reels
      .filter((_, index) => pinned[index])
      .map((reel) => reel.current.category),
  );
  const availableCategories = categories.filter(
    (category) => !pinnedCategories.has(category),
  );

  const chance = Math.random();
  const rareCount =
    availableCategories.length === 0
      ? 0
      : chance < 0.8
        ? 0
        : chance < 0.95
          ? 1
          : Math.min(2, availableCategories.length);
  const rareCategories = new Set(
    shuffled(availableCategories).slice(0, rareCount),
  );

  const selected = shuffled(
    availableCategories.map((category) => {
      const shouldBeRare = rareCategories.has(category);
      let pool = words.filter(
        (item) => item.category === category && item.rare === shouldBeRare,
      );
      if (pool.length === 0) {
        pool = words.filter((item) => item.category === category);
      }
      return randomFrom(pool);
    }),
  );

  const finalWords = Array(reels.length).fill(null);
  let nextIndex = 0;
  reels.forEach((reel, index) => {
    if (pinned[index]) finalWords[index] = reel.current;
    else {
      finalWords[index] = selected[nextIndex];
      nextIndex += 1;
    }
  });
  return finalWords;
}

function fitText(element, maxSize, minSize) {
  const parent = element.parentElement;
  if (!parent || parent.clientWidth === 0) return;

  const available = Math.max(24, parent.clientWidth - 14);
  const characterCount = Math.max(1, Array.from(element.textContent || "").length);
  const calculatedSize = Math.floor((available - 2) / (characterCount * 1.08));
  const size = Math.max(minSize, Math.min(maxSize, calculatedSize));

  element.style.fontSize = `${size}px`;
  element.style.transform = "scaleX(1)";
  element.style.width = "max-content";
  const measuredWidth = element.scrollWidth;
  if (measuredWidth > available) {
    element.style.transform = `scaleX(${(available - 2) / measuredWidth})`;
  }
}

function fitAllText(scope = document) {
  scope.querySelectorAll(".word").forEach((element) => fitText(element, 34, 8));
  scope
    .querySelectorAll(".reading")
    .forEach((element) => fitText(element, 16, 7));
}

function createWordFace(item, hidden = false) {
  const face = document.createElement("span");
  face.className = "reel-face";
  if (hidden) face.setAttribute("aria-hidden", "true");

  const wordLine = document.createElement("span");
  wordLine.className = "word-line";
  const word = document.createElement("span");
  word.className = "word";
  word.textContent = item.word || "―";
  wordLine.append(word);

  const readingLine = document.createElement("span");
  readingLine.className = "reading-line";
  const reading = document.createElement("span");
  reading.className = "reading";
  reading.textContent = `（${item.reading}）`;
  readingLine.append(reading);

  face.append(wordLine, readingLine);
  return face;
}

function renderReel(index, moving = false, duration = 0) {
  const cell = cells[index];
  const wordButton = wordButtons[index];
  const reel = reels[index];
  wordButton.replaceChildren();
  wordButton.setAttribute(
    "aria-label",
    `${reel.current.word}、${reel.current.reading}。意味を見る`,
  );

  const reelWindow = document.createElement("span");
  reelWindow.className = "reel-window";
  const track = document.createElement("span");
  track.className = "reel-track";
  track.style.animationDuration = `${duration}ms`;
  track.append(
    createWordFace(reel.previous, true),
    createWordFace(reel.current),
  );
  reelWindow.append(track);
  wordButton.append(reelWindow);

  requestAnimationFrame(() => {
    fitAllText(cell);
    if (moving) track.classList.add("is-moving");
  });
}

function updateReel(index, nextWord, duration, moving = true) {
  reels[index] = {
    previous: reels[index].current,
    current: nextWord,
  };
  renderReel(index, moving, duration);
}

function placeTooltip(anchor) {
  const rect = anchor.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const left = Math.min(
    window.innerWidth - tooltipRect.width - 12,
    Math.max(12, rect.left + rect.width / 2 - tooltipRect.width / 2),
  );
  const above = rect.top - tooltipRect.height - 10;
  const top = above >= 10 ? above : rect.bottom + 10;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function showMeaning(index) {
  if (isSpinning) return;
  openIndex = index;
  meaningText.textContent = reels[index].current.meaning;
  tooltip.hidden = false;
  placeTooltip(cells[index]);
}

function hideMeaning(index = null) {
  if (index !== null && openIndex !== index) return;
  openIndex = null;
  tooltip.hidden = true;
}

function updatePinButton(index) {
  const isPinned = pinned[index];
  const cell = cells[index];
  const pinButton = pinButtons[index];
  cell.classList.toggle("is-pinned", isPinned);
  pinButton.classList.toggle("is-pinned", isPinned);
  pinButton.setAttribute("aria-pressed", String(isPinned));
  pinButton.setAttribute(
    "aria-label",
    isPinned
      ? `${reels[index].current.word}のピン止めを解除`
      : `${reels[index].current.word}をピン止め`,
  );
  pinButton.textContent = isPinned ? "固定中" : "ピン";
}

function togglePin(index) {
  if (isSpinning) return;
  hideMeaning();
  pinned[index] = !pinned[index];
  updatePinButton(index);
  updateMakeButtonState();
  announcement.textContent = pinned[index]
    ? `${reels[index].current.word}をピン止めしました。`
    : `${reels[index].current.word}のピン止めを解除しました。`;
}

function createCells() {
  cells = reels.map((_, index) => {
    const cell = document.createElement("div");
    cell.className = "seed-cell";

    const wordButton = document.createElement("button");
    wordButton.type = "button";
    wordButton.className = "word-button";
    wordButton.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") showMeaning(index);
    });
    wordButton.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") hideMeaning(index);
    });
    wordButton.addEventListener("focus", () => {
      requestAnimationFrame(() => {
        if (wordButton.matches(":focus-visible")) showMeaning(index);
      });
    });
    wordButton.addEventListener("blur", () => hideMeaning(index));
    wordButton.addEventListener("click", () => {
      if (openIndex === index) hideMeaning(index);
      else showMeaning(index);
    });

    const pinButton = document.createElement("button");
    pinButton.type = "button";
    pinButton.className = "pin-button";
    pinButton.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePin(index);
    });

    const historyNav = document.createElement("div");
    historyNav.className = "cell-history-nav";

    const cellBackButton = document.createElement("button");
    cellBackButton.type = "button";
    cellBackButton.className = "cell-history-button cell-back-button";
    cellBackButton.textContent = "↶";
    cellBackButton.hidden = true;
    cellBackButton.setAttribute("aria-label", "このマスだけ1つ前のことばに戻す");
    cellBackButton.addEventListener("click", (event) => {
      event.stopPropagation();
      restoreCellHistory(index, -1);
    });

    const cellForwardButton = document.createElement("button");
    cellForwardButton.type = "button";
    cellForwardButton.className = "cell-history-button cell-forward-button";
    cellForwardButton.textContent = "↷";
    cellForwardButton.hidden = true;
    cellForwardButton.setAttribute("aria-label", "このマスだけ1つ新しいことばに進める");
    cellForwardButton.addEventListener("click", (event) => {
      event.stopPropagation();
      restoreCellHistory(index, 1);
    });

    historyNav.append(cellBackButton, cellForwardButton);
    cell.append(wordButton, pinButton, historyNav);
    grid.append(cell);
    wordButtons.push(wordButton);
    pinButtons.push(pinButton);
    cellBackButtons.push(cellBackButton);
    cellForwardButtons.push(cellForwardButton);
    return cell;
  });

  reels.forEach((_, index) => {
    renderReel(index);
    updatePinButton(index);
    updateCellHistoryControls(index);
  });
}

function updateMakeButtonState() {
  const allPinned = pinned.length > 0 && pinned.every(Boolean);
  makeButton.disabled = isSpinning || allPinned;
  if (isSpinning) buttonLabel.textContent = "ことばを選んでいます…";
  else if (allPinned) buttonLabel.textContent = "9つすべて固定中";
  else buttonLabel.textContent = "物語の種をつくる";
}

function setSpinning(spinning) {
  isSpinning = spinning;
  grid.classList.toggle("is-spinning", spinning);
  grid.setAttribute("aria-busy", String(spinning));
  wordButtons.forEach((button) => {
    button.disabled = spinning;
  });
  pinButtons.forEach((button) => {
    button.disabled = spinning;
  });
  updateMakeButtonState();
  updateAllCellHistoryControls();
}

async function makeSeeds() {
  if (isSpinning) return;

  const spinningIndexes = reels
    .map((_, index) => index)
    .filter((index) => !pinned[index]);
  if (spinningIndexes.length === 0) return;

  hideMeaning();
  setSpinning(true);
  announcement.textContent = "ピン止めしていないことばを選んでいます。";

  const finalWords = createFinalWords();
  const start = performance.now();
  const stopTimes = new Map(
    spinningIndexes.map((cellIndex, order) => [
      cellIndex,
      2200 + order * 165 + Math.random() * 260,
    ]),
  );

  await Promise.all(
    spinningIndexes.map(
      (cellIndex, order) =>
        new Promise((resolve) => {
          const finalWord = finalWords[cellIndex];
          const spinCell = () => {
            const elapsed = performance.now() - start;
            const stopAt = stopTimes.get(cellIndex);

            if (elapsed >= stopAt) {
              const landingDuration = 520;
              updateReel(cellIndex, finalWord, landingDuration);
              window.setTimeout(() => {
                renderReel(cellIndex, false, 0);
                updatePinButton(cellIndex);
                pushCellHistory(cellIndex, finalWord);
                resolve();
              }, landingDuration);
              return;
            }

            const progress = Math.min(1, elapsed / stopAt);
            const delay = 112 + Math.pow(progress, 3) * 360;
            updateReel(cellIndex, randomFrom(words), delay);
            window.setTimeout(spinCell, delay);
          };

          window.setTimeout(spinCell, order * 55);
        }),
    ),
  );

  setSpinning(false);
  announcement.textContent = `固定したことばを残して、${spinningIndexes.length}個のことばを選び直しました。`;
}

async function start() {
  try {
    const response = await fetch("words.json");
    if (!response.ok) throw new Error(`words.json: ${response.status}`);
    const wordData = await response.json();
    words = wordData.filter(isStandaloneWord);
    categories = [...new Set(words.map((item) => item.category))];
    if (categories.length !== 9) throw new Error("分類数が9ではありません。");

    reels = initialWords().map((item) => ({
      previous: item,
      current: item,
    }));
    pinned = Array(reels.length).fill(false);
    initializeCellHistories();
    createCells();
    setSpinning(false);
    announcement.textContent = "9つのことばが表示されています。";
  } catch (error) {
    console.error(error);
    grid.setAttribute("aria-busy", "false");
    loadError.hidden = false;
    buttonLabel.textContent = "読み込みに失敗しました";
  }
}

makeButton.addEventListener("click", makeSeeds);
window.addEventListener("resize", () => {
  fitAllText();
  if (openIndex !== null) placeTooltip(cells[openIndex]);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideMeaning();
});
document.fonts?.ready.then(() => fitAllText());

start();
