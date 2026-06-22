import zipfile
import xml.etree.ElementTree as ET
import re
import sys

# Configure stdout to use UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def get_docx_text(path):
    try:
        with zipfile.ZipFile(path) as z:
            xml_content = z.read('word/document.xml')
            root = ET.fromstring(xml_content)
            
            # Namespaces
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            text_parts = []
            for para in root.findall('.//w:p', ns):
                para_text = []
                for run in para.findall('.//w:r', ns):
                    for text in run.findall('.//w:t', ns):
                        if text.text:
                            para_text.append(text.text)
                if para_text:
                    text_parts.append("".join(para_text))
            return "\n".join(text_parts)
    except Exception as e:
        return str(e)

text = get_docx_text(r'd:\Cuoi Ki\vr\docs\BaoCaoVR_Final_v3.docx')

# Search for grabbing keywords
keywords = ['cầm', 'kéo', 'thả', 'tương tác', 'vật lý', 'tay cầm', 'chạm', 'grab', 'trigger', 'grip']
matches = []
for line in text.split('\n'):
    if any(k in line.lower() for k in keywords):
        matches.append(line)

print(f"Total lines extracted: {len(text.splitlines())}")
print("\n--- MATCHES ---")
for m in matches[:100]:
    print(m)
