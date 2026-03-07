"""Command runner for sandbox workspace with streaming callbacks."""

from __future__ import annotations

import asyncio
import codecs
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Awaitable, Callable


LineCallback = Callable[[str], Awaitable[None] | None]


@dataclass
class CommandRunResult:
    """Structured command execution result."""

    command: list[str]
    exit_code: int
    stdout_lines: list[str] = field(default_factory=list)
    stderr_lines: list[str] = field(default_factory=list)
    duration_ms: int = 0
    timed_out: bool = False

    @property
    def ok(self) -> bool:
        return self.exit_code == 0 and not self.timed_out


class CommandRunner:
    """Execute one command with line-level streaming callbacks."""

    async def run(
        self,
        command: list[str],
        cwd: Path,
        input_text: str = "",
        env: dict[str, str] | None = None,
        timeout_sec: int = 60,
        on_stdout: LineCallback | None = None,
        on_stderr: LineCallback | None = None,
    ) -> CommandRunResult:
        started = time.time()
        proc = await asyncio.create_subprocess_exec(
            *command,
            cwd=str(cwd),
            env=env,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        if input_text and proc.stdin:
            proc.stdin.write(input_text.encode("utf-8"))
            await proc.stdin.drain()
        if proc.stdin:
            proc.stdin.close()

        stdout_lines: list[str] = []
        stderr_lines: list[str] = []

        async def _emit(cb: LineCallback | None, line: str) -> None:
            if cb is None:
                return
            resp = cb(line)
            if asyncio.iscoroutine(resp):
                await resp

        async def _pump(
            reader: asyncio.StreamReader | None,
            collector: list[str],
            cb: LineCallback | None,
        ) -> None:
            if reader is None:
                return

            decoder = codecs.getincrementaldecoder("utf-8")("replace")
            buffer = ""
            while True:
                chunk = await reader.read(4096)
                if not chunk:
                    break
                buffer += decoder.decode(chunk)
                while "\n" in buffer:
                    raw, buffer = buffer.split("\n", 1)
                    line = raw.rstrip("\r")
                    collector.append(line)
                    await _emit(cb, line)

            buffer += decoder.decode(b"", final=True)
            if buffer:
                line = buffer.rstrip("\r")
                collector.append(line)
                await _emit(cb, line)

        stdout_task = asyncio.create_task(_pump(proc.stdout, stdout_lines, on_stdout))
        stderr_task = asyncio.create_task(_pump(proc.stderr, stderr_lines, on_stderr))

        timed_out = False
        try:
            await asyncio.wait_for(proc.wait(), timeout=timeout_sec)
        except asyncio.CancelledError:
            proc.kill()
            await proc.wait()
            raise
        except asyncio.TimeoutError:
            timed_out = True
            proc.kill()
            await proc.wait()

        await asyncio.gather(stdout_task, stderr_task, return_exceptions=True)

        duration_ms = int((time.time() - started) * 1000)
        exit_code = int(proc.returncode or 0)
        if timed_out and exit_code == 0:
            exit_code = 124

        return CommandRunResult(
            command=command,
            exit_code=exit_code,
            stdout_lines=stdout_lines,
            stderr_lines=stderr_lines,
            duration_ms=duration_ms,
            timed_out=timed_out,
        )


command_runner = CommandRunner()
