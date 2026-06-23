"""将正文和代码块的行距设为固定20磅"""
from docx import Document
from docx.shared import Pt, Cm
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

SRC = r'N:\课程备份\小程序\大作业\附录_系统核心代码_最终版.docx'

doc = Document(SRC)

def has_gray_bg(para):
    pPr = para._element.find(qn('w:pPr'))
    if pPr is None:
        return False
    shd = pPr.find(qn('w:shd'))
    if shd is not None:
        fill = shd.get(qn('w:fill'))
        if fill and fill != 'auto' and fill.lower() not in ('ffffff', '000000'):
            return True
    return False

def is_heading(para):
    return para.style.name.startswith('Heading') if para.style else False

def is_blue_bold(para):
    for run in para.runs:
        if run.bold:
            try:
                if run.font.color and run.font.color.rgb:
                    r, g, b = run.font.color.rgb
                    if r < 80 and b > 200:
                        return True
            except:
                pass
    return False

body_count = 0
code_count = 0

for para in doc.paragraphs:
    if not para.text.strip():
        continue
    if is_heading(para):
        continue
    if is_blue_bold(para):
        continue

    if has_gray_bg(para):
        # 代码块
        para.paragraph_format.line_spacing = Pt(20)
        code_count += 1
    else:
        # 正文
        para.paragraph_format.line_spacing = Pt(20)
        body_count += 1

doc.save(r'N:\课程备份\小程序\大作业\附录_系统核心代码_行距20磅.docx')
print(f'[OK] Line spacing set to 20pt: {body_count} body + {code_count} code paragraphs')
