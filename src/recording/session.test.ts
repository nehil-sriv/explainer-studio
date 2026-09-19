import { describe, expect, it, vi } from 'vitest';
import {
  RecordingSession,
  pickMimeType,
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
    expect(recordingFilename(new Date('2026-01-02T03:04:05Z'))).toBe(
      'explainer-2026-01-02-03-04-05.webm',
    );
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

  it('throws a readable error with no capture API', async () => {
    vi.stubGlobal('navigator', {});
    try {
      await expect(startRegionCapture(null)).rejects.toThrow(/not supported/);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
