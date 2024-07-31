# Voice-to-Text Transcription App

## Overview

This is a simple web-based voice-to-text transcription application. The primary goal of this app is to test out transcription latency. 

The app allows users to record audio by holding down the `b` key, then automatically transcribes the audio using OpenAI's Whisper model on key release. The app includes latency benchmarking to measure the performance of the transcription process after the user releases the key.

## Features

- Real-time audio recording
- Automatic transcription using OpenAI's Whisper model
- Latency benchmarking for performance measurement
- Simple and intuitive user interface

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v12.0.0 or higher)
- npm (usually comes with Node.js)
- An OpenAI API key

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/voice-to-text-app.git
   cd voice-to-text-app
   ```

2. Install the dependencies:

   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

## Usage

1. Start the server:

   ```
   node server.js
   ```

2. Open a web browser and navigate to `http://localhost:3000`

3. To record audio, hold down the 'b' key. Release the key to stop recording and initiate transcription.

4. The transcribed text will appear on the screen, along with the latency measurement.

## File Structure

- `index.html`: The main HTML file for the web interface
- `script.js`: Client-side JavaScript for handling audio recording and UI updates
- `server.js`: Server-side code for handling file uploads and interacting with the OpenAI API
- `public/`: Directory for static files (if any)
- `uploads/`: Temporary directory for storing audio files (created automatically)

## Troubleshooting

If you encounter the error "Unrecognized file format", ensure that:

1. The audio is being correctly converted to WAV format on the client-side.
2. The server is correctly receiving and processing the WAV file.
3. Your OpenAI API key has the necessary permissions for audio transcription.

## Contributing

Contributions to this project are welcome. Please fork the repository and create a pull request with your changes.

## License

[MIT License](https://opensource.org/licenses/MIT)

## Contact

If you have any questions or feedback, please open an issue in the GitHub repository.
