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
let isSpinning = false;
let openIndex = null;

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
  const chance = Math.random();
  const rareCount = chance < 0.8 ? 0 : chance < 0.95 ? 1 : 2;
  const rareCategories = new Set(shuffled(categories).slice(0, rareCount));

  return shuffled(
    categories.map((category) => {
      const shouldBeRare = rareCategories.has(category);
      const pool = words.filter(
        (item) => item.category === category && item.rare === shouldBeRare,
      );
      return randomFrom(pool);
    }),
  );
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
  const reel = reels[index];
  cell.replaceChildren();
  cell.setAttribute(
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
  cell.append(reelWindow);

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

function createCells() {
  cells = reels.map((_, index) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "seed-cell";
    cell.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") showMeaning(index);
    });
    cell.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") hideMeaning(index);
    });
    cell.addEventListener("focus", () => {
      requestAnimationFrame(() => {
        if (cell.matches(":focus-visible")) showMeaning(index);
      });
    });
    cell.addEventListener("blur", () => hideMeaning(index));
    cell.addEventListener("click", () => {
      if (openIndex === index) hideMeaning(index);
      else showMeaning(index);
    });
    grid.append(cell);
    return cell;
  });

  reels.forEach((_, index) => renderReel(index));
}

function setSpinning(spinning) {
  isSpinning = spinning;
  grid.classList.toggle("is-spinning", spinning);
  grid.setAttribute("aria-busy", String(spinning));
  makeButton.disabled = spinning;
  cells.forEach((cell) => {
    cell.disabled = spinning;
  });
  buttonLabel.textContent = spinning
    ? "ことばを選んでいます…"
    : "物語の種をつくる";
}

async function makeSeeds() {
  if (isSpinning) return;

  hideMeaning();
  setSpinning(true);
  announcement.textContent = "ことばを選んでいます。";

  const finalWords = createFinalWords();
  const start = performance.now();
  const stopTimes = finalWords.map(
    (_, index) => 2200 + index * 165 + Math.random() * 260,
  );

  await Promise.all(
    finalWords.map(
      (finalWord, cellIndex) =>
        new Promise((resolve) => {
          const spinCell = () => {
            const elapsed = performance.now() - start;
            const stopAt = stopTimes[cellIndex];

            if (elapsed >= stopAt) {
              const landingDuration = 520;
              updateReel(cellIndex, finalWord, landingDuration);
              window.setTimeout(() => {
                renderReel(cellIndex, false, 0);
                resolve();
              }, landingDuration);
              return;
            }

            const progress = Math.min(1, elapsed / stopAt);
            const delay = 112 + Math.pow(progress, 3) * 360;
            updateReel(cellIndex, randomFrom(words), delay);
            window.setTimeout(spinCell, delay);
          };

          window.setTimeout(spinCell, cellIndex * 55);
        }),
    ),
  );

  setSpinning(false);
  announcement.textContent = "新しい9つのことばが決まりました。";
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
