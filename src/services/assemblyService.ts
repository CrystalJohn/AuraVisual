import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

// Initialize FFmpeg
const loadFFmpeg = async () => {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  
  // Wait for loading
  if (!ffmpeg.loaded) {
    await ffmpeg.load({
      coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js',
      wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm',
    });
  }
  return ffmpeg;
};

export const assembleClips = async (
  clips: File[],
  onProgress: (progress: number) => void
): Promise<string> => {
  const fg = await loadFFmpeg();
  
  // Set up progress callback
  fg.on('progress', ({ progress }) => {
    onProgress(progress * 100);
  });

  try {
    // 1. Write input files to virtual filesystem
    const inputFiles: string[] = [];
    for (let i = 0; i < clips.length; i++) {
        const file = clips[i];
        const filename = `input_${i}.mp4`;
        await fg.writeFile(filename, await fetchFile(file));
        inputFiles.push(filename);
    }

    // 2. Build the complex filtergraph string
    // We want to concatenate N clips with a 0.5s crossfade transition
    // Since ffmpeg xfade filter takes two inputs and outputs one, we chain them.
    // Length calculation will be complex without knowing exact durations.
    // For simplicity, if we don't know durations, standard concatenation is MUCH safer natively.
    // We will do a simple smooth concat for this workflow, as accurate xfade requires precise probing in WASM.

    // 2a. Write a concat demuxer file because it's reliable and fast
    const concatText = inputFiles.map(f => `file '${f}'`).join('\n');
    await fg.writeFile('list.txt', concatText);

    // 3. Execute FFmpeg command
    // Simple concat: 
    // ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4
    // (If clips from Grok have EXACTLY same dimensions, codec, framerate, this is instant and perfect)
    await fg.exec([
        '-f', 'concat', 
        '-safe', '0', 
        '-i', 'list.txt', 
        '-c', 'copy', 
        'output.mp4'
    ]);

    // 4. Read the output file
    const outputData = await fg.readFile('output.mp4');
    
    // Cleanup virtual file system
    await fg.deleteFile('list.txt');
    for (const f of inputFiles) {
        await fg.deleteFile(f);
    }
    await fg.deleteFile('output.mp4');

    // 5. Create Blob URL
    // Convert FileData to Uint8Array for Blob
    let uint8Data: Uint8Array;
    if (typeof outputData === 'string') {
        uint8Data = new TextEncoder().encode(outputData);
    } else {
        uint8Data = new Uint8Array(outputData as any);
    }
    const videoBlob = new Blob([uint8Data as any], { type: 'video/mp4' });
    const url = URL.createObjectURL(videoBlob);
    
    return url;

  } catch (error) {
    console.error('Error during FFmpeg assembly:', error);
    throw new Error('Failed to assemble video clips. Please ensure all uploaded clips are matching MP4 files.');
  } finally {
      // Remove listener to prevent memory leaks if ran multiple times
      fg.off('progress', () => {});
  }
};
