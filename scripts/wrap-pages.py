import sys, pathlib, re
sys.stdout.reconfigure(encoding='utf-8')

pages_dir = pathlib.Path("src/pages")
pages = ["Index.tsx","AboutPage.tsx","LeadershipPage.tsx","NewsPage.tsx","ResourcesPage.tsx","SubsidiariesPage.tsx"]

for name in pages:
    f = pages_dir / name
    text = f.read_text(encoding="utf-8")

    # Insert </> before the final closing ");\n};\n\nexport default"
    # Pattern: last "  );\n};" preceded by a section/element closing tag
    text = re.sub(
        r'(\n  \);\n\};\n\nexport default)',
        r'\n    </>\n  );\n};\n\nexport default',
        text
    )

    f.write_text(text, encoding="utf-8")
    print(f"Fixed closing fragment: {name}")
