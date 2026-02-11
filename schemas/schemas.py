from datetime import datetime
from typing import Any
from pydantic import BaseModel


# --- Suite ---
class SuiteCreate(BaseModel):
    name: str
    description: str | None = None
    tags: list[str] = []

class SuiteUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    tags: list[str] | None = None

class QueryOut(BaseModel):
    id: int
    suite_id: int
    ordinal: int
    tag: str | None
    query_text: str
    expected_answer: str
    comments: str | None

    model_config = {"from_attributes": True}

class SuiteOut(BaseModel):
    id: int
    name: str
    description: str | None
    tags: list[str]
    created_at: datetime
    updated_at: datetime
    query_count: int = 0

    model_config = {"from_attributes": True}

class SuiteDetailOut(SuiteOut):
    queries: list[QueryOut] = []


# --- Query ---
class QueryCreate(BaseModel):
    tag: str | None = None
    query_text: str
    expected_answer: str
    comments: str | None = None


# --- Agent ---
class AgentCreate(BaseModel):
    name: str
    executor_type: str = "openai_agents"
    model: str
    system_prompt: str | None = None
    tools_config: dict | None = None
    model_settings: dict | None = None
    tags: list[str] = []

class AgentUpdate(BaseModel):
    name: str | None = None
    executor_type: str | None = None
    model: str | None = None
    system_prompt: str | None = None
    tools_config: dict | None = None
    model_settings: dict | None = None
    tags: list[str] | None = None

class AgentOut(BaseModel):
    id: int
    name: str
    executor_type: str
    model: str
    system_prompt: str | None
    tools_config: dict | None
    model_settings: dict | None
    tags: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Run ---
class RunCreate(BaseModel):
    suite_id: int
    agent_config_id: int
    label: str
    tags: list[str] = []
    batch_size: int = 10
    query_ids: list[int] | None = None  # None = all queries
    output_dir: str | None = None  # default ~/benchmark_app_data/<label>
    repeat: int = 1  # run N times

class RunOut(BaseModel):
    id: int
    suite_id: int
    agent_config_id: int
    label: str
    status: str
    progress_current: int
    progress_total: int
    batch_size: int
    error_message: str | None
    output_dir: str | None
    run_group: str | None
    run_number: int = 1
    tags: list[str]
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}

class RunDetailOut(RunOut):
    suite_name: str = ""
    agent_name: str = ""


# --- Result ---
class ResultOut(BaseModel):
    id: int
    run_id: int
    query_id: int
    agent_response: str | None
    tool_calls: Any = None
    reasoning: Any = None
    usage: Any = None
    execution_time_seconds: float | None
    error: str | None
    created_at: datetime
    grade: "GradeOut | None" = None
    query: QueryOut | None = None

    model_config = {"from_attributes": True}


# --- Grade ---
class GradeCreate(BaseModel):
    grade: str  # correct, partial, wrong
    notes: str | None = None

class GradeOut(BaseModel):
    id: int
    result_id: int
    grade: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Analytics ---
class GradeCountsOut(BaseModel):
    correct: int = 0
    partial: int = 0
    wrong: int = 0
    total: int = 0
    accuracy: float = 0.0
    weighted_score: float = 0.0

class StatsOut(BaseModel):
    mean: float = 0
    median: float = 0
    std: float = 0
    min: float = 0
    max: float = 0
    n: int = 0

class RunAnalyticsOut(BaseModel):
    run_id: int
    label: str
    grade_counts: GradeCountsOut
    by_type: dict[str, GradeCountsOut] = {}
    performance: dict[str, StatsOut] = {}
    tool_usage: dict[str, int] = {}

class CompareAnalyticsOut(BaseModel):
    runs: list[RunAnalyticsOut]
    consistency: dict[str, int] = {}


# --- Comparison ---
class ComparisonCreate(BaseModel):
    run_ids: list[int]
    name: str | None = None

class ComparisonOut(BaseModel):
    id: int
    name: str | None
    suite_id: int
    suite_name: str = ""
    run_ids: list[int] = []
    run_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
