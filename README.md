# Milestone.AI

An AI-powered application that helps users achieve significant goals in 90 days using smart planning and tracking tools.

## Core Features

- **AI-Powered Planning**: Chat with an AI assistant to break down your goal into actionable steps
- **Hierarchical Goal Structure**: 
  - 3 Monthly Milestones
  - 4 Weekly Objectives per month
  - 7 Daily Tasks per week
- **Progress Tracking**: Visual indicators of your overall journey
- **Gamification**: Earn achievements as you progress
- **Daily/Weekly Check-ins**: Stay accountable and reflect on your progress

## User Flow

1. Define your 90-day goal via the chat interface
2. AI generates a hierarchical plan for achieving the goal
3. Execute daily tasks with daily check-ins
4. Review progress weekly and adjust if needed
5. Earn achievements as you reach milestones
6. Complete your goal in 90 days

## Technical Stack

- Platform: Web Application
- Language: TypeScript
- AI: Gemini 2.5 Pro (via user key)
- Front-end: React with shadcn
- Back-end: Node.js
- Database: MongoDB

## Getting Started

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Build for production
npm run build
```

## Configuration

Users need to provide their own Gemini API key in the settings menu to enable AI functionality.

## Color Palette

- #F8FAFC (Primary Background/Lightest)
- #D9EAFD (Accent 1: highlights, buttons)
- #BCCCDC (Accent 2: secondary elements, borders)
- #9AA6B2 (Accent 3: text, darker elements)