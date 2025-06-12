# 🔍 ScanTheLie

<div align="center">

### A Web App To Analyze Packaged Food Products.

[<img src="https://img.shields.io/badge/LIVE_DEMO-Try_Now-FF4081?style=for-the-badge&logoColor=white" width="200"/>](https://scanthelie.vercel.app)

[![Deployed with Vercel](https://img.shields.io/badge/Deployed%20with-Vercel-black?style=for-the-badge&logo=vercel)](https://scanthelie.vercel.app)
[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org)
[![Powered by Gemini AI](https://img.shields.io/badge/Powered%20by-Gemini%20AI-4285F4?style=for-the-badge&logo=google)](https://cloud.google.com/gemini)

[📸 Try Demo](https://scanthelie.vercel.app) 
</div>

### 📸 Try with these example images:

<div align="center">
<img src="./.github/assets/example1.jpg" width="300" alt="Example 1 - Clear product label"/>
<img src="./.github/assets/example2.jpg" width="300" alt="Example 2 - Clear ingredients list"/>

*For best results, ensure your product label images are clear and well-lit like these examples*
</div>

[![Tech Stack](https://img.shields.io/badge/Tech%20Stack-⚡-yellow)](#)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF?logo=vite)](https://vitejs.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-11.8.1-FFCA28?logo=firebase)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.1-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

## 🎯 Real-World Problem & Solution

In today's world of processed foods and marketing claims, consumers often struggle to make informed decisions about their food choices. **ScanTheLie** empowers users to:

- 📸 Scan food product labels
- 🔍 Verify marketing claims
- 🧪 Analyze ingredients
- 📊 Get personalized health insights
- 📱 Track consumption patterns
- 🤖 Get real-time AI assistance

### Real-Life Example

> Sarah, a mother of two with a family history of diabetes, wants to ensure she's making the best food choices. While shopping, she encounters a product labeled "Sugar-Free" but contains unfamiliar ingredients. Using ScanTheLie, she:
> 1. Scans the product label
> 2. Gets instant verification of the "Sugar-Free" claim
> 3. Receives a detailed breakdown of alternative sweeteners used
> 4. Views a personalized health impact assessment
> 5. Chats with the AI assistant to understand complex ingredients
> 6. Saves the product to her history for future reference

## 🏗️ Technical Architecture

```mermaid
graph TD
    A[User Interface] --> B[React Components]
    B --> C[Context API]
    C --> D[Service Layer]
    D --> E[Firebase Auth]
    D --> F[Cloud Firestore]
    D --> G[Cloud Storage]
    D --> H[Gemini AI API]
    H --> I[Smart Label Analysis]
    H --> J[AI Chatbot]
    
    style A fill:#61DAFB
    style B fill:#61DAFB
    style C fill:#61DAFB
    style D fill:#FF9900
    style E fill:#FFCA28
    style F fill:#FFCA28
    style G fill:#FFCA28
    style H fill:#4285F4
    style I fill:#4285F4
    style J fill:#4285F4
```


## 🔄 Application Workflow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Firebase
    participant GeminiAI
    participant Chatbot

    User->>App: Scans Product Label
    App->>Firebase: Upload Image
    Firebase-->>App: Image URL
    App->>GeminiAI: Analyze Image
    GeminiAI-->>App: Analysis Results
    App->>Firebase: Store Results
    App->>User: Display Insights
    User->>Chatbot: Ask Questions
    Chatbot->>GeminiAI: Process Query
    GeminiAI-->>Chatbot: Generate Response
    Chatbot->>User: Provide Answer
    User->>App: Save to History
    App->>Firebase: Update User History
```


## 🛠️ Tech Stack

- **Frontend Framework**: React with TypeScript
- **Styling**: TailwindCSS + Framer Motion
- **Backend**: Firebase
- **AI Integration**: Gemini AI


## 📱 Features

- **Analyzes packaged food product labels in real-time**
- **Verifies marketing claims against actual ingredients**
- **Provides detailed breakdowns of complex ingredients in simpler terms**
- **Offers personalized health insights based on user dietary preferences**
- **Tracks scan history for informed decision-making**
- **A Chatbot that responds to any health related query related to the scanned product.**

## 🤖 Chatbot Features

The integrated AI chatbot in the websiteserves as your personal product expert:

- **Instant Answers**: Get immediate responses about ingredients, nutrition, and health claims
- **Context-Aware**: The chatbot understands the scanned product's context for accurate answers
- **Smart Recommendations**: Receive personalized suggestions based on your health profile







---

<p align="center">Made with ❤️ for healthier food choices</p> 
