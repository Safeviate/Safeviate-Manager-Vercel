from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors


OUTPUT = r"C:\Git\Safeviate-Manager-Vercel\formal_hearing_outcome_letter.pdf"

doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=letter,
    leftMargin=1 * inch,
    rightMargin=1 * inch,
    topMargin=1 * inch,
    bottomMargin=1 * inch,
)

styles = getSampleStyleSheet()
title_style = ParagraphStyle(
    "TitleCustom",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=18,
    leading=22,
    alignment=TA_CENTER,
    spaceAfter=12,
    textColor=colors.HexColor("#1F2937"),
)
body_style = ParagraphStyle(
    "BodyCustom",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=11,
    leading=15,
    spaceAfter=8,
)
body_style.spaceBefore = 0
small_style = ParagraphStyle(
    "SmallCustom",
    parent=body_style,
    spaceAfter=2,
)

story = []
story.append(Paragraph("Finding Letter", title_style))

meta = Table(
    [
        [Paragraph("<b>To:</b>", body_style), Paragraph("[Employee Name]", body_style)],
        [Paragraph("<b>Date:</b>", body_style), Paragraph("[Insert date]", body_style)],
    ],
    colWidths=[1.1 * inch, 4.8 * inch],
)
meta.setStyle(
    TableStyle(
        [
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EAF0F6")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D1D5DB")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]
    )
)
story.append(meta)
story.append(Spacer(1, 0.22 * inch))

story.append(Paragraph("Dear [Employee Name],", body_style))

paras = [
    "This letter serves as the formal outcome of the disciplinary hearing held on [hearing date] concerning the allegation that you used drugs on 11 July 2026 and that a subsequent drug test conducted on 14 July 2026 returned a positive result.",
    "The chairperson considered the evidence presented during the hearing, including your admission that you used drugs on 11 July 2026, the urine test result obtained on 14 July 2026 indicating positive results for Cocaine and THC, and your decision not to proceed with blood or laboratory testing.",
    "Having assessed the evidence on the balance of probabilities, the chairperson finds that the allegation is proven.",
    "This conduct is a serious breach of workplace rules and is incompatible with the standards of conduct expected of employees, particularly in relation to safety, reliability, and trust.",
]

for p in paras:
    story.append(Paragraph(p, body_style))

story.append(Paragraph("<b>Outcome:</b> [Insert sanction/outcome here]", body_style))
story.append(
    Paragraph(
        "You are advised of your right to appeal this finding in accordance with company policy. Any appeal must be submitted in writing within [number] days of receipt of this letter and addressed to [appeal authority/title].",
        body_style,
    )
)
story.append(Spacer(1, 0.2 * inch))
story.append(Paragraph("Yours faithfully,", body_style))
story.append(Spacer(1, 0.18 * inch))
story.append(Paragraph("<b>[Name]</b>", small_style))
story.append(Paragraph("[Title]", small_style))
story.append(Paragraph("[Company Name]", small_style))

doc.build(story)
print(OUTPUT)
