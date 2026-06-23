"""
读取附录_系统核心代码.docx，按要求统一格式化后写入新文件。
- 一级标题：黑体 二号(22pt) 加粗
- 二级标题：黑体 三号(16pt) 加粗
- 三级标题（文件名）：宋体 小三(15pt) 加粗
- 正文：中文宋体 / 英文Consolas 四号(14pt)，首行缩进2字符
- 代码块：中文宋体 / 英文Consolas 四号(14pt)，保留灰底
"""
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.oxml.ns import qn
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
import copy

SRC = r'N:\课程备份\小程序\大作业\附录_系统核心代码.docx'
DST = r'N:\课程备份\小程序\大作业\附录_系统核心代码_格式化.docx'

doc = Document(SRC)

# ========== 样式参数 ==========
H1_SIZE = Pt(22)   # 二号
H2_SIZE = Pt(16)   # 三号
H3_SIZE = Pt(15)   # 小三
BODY_SIZE = Pt(14) # 四号

def set_run_font(run, cn, en, size, bold=False, color=None):
    """设置 run 的中英文字体、字号、粗细、颜色"""
    run.font.size = size
    run.bold = bold
    run.font.name = en
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = OxmlElement('w:rFonts')
        rPr.insert(0, rFonts)
    rFonts.set(qn('w:eastAsia'), cn)
    rFonts.set(qn('w:ascii'), en)
    rFonts.set(qn('w:hAnsi'), en)
    if color is not None:
        run.font.color.rgb = color

def clear_indent(para):
    """清除首行缩进"""
    para.paragraph_format.first_line_indent = Cm(0)

def set_body_indent(para):
    """设置正文首行缩进2字符(~0.74cm)"""
    para.paragraph_format.first_line_indent = Cm(0.74)

def has_gray_bg(para):
    """检测段落是否有灰色底纹"""
    pPr = para._element.find(qn('w:pPr'))
    if pPr is None:
        return False
    shd = pPr.find(qn('w:shd'))
    if shd is not None:
        fill = shd.get(qn('w:fill'))
        if fill and fill != 'auto' and fill.lower() not in ('ffffff', '000000'):
            return True
    return False

# ========== 分类统计 ==========
h1 = h2 = h3 = body = code = 0

for para in doc.paragraphs:
    text = para.text.strip()
    if not text:
        continue

    style = para.style.name if para.style else ''
    is_gray = has_gray_bg(para)

    # ---- 一级标题 ----
    if 'Heading 1' in style or 'heading 1' in style:
        clear_indent(para)
        for run in para.runs:
            set_run_font(run, '黑体', 'Arial', H1_SIZE, bold=True)
        h1 += 1
        continue

    # ---- 二级标题 ----
    if 'Heading 2' in style or 'heading 2' in style:
        clear_indent(para)
        for run in para.runs:
            set_run_font(run, '黑体', 'Arial', H2_SIZE, bold=True)
        h2 += 1
        continue

    # ---- 三级标题（Heading 3 样式 或 蓝色加粗文件名头） ----
    is_h3_style = ('Heading 3' in style or 'heading 3' in style)
    is_blue_bold = False
    for run in para.runs:
        if run.bold and run.font.size and run.font.size <= Pt(16):
            try:
                if run.font.color and run.font.color.rgb:
                    if run.font.color.rgb[0] < 80 and run.font.color.rgb[2] > 200:
                        is_blue_bold = True
                        break
            except:
                pass

    if is_h3_style or is_blue_bold:
        clear_indent(para)
        for run in para.runs:
            set_run_font(run, '宋体', 'Consolas', H3_SIZE, bold=True)
        h3 += 1
        continue

    # ---- 代码块（有灰底） ----
    if is_gray:
        clear_indent(para)
        for run in para.runs:
            set_run_font(run, '宋体', 'Consolas', BODY_SIZE, bold=False)
        code += 1
        continue

    # ---- 其余：正文 ----
    set_body_indent(para)
    for run in para.runs:
        set_run_font(run, '宋体', 'Consolas', BODY_SIZE, bold=False)
    body += 1

doc.save(DST)
print(f'Done! Saved to: {DST}')
print(f'  Heading 1 (黑体 22pt): {h1}')
print(f'  Heading 2 (黑体 16pt): {h2}')
print(f'  Heading 3 (宋体 15pt): {h3}')
print(f'  Body      (宋体/Consolas 14pt): {body}')
print(f'  Code      (宋体/Consolas 14pt + gray bg): {code}')
