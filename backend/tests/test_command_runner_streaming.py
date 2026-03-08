"""Command runner line streaming tests."""

import asyncio
import unittest

from app.services.workspace.command_runner import command_runner
from app.services.workspace.config import workspace_config


class CommandRunnerStreamingTest(unittest.TestCase):
    def test_stdout_stderr_streamed(self):
        async def _run():
            stdout_lines = []
            stderr_lines = []

            result = await command_runner.run(
                command=[
                    "python3",
                    "-c",
                    "import sys;print('line-1');print('line-2');print('err-1', file=sys.stderr)",
                ],
                cwd=workspace_config.temp_root,
                timeout_sec=10,
                on_stdout=lambda line: stdout_lines.append(line),
                on_stderr=lambda line: stderr_lines.append(line),
            )

            self.assertTrue(result.ok)
            self.assertIn("line-1", stdout_lines)
            self.assertIn("line-2", stdout_lines)
            self.assertIn("err-1", stderr_lines)

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
