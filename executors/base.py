from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ExecutionResult:
    response: str = ""
    tool_calls: list[dict] = field(default_factory=list)
    reasoning: list[dict] = field(default_factory=list)
    usage: dict = field(default_factory=dict)
    execution_time_seconds: float = 0.0
    error: str | None = None


class AgentExecutor(ABC):
    @abstractmethod
    async def execute(self, query: str, config: dict) -> ExecutionResult:
        """Execute a single query against the agent.

        Args:
            query: The query text to send
            config: Dict with keys: system_prompt, model, tools_config, model_settings

        Returns:
            ExecutionResult with response and metadata
        """
        ...

    @staticmethod
    @abstractmethod
    def executor_type() -> str:
        """Return the executor type identifier, e.g. 'openai_agents'."""
        ...
