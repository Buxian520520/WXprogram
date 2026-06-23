"""只修改正文（非标题、非代码块）的字体：中文宋体四号，英文Consolas四号"""
from docx import Document
from docx.shared import Pt
from docx.oxml.ns import qn

doc_path = r'N:\课程备份\小程序\大作业\附录_系统核心代码.docx'
doc = Document(doc_path)

# 四号 = 14pt
BODY_SIZE = Pt(14)
body_count = 0

def is_heading(para):
    """判断是否为标题段落"""
    if para.style.name.startswith('Heading'):
        return True
    return False

def is_code_block(para):
    """判断是否为代码块（Courier New 小字 + 灰底）"""
    if not para.runs:
        return False
    run = para.runs[0]
    if run.font.name == 'Courier New' and run.font.size and run.font.size < Pt(12):
        return True
    return False

def is_file_header(para):
    """判断是否为文件名标题（蓝色加粗）"""
    if not para.runs:
        return False
    for run in para.runs:
        if run.bold and run.font.size and run.font.size <= Pt(15):
            try:
                if run.font.color and run.font.color.rgb:
                    r = run.font.color.rgb[0]
                    if r < 50:
                        return True
            except:
                pass
    return False

for para in doc.paragraphs:
    if is_heading(para):
        continue
    if is_code_block(para):
        continue
    if is_file_header(para):
        continue
    if not para.text.strip():
        continue

    # 正文：修改字体
    for run in para.runs:
        run.font.size = BODY_SIZE
        run.font.name = 'Consolas'
        rPr = run._element.get_or_add_rPr()
        from docx.oxml import OxmlElement
        rFonts = rPr.find(qn('w:rFonts'))
        if rFonts is None:
            rFonts = OxmlElement('w:rFonts')
            rPr.insert(0, rFonts)
        rFonts.set(qn('w:eastAsia'), '宋体')
        rFonts.set(qn('w:ascii'), 'Consolas')
        rFonts.set(qn('w:hAnsi'), 'Consolas')
    body_count += 1

doc.save(doc_path)
print(f'[OK] {body_count} body paragraphs updated: 宋体/Consolas 四号(14pt)')
