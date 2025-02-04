import os

def get_language_by_extension(file_path: str) -> str:
    _, ext = os.path.splitext(file_path.lower())
    ext_to_lang = {
        '.py': 'python',
        '.java': 'java',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.html': 'html',
        '.css': 'css',
        '.c': 'c',
        '.cpp': 'cpp',
        '.h': 'c',
        '.hpp': 'cpp',
        '.json': 'json',
        '.md': 'markdown',
        '.sh': 'bash'
    }
    return ext_to_lang.get(ext, '')

def build_structure(base_path: str, ignore_list: list[str]) -> dict:
    tree = {}
    if not os.path.isdir(base_path):
        return tree
    
    for entry in sorted(os.listdir(base_path)):
        if entry in ignore_list:
            continue

        full_path = os.path.join(base_path, entry)
        if os.path.isdir(full_path):
            if entry in ignore_list:
                continue
            tree[entry] = build_structure(full_path, ignore_list)
        else:
            if entry not in ignore_list:
                tree[entry] = None
    return tree

def structure_to_markdown(tree: dict, indent: int = 0) -> str:
    md_lines = []
    for key, value in tree.items():
        line = "  " * indent + f"- {key}"
        md_lines.append(line)
        if isinstance(value, dict):
            md_lines.append(structure_to_markdown(value, indent + 1))
    return "\n".join(md_lines)

def gather_files(tree: dict, base_path: str, current_path: str = "") -> list[str]:
    file_list = []
    for entry, value in tree.items():
        new_path = os.path.join(current_path, entry)
        if isinstance(value, dict):
            file_list.extend(gather_files(value, base_path, new_path))
        else:
            file_list.append(new_path)
    return file_list

def read_file_content(file_path: str) -> str:
    """
    Зчитує текстовий вміст файлу. Якщо файл двійковий або має інше кодування, повертає повідомлення.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        return f"Файл {file_path} не вдалося прочитати: невідоме кодування або це не текстовий файл."


def save_to_md_file(content: str, output_path: str) -> None:
    """
    Зберігає текстовий контент у файл формату .md.
    """
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Файл збережено як: {output_path}")


def generate_markdown(base_path: str, ignore_list: list[str]) -> str:
    tree = build_structure(base_path, ignore_list)
    md_structure = "## Структура проєкту\n\n" + structure_to_markdown(tree)
    files = gather_files(tree, base_path)
    md_code_parts = ["\n\n## Код файлів\n"]
    for rel_path in files:
        full_path = os.path.join(base_path, rel_path)
        lang = get_language_by_extension(full_path)
        code = read_file_content(full_path)

        md_code_parts.append(f"### {rel_path}\n")
        if lang:
            md_code_parts.append(f"```{lang}\n{code}\n```\n")
        else:
            md_code_parts.append(f"```\n{code}\n```\n")
    return md_structure + "\n".join(md_code_parts)

if __name__ == "__main__":
    base_path = "."
    ignore_list = ["swagger", "test.html", "project.md", ".git", ".DS_Store", "node_modules", "uploads", ".env", "databese.sqlite3", "generator.py", "package.json", "package-lock.json", "SequelizeSummery.md", "StartSummery.md", "Summery2.0.md", "output.md", "MulterSummery.md", "login.html", "profile.html", "register.html", "test.html"]
    output_md_file = "project.md"
    
    # Генеруємо Markdown
    markdown_content = generate_markdown(base_path, ignore_list)
    
    # Зберігаємо у файл .md
    save_to_md_file(markdown_content, output_md_file)
