from pathlib import Path
from typing import Optional
import json

class PromptLoader:
    def __init__(self, prompt_dir: Optional[Path] = None):
        if prompt_dir is None: self.prompt_dir = Path(__file__).parent / "templates"
        else: self.prompt_dir = prompt_dir

    def load_template(self, prompt_name: str) -> str:
        template_file = self.prompt_dir / f"{prompt_name}.txt"
        if template_file.exists(): return template_file.read_text(encoding="utf-8")
        else: raise FileNotFoundError(f"Prompt template not found: {prompt_name}")

    def save_template(self, prompt_name: str, content: str) -> None:
        self.prompt_dir.mkdir(parents=True, exist_ok=True)
        template_file = self.prompt_dir / f"{prompt_name}.txt"
        template_file.write_text(content, encoding="utf-8")

    def list_templates(self) -> list[str]:
        if not self.prompt_dir.exists(): return []
        return [f.stem for f in self.prompt_dir.glob("*.txt")]
    
_loader = PromptLoader()

def load_prompt(prompt_name: str, **variables) -> str:
    template = _loader.load_template(prompt_name)
    return template.format(**variables)
