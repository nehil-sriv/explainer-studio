import { describe, expect, it, vi } from 'vitest';
import {
  RecordingSession,
  mimeExtension,
  pickMimeType,
  recordingBitrate,
  recordingFilename,
  startRegionCapture,
} from './session.js';

class MockRecorder {
  state = 'inactive';
  ondataavailable: ((ev: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(
    private stream: unknown,
    private opts: { mimeType?: string },
  ) {
    void stream;
    void opts;
  }
  start(): void {
    this.state = 'recording';
    this.ondataavailable?.({ data: new Blob(['chunk1']) });
    this.ondataavailable?.({ data: new Blob(['chunk2']) });
  }
  stop(): void {
    this.state = 'inactive';
    this.onstop?.();
  }
}

const fakeStream = () => {
  const stop = vi.fn();
  return {
    getTracks: () => [{ stop }],
    getVideoTracks: () => [{ stop, cropTo: vi.fn().mockResolvedValue(undefined) }],
    _stop: stop,
  } as unknown as MediaStream & { _stop: () => void };
};

describe('recording session', () => {
  it('collects chunks and resolves the assembled blob on stop', async () => {
    const stream = fakeStream();
    const seen: { blob: Blob; name: string }[] = [];
    const session = new RecordingSession(stream, {
      mimeType: 'video/webm',
      recorderFactory: (s, o) => new MockRecorder(s, o),
      onBlob: (blob, name) => seen.push({ blob, name }),
    });
    expect(session.active).toBe(false);
    session.start();
    expect(session.active).toBe(true);
    const blob = await session.stop();
    expect(blob.size).toBe(new Blob(['chunk1chunk2']).size);
    expect(seen.length).toBe(1);
    expect(seen[0].name).toMatch(/^explainer-.*\.webm$/);
    expect(stream._stop).toHaveBeenCalled();
  });

  it('stop without start resolves an empty blob', async () => {
    const blob = await new RecordingSession(fakeStream()).stop();
    expect(blob.size).toBe(0);
  });

  it('pickMimeType cascades vp9 → vp8 → webm → default', () => {
    expect(pickMimeType((t) => t.includes('vp9'))).toBe('video/webm;codecs=vp9');
    expect(pickMimeType((t) => t.includes('vp8'))).toBe('video/webm;codecs=vp8');
    expect(pickMimeType((t) => t === 'video/webm')).toBe('video/webm');
    expect(pickMimeType(() => false)).toBe('');
    expect(pickMimeType(undefined)).toBe('');
    const at = new Date('2026-01-02T03:04:05Z');
    expect(recordingFilename('video/webm;codecs=vp9', at)).toBe(
      'explainer-2026-01-02-03-04-05.webm',
    );
    // the file takes the container MediaRecorder produced, not a fixed one
    expect(recordingFilename('video/mp4;codecs=avc1.42001f', at)).toBe(
      'explainer-2026-01-02-03-04-05.mp4',
    );
    expect(mimeExtension('video/mp4')).toBe('mp4');
    expect(mimeExtension('video/webm')).toBe('webm');
    expect(mimeExtension(undefined)).toBe('webm');
  });

  it('tags the blob with the container only (codecs break playback)', async () => {
    const session = new RecordingSession(fakeStream(), {
      mimeType: 'video/mp4;codecs=avc1.42001f',
      recorderFactory: (s, o) => new MockRecorder(s, o),
    });
    session.start();
    const blob = await session.stop();
    expect(blob.type).toBe('video/mp4');
  });

  it('region capture crops when supported, degrades gracefully', async () => {
    const stream = fakeStream();
    const getDisplayMedia = vi.fn().mockResolvedValue(stream);
    vi.stubGlobal('navigator', { mediaDevices: { getDisplayMedia } });
    try {
      const el = document.createElement('div');
      const cap = await startRegionCapture(el);
      expect(cap.stream).toBe(stream);
      expect(getDisplayMedia).toHaveBeenCalledTimes(1);
      cap.cleanup();
      // Safari path: hints rejected → bare retry
      getDisplayMedia.mockRejectedValueOnce(new Error('denied')).mockResolvedValueOnce(stream);
      await startRegionCapture(el);
      expect(getDisplayMedia).toHaveBeenCalledTimes(3);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('clamps the recording bitrate to 8–50 Mbps', () => {
    expect(recordingBitrate(1920, 1080)).toBe(12_441_600);
    expect(recordingBitrate(320, 240)).toBe(8_000_000);
    expect(recordingBitrate(7680, 4320)).toBe(50_000_000);
  });

  it('throws a readable error with no capture API', async () => {
    vi.stubGlobal('navigator', {});
    try {
      await expect(startRegionCapture(null)).rejects.toThrow(/not supported/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
