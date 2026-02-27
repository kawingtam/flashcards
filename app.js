/**
 * Elder-friendly Flashcards (ZH ↔ EN)
 * - Chinese UI
 * - Wizard flow: (1) single/multi -> (2) choose sets -> (3) choose direction -> start
 * - Single-column selection boxes
 * - Always shuffle/randomize
 * - Tap to flip
 * - NO swipe to next
 * - Speak current visible side (Web Speech API)
 * - Practice mode fits in one screen (iPhone-safe height)
 */

const state = {
  sets: [],
  mode: null, // "single" | "multi"
  selectedSetIds: new Set(),
  direction: null, // "zh-first" | "en-first"

  sessionCards: [],
  sessionIndex: 0,
  flipped: false,

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

  el.btnPrev = $("btnPrev");
  el.btnNext = $("btnNext");
  el.btnSpeak = $("btnSpeak");
  el.btnFlip = $("btnFlip");

  el.doneBox = $("doneBox");
  el.btnRestart = $("btnRestart");
  el.btnBackToSets = $("btnBackToSets");

  // Init voices + viewport vars
  initVoices();
  updateViewportVars();
  window.addEventListener("resize", updateViewportVars);
  window.addEventListener("orientationchange", () => setTimeout(updateViewportVars, 50));

  // Bind events
  if (el.btnHome) el.btnHome.addEventListener("click", goHome);

  if (el.btnModeSingle) el.btnModeSingle.addEventListener("click", () => chooseMode("single"));
  if (el.btnModeMulti) el.btnModeMulti.addEventListener("click", () => chooseMode("multi"));
  if (el.btnStep1Next) el.btnStep1Next.addEventListener("click", () => goStep(2));

  if (el.btnStep2Back) el.btnStep2Back.addEventListener("click", () => goStep(1));
  if (el.btnStep2Next) el.btnStep2Next.addEventListener("click", () => goStep(3));

  if (el.btnDirZhFirst) el.btnDirZhFirst.addEventListener("click", () => chooseDirection("zh-first"));
  if (el.btnDirEnFirst) el.btnDirEnFirst.addEventListener("click", () => chooseDirection("en-first"));
  if (el.btnStep3Back) el.btnStep3Back.addEventListener("click", () => goStep(2));
  if (el.btnStart) el.btnStart.addEventListener("click", startPractice);

  if (el.card) el.card.addEventListener("click", flipCard);

  if (el.btnPrev) el.btnPrev.addEventListener("click", prevCard);
  if (el.btnNext) el.btnNext.addEventListener("click", nextCard);
  if (el.btnFlip) el.btnFlip.addEventListener("click", flipCard);
  if (el.btnSpeak) el.btnSpeak.addEventListener("click", (e) => {
    e.stopPropagation();
    speakVisibleSide();
  });

  if (el.btnRestart) el.btnRestart.addEventListener("click", () => {
    state.sessionIndex = 0;
    setFlipped(false);
    if (el.doneBox) el.doneBox.classList.add("hidden");
    showCard();
    updateNavButtons();
  });

  if (el.btnBackToSets) el.btnBackToSets.addEventListener("click", goHome);

  // Show step 1
  goStep(1);
  updateStepButtons();

  // Load sets
  try {
    // cache-bust for GitHub Pages
    await loadSets("./data/sets.json");
  } catch (err) {
    console.error(err);
    alert("⚠️ 無法讀取 data/sets.json。\n請確認檔案存在於 data/sets.json。");
    state.sets = [];
  }
});

/* -------------------- Data -------------------- */

async function loadSets(url){
  const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
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
  state.selectedSetIds.clear();
  state.direction = null;

  setActiveChoice(el.btnModeSingle, mode === "single");
  setActiveChoice(el.btnModeMulti, mode === "multi");

  if (el.btnStep1Next) el.btnStep1Next.disabled = false;
  updateStepButtons();
}

function setActiveChoice(button, on){
  if (!button) return;
  button.style.outline = on ? "3px solid rgba(37,99,235,0.35)" : "none";
}

function renderSetList(){
  if (!el.setList) return;
  el.setList.innerHTML = "";

  if (el.modeHint){
    el.modeHint.textContent =
      state.mode === "single"
        ? "提示：只可以選 1 組。"
        : "提示：可以選多組（例如第 1 組 + 第 3 組）。";
  }

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
  if (el.btnStep2Next) el.btnStep2Next.disabled = state.selectedSetIds.size === 0;
  if (el.btnStart) el.btnStart.disabled = !(state.selectedSetIds.size > 0 && !!state.direction);
}

/* -------------------- Practice -------------------- */

function startPractice(){
  const chosenSets = state.sets.filter(s => state.selectedSetIds.has(s.id));
  const cards = chosenSets.flatMap(s => s.cards.map(c => ({ ...c, _setId: s.id })));
  if (cards.length === 0) return;

  state.sessionCards = shuffle([...cards]);
  state.sessionIndex = 0;
  setFlipped(false);
  if (el.doneBox) el.doneBox.classList.add("hidden");

  if (el.setNamesText) el.setNamesText.textContent = chosenSets.map(s => s.name).join(" ・ ");

  // ✅ enter practice mode BEFORE showing practice view
  document.body.classList.add("practiceMode");
  updateViewportVars();

  hide(el.viewSetup);
  show(el.viewPractice);
  showCard();
  updateNavButtons();

  setTimeout(() => el.card && el.card.focus(), 0);
}

function showCard(){
  const total = state.sessionCards.length;

  if (state.sessionIndex >= total){
    if (el.doneBox) el.doneBox.classList.remove("hidden");
    if (el.progressText) el.progressText.textContent = `${total} / ${total}`;
    return;
  }

  if (el.doneBox) el.doneBox.classList.add("hidden");

  const card = state.sessionCards[state.sessionIndex];
  const frontIsZh = (state.direction === "zh-first");

  if (el.frontText) el.frontText.textContent = frontIsZh ? card.zh : card.en;
  if (el.backText)  el.backText.textContent  = frontIsZh ? card.en : card.zh;

  if (el.frontLangBadge) el.frontLangBadge.textContent = frontIsZh ? "中文" : "英文";
  if (el.backLangBadge)  el.backLangBadge.textContent  = frontIsZh ? "英文" : "中文";

  if (el.progressText) el.progressText.textContent = `${state.sessionIndex + 1} / ${total}`;

  setFlipped(false);
  updateNavButtons();
}

function flipCard(){
  if (el.doneBox && !isHidden(el.doneBox)) return;
  setFlipped(!state.flipped);
}

function setFlipped(on){
  state.flipped = on;
  if (!el.card) return;
  if (on) el.card.classList.add("flipped");
  else el.card.classList.remove("flipped");
}

function nextCard(){
  if (state.sessionIndex >= state.sessionCards.length - 1) return;
  state.sessionIndex += 1;
  setFlipped(false);
  showCard();
}

function prevCard(){
  if (state.sessionIndex <= 0) return;
  state.sessionIndex -= 1;
  setFlipped(false);
  showCard();
}

function updateNavButtons(){
  if (el.btnPrev) el.btnPrev.disabled = (state.sessionIndex <= 0);
  if (el.btnNext) el.btnNext.disabled = (state.sessionIndex >= state.sessionCards.length - 1);
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
  if (state.sessionIndex >= state.sessionCards.length) return;

  const card = state.sessionCards[state.sessionIndex];
  const frontIsZh = (state.direction === "zh-first");
  const showingFront = !state.flipped;

  let text = "";
  let lang = "";

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

  const v = pickBestVoice(langShort);
  if (v) {
    utter.voice = v;
    utter.lang = v.lang;
  } else {
    // fallback
    utter.lang = (langShort === "zh") ? "zh-HK" : "en-US";
  }

  utter.rate = (langShort === "zh") ? 0.9 : 0.95;
  utter.pitch = 1.0;

  synth.speak(utter);
}

function pickBestVoice(langShort){
  const voices = state.voices || [];
  if (!voices.length) return null;

  if (langShort === "zh") {
    // Cantonese preferred if available; falls back to any Chinese
    const prefer = ["zh-HK", "yue", "zh"];
    for (const p of prefer) {
      const v = voices.find(vo => (vo.lang || "").toLowerCase().startsWith(p.toLowerCase()));
      if (v) return v;
    }
    return null;
  }

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

  // ✅ remove practice mode first
  document.body.classList.remove("practiceMode");

  state.sessionCards = [];
  state.sessionIndex = 0;
  setFlipped(false);

  show(el.viewSetup);
  hide(el.viewPractice);

  state.mode = null;
  state.selectedSetIds.clear();
  state.direction = null;

  if (el.btnStep1Next) el.btnStep1Next.disabled = true;
  setActiveChoice(el.btnModeSingle, false);
  setActiveChoice(el.btnModeMulti, false);

  goStep(1);
}

function show(node){ if (node) node.classList.remove("hidden"); }
function hide(node){ if (node) node.classList.add("hidden"); }
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

/* iPhone / in-app browser safe height */
function updateViewportVars(){
  document.documentElement.style.setProperty("--app-h", `${window.innerHeight}px`);

  const topbar = document.querySelector(".topbar");
  if (topbar) {
    document.documentElement.style.setProperty("--topbar-h", `${topbar.offsetHeight}px`);
  }
}
