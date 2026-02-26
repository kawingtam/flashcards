/**
 * Elder-friendly Flashcards (ZH ↔ EN)
 * - Chinese UI
 * - Wizard flow: (1) single/multi -> (2) choose sets -> (3) choose direction -> start
 * - Single-column selection boxes
 * - Always shuffle/randomize
 * - Tap to flip, swipe up to next (no flip required)
 * - Speak for both languages (Web Speech API)
 */

const state = {
  sets: [],
  mode: null, // "single" | "multi"
  selectedSetIds: new Set(),
  direction: null, // "zh-first" | "en-first"

  sessionCards: [],
  sessionIndex: 0,
  flipped: false,

  touchStartY: null,
  voices: [],
};

const el = {};
function $(id){ return document.getElementById(id); }

document.addEventListener("DOMContentLoaded", async () => {
  // Setup view
  el.viewSetup = $("viewSetup");
  el.step1 = $("step1");
  el.step2 = $("step2");
  el.step3 = $("step3");

  el.btnHome = $("btnHome");

  el.btnModeSingle = $("btnModeSingle");
  el.btnModeMulti = $("btnModeMulti");
  el.btnStep1Next = $("btnStep1Next");

  el.modeHint = $("modeHint");
  el.setList = $("setList");
  el.btnStep2Back = $("btnStep2Back");
  el.btnStep2Next = $("btnStep2Next");

  el.btnDirZhFirst = $("btnDirZhFirst");
  el.btnDirEnFirst = $("btnDirEnFirst");
  el.btnStep3Back = $("btnStep3Back");
  el.btnStart = $("btnStart");

  // Practice view
  el.viewPractice = $("viewPractice");
  el.progressText = $("progressText");
  el.setNamesText = $("setNamesText");

  el.card = $("card");
  el.frontText = $("frontText");
  el.backText = $("backText");
  el.frontLangBadge = $("frontLangBadge");
  el.backLangBadge = $("backLangBadge");

  el.btnSpeak = $("btnSpeak");
  el.btnFlip = $("btnFlip");
  el.btnNext = $("btnNext");

  el.doneBox = $("doneBox");
  el.btnRestart = $("btnRestart");
  el.btnBackToSets = $("btnBackToSets");

  // ✅ 先綁事件（避免資料讀取失敗就整個死掉）
  initVoices();

  el.btnHome.addEventListener("click", goHome);

  el.btnModeSingle.addEventListener("click", () => chooseMode("single"));
  el.btnModeMulti.addEventListener("click", () => chooseMode("multi"));
  el.btnStep1Next.addEventListener("click", () => goStep(2));

  el.btnStep2Back.addEventListener("click", () => goStep(1));
  el.btnStep2Next.addEventListener("click", () => goStep(3));

  el.btnDirZhFirst.addEventListener("click", () => chooseDirection("zh-first"));
  el.btnDirEnFirst.addEventListener("click", () => chooseDirection("en-first"));
  el.btnStep3Back.addEventListener("click", () => goStep(2));
  el.btnStart.addEventListener("click", startPractice);

  el.card.addEventListener("click", flipCard);

  el.card.addEventListener("touchstart", (e) => {
    if (!e.touches?.length) return;
    state.touchStartY = e.touches[0].clientY;
  }, { passive: true });

  el.card.addEventListener("touchend", (e) => {
    if (state.touchStartY == null) return;
    const endY = e.changedTouches?.[0]?.clientY;
    if (endY == null) return;
    const dy = endY - state.touchStartY;
    state.touchStartY = null;
    if (dy < -60) nextCard();
  }, { passive: true });

  el.btnFlip.addEventListener("click", flipCard);
  el.btnNext.addEventListener("click", nextCard);
  el.btnSpeak.addEventListener("click", (e) => {
  e.stopPropagation();
  speakVisibleSide();
});

  el.btnRestart.addEventListener("click", () => {
    state.sessionIndex = 0;
    setFlipped(false);
    el.doneBox.classList.add("hidden");
    showCard();
  });

  el.btnBackToSets.addEventListener("click", goHome);

  // ✅ 先顯示第一步（就算資料還沒載入也可以操作）
  goStep(1);
  updateStepButtons();

  // ✅ 最後再載入 sets.json；失敗也不會讓整個頁面失效
  try {
    await loadSets("./data/sets.json");
  } catch (err) {
    console.error(err);
    alert("⚠️ 無法讀取 data/sets.json。\n請確認檔案存在於 flashcards/data/sets.json，並用 http://localhost:8000 開啟。");
    state.sets = [];
  }
});

/* -------------------- Data -------------------- */

async function loadSets(url){
  const res = await fetch(url);
  if (!res.ok) throw new Error(`無法載入：${url}`);
  const json = await res.json();
  state.sets = normalizeSets(json.sets || []);
}

function normalizeSets(sets){
  return sets
    .filter(s => s && Array.isArray(s.cards))
    .map((s, idx) => ({
      id: String(s.id ?? `set${idx + 1}`),
      name: String(s.name ?? `第 ${idx + 1} 組`),
      cards: s.cards
        .map(c => ({
          zh: String(c.zh ?? c.chinese ?? "").trim(),
          en: String(c.en ?? c.english ?? "").trim(),
        }))
        .filter(c => c.zh && c.en),
    }))
    .filter(s => s.cards.length > 0);
}

/* -------------------- Wizard flow -------------------- */

function goStep(n){
  show(el.viewSetup);
  hide(el.viewPractice);

  if (n === 1){
    show(el.step1); hide(el.step2); hide(el.step3);
  } else if (n === 2){
    hide(el.step1); show(el.step2); hide(el.step3);
    renderSetList();
  } else {
    hide(el.step1); hide(el.step2); show(el.step3);
  }
  updateStepButtons();
}

function chooseMode(mode){
  state.mode = mode;
  state.selectedSetIds.clear(); // 重新選
  state.direction = null;

  // Visual feedback (simple)
  setActiveChoice(el.btnModeSingle, mode === "single");
  setActiveChoice(el.btnModeMulti, mode === "multi");

  el.btnStep1Next.disabled = false;
  updateStepButtons();
}

function setActiveChoice(button, on){
  if (!button) return;
  button.style.outline = on ? "3px solid rgba(37,99,235,0.35)" : "none";
}

function renderSetList(){
  el.setList.innerHTML = "";

  el.modeHint.textContent =
    state.mode === "single"
      ? "提示：只可以選 1 組。"
      : "提示：可以選多組（例如第 1 組 + 第 3 組）。";

  state.sets.forEach((set) => {
    const wrap = document.createElement("div");
    wrap.className = "setItem";

    const inputType = (state.mode === "single") ? "radio" : "checkbox";
    const checked = state.selectedSetIds.has(set.id);

    wrap.innerHTML = `
      <label>
        <input type="${inputType}" name="setPick" data-setid="${escapeHtml(set.id)}" ${checked ? "checked" : ""}/>
        <div>
          <strong>${escapeHtml(set.name)}</strong>
          <div class="meta">${set.cards.length} 張單字卡</div>
        </div>
      </label>
    `;

    const input = wrap.querySelector("input");
    input.addEventListener("change", () => {
      const id = input.dataset.setid;

      if (state.mode === "single"){
        state.selectedSetIds.clear();
        state.selectedSetIds.add(id);
        // rerender to uncheck others (radio group will handle, but keep state consistent)
        renderSetList();
      } else {
        if (input.checked) state.selectedSetIds.add(id);
        else state.selectedSetIds.delete(id);
      }
      updateStepButtons();
    });

    el.setList.appendChild(wrap);
  });
}

function chooseDirection(dir){
  state.direction = dir;
  setActiveChoice(el.btnDirZhFirst, dir === "zh-first");
  setActiveChoice(el.btnDirEnFirst, dir === "en-first");
  updateStepButtons();
}

function updateStepButtons(){
  // Step2 next enabled when at least one set selected
  if (el.btnStep2Next) el.btnStep2Next.disabled = state.selectedSetIds.size === 0;

  // Start enabled when direction chosen + set chosen
  if (el.btnStart) el.btnStart.disabled = !(state.selectedSetIds.size > 0 && !!state.direction);
}

/* -------------------- Practice -------------------- */

function startPractice(){
  const chosenSets = state.sets.filter(s => state.selectedSetIds.has(s.id));
  const cards = chosenSets.flatMap(s => s.cards.map(c => ({ ...c, _setId: s.id })));

  if (cards.length === 0) return;

  // Always randomized
  state.sessionCards = shuffle([...cards]);
  state.sessionIndex = 0;
  setFlipped(false);
  el.doneBox.classList.add("hidden");

  el.setNamesText.textContent = chosenSets.map(s => s.name).join(" ・ ");

  hide(el.viewSetup);
  show(el.viewPractice);
  showCard();

  setTimeout(() => el.card.focus(), 0);
}

function showCard(){
  const total = state.sessionCards.length;

  if (state.sessionIndex >= total){
    el.doneBox.classList.remove("hidden");
    el.progressText.textContent = `${total} / ${total}`;
    return;
  }

  el.doneBox.classList.add("hidden");

  const card = state.sessionCards[state.sessionIndex];
  const frontIsZh = (state.direction === "zh-first");

  el.frontText.textContent = frontIsZh ? card.zh : card.en;
  el.backText.textContent  = frontIsZh ? card.en : card.zh;

  el.frontLangBadge.textContent = frontIsZh ? "中文" : "英文";
  el.backLangBadge.textContent  = frontIsZh ? "英文" : "中文";

  el.progressText.textContent = `${state.sessionIndex + 1} / ${total}`;
  setFlipped(false);
}

function flipCard(){
  if (!isHidden(el.doneBox)) return;
  setFlipped(!state.flipped);
}

function setFlipped(on){
  state.flipped = on;
  if (on) el.card.classList.add("flipped");
  else el.card.classList.remove("flipped");
}

function nextCard(){
  const total = state.sessionCards.length;
  if (state.sessionIndex >= total) return;

  state.sessionIndex += 1;
  setFlipped(false);
  showCard();
}

/* -------------------- Speech -------------------- */

function initVoices(){
  if (!("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;

  const load = () => { state.voices = synth.getVoices() || []; };
  load();
  synth.onvoiceschanged = load;
}

function speakVisibleSide(){
  const total = state.sessionCards.length;
  if (state.sessionIndex >= total) return;

  const card = state.sessionCards[state.sessionIndex];
  const frontIsZh = (state.direction === "zh-first");

  // 目前看哪一面：沒翻＝正面；翻了＝背面
  const showingFront = !state.flipped;

  let text = "";
  let lang = ""; // "zh" | "en"

  if (showingFront) {
    text = frontIsZh ? card.zh : card.en;
    lang = frontIsZh ? "zh" : "en";
  } else {
    text = frontIsZh ? card.en : card.zh;
    lang = frontIsZh ? "en" : "zh";
  }

  speak(text, lang);
}

function speak(text, langShort){
  if (!text) return;
  if (!("speechSynthesis" in window)){
    alert("此瀏覽器不支援朗讀功能。");
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(text);

  // 依語言挑更適合的 voice（中文優先 zh-TW / zh-CN，避免 zh-HK）
  const v = pickBestVoice(langShort);
  if (v) {
    utter.voice = v;
    utter.lang = v.lang; // 用 voice 自己的語言標記最準
  } else {
    utter.lang = (langShort === "zh") ? "zh-HK" : "en-US";
  }

  // 中文稍慢一點通常更自然
  utter.rate = (langShort === "zh") ? 0.9 : 0.95;
  utter.pitch = 1.0;

  synth.speak(utter);
}

function pickBestVoice(langShort){
  const voices = state.voices || [];
  if (!voices.length) return null;

  if (langShort === "zh") {
    // ✅ 廣東話優先（zh-HK）
    const prefer = ["zh-HK", "zh-hk", "yue", "zh"];
    for (const p of prefer) {
      const v = voices.find(vo => (vo.lang || "").toLowerCase().startsWith(p));
      if (v) return v;
    }
    return null;
  }

  // English
  const preferEn = ["en-US", "en"];
  for (const p of preferEn) {
    const v = voices.find(vo => (vo.lang || "").toLowerCase().startsWith(p.toLowerCase()));
    if (v) return v;
  }
  return null;
}

/* -------------------- Home / utils -------------------- */

function goHome(){
  try { window.speechSynthesis?.cancel(); } catch {}

  state.sessionCards = [];
  state.sessionIndex = 0;
  setFlipped(false);

  show(el.viewSetup);
  hide(el.viewPractice);

  // Back to step 1, keep nothing selected (simpler for less tech users)
  state.mode = null;
  state.selectedSetIds.clear();
  state.direction = null;
  el.btnStep1Next.disabled = true;
  setActiveChoice(el.btnModeSingle, false);
  setActiveChoice(el.btnModeMulti, false);

  goStep(1);
}

function show(node){ node.classList.remove("hidden"); }
function hide(node){ node.classList.add("hidden"); }
function isHidden(node){ return node.classList.contains("hidden"); }

function shuffle(arr){
  for (let i = arr.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}