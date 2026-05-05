# 🌷 Workplace English Flashcards

A bilingual Chinese-English flashcard web app I built to help my mom practice practical English for the workplace.

This project started as a personal tool for someone I care about, but it also became a meaningful portfolio project where I practiced frontend development, data organization, accessibility-minded design, and building a real learning tool for a real user.

---

## 💡 Why I Built This

I created this project to help my mom learn useful English words and phrases for work.  

Instead of building a generic flashcard app, I focused on making the experience simple, friendly, and easy to use for someone who may not be comfortable with complicated technology.

The goal was to help her practice workplace English in a way that feels less stressful and more encouraging. 🌱

---

## ✨ Features

- 🌐 **Bilingual flashcards** — Chinese ↔ English vocabulary practice
- 🧭 **Guided setup flow** — users choose study mode, vocabulary sets, and language direction
- 📚 **Single-set or multi-set practice** — practice one group or combine multiple groups
- 🔁 **Randomized card order** — helps make each practice session different
- 🃏 **Tap-to-flip flashcards** — simple card interaction for review
- 🔊 **Text-to-speech support** — uses the browser’s built-in speech feature for pronunciation practice
- 📱 **Mobile-friendly layout** — designed to work well on phones and small screens
- 📄 **Excel-to-JSON workflow** — vocabulary can be managed in Excel and converted into app data

---

## 🛠️ Tech Stack

- **HTML**
- **CSS**
- **JavaScript**
- **Node.js**
- **JSON**
- **XLSX / Excel data processing**

---

## 📸 Project Preview

This app allows users to:

1. Choose whether to practice one set or multiple sets  
2. Select vocabulary groups  
3. Choose Chinese-first or English-first practice  
4. Flip cards, hear pronunciation, and review words at their own pace  

---

## 📁 Project Structure

```text
flashcards/
├── index.html
├── styles.css
├── app.js
├── excel_to_sets.js
├── vocab.xlsx
├── data/
│   ├── sets.json
│   └── sets.sample.json
├── package.json
└── README.md
