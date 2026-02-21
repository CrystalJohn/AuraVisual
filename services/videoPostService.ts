// ─── Video Post-Production Service ──────────────────────────────────
// Lightweight browser-based video concatenation using Canvas + MediaRecorder
// No ffmpeg.wasm needed — fast and gives real-time progress

// ─── Concatenate Video Clips ────────────────────────────────────────

export const concatenateClips = async (
  videoUrls: string[],
  onProgress?: (progress: number) => void
): Promise<string> => {
  if (videoUrls.length === 0) throw new Error("No clips to concatenate");
  if (videoUrls.length === 1) return videoUrls[0];

  onProgress?.(2);

  // Step 1: Pre-load all videos to get metadata
  const videos: HTMLVideoElement[] = [];
  let totalDuration = 0;

  for (let i = 0; i < videoUrls.length; i++) {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true; // Needed to allow play without interaction
    video.playsInline = true;
    video.preload = "auto";
    video.src = videoUrls[i];

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Video ${i + 1} failed to load (timeout)`)), 15000);
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        console.log(`[PostPro] Clip ${i + 1}: ${video.videoWidth}x${video.videoHeight}, ${video.duration.toFixed(1)}s`);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Video ${i + 1} failed to load`));
      };
    });

    totalDuration += video.duration;
    videos.push(video);
    onProgress?.(5 + (i / videoUrls.length) * 10);
  }

  console.log(`[PostPro] Total duration: ${totalDuration.toFixed(1)}s across ${videos.length} clips`);
  onProgress?.(15);

  // Step 2: Create canvas with the first video's dimensions
  const canvas = document.createElement("canvas");
  const firstVideo = videos[0];
  canvas.width = firstVideo.videoWidth || 1280;
  canvas.height = firstVideo.videoHeight || 720;
  const ctx = canvas.getContext("2d")!;

  // Step 3: Set up MediaRecorder
  const stream = canvas.captureStream(30); // 30fps
  
  // Find supported MIME type
  const mimeType = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ].find((t) => MediaRecorder.isTypeSupported(t)) || "video/webm";

  console.log(`[PostPro] Recording with: ${mimeType}`);

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 5_000_000, // 5 Mbps
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.start(100); // Collect data every 100ms for responsiveness

  // Step 4: Play each video sequentially and draw to canvas
  let elapsedTime = 0;

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    const clipDuration = video.duration;

    video.currentTime = 0;
    video.muted = true;

    console.log(`[PostPro] Playing clip ${i + 1}/${videos.length} (${clipDuration.toFixed(1)}s)`);

    // Play the video
    await video.play();

    // Draw frames until this clip ends
    await new Promise<void>((resolve) => {
      const drawFrame = () => {
        if (video.ended || video.paused) {
          resolve();
          return;
        }

        // Draw current frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Update progress
        const currentElapsed = elapsedTime + video.currentTime;
        const progress = 15 + (currentElapsed / totalDuration) * 80;
        onProgress?.(Math.round(Math.min(95, progress)));

        requestAnimationFrame(drawFrame);
      };

      video.onended = () => resolve();
      video.onpause = () => {
        if (video.currentTime >= clipDuration - 0.1) resolve();
      };

      drawFrame();
    });

    video.pause();
    elapsedTime += clipDuration;

    console.log(`[PostPro] Clip ${i + 1} done. Elapsed: ${elapsedTime.toFixed(1)}s`);
  }

  // Step 5: Stop recording and collect output
  onProgress?.(95);

  return new Promise<string>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size < 1000) {
        reject(new Error("Recording produced empty output"));
        return;
      }
      const url = URL.createObjectURL(blob);
      console.log(`[PostPro] Done! Output: ${(blob.size / 1024 / 1024).toFixed(1)} MB`);
      onProgress?.(100);
      resolve(url);
    };
    recorder.onerror = (e) => reject(new Error(`Recording error: ${e}`));
    recorder.stop();
  });
};

// ─── Download Helper ────────────────────────────────────────────────

export const downloadVideo = (url: string, filename: string = "short_film.webm") => {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
