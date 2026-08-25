# -*- coding: utf-8 -*-
"""Parse 'Diger' docx table into structured product rows."""
import zipfile, glob, json
from xml.etree import ElementTree as ET

f = glob.glob("*.docx")[0]
z = zipfile.ZipFile(f)
xml = z.read("word/document.xml").decode("utf-8")
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
root = ET.fromstring(xml)
tbl = root.find(".//w:tbl", ns)
rows = tbl.findall("w:tr", ns)

parsed = []
for r in rows:
    cells = r.findall("w:tc", ns)
    out = []
    for c in cells:
        texts = c.findall(".//w:t", ns)
        out.append("".join(t.text or "" for t in texts).strip())
    parsed.append(out)

for row in parsed:
    print("|".join(row))
