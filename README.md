# 🧠 First-Principles Learning App

> **"Understand, don't just memorize."**

A next-generation learning platform designed to help you master any subject through **First-Principles Thinking**. Unlike standard wikis or chat bots, this app guides you through a cognitive cycle proven to build deep, lasting understanding.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## 🌟 Core Philosophy: The Learning Cycle

Most learning tools focus on *content delivery*. This app focuses on *cognitive integration*. It forces you to engage with the material in four distinct phases:

1.  **🔍 Study (First Principles)**: 
    *   AI generates "encyclopedia-style" articles that explain *why* things work, starting from the root problem.
    *   Concepts are broken down into cause-and-effect chains.
    *   **Interactive Mind Map**: Visualizes your knowledge growth as a network of connected nodes.

2.  **✍️ Ingrain (Feynman Technique)**:
    *   **Essay Mode**: Write everything you know without looking at notes.
    *   **Teaching Mode**: Explanation is the highest form of understanding. "Teach" a simulated AI student who asks clarifications.
    *   **Voice Support**: Speak your explanations naturally.

3.  **🧪 Validate (Practice Hub)**:
    *   **Core Exercises**: Solve scenarios that require applying the concept, not just reciting it.
    *   **SAT/Exam Prep**: Generate standardized test questions on the fly.
    *   **Custom Practice**: Ask for specific challenges (e.g., "Give me a PhD-level problem").

4.  **🔄 Iterate**:
    *   Identify gaps in your explanation.
    *   Return to the **Study** phase to fill those specific gaps.

---

## 🚀 Features

*   **AI-Powered Content**: built on `llama-3.3-70b` (via Groq) for high-speed, high-quality reasoning.
*   **Visual Knowledge Graph**: A dynamic mind map that grows as you explore sub-topics.
*   **Voice Interaction**: Full speech-to-text integration for the "Teaching" phase.
*   **PDF/Document Analysis**: Upload a textbook or paper, and the AI will teach you *specific chapters* from it.
*   **Pomodoro Timer**: Built-in focus timer with customized intervals.
*   **Guest & User Modes**: Try it instantly as a guest, or sign up to save progress.

---

## 🛠️ Tech Stack

*   **Frontend**: Next.js 14 (React)
    *   *Styling*: CSS Modules (Clean, paper-like aesthetic)
    *   *State*: React Hooks + Context
    *   *Visualization*: Custom Canvas / SVG for Mind Maps
*   **Backend**: Next.js API Routes (Serverless)
*   **Database**: Supabase (PostgreSQL)
    *   *Auth*: Supabase Auth
    *   *Storage*: Supabase Database for profiles, studies, and logs.
*   **AI Engine**: Groq API (running Llama 3 models)
*   **Payments**: Stripe integration for subscriptions (Free/Premium).

---

## 🔑 Configuration & API Keys

To run this project, you need to configure several external services. Create a `.env.local` file in the root directory with the following keys:

### 1. Supabase (Database & Auth)
*   Create a project at [supabase.com](https://supabase.com).
*   Go to **Project Settings > API**.
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Critical for admin tasks like limit resets
```

### 2. Groq (AI Intelligence)
*   Get a free/paid API key from [console.groq.com](https://console.groq.com).
*   The app supports key rotation. You can add multiple keys to avoid rate limits.
```bash
GROQ_API_KEY=gsk_...
# Optional additional keys
GROQ_API_KEY_2=gsk_...
```

### 3. Stripe (Payments - Optional for Dev)
*   Create a verified account at [stripe.com](https://stripe.com).
*   Get your keys from **Developers > API keys**.
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## ⚡ Quick Start Guide

### Prerequisites
*   Node.js 18+ installed.
*   npm or yarn.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/learning-app.git
    cd learning-app
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```
    *(Note: This installs Next.js, Supabase client, Stripe, Pdf.js, etc.)*

3.  **Setup Database**
    You will need to run the SQL scripts in the `root` folder to set up your Supabase tables (`profiles`, `studies`, `guest_tracking`).
    *   Go to your Supabase **SQL Editor**.
    *   Copy/Paste the contents of `db_full_setup.sql` (located in the root folder) and run them.

4.  **Run Locally**
    ```bash
    npm run dev
    ```
    Open `http://localhost:3000`.

---

## 📖 How to Use

1.  **Enter a Topic**: Start with something broad (e.g., "Quantum Physics") or specific ("How does a bicycle stay upright?").
2.  **Read & Click**: The AI writes a first-principles article.
    *   *Blue Text*: Click to open a sub-article (adds a node to the Mind Map).
    *   *Select Text*: Highlight any confusing phrase to get an instant explanation.
3.  **Switch Phases**: Use the sidebar to move to "Ingrain" or "Practice".
4.  **Upload Files**: Toggle the "Plan Mode" or File Upload to study from a specific PDF.

---

## 📂 Project Structure

*   **/app**: Main Next.js application code.
    *   **/api**: Serverless functions (AI generation, database operations).
    *   **/components**: Reusable UI (MindMap, PracticeHub, PomodoroTimer).
    *   `page.js`: The main controller and state machine.
*   **/lib**: Utility functions (Supabase client, API helpers).

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

*Built with ❤️ for lifelong learners.*
