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
7. Only the image associated with the most successful strategy is revealed to the user.
8. If the user's impressions align with the revealed image, it indicates a successful prediction and potential financial gain.

## About Associative Remote Viewing (ARV)

This game is inspired by the concept of Associative Remote Viewing (ARV), a technique used in parapsychology and psychic research. Here's a brief overview:

- **Definition**: ARV is a method that attempts to predict future events by linking psychic impressions to specific images or objects.

- **Process**: 
  1. A question with a binary outcome is formulated (e.g., will the stock market go up or down?).
  2. Two distinct images are chosen, each representing one of the possible outcomes.
  3. A "viewer" attempts to describe an image they haven't seen, which will be shown to them in the future.
  4. Their description is matched to one of the pre-selected images.
  5. The outcome associated with the best-matching image is considered the prediction.

- **Application**: ARV has been experimentally applied to various fields, including financial predictions and event outcomes.

- **Scientific Status**: While some proponents claim success with ARV, it remains a controversial topic in the scientific community. There is no widely accepted scientific evidence for the efficacy of ARV or other forms of psychic phenomena.

Our game adapts the ARV concept into an entertaining and engaging format, allowing users to explore and test their intuitive abilities in a simulated investment scenario.

## How It Works

- The system has a set of images, each representing a specific investment strategy (e.g., a snake might represent a bearish market, while a mountain could represent a bullish trend).
- At the start of each game, two images are randomly selected, each tied to a different investment choice.
- Users focus on getting impressions about an unseen image, not knowing which images have been selected.
- User impressions are analyzed and interpreted as a description of one of the two selected images.
- The investment strategy associated with the image that best matches the user's impressions is applied.
- The system simulates the outcomes of both strategies.
- Only the image corresponding to the more successful strategy is shown to the user. The other image remains hidden to prevent any unintended psychic connections with the "incorrect" image.
- Success is measured by how well the user's impressions match the revealed image, indicating they "sensed" the more successful strategy.
- After the game, users have the option to view the "non-target" image(s) that were not initially shown, satisfying curiosity without affecting the game's psychic aspect.

## Features

- **Session Creation**: Users can start new game sessions.
- **Psychic Impressions**: Users input their intuitive feelings about an unseen image.
- **AI-Powered Analysis**: Advanced AI models interpret user impressions to match them with one of the randomly selected images.
- **Investment Simulation**: The system simulates different investment outcomes based on the strategies associated with each image.
- **Real-time Processing**: Quick processing of impressions and strategy outcomes.
- **Selective Visual Feedback**: Users see only the image associated with the successful strategy, maintaining the integrity of the psychic experience.
- **Optional Non-Target Image Reveal**: After the game, users can choose to view the image(s) not initially shown, allowing for reflection and learning.

## Technical Stack

- **Frontend**: React with Next.js
- **Backend**: Node.js
- **AI Models**: OpenAI GPT, Claude, and Llava for impression analysis and image matching
- **Database**: File-based JSON storage
- **Styling**: Tailwind CSS

## Setup Instructions

1. Clone the repository:
   ```
   git clone https://github.com/bazmatic/rv-investor.git
   ```

2. Install dependencies:
   ```
   cd rv-investor
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

4. Add strategy images:
   Place your random images in the `public/images` directory.

5. Run the development server:
   ```
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:3000` to start playing!

## Contributing

We welcome contributions to improve the Psychic Investment Game! Please feel free to submit issues, feature requests, or pull requests.

