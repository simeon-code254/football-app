from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


OUTPUT_PATH = Path("docs/option-a-launch-budget-kenya.pdf")
USD_TO_KES = 130

# Option A + AI deployment (production-ready for first users)
items = [
    {
        "payee": "eCitizen (Government of Kenya)",
        "item": "Business name registration",
        "frequency": "One-time",
        "kes": 950,
        "purpose": "Creates legal business identity for operating, invoicing and contracts.",
    },
    {
        "payee": "Domain registrar (e.g., Truehost/HostPinnacle)",
        "item": ".com domain (1 year)",
        "frequency": "Annual",
        "kes": 1800,
        "purpose": "Public domain for legal pages, links, support and trust signals.",
    },
    {
        "payee": "Apple",
        "item": "Apple Developer Program",
        "frequency": "Annual",
        "kes": 99 * USD_TO_KES,
        "purpose": "Required to publish and maintain the iOS app on App Store.",
    },
    {
        "payee": "Google",
        "item": "Google Play Console account",
        "frequency": "One-time",
        "kes": 25 * USD_TO_KES,
        "purpose": "Required to publish the Android app on Google Play.",
    },
    {
        "payee": "Supabase",
        "item": "Backend database/auth/storage",
        "frequency": "Monthly",
        "kes": 0,
        "purpose": "Core backend for users, auth, profiles, messaging and app data (Free tier at launch).",
    },
    {
        "payee": "Render or Railway",
        "item": "AI service deployment (inference API)",
        "frequency": "Monthly",
        "kes": 25 * USD_TO_KES,
        "purpose": "Hosts the AI pipeline service so uploaded videos can be processed for ratings.",
    },
]

one_time_total = sum(i["kes"] for i in items if i["frequency"] == "One-time")
annual_total = sum(i["kes"] for i in items if i["frequency"] == "Annual")
monthly_total = sum(i["kes"] for i in items if i["frequency"] == "Monthly")
first_year_total = one_time_total + annual_total + (monthly_total * 12)

OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

doc = SimpleDocTemplate(
    str(OUTPUT_PATH),
    pagesize=A4,
    leftMargin=12 * mm,
    rightMargin=12 * mm,
    topMargin=12 * mm,
    bottomMargin=12 * mm,
)

styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="Meta",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#374151"),
        leading=12,
    )
)
styles.add(
    ParagraphStyle(
        name="Cell",
        parent=styles["Normal"],
        fontSize=8.5,
        leading=11,
    )
)
styles.add(
    ParagraphStyle(
        name="HeaderCell",
        parent=styles["Normal"],
        fontSize=8.5,
        textColor=colors.white,
        leading=11,
    )
)

story = []
story.append(Paragraph("Matobev Option A Launch Budget (Kenya)", styles["Title"]))
story.append(Spacer(1, 4))
story.append(
    Paragraph(
        f"Prepared: {date.today().isoformat()} | Currency: Kenyan Shillings (KES) | FX assumption: 1 USD = KES {USD_TO_KES}",
        styles["Meta"],
    )
)
story.append(
    Paragraph(
        "Scope: First-time production launch with user onboarding live on iOS and Google Play, plus AI service deployment.",
        styles["Meta"],
    )
)
story.append(Spacer(1, 10))

header = [
    Paragraph("Payee", styles["HeaderCell"]),
    Paragraph("Cost Item", styles["HeaderCell"]),
    Paragraph("Frequency", styles["HeaderCell"]),
    Paragraph("Amount (KES)", styles["HeaderCell"]),
    Paragraph("What It Enables", styles["HeaderCell"]),
]

data = [header]

for i in items:
    data.append(
        [
            Paragraph(i["payee"], styles["Cell"]),
            Paragraph(i["item"], styles["Cell"]),
            Paragraph(i["frequency"], styles["Cell"]),
            Paragraph(f"{i['kes']:,}", styles["Cell"]),
            Paragraph(i["purpose"], styles["Cell"]),
        ]
    )

summary_rows = [
    ["", "", "One-time subtotal", f"{one_time_total:,}", ""],
    ["", "", "Annual subtotal", f"{annual_total:,}", ""],
    ["", "", "Monthly run-rate", f"{monthly_total:,}", ""],
    ["", "", "Estimated first-year total", f"{first_year_total:,}", ""],
]

for row in summary_rows:
    data.append(
        [
            Paragraph(row[0], styles["Cell"]),
            Paragraph(row[1], styles["Cell"]),
            Paragraph(row[2], styles["Cell"]),
            Paragraph(row[3], styles["Cell"]),
            Paragraph(row[4], styles["Cell"]),
        ]
    )

col_widths = [36 * mm, 34 * mm, 22 * mm, 23 * mm, 70 * mm]

table = Table(data, colWidths=col_widths, repeatRows=1)
table.setStyle(
    TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#123A6B")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D1D5DB")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("ROWBACKGROUNDS", (0, 1), (-1, 6), [colors.white, colors.HexColor("#F8FAFC")]),
            ("BACKGROUND", (0, 7), (-1, -1), colors.HexColor("#FFF7E6")),
            ("FONTNAME", (2, 7), (3, -1), "Helvetica-Bold"),
        ]
    )
)

story.append(table)
story.append(Spacer(1, 8))
story.append(
    Paragraph(
        "Note: Supabase Free is listed for launch cost control. Upgrade to Supabase Pro once traffic, storage or database limits are approached.",
        styles["Meta"],
    )
)

story.append(
    Paragraph(
        "Note: AI deployment is costed for a baseline always-on inference API. Heavy video load may require higher compute tiers.",
        styles["Meta"],
    )
)

doc.build(story)
print(f"Created: {OUTPUT_PATH}")
