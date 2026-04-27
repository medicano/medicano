import os
from pathlib import Path
from typing import List
from crewai import Agent, Crew, LLM, Process, Task
from crewai.agents.agent_builder.base_agent import BaseAgent
from crewai.project import CrewBase, agent, crew, task
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[4] / ".env", override=True)

PROVIDER = os.getenv("LLM_PROVIDER", "openrouter")


def _llm(openrouter_model: str, vertex_model: str) -> LLM:
    if PROVIDER == "vertex":
        return LLM(model=vertex_model)
    return LLM(model=f"openrouter/{openrouter_model}", is_litellm=True)


_architect_llm = _llm(
    os.getenv("ARCHITECT_MODEL", "anthropic/claude-opus-4-7"),
    os.getenv("VERTEX_ARCHITECT_MODEL", "vertex_ai/claude-opus-4-7"),
)
_developer_llm = _llm(
    os.getenv("DEVELOPER_MODEL", "anthropic/claude-sonnet-4-6"),
    os.getenv("VERTEX_DEVELOPER_MODEL", "vertex_ai/claude-sonnet-4-6"),
)
_documenter_llm = _llm(
    os.getenv("DOCUMENTER_MODEL", "google/gemini-2.5-flash"),
    os.getenv("VERTEX_DOCUMENTER_MODEL", "vertex_ai/gemini-2.5-flash"),
)
_reviewer_llm = _llm(
    os.getenv("REVIEWER_MODEL", "anthropic/claude-opus-4-7"),
    os.getenv("VERTEX_REVIEWER_MODEL", "vertex_ai/claude-opus-4-7"),
)


@CrewBase
class DevCrew:
    """Medicano development crew."""

    agents: List[BaseAgent]
    tasks: List[Task]

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    # ========================
    # AGENTS
    # ========================

    @agent
    def architect(self) -> Agent:
        return Agent(
            config=self.agents_config["architect"],  # type: ignore[index]
            llm=_architect_llm,
            verbose=True,
        )

    @agent
    def developer(self) -> Agent:
        return Agent(
            config=self.agents_config["developer"],  # type: ignore[index]
            llm=_developer_llm,
            verbose=True,
        )

    @agent
    def documenter(self) -> Agent:
        return Agent(
            config=self.agents_config["documenter"],  # type: ignore[index]
            llm=_documenter_llm,
            verbose=True,
        )

    @agent
    def reviewer(self) -> Agent:
        return Agent(
            config=self.agents_config["reviewer"],  # type: ignore[index]
            llm=_reviewer_llm,
            verbose=True,
        )

    # ========================
    # TASKS
    # ========================

    @task
    def plan(self) -> Task:
        return Task(config=self.tasks_config["plan"])  # type: ignore[index]

    @task
    def implement(self) -> Task:
        return Task(config=self.tasks_config["implement"])  # type: ignore[index]

    @task
    def document(self) -> Task:
        return Task(config=self.tasks_config["document"])  # type: ignore[index]

    @task
    def review(self) -> Task:
        return Task(
            config=self.tasks_config["review"],  # type: ignore[index]
            output_file="output/review.md",
        )

    # ========================
    # CREW
    # ========================

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )
