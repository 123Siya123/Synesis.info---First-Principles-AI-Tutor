# Learning App - Deep First-Principles Understanding

A minimalist, intuitive web learning application focused on deep first-principles understanding through a simplified 4-step repeating cycle. The entire app feels like reading a real encyclopedia and writing on real paper — clean, distraction-free, paper-like aesthetic.

## 🎯 Core Philosophy

Everything is **1 click away**, natural, and guided. The app uses a repeating cycle:

1. **Choose topic** → Study phase
2. **When ready** → Ingrain & Validate phase (essay + teach to student)
3. **Identify gaps** → back to Study to fill them
4. **Repeat**

## ✨ Features

### Study Phase
- **AI-Generated Articles**: 400-500 word encyclopedia-style articles using first-principles reasoning
- **Interactive Sub-Concepts**: Blue clickable terms that generate new articles
- **Text Selection**: Select any passage to dive deeper
- **Notes Panel**: Collapsible side panel for questions and free-form notes
- **Question Input**: Ask questions at any time to generate new articles

### Ingrain & Validate Phase
- **Essay Writing**: Write everything you know without worrying about form
- **Teach to a Student**: Explain the topic in simple terms using voice or text
- **AI-Generated Student Questions**: Realistic questions a student would ask
- **Gap Identification**: Identify what you need to understand more deeply

### Technical Features
- **Session Persistence**: Your progress is saved automatically
- **Voice Recognition**: Web Speech API for teaching phase (with typing fallback)
- **Loading Indicators**: Clear feedback during AI generation
- **Responsive Design**: Works on desktop and mobile

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. Navigate to the project directory:
```bash
cd "Learning App"
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## 🎨 Design Principles

- **Paper-like aesthetic**: White/off-white backgrounds, simple typography, subtle shadows
- **Distraction-free**: Clean interface with minimal UI elements
- **Natural flow**: Intuitive navigation that guides the learning process
- **Readable typography**: Georgia serif font for article content, sans-serif for UI

## 🔧 Technology Stack

- **Framework**: Next.js 14 (React)
- **Styling**: Vanilla CSS with CSS Modules
- **AI**: Groq API (llama-3.3-70b-versatile model)
- **Speech**: Web Speech API
- **Storage**: localStorage for session persistence

## 📖 How to Use

### 1. Start Learning
- Enter a topic you want to learn about
- Click "Start Learning" to generate your first article

### 2. Study Phase
- Read the encyclopedia-style article
- Click on blue sub-concepts to explore deeper
- Select any text to generate an article about it
- Ask questions using the input at the bottom
- Take notes in the collapsible Notes panel

### 3. Ingrain & Validate
- When ready, click "Ingrain & Validate Knowledge"
- Write an essay about everything you've learned
- Teach the topic to a student in simple terms (voice or text)
- Answer the student's questions
- Identify gaps to study further

### 4. Repeat
- Return to Study phase to fill gaps
- Continue the cycle until you have deep understanding

## 🎯 Article Generation

All articles follow a strict first-principles approach:
1. Explain the problem without the concept
2. Identify the root cause
3. Ask "How can we solve this?"
4. Introduce the concept as the solution
5. Walk through reasoning step by step

Articles are:
- Factual and easy to understand
- 400-500 words (encyclopedia-style)
- Include sub-concepts and vocabulary naturally
- Use analogies and examples where helpful

## 🔐 API Configuration




## 📱 Browser Compatibility

- **Chrome/Edge**: Full support (including voice recognition)
- **Firefox**: Full support (including voice recognition)
- **Safari**: Full support (including voice recognition)
- **Mobile**: Responsive design works on all devices

## 🛠️ Project Structure

```
Learning App/
├── app/
│   ├── globals.css          # Global styles and design system
│   ├── layout.js            # Root layout component
│   ├── page.js              # Main application logic
│   └── page.module.css      # Component-specific styles
├── package.json             # Dependencies and scripts
├── next.config.js           # Next.js configuration
└── README.md               # This file
```

## 🎓 Learning Tips

1. **Don't rush**: Spend time with each article before moving on
2. **Use notes**: Write down questions as they come up
3. **Follow curiosity**: Click on sub-concepts that interest you
4. **Be honest**: In the essay phase, write everything even if incomplete
5. **Simplify**: Teaching to a student reveals true understanding
6. **Identify gaps**: Use student questions to find what you need to study

## 🔄 Session Management

- Sessions are automatically saved to localStorage
- Starting a new topic clears the previous session
- Your notes, questions, and current article are preserved
- Close and reopen the browser to continue where you left off

## 🚧 Future Enhancements

Potential improvements:
- User accounts and cloud storage
- Learning history and progress tracking
- Spaced repetition reminders
- Export notes and essays
- Multiple learning paths
- Collaborative learning features

## 📄 License

This project is for educational purposes.

## 🙏 Acknowledgments

- Built with Next.js and React
- AI powered by Groq (llama-3.3-70b-versatile)
- Inspired by first-principles thinking and deep learning methodologies

---

**Happy Learning! 📚**
