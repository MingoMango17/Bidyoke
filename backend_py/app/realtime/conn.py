import asyncio
import json

from fastapi import WebSocket

from app.core.session import Member

OUTBOX_SIZE = 64


class Conn:
    """One socket plus a bounded outbox, so a slow phone can't stall a broadcast."""

    def __init__(self, ws: WebSocket, member: Member):
        self.ws = ws
        self.member = member
        self.out: asyncio.Queue[dict] = asyncio.Queue(maxsize=OUTBOX_SIZE)
        self._writer = asyncio.create_task(self._write_loop())

    async def _write_loop(self) -> None:
        try:
            while True:
                await self.ws.send_text(json.dumps(await self.out.get()))
        except Exception:
            pass  # socket gone; the read loop does cleanup

    def send(self, msg: dict) -> None:
        try:
            self.out.put_nowait(msg)
        except asyncio.QueueFull:
            asyncio.create_task(self._close(1013))

    async def _close(self, code: int) -> None:
        try:
            await self.ws.close(code=code)
        except Exception:
            pass

    async def close(self, code: int) -> None:
        self._writer.cancel()
        await self._close(code)

    def stop(self) -> None:
        self._writer.cancel()
