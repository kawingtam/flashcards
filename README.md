# Workplace English Flashcards

A bilingual Chinese ↔ English flashcard web app designed to help my mom practice workplace English vocabulary at her own pace.

This project began as a personal learning tool for a real user: my mom wanted a simple, friendly way to review English words she might see at work. I built the app with a guided setup flow, large touch-friendly buttons, randomized flashcards, and browser-based pronunciation support so the experience feels approachable on both desktop and mobile.

## Live Demo

Add your GitHub Pages link here after enabling Pages:

```text
https://kawingtam.github.io/flashcards/
```

## Project Highlights

- **Built for a real user need:** helps a family member practice practical workplace English vocabulary.
- **Bilingual learning flow:** supports Chinese → English and English → Chinese practice.
- **Guided setup:** users choose single-set or multi-set practice, select vocabulary groups, then choose study direction.
- **Elder-friendly interface:** large buttons, clear steps, simple Chinese UI, and mobile-friendly layout.
- **Flashcard interaction:** tap/click to flip cards, navigate previous/next, and restart practice sessions.
- **Pronunciation support:** uses the browser Web Speech API to read the visible card aloud.
- **Data-driven content:** vocabulary is stored in JSON and can be generated from an Excel spreadsheet.
- **Static deployment:** runs as a lightweight HTML/CSS/JavaScript app and can be hosted on GitHub Pages.

## Tech Stack

| Area | Tools |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Data Format | JSON |
| Data Conversion | Node.js, SheetJS/xlsx |
| Browser API | Web Speech API |
| Deployment | GitHub Pages |

## How It Works

The app loads vocabulary from `data/sets.json`. Each vocabulary set contains multiple cards with Chinese and English text.

```json
{
  "sets": [
    {
      "id": "word-01",
      "name": "Word 01",
      "cards": [
        {
          "zh": "文档",
          "en": "Document"
        }
      ]
    }
  ]
}
```

The included `excel_to_sets.js` script converts an Excel vocabulary file into the JSON format used by the app.

## Run Locally

Because the app loads a local JSON file, it should be previewed through a local server instead of opening `index.html` directly.

```bash
# Clone the repository
git clone https://github.com/kawingtam/flashcards.git
cd flashcards

# Start a local server
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Update Vocabulary from Excel

Install dependencies:

```bash
npm install
```

Convert the Excel file into app data:

```bash
node excel_to_sets.js vocab.xlsx ./data/sets.json
```

Expected Excel columns:

| Column | Description |
|---|---|
| `set` | Vocabulary group name |
| `zh` / `chinese` / `中文` | Chinese word or phrase |
| `en` / `english` / `英文` | English word or phrase |

## Folder Structure

```text
flashcards/
├── index.html              # App layout
├── styles.css              # Responsive and elder-friendly styling
├── app.js                  # Flashcard logic and Web Speech support
├── excel_to_sets.js        # Excel-to-JSON conversion script
├── vocab.xlsx              # Source vocabulary spreadsheet
├── data/
│   └── sets.json           # Vocabulary data used by the app
├── package.json
└── README.md
```

## What I Learned

Through this project, I practiced building a complete small web app from a real-world need. I improved my ability to design for usability, structure data for maintainability, and automate repetitive content updates through an Excel-to-JSON workflow. This project also helped me improve productivity by turning vocabulary updates into a repeatable process instead of manually editing flashcards one by one.

## Future Improvements

- Add a progress tracker for learned and difficult words.
- Add a quiz mode with multiple-choice answers.
- Save user progress with `localStorage`.
- Add categories such as office tools, email phrases, meetings, and customer service.
- Add screenshots or a short demo GIF to the README.
- Improve accessibility with stronger keyboard navigation and screen reader labels.

## Repository Notes for Recruiters

This project demonstrates my ability to:

- Build a browser-based app using HTML, CSS, and JavaScript.
- Design around a specific user need instead of only technical requirements.
- Create a data-driven interface from structured JSON.
- Automate data preparation with Node.js.
- Make a project deployable as a static GitHub Pages site.
