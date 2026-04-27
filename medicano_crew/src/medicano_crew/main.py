import subprocess
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel
from crewai.flow import Flow, listen, start

load_dotenv(".env", override=True)

from medicano_crew.crews.content_crew.content_crew import DevCrew


def _strip_outer_codeblock(text: str) -> str:
    """Remove a wrapping ```lang...``` if the LLM wrapped the whole output in one."""
    lines = text.strip().splitlines()
    if len(lines) >= 2 and lines[0].startswith("```") and lines[-1].strip() == "```":
        return "\n".join(lines[1:-1])
    return text


# medicano_crew/ (3 parents up from src/medicano_crew/main.py)
CREW_DIR = Path(__file__).parent.parent.parent
# medicano-project/ — git root where Aider should run
PROJECT_ROOT = CREW_DIR.parent

_SCAN_DIRS = ["apps/api/src", "apps/web/src", "packages"]
_IGNORE_DIRS = {"node_modules", ".git", "dist", "coverage", "__pycache__"}

# Reference documents injected into every Aider call as read-only context.
# Paths are relative to PROJECT_ROOT.
_AIDER_READ_FILES = [
    "medicano_crew/docs/CONVENTIONS.md",
    "medicano_crew/docs/specs/feature-registry.md",
]

# Reference documents loaded and passed to CrewAI agents as context.
# Paths are relative to PROJECT_ROOT.
_CREW_CONTEXT_FILES = [
    "medicano_crew/docs/CONVENTIONS.md",
    "medicano_crew/docs/specs/feature-registry.md",
]


def _build_project_tree() -> str:
    lines = []
    for scan_dir in _SCAN_DIRS:
        root = PROJECT_ROOT / scan_dir
        if not root.exists():
            continue
        for path in sorted(root.rglob("*")):
            if any(part in _IGNORE_DIRS for part in path.parts):
                continue
            if path.is_file():
                lines.append(str(path.relative_to(PROJECT_ROOT)))
    return "\n".join(lines) if lines else "(no source files found)"


def _load_context_files() -> str:
    """Read reference documents and return them as a single concatenated string
    to be injected into the CrewAI task inputs so agents are aware of existing
    code, conventions, and the feature registry before planning anything."""
    sections: list[str] = []
    for rel_path in _CREW_CONTEXT_FILES:
        abs_path = PROJECT_ROOT / rel_path
        if abs_path.exists():
            content = abs_path.read_text(encoding="utf-8")
            sections.append(f"=== {rel_path} ===\n{content}")
        else:
            print(f"  ⚠️  Context file not found, skipping: {rel_path}")
    return "\n\n".join(sections)


class DevFlowState(BaseModel):
    run_id: str = ""
    request: str = ""
    implementation: str = ""
    result: str = ""


class MedicanoDevFlow(Flow[DevFlowState]):

    @start()
    def receive_request(self):
        self.state.run_id = datetime.now().strftime("%Y%m%d_%H%M%S")

        # When called from run_sprint.py, the request is passed via
        # flow.kickoff(inputs={"request": ...}) which pre-populates
        # self.state.request. Only fall back to interactive input if empty.
        if not self.state.request:
            self.state.request = input("\nWhat do you want to implement?\n> ")

        print(f"\n🚀 Starting development run [{self.state.run_id}]")
        print(f"   Request: {self.state.request[:120]}{'...' if len(self.state.request) > 120 else ''}\n")

    @listen(receive_request)
    def develop(self):
        project_tree = _build_project_tree()
        # Load conventions and feature registry so CrewAI agents know what
        # already exists before planning anything — prevents duplication.
        context_docs = _load_context_files()

        result = DevCrew().crew().kickoff(
            inputs={
                "request": self.state.request,
                "project_tree": project_tree,
                "conventions": context_docs,
            }
        )
        # tasks order: plan=0, implement=1, document=2, review=3
        self.state.implementation = result.tasks_output[1].raw
        self.state.result = str(result)

    @listen(develop)
    def apply_with_aider(self):
        prompts_dir = CREW_DIR / "output" / "prompts"
        prompts_dir.mkdir(parents=True, exist_ok=True)

        prompt_file = prompts_dir / f"{self.state.run_id}.txt"
        prompt_file.write_text(_strip_outer_codeblock(self.state.implementation))

        print(f"\n🤖 Applying with Aider (prompt: output/prompts/{self.state.run_id}.txt)...\n")

        # Build --read flags for every reference document that exists.
        read_flags: list[str] = []
        for rel_path in _AIDER_READ_FILES:
            abs_path = PROJECT_ROOT / rel_path
            if abs_path.exists():
                read_flags += ["--read", str(abs_path)]
            else:
                print(f"  ⚠️  Reference file not found, skipping: {rel_path}")

        subprocess.run(
            [
                "aider",
                "--env-file", str(CREW_DIR / ".env"),
                "--message-file", str(prompt_file),
                "--yes-always",
                *read_flags,
            ],
            cwd=str(PROJECT_ROOT),
            check=True,
        )

    @listen(apply_with_aider)
    def finish(self):
        print("\n✅ Development complete!")
        print(f"   Prompt : output/prompts/{self.state.run_id}.txt")


def kickoff():
    """Entry point for interactive use (crewai run / python main.py)."""
    import sys
    request = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else ""
    MedicanoDevFlow().kickoff(inputs={"request": request} if request else {})


def run():
    kickoff()


def plot():
    MedicanoDevFlow().plot()


if __name__ == "__main__":
    kickoff()
