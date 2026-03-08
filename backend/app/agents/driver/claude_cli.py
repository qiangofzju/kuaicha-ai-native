"""Claude Code CLI driver – invokes the ``claude`` CLI as a subprocess."""

import asyncio
import codecs
import json
import os
from typing import AsyncGenerator, Optional

from app.agents.driver.base_driver import BaseDriver, DriverResponse
from app.config import settings
from app.utils.logger import logger


class ClaudeCodeCLIDriver(BaseDriver):
    """Driver that calls the Claude Code CLI (``claude``) via subprocess.

    Requires the ``claude`` binary to be available on ``$PATH``.
    Supports custom config dir via ``CLAUDE_CONFIG_DIR`` setting
    (equivalent to the ``claude-glm`` alias).
    """

    def __init__(self):
        self.binary = settings.CLAUDE_CLI_BINARY
        self.model = settings.CLAUDE_MODEL
        self.timeout = settings.CLI_TIMEOUT

        # Build subprocess env: inherit current env, optionally override config dir
        self.env: Optional[dict] = None
        if settings.CLAUDE_CONFIG_DIR:
            self.env = {**os.environ, "CLAUDE_CONFIG_DIR": os.path.expanduser(settings.CLAUDE_CONFIG_DIR)}

    def _build_cmd(
        self,
        prompt: str,
        system: str = "",
        output_format: str = "json",
        json_schema: Optional[dict] = None,
    ) -> list[str]:
        """Build the CLI command args."""
        cmd = [
            self.binary,
            "-p",
            prompt,
            "--model",
            self.model,
            "--output-format",
            output_format,
            "--no-session-persistence",
            "--dangerously-skip-permissions",
        ]
        if output_format == "stream-json":
            cmd.append("--verbose")
        if system:
            cmd.extend(["--system-prompt", system])
        if json_schema is not None:
            cmd.extend(["--json-schema", json.dumps(json_schema)])
        return cmd

    async def call(
        self,
        prompt: str,
        system: str = "",
        json_schema: Optional[dict] = None,
    ) -> DriverResponse:
        """Execute ``claude -p`` and capture the full response."""
        cmd = self._build_cmd(prompt, system=system, json_schema=json_schema)

        logger.info("ClaudeCodeCLIDriver.call: spawning subprocess")
        logger.debug("CMD: %s", " ".join(cmd[:6]) + " ...")

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self.env,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=self.timeout,
                )
            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                logger.error("Claude CLI timed out after %ds", self.timeout)
                return DriverResponse(
                    content=f"[Error] CLI call timed out after {self.timeout}s",
                    model=self.model,
                )

            if proc.returncode != 0:
                err_msg = stderr.decode("utf-8", errors="replace")
                logger.error("Claude CLI error (rc=%d): %s", proc.returncode, err_msg)
                return DriverResponse(
                    content=f"[CLI Error] {err_msg}",
                    model=self.model,
                )

            raw = stdout.decode("utf-8", errors="replace")

            # The CLI with --output-format json returns a JSON envelope
            # with the model's text in the "result" field.
            try:
                data = json.loads(raw)
                content = data.get("result", raw)
                is_error = data.get("is_error", False)
                if is_error:
                    logger.warning("Claude CLI reported is_error=true")

                usage_data = data.get("usage", {})
                usage = {
                    "input_tokens": usage_data.get("input_tokens", 0),
                    "output_tokens": usage_data.get("output_tokens", 0),
                    "cost_usd": data.get("total_cost_usd"),
                    "duration_ms": data.get("duration_ms"),
                }
            except json.JSONDecodeError:
                content = raw
                usage = None

            return DriverResponse(
                content=content,
                usage=usage,
                model=self.model,
            )

        except FileNotFoundError:
            logger.error("claude binary not found on PATH")
            return DriverResponse(
                content="[Error] claude CLI binary not found. Please install Claude Code.",
                model=self.model,
            )
        except Exception as exc:
            logger.exception("Unexpected error in ClaudeCodeCLIDriver.call")
            return DriverResponse(
                content=f"[Error] {exc}",
                model=self.model,
            )

    async def call_streaming(
        self, prompt: str, system: str = ""
    ) -> AsyncGenerator[str, None]:
        """Stream output from ``claude -p`` with ``--output-format stream-json``.

        Handles multiple stream-json event types:
        - ``content_block_delta`` with ``text_delta`` (incremental chunks)
        - ``assistant`` with nested ``message.content`` blocks
        - ``result`` as fallback when no streaming deltas were received
        """
        cmd = self._build_cmd(prompt, system=system, output_format="stream-json")

        logger.info("ClaudeCodeCLIDriver.call_streaming: spawning subprocess")

        def parse_stream_line(line_text: str) -> list[str]:
            nonlocal streamed
            chunks: list[str] = []

            text = line_text.strip()
            if not text:
                return chunks

            logger.debug("stream-json line(len=%s): %s", len(text), text[:200])

            try:
                data = json.loads(text)
                msg_type = data.get("type", "")

                if msg_type == "content_block_delta":
                    delta = data.get("delta", {})
                    if delta.get("type") == "text_delta":
                        chunk = delta.get("text", "")
                        if chunk:
                            streamed = True
                            chunks.append(chunk)

                elif msg_type == "assistant":
                    message = data.get("message", data)
                    content = message.get("content", "")
                    if isinstance(content, list):
                        for block in content:
                            if isinstance(block, dict) and block.get("type") == "text":
                                block_text = block.get("text", "")
                                if block_text:
                                    streamed = True
                                    chunks.append(block_text)
                    elif isinstance(content, str) and content:
                        streamed = True
                        chunks.append(content)

                elif msg_type == "result":
                    if not streamed:
                        result_text = data.get("result", "")
                        if result_text:
                            chunks.append(result_text)

            except json.JSONDecodeError:
                streamed = True
                chunks.append(text)

            return chunks

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self.env,
            )

            streamed = False

            assert proc.stdout is not None
            decoder = codecs.getincrementaldecoder("utf-8")("replace")
            text_buffer = ""

            while True:
                chunk = await proc.stdout.read(65536)
                if not chunk:
                    break

                text_buffer += decoder.decode(chunk)
                lines = text_buffer.split("\n")
                text_buffer = lines.pop() if lines else ""

                for line in lines:
                    for out in parse_stream_line(line):
                        yield out

            text_buffer += decoder.decode(b"", final=True)
            if text_buffer.strip():
                for out in parse_stream_line(text_buffer):
                    yield out

            await proc.wait()

            # If nothing was streamed, check stderr for errors
            if not streamed:
                assert proc.stderr is not None
                stderr_bytes = await proc.stderr.read()
                stderr_text = stderr_bytes.decode("utf-8", errors="replace").strip()
                rc = proc.returncode
                logger.error(
                    "call_streaming produced no output (rc=%s): stderr=%s",
                    rc, stderr_text[:500],
                )
                if stderr_text:
                    yield f"[Error] CLI stream failed (rc={rc}): {stderr_text[:300]}"
                else:
                    yield f"[Error] CLI stream produced no output (rc={rc})"

        except asyncio.CancelledError:
            if 'proc' in locals() and proc.returncode is None:
                proc.terminate()
                try:
                    await asyncio.wait_for(proc.wait(), timeout=2)
                except asyncio.TimeoutError:
                    proc.kill()
                    await proc.wait()
            raise

        except FileNotFoundError:
            yield "[Error] claude CLI binary not found."
        except Exception as exc:
            logger.exception("Unexpected error in ClaudeCodeCLIDriver.call_streaming")
            yield f"[Error] {exc}"

    async def call_streaming_events(
        self, prompt: str, system: str = ""
    ) -> AsyncGenerator[dict, None]:
        """Stream parsed ``stream-json`` events from ``claude -p``."""
        cmd = self._build_cmd(prompt, system=system, output_format="stream-json")

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self.env,
            )

            assert proc.stdout is not None
            decoder = codecs.getincrementaldecoder("utf-8")("replace")
            text_buffer = ""

            async def emit_line(line_text: str) -> AsyncGenerator[dict, None]:
                text = line_text.strip()
                if not text:
                    return
                try:
                    data = json.loads(text)
                except json.JSONDecodeError:
                    yield {"kind": "raw_text", "text": text}
                    return

                msg_type = data.get("type", "")
                if msg_type == "content_block_delta":
                    delta = data.get("delta", {})
                    if delta.get("type") == "text_delta":
                        chunk = delta.get("text", "")
                        if chunk:
                            yield {"kind": "text_delta", "text": chunk, "raw": data}
                            return
                elif msg_type == "assistant":
                    message = data.get("message", data)
                    content = message.get("content", "")
                    if isinstance(content, list):
                        for block in content:
                            if isinstance(block, dict) and block.get("type") == "text":
                                block_text = block.get("text", "")
                                if block_text:
                                    yield {"kind": "assistant_text", "text": block_text, "raw": data}
                        return
                    if isinstance(content, str) and content:
                        yield {"kind": "assistant_text", "text": content, "raw": data}
                        return

                yield {"kind": "raw_event", "type": msg_type, "raw": data}

            while True:
                chunk = await proc.stdout.read(65536)
                if not chunk:
                    break

                text_buffer += decoder.decode(chunk)
                lines = text_buffer.split("\n")
                text_buffer = lines.pop() if lines else ""

                for line in lines:
                    async for event in emit_line(line):
                        yield event

            text_buffer += decoder.decode(b"", final=True)
            if text_buffer.strip():
                async for event in emit_line(text_buffer):
                    yield event

            await proc.wait()
        except FileNotFoundError:
            yield {"kind": "error", "text": "claude CLI binary not found"}
        except Exception as exc:
            logger.exception("Unexpected error in ClaudeCodeCLIDriver.call_streaming_events")
            yield {"kind": "error", "text": str(exc)}
