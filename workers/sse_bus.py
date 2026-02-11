import asyncio
import json
from collections import defaultdict


class SSEBus:
    """In-process pub/sub for SSE events keyed by run_id."""

    def __init__(self):
        self._subscribers: dict[int, list[asyncio.Queue]] = defaultdict(list)

    def subscribe(self, run_id: int) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        self._subscribers[run_id].append(q)
        return q

    def unsubscribe(self, run_id: int, q: asyncio.Queue):
        subs = self._subscribers.get(run_id, [])
        if q in subs:
            subs.remove(q)
        if not subs:
            self._subscribers.pop(run_id, None)

    async def publish(self, run_id: int, event: str, data: dict):
        payload = json.dumps(data)
        for q in self._subscribers.get(run_id, []):
            await q.put((event, payload))

    def clear(self):
        self._subscribers.clear()


sse_bus = SSEBus()
