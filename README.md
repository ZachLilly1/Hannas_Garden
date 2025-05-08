# 🌱 Hanna's Garden - AI-Powered Plant Care Manager

Hanna's Garden is a comprehensive plant care management platform that transforms plant care into an engaging, intelligent, and interactive digital experience. With cutting-edge AI integration, this application helps plant enthusiasts track, manage, and optimize their plant care routines.

![Hanna's Garden App](public/generated-icon.png)

## 🌟 Features

### Core Functionality
- **Plant Management**: Track all your plants in one place with customizable details like name, species, location, and care requirements
- **Care Scheduling**: Receive personalized reminders for watering, fertilizing, and other care tasks
- **Plant Guides**: Access comprehensive care guides with best practices for different plant species

### AI-Powered Tools
- **Plant Identifier**: Identify plant species using image recognition technology
- **Light Meter**: Analyze your plant's environment to determine lighting conditions
- **Seasonal Care Guide**: Get care recommendations tailored to the current season
- **Personalized Plant Advisor**: Receive custom advice for your specific plants

### Social Features
- **User Profiles**: Create and customize your plant parent profile
- **Public Plant Collections**: Share your collection with other plant enthusiasts
- **Follow System**: Connect with other plant parents for inspiration
- **Activity Feed**: See what's happening in your plant community
- **Plant Sharing**: Generate shareable links to showcase individual plants or care logs

## 🔧 Technical Stack

### Frontend
- React with TypeScript
- TanStack Query for data fetching
- Tailwind CSS with Radix UI components
- Wouter for routing
- Mobile-responsive design

### Backend
- Node.js with Express
- PostgreSQL database with Drizzle ORM
- OpenAI integration for AI features
- JWT-based authentication
- Secure session management

## 🚀 Getting Started

### Prerequisites
- Node.js (v16.0.0+)
- PostgreSQL database
- OpenAI API key for AI features

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/hannas-garden.git
   cd hannas-garden
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables by creating a `.env` file:
   ```
   DATABASE_URL=postgres://username:password@localhost:5432/hannas_garden
   SESSION_SECRET=your_session_secret
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Run database migrations:
   ```
   npm run db:push
   ```

5. Start the development server:
   ```
   npm run dev
   ```

6. Access the application at `http://localhost:5000`

## 📱 Usage

### Account Creation
1. Register a new account or login with existing credentials
2. Complete the onboarding process to personalize your experience

### Adding Plants
1. Use the "+" button in the bottom navigation
2. Fill in basic plant details or use the Plant Identifier to automatically identify your plant
3. Add a photo of your plant
4. Specify care requirements or let the AI suggest optimal care schedules

### Managing Care
1. View your care schedule in the Schedule tab
2. Mark tasks as complete when you care for your plants
3. View care history for each plant to track patterns

### Social Features
1. Visit your profile to customize privacy settings
2. Discover other users through the Discover page
3. Follow users to see their activity in your feed
4. Share plants or care logs via the share button

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Icons from Lucide React
- UI components from Radix UI
- Plant identification powered by OpenAI
- Weather data from OpenWeatherMap API