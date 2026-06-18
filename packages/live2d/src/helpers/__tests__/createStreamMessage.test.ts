import {
  STREAM_MESSAGE_START_EVENT_NAME,
  type StreamMessageStartEventDetail,
} from "@/live2d/events/stream-message";
import { describe, expect, it, vi } from "vitest";
import { createStreamMessage } from "../createStreamMessage";

describe("createStreamMessage", () => {
  it("dispatches stream start with the inactivity timeout", () => {
    const listener = vi.fn((event: Event) => {
      const detail = (event as CustomEvent<StreamMessageStartEventDetail>)
        .detail;
      expect(detail).toEqual({
        timeout: 1000,
      });
    });
    window.addEventListener(STREAM_MESSAGE_START_EVENT_NAME, listener);

    try {
      createStreamMessage(1000, 2000);
    } finally {
      window.removeEventListener(STREAM_MESSAGE_START_EVENT_NAME, listener);
    }

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
