# Psychic Investment Game

Welcome to the Psychic Investment Game, an innovative platform that combines intuitive impressions with simulated financial investments!

## Overview

This game challenges users to provide psychic impressions that guide investment decisions. Here's how it works:

1. The system randomly selects two images, each associated with a different investment strategy.
2. Users are asked to focus and obtain psychic impressions about an image they haven't seen yet.
3. They provide these impressions to the system.
4. The system interprets these impressions as a description of one of the randomly selected images.
5. Based on which image the system determines the impressions most closely match, the corresponding investment strategy is chosen.
6. The system simulates the outcomes of both investment strategies.
7. The image associated with the most successful strategy is revealed to the user.
8. If the user's impressions align with the revealed image, it indicates a successful prediction and potential financial gain.

## How It Works

- The system has a set of images, each representing a specific investment strategy (e.g., a snake might represent a bearish market, while a mountain could represent a bullish trend).
- At the start of each game, two images are randomly selected, each tied to a different investment choice.
- Users focus on getting impressions about an unseen image, not knowing which images have been selected.
- User impressions are analyzed and interpreted as a description of one of the two selected images.
- The investment strategy associated with the image that best matches the user's impressions is applied.
- The system simulates the outcomes of both strategies.
- The image corresponding to the more successful strategy is shown to the user.
- Success is measured by how well the user's impressions match the revealed image, indicating they "sensed" the more successful strategy.

## Features

- **Session Creation**: Users can start new game sessions.
- **Psychic Impressions**: Users input their intuitive feelings about an unseen image.
- **AI-Powered Analysis**: Advanced AI models interpret user impressions to match them with one of the randomly selected images.
- **Investment Simulation**: The system simulates different investment outcomes based on the strategies associated with each image.
- **Real-time Processing**: Quick processing of impressions and strategy outcomes.
- **Visual Feedback**: Users see the outcome of their predictions through the revealed image.

## Technical Stack

- **Frontend**: React with Next.js
- **Backend**: Node.js
- **AI Models**: OpenAI GPT, Claude, and Llava for impression analysis and image matching
- **Database**: File-based JSON storage
- **Styling**: Tailwind CSS

## Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/psychic-investment-game.git
   ```

2. Install dependencies:
   ```
   cd psychic-investment-game
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

4. Add strategy images:
   Place your strategy-related images in the `public/images` directory. Ensure each image clearly represents a specific investment strategy.

5. Run the development server:
   ```
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:3000` to start playing!

## Contributing

We welcome contributions to improve the Psychic Investment Game! Please feel free to submit issues, feature requests, or pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This game is for entertainment purposes only. The investment strategies and outcomes in the game are simulated and do not reflect real-world financial markets or advice. Always consult with a qualified financial advisor before making any actual investment decisions.

Enjoy the game and may your intuition guide you to successful predictions!