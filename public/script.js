const message = document.getElementById("message");
const transcribedText = document.getElementById("transcribed-text");
const redDot = document.getElementById("red-dot");

let mediaRecorder;
let audioChunks = [];
let startTime; // Add this line to store the start time

navigator.mediaDevices
  .getUserMedia({ audio: true })
  .then((stream) => {
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.addEventListener("dataavailable", (event) => {
      audioChunks.push(event.data);
    });

    mediaRecorder.addEventListener("start", () => {
      message.textContent = "Recording...";
      redDot.classList.remove("hidden");
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
            transcribedText.textContent = data.transcription;
            message.textContent = "Hold b key to start recording";

            // Calculate and display latency
            const endTime = performance.now();
            const latency = endTime - startTime;
            console.log(`Total latency: ${latency.toFixed(2)} ms`);
            message.textContent += ` (Latency: ${latency.toFixed(2)} ms)`;
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
  if (event.key === "b") {
    if (!mediaRecorder || mediaRecorder.state === "recording") return;
    audioChunks = [];
    mediaRecorder.start();
  }
});

document.addEventListener("keyup", (event) => {
  if (
    event.key === "b" &&
    mediaRecorder &&
    mediaRecorder.state === "recording"
  ) {
    mediaRecorder.stop();
  }
});

function convertToWav(audioBlob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
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
    reader.readAsArrayBuffer(audioBlob);
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
