# Frontend - Live Polling System

Frontend application for the Live Polling System using React, Redux Toolkit, and Socket.io.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create `.env` file (optional):

```env
VITE_SOCKET_URL=http://localhost:5000
```

## Technologies

- **React 18.2** - UI library
- **Redux Toolkit** - State management
- **Socket.io Client** - Real-time communication
- **Recharts** - Chart visualization
- **React Router** - Routing
- **React Toastify** - Notifications
- **Vite** - Build tool

## Project Structure

```
src/
├── app/              # Redux store configuration
├── features/         # Redux slices
├── components/       # Reusable components
├── pages/           # Page components
├── services/        # API and Socket.io services
├── App.jsx          # Main app component
├── main.jsx         # Entry point
└── index.css        # Global styles
```

## Available Routes

- `/` - Home page (role selection)
- `/teacher` - Teacher dashboard
- `/student` - Student portal

## Color Palette

```css
--primary-purple: #7765DA
--primary-blue: #5767D0
--primary-vibrant: #4F0DCE
--neutral-light: #F2F2F2
--neutral-dark: #373737
--neutral-gray: #6E6E6E
```
