const message = document.getElementById("message");
const subtext = document.getElementById("subtext");
const latencyText = document.getElementById("latency");
const redDot = document.getElementById("red-dot");

let mediaRecorder;
let audioChunks = [];
let startTime;
let chunkInterval;
let transcriptionParts = [];
let isRecording = false;
let chunkSize = 2000; // Default chunk size in milliseconds

navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then((stream) => {
    mediaRecorder = new MediaRecorder(stream);

    // Add event listener for chunk size input
    document.getElementById('chunkSizeInput').addEventListener('change', updateChunkSize);

    mediaRecorder.addEventListener("dataavailable", (event) => {
      audioChunks.push(event.data);
    });

    mediaRecorder.addEventListener("start", () => {
      message.textContent = "Recording...";
      redDot.classList.remove("hidden");
      subtext.textContent = "";
      latencyText.textContent = "";
    });

    mediaRecorder.addEventListener("stop", () => {
      message.textContent = "Processing audio...";
      redDot.classList.add("hidden");
      startTime = performance.now(); // Start timing when recording stops

      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      convertToWav(audioBlob).then((wavBlob) => {
        const formData = new FormData();
        formData.append("audio", wavBlob, "audio.wav");

        console.log("Sending audio file to server...");
        fetch("/transcribe", {
          method: "POST",
          body: formData,
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            console.log("Response from server:", data);
            message.textContent = data.transcription;
            subtext.textContent = "Hold b key to start recording";

            // Calculate and display latency
            const endTime = performance.now();
            const latency = endTime - startTime;
            console.log(`Total latency: ${latency.toFixed(2)} ms`);
            latencyText.textContent = ` (Latency: ${latency.toFixed(2)} ms)`;
          })
          .catch((error) => {
            console.error("Error:", error);
            message.textContent = "Failed to process audio";
          });
      });
    });
  })
  .catch((error) => {
    console.error("getUserMedia error:", error);
  });

document.addEventListener("keydown", (event) => {
  if (event.key === "b" && !isRecording) {
    isRecording = true;
    audioChunks = [];
    transcriptionParts = [];
    mediaRecorder.start();
    startTime = performance.now();
    chunkInterval = setInterval(sendAudioChunk, chunkSize); // Send chunk based on user-defined size
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key === "b" && isRecording) {
    isRecording = false;
    mediaRecorder.stop();
    clearInterval(chunkInterval);
    sendAudioChunk(); // Send any remaining audio
    finalizeTranscription();
  }
});

function convertToWav(audioChunks) {
  return new Promise((resolve, reject) => {
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const reader = new FileReader();
    reader.onload = function (event) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContext
        .decodeAudioData(event.target.result)
        .then((buffer) => {
          const wavBlob = new Blob([audioBufferToWav(buffer)], {
            type: "audio/wav",
          });
          resolve(wavBlob);
        })
        .catch(reject);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
}

function audioBufferToWav(buffer, opt) {
  opt = opt || {};

  var numChannels = buffer.numberOfChannels;
  var sampleRate = buffer.sampleRate;
  var format = opt.float32 ? 3 : 1;
  var bitDepth = format === 3 ? 32 : 16;

  var result;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  return encodeWAV(result, format, sampleRate, numChannels, bitDepth);
}

function encodeWAV(samples, format, sampleRate, numChannels, bitDepth) {
  var bytesPerSample = bitDepth / 8;
  var blockAlign = numChannels * bytesPerSample;

  var buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
  var view = new DataView(buffer);

  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * bytesPerSample, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, samples.length * bytesPerSample, true);
  if (format === 1) {
    // Raw PCM
    floatTo16BitPCM(view, 44, samples);
  } else {
    writeFloat32(view, 44, samples);
  }

  return buffer;
}

function interleave(inputL, inputR) {
  var length = inputL.length + inputR.length;
  var result = new Float32Array(length);

  var index = 0;
  var inputIndex = 0;

  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function writeFloat32(output, offset, input) {
  for (var i = 0; i < input.length; i++, offset += 4) {
    output.setFloat32(offset, input[i], true);
  }
}

function floatTo16BitPCM(output, offset, input) {
  for (var i = 0; i < input.length; i++, offset += 2) {
    var s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

function writeString(view, offset, string) {
  for (var i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function sendAudioChunk() {
  if (audioChunks.length === 0) return;

  const chunksToSend = audioChunks.splice(0, audioChunks.length);
  convertToWav(chunksToSend).then((wavBlob) => {
    const formData = new FormData();
    formData.append("audio", wavBlob, "audio.wav");

    fetch("/transcribe-chunk", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        transcriptionParts.push(data.transcription);
        updateTranscription();
      })
      .catch((error) => {
        console.error("Error sending audio chunk:", error);
      });
  });
}

function updateTranscription() {
  message.textContent = transcriptionParts.join(" ");
}

function finalizeTranscription() {
  const endTime = performance.now();
  const latency = endTime - startTime;
  console.log(`Total latency: ${latency.toFixed(2)} ms`);
  latencyText.textContent = ` (Latency: ${latency.toFixed(2)} ms)`;
  subtext.textContent = "Hold b key to start recording";
}

function updateChunkSize() {
  const newChunkSize = parseInt(document.getElementById('chunkSizeInput').value);
  if (!isNaN(newChunkSize) && newChunkSize > 0) {
    chunkSize = newChunkSize;
    console.log(`Chunk size updated to ${chunkSize} ms`);
  } else {
    console.error('Invalid chunk size');
  }
}
