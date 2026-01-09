# 📚 SICSR Timetable WebApp

A modern, fast, and responsive web application built with **React**, **Vite**, and **TypeScript** that replicates the functionality of an Android timetable app, allowing students to view their class schedules for SICSR.

---

## ✨ Features

- 📅 **Batch Selection** - Choose multiple batches to view their aggregated timetables
- 🗓️ **Date Navigation** - Jump to any date or navigate day-by-day with a timeline
- 📊 **Course Display** - Clear class cards showing room numbers, course names, and timings
- 💾 **Smart Caching** - Instant loading from local storage with background synchronization
- 🎨 **Modern UI** - Premium design with smooth transitions and responsive layouts
- ⚡ **Real-time Sync** - Fetches latest timetable data with automatic proxy rotation
- 📱 **PWA Ready** - Fully responsive and designed for a mobile-first experience

---

## 🛠️ Tech Stack

- **Core**: [React 18](https://reactjs.org/)
- **Bundler**: [Vite 6](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: Vanilla CSS (Modern Design System)
- **Deployment**: Optimized for GitHub Pages

---

## 📁 Project Structure

```
SICSR-TimeTable-WebApp/
├── src/
│   ├── components/     # Reusable UI components (Modals, Lists, etc.)
│   ├── hooks/          # Custom hooks (useTimetable for data logic)
│   ├── types.ts        # TypeScript interfaces and types
│   ├── api.ts          # HTTP client with CORS proxy rotation
│   ├── App.tsx         # Main application orchestrator
│   └── index.css       # Global design system and styles
├── public/             # Static assets
├── index.html          # Vite entry point
├── package.json        # Dependencies and scripts
└── tsconfig.json       # TypeScript configuration
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TriforceParas/SICSR-TimeTable-WebApp.git
   cd SICSR-TimeTable-WebApp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

---

## 🏗️ Technical Architecture

### Data Management (`useTimetable` hook)
- **Cache-First Strategy**: Loads data from `localStorage` immediately for instant UI, then fetches updates in the background.
- **CSV Parsing**: Custom robust parsing of the SICSR CSV response format.
- **Proxy Rotation**: Automatically switches between multiple CORS proxies if one fails.

### UI Components
- **Modals**: Flexible modal system for batch and date selection.
- **Timeline**: Fixed navigation bar for quick access to "Yesterday" and "Tomorrow".
- **Sync Indicator**: Visual feedback on whether the data is being updated or is up-to-date.

---

## 🌐 API Information

- **Base URL**: `http://time-table.sicsr.ac.in/report.php`
- **Fallbacks**: Uses multiple CORS proxies (Codetabs, Corsproxy.io, AllOrigins) to ensure connectivity.
- **Format**: CSV data parsed on-the-fly into structured TypeScript objects.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is created for SICSR students. Feel free to use, modify, and distribute as needed.

**Created with ❤️ by [TriforceParas](https://github.com/TriforceParas)**

---

**Last Updated:** January 9, 2026
**Version:** 2.0.0
