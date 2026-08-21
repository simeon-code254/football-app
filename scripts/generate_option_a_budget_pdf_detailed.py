from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

OUTPUT_PATH = Path("docs/option-a-launch-budget-kenya-detailed-branded.pdf")
USD_TO_KES = 130

# Detailed Option A launch budget, including AI service deployment.
items = [
    {
        "phase": "Legal setup",
        "payee": "eCitizen (Government of Kenya)",
        "item": "Business name registration",
        "frequency": "One-time",
        "amount_kes": 950,
        "amount_usd": "-",
        "due": "Pre-launch",
        "owner": "Founder/Admin",
        "purpose": "Establishes legal business identity required for contracts, invoicing and platform operations.",
    },
    {
        "phase": "Brand and web trust",
        "payee": "Domain registrar (Truehost/HostPinnacle/HostAfrica)",
        "item": ".com domain (1 year)",
        "frequency": "Annual",
        "amount_kes": 1800,
        "amount_usd": "-",
        "due": "Pre-launch",
        "owner": "Founder/Admin",
        "purpose": "Creates trusted public endpoint for legal pages, support, and scout/player verification links.",
    },
    {
        "phase": "iOS distribution",
        "payee": "Apple",
        "item": "Apple Developer Program",
        "frequency": "Annual",
        "amount_kes": 99 * USD_TO_KES,
        "amount_usd": "USD 99",
        "due": "Before App Store submission",
        "owner": "Founder/Admin",
        "purpose": "Mandatory to sign and publish iOS builds, manage TestFlight, and ship App Store updates.",
    },
    {
        "phase": "Android distribution",
        "payee": "Google",
        "item": "Google Play Console account",
        "frequency": "One-time",
        "amount_kes": 25 * USD_TO_KES,
        "amount_usd": "USD 25",
        "due": "Before Play Store submission",
        "owner": "Founder/Admin",
        "purpose": "Mandatory account to publish and maintain Android production releases on Google Play.",
    },
    {
        "phase": "Backend and database",
        "payee": "Supabase",
        "item": "Production DB/Auth/Storage (Free launch tier)",
        "frequency": "Monthly",
        "amount_kes": 0,
        "amount_usd": "USD 0",
        "due": "Go-live",
        "owner": "Engineering",
        "purpose": "Runs user accounts, profile data, app content and storage with no immediate cash outlay at MVP scale.",
    },
    {
        "phase": "AI runtime",
        "payee": "Render or Railway",
        "item": "AI inference API hosting",
        "frequency": "Monthly",
        "amount_kes": 25 * USD_TO_KES,
        "amount_usd": "USD 25",
        "due": "Go-live",
        "owner": "Engineering",
        "purpose": "Keeps the AI service online so user video uploads can be processed into ratings in production.",
    },
]

one_time_total = sum(i["amount_kes"] for i in items if i["frequency"] == "One-time")
annual_total = sum(i["amount_kes"] for i in items if i["frequency"] == "Annual")
monthly_total = sum(i["amount_kes"] for i in items if i["frequency"] == "Monthly")
first_year_total = one_time_total + annual_total + (monthly_total * 12)

OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

doc = SimpleDocTemplate(
    str(OUTPUT_PATH),
    pagesize=A4,
    leftMargin=11 * mm,
    rightMargin=11 * mm,
    topMargin=11 * mm,
    bottomMargin=11 * mm,
)

styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="BrandTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        textColor=colors.HexColor("#0A1B33"),
        leading=24,
    )
)
styles.add(
    ParagraphStyle(
        name="Subhead",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )
)
styles.add(
    ParagraphStyle(
        name="HeaderCell",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.8,
        leading=9.6,
        textColor=colors.white,
    )
)
styles.add(
    ParagraphStyle(
        name="Cell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.6,
        leading=9.5,
        textColor=colors.HexColor("#111827"),
    )
)
styles.add(
    ParagraphStyle(
        name="Summary",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0A1B33"),
    )
)

story = []

story.append(Paragraph("Matobev", styles["BrandTitle"]))
story.append(Paragraph("Option A Launch Budget - Detailed Production Draft (Kenya)", styles["Summary"]))
story.append(Spacer(1, 2))
story.append(
    Paragraph(
        f"Date: {date.today().strftime('%d %B %Y')} | Currency: KES | FX baseline: 1 USD = KES {USD_TO_KES}",
        styles["Subhead"],
    )
)
story.append(
    Paragraph(
        "Objective: first production launch with real users on iOS and Android, including backend and AI inference deployment.",
        styles["Subhead"],
    )
)
story.append(Spacer(1, 8))

headers = [
    Paragraph("Phase", styles["HeaderCell"]),
    Paragraph("Paid To", styles["HeaderCell"]),
    Paragraph("Cost Item", styles["HeaderCell"]),
    Paragraph("Freq.", styles["HeaderCell"]),
    Paragraph("Amount (KES)", styles["HeaderCell"]),
    Paragraph("USD Ref", styles["HeaderCell"]),
    Paragraph("When Needed", styles["HeaderCell"]),
    Paragraph("Launch Impact", styles["HeaderCell"]),
]

rows = [headers]
for i in items:
    rows.append(
        [
            Paragraph(i["phase"], styles["Cell"]),
            Paragraph(i["payee"], styles["Cell"]),
            Paragraph(i["item"], styles["Cell"]),
            Paragraph(i["frequency"], styles["Cell"]),
            Paragraph(f"{i['amount_kes']:,}", styles["Cell"]),
            Paragraph(i["amount_usd"], styles["Cell"]),
            Paragraph(i["due"], styles["Cell"]),
            Paragraph(i["purpose"], styles["Cell"]),
        ]
    )

# Summary block at bottom of table
summary_labels = [
    ("One-time subtotal", one_time_total),
    ("Annual subtotal", annual_total),
    ("Monthly run-rate", monthly_total),
    ("Estimated first-year total", first_year_total),
]
for label, value in summary_labels:
    rows.append(
        [
            Paragraph("", styles["Cell"]),
            Paragraph("", styles["Cell"]),
            Paragraph("", styles["Cell"]),
            Paragraph(Paragraph(label, styles["Summary"]).text, styles["Summary"]),
            Paragraph(f"{value:,}", styles["Summary"]),
            Paragraph("", styles["Cell"]),
            Paragraph("", styles["Cell"]),
            Paragraph("", styles["Cell"]),
        ]
    )

col_widths = [20 * mm, 30 * mm, 27 * mm, 13 * mm, 16 * mm, 14 * mm, 24 * mm, 53 * mm]

table = Table(rows, colWidths=col_widths, repeatRows=1)
table.setStyle(
    TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#123A6B")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D1D5DB")),
            ("ROWBACKGROUNDS", (0, 1), (-1, 6), [colors.white, colors.HexColor("#F8FAFC")]),
            ("BACKGROUND", (0, 7), (-1, -1), colors.HexColor("#FFF7E6")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("FONTNAME", (3, 7), (4, -1), "Helvetica-Bold"),
            ("TEXTCOLOR", (3, 7), (4, -1), colors.HexColor("#0A1B33")),
        ]
    )
)

story.append(table)
story.append(Spacer(1, 8))

story.append(Paragraph("Execution Notes", styles["Summary"]))
story.append(
    Paragraph(
        "1) Supabase is shown as Free tier at launch to keep costs low. Move to Pro immediately when storage or database usage grows.",
        styles["Subhead"],
    )
)
story.append(
    Paragraph(
        "2) AI hosting is costed at a baseline always-on service. Higher traffic or GPU workloads can increase monthly spend.",
        styles["Subhead"],
    )
)
story.append(
    Paragraph(
        "3) This draft excludes optional marketing, legal review, CI/CD paid tiers and CDN add-ons so you can see pure launch essentials.",
        styles["Subhead"],
    )
)

doc.build(story)
print(f"Created: {OUTPUT_PATH}")
