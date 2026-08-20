"""Built-in paper templates."""

BUILTIN_TEMPLATES = [
    {
        "id": "cbse",
        "name": "CBSE Board Format",
        "type": "cbse",
        "layout_config": {
            "header": {
                "show_school_name": True,
                "show_board": "CBSE",
                "show_subject_line": True,
                "show_marks_duration": True,
            },
            "sections": {
                "label_style": "letter",
                "show_section_instructions": True,
                "question_numbering": "section_prefix",
            },
            "typography": {
                "font_family": "Times New Roman",
                "title_size": 14,
                "body_size": 12,
            },
            "footer": {
                "show_page_numbers": True,
                "show_end_marker": True,
            },
        },
    },
    {
        "id": "general",
        "name": "General School Format",
        "type": "general",
        "layout_config": {
            "header": {
                "show_school_name": True,
                "show_board": False,
                "show_subject_line": True,
                "show_marks_duration": True,
            },
            "sections": {
                "label_style": "number",
                "show_section_instructions": True,
                "question_numbering": "sequential",
            },
            "typography": {
                "font_family": "Arial",
                "title_size": 14,
                "body_size": 11,
            },
            "footer": {
                "show_page_numbers": True,
                "show_end_marker": False,
            },
        },
    },
]
