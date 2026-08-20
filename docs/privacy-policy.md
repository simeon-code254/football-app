---
layout: default
title: Privacy Policy
---

# Matobev Privacy Policy

**Last updated: 20 August 2026**

> **⚠️ NEEDS LEGAL REVIEW, AND A POSTAL ADDRESS.**
> Everything below describes what the Matobev app and database actually do,
> checked against the schema, the Edge Functions and the live project. It is
> accurate and it is specific, but it is not a lawyer's work.
>
> **A postal address is still missing from section 1.** Kenya's Data Protection
> Act expects a controller to be reachable at a physical address, and Google
> Play requires one on the developer account and publishes it on the store
> listing anyway — so it becomes public regardless.
>
> Sections 9 and 12 commit to retention periods and response times that nothing
> currently automates. Read them as promises, because that is what they are.

## The short version

- We collect what you put in your profile, the videos you upload, and how you
  use the app. We do **not** sell it and we do **not** run advertising.
- If you ask for AI analysis, our software **measures your body** from your
  video. That is why we treat it separately from everything else.
- If you are **under 18**, a parent or guardian must approve that analysis
  before it can happen.
- **You can delete everything, from inside the app, immediately.**
- Your data is stored in **Ireland**, not in Kenya. Section 8 explains why and
  what protects it.

The rest of this document is the detail behind those five points.

---

## 1. Who is responsible for your data

Matobev is a business name registered in Kenya, operated as a sole
proprietorship by **Simeon Odhiambo** ("Matobev", "we", "us").

We are the **data controller** for the personal data described here. That
means we decide what is collected and why, and we are the ones answerable for
it.

| | |
|---|---|
| **Privacy contact** | support@matobev.com |
| **Primary law** | Kenya Data Protection Act, 2019 |
| **Regulator** | Office of the Data Protection Commissioner (ODPC), Kenya |
| **Also applies** | EU/UK GDPR, because your data is stored in Ireland |

Write to us at support@matobev.com about anything in this policy. We answer
privacy requests within **7 days**, and complete them within **30 days** — the
period the Data Protection Act allows.

---

## 2. What we collect, and where it comes from

Almost everything here comes **from you**. Nothing is bought from data
brokers, and nothing is scraped from other platforms.

### 2.1 Account details

| Data | Why we have it |
|---|---|
| Email address and password | To sign you in. Passwords are handled by our authentication provider and never reach us in readable form. |
| Full name | So scouts know who they are looking at. |
| Phone number *(optional)* | Account recovery, and contact if you choose to give it. |
| Role — player or scout | Determines what you can see and do. **Set once and cannot be changed**, because switching roles would let someone see the other side of the platform. |

### 2.2 If you are a player

- Date of birth, gender, nationality
- Primary and secondary position, preferred foot, goalkeeper status
- Height, weight, current club, jersey number, years playing
- A short bio, and any Instagram, TikTok, YouTube or Facebook links you add
- Your profile photo

**Your date of birth is required**, and it is not decoration. It decides
whether you are treated as a child under this policy, whether guardian consent
is needed before analysis, and whether your profile is hidden from people who
are not signed in.

### 2.3 If you are a scout

- Your organisation, a bio, and your country
- Documents you upload to prove you are a genuine scout
- Your verification status and the date it was granted

Verification documents are visible only to our review team. Other users never
see them, and they are not shown on your profile.

### 2.4 Videos

- The video file itself and a generated thumbnail
- Title, description, match name, opponent and any tags you enter
- Duration
- If you request AI analysis: the point in the video where you tagged yourself,
  so the software knows which player to follow

### 2.5 What our analysis produces

- Attribute scores — pace, physical, positioning, ball control and others
- An overall rating
- **A confidence level for each score**, because our analysis is often
  uncertain and we would rather show you that than hide it

### 2.6 How you use the app

- Messages you send, and any attachments
- Which profiles you have viewed, and which profiles have viewed yours
- Likes, saves, comments, follows and endorsements
- Trials you apply to, and the status of those applications
- Reports you make about other users

### 2.7 Technical data

- A push notification token for your device, if you turn notifications on
- Crash reports and error diagnostics

**We do not collect your IP address for diagnostics.** Our crash reporting is
explicitly configured not to (`sendDefaultPii: false`), and only a sample of
performance traces is recorded.

**We do not use tracking cookies, advertising identifiers or analytics SDKs.**
Your login session is held in your device's secure storage, not in a browser
cookie. The app also keeps a copy of recently viewed screens on your device
for up to **24 hours** so it works offline — private messages, notifications
and verification documents are explicitly excluded from that copy.

---

## 3. Why we use your data, and what allows us to

Under the Data Protection Act we must have a lawful basis for each purpose.

| What we do | Why | Lawful basis |
|---|---|---|
| Run your account and profile | You asked us to | Performance of a contract |
| Show your profile and videos to scouts | The purpose of the platform | Performance of a contract |
| Analyse your video and produce ratings | You requested analysis | **Consent** — and for under-18s, guardian consent as well |
| Send you notifications | You enabled them | **Consent** — withdrawable in Settings |
| Moderate content, investigate reports, block abuse | Keeping users, especially minors, safe | Legitimate interests |
| Keep records of suspensions | So a banned account cannot simply be recreated | Legitimate interests |
| Keep evidence that consent was given | We are required to be able to prove it | Legal obligation |

Where we rely on **consent**, you can withdraw it at any time and we stop.
Withdrawing does not undo processing that already happened lawfully.

Where we rely on **legitimate interests**, we have weighed our interest
against your rights, and you can object — see section 12.

---

## 4. AI analysis — the part that deserves your attention

If you upload a video and request analysis, our software estimates the
position of your joints frame by frame and derives measurements from how you
move.

**This is processing of your physical characteristics.** We treat it as a
separate purpose with its own consent, rather than folding it into "using the
app", because:

- Kenya's Data Protection Act treats biometric data as **sensitive personal
  data** requiring specific handling;
- the amended COPPA rules in force since 22 April 2026 treat biometric
  identifiers as personal information, and state that processing a child's
  data to train AI is never part of "providing a service"; and
- the GDPR reaches the same conclusion for children's data.

### What we commit to

- **We do not use your videos, your images, or your body measurements to train
  AI models.** They produce your ratings and nothing else.
- **We do not sell or license this data to anyone.**
- **We do not attempt to identify you biometrically.** The analysis follows a
  subject through one clip. It does not build a face or body signature, and it
  does not match you across videos.
- **Highlight-only uploads are never analysed.** If you post a video without
  requesting analysis, no measurement takes place — this is enforced in our
  database, not merely in the app.

### Automated processing and your right to object

Your ratings are produced automatically, without a human reviewing each one.

**No decision with a legal or similarly significant effect is made about you
by software alone.** Ratings influence where you appear in search results and
leaderboards. They do not decide whether you get a trial, and no scout is
required or encouraged to treat them as a verdict.

Under section 35 of the Data Protection Act and Article 22 of the GDPR you
have the right not to be subject to a decision based solely on automated
processing. If you believe a rating has affected you unfairly, email
support@matobev.com and a person will review it.

### Ratings are estimates

They are frequently uncertain, and the app marks them when they are. A low
score very often reflects poor footage — distance, lighting, camera movement,
a crowded frame — rather than the player. A rating is not a professional
assessment of ability.

---

## 5. If you are under 18

You must be at least **13** to hold an account.

### What Kenyan law requires

Section 33 of the Data Protection Act defines a child as anyone **under 18**,
and requires that processing a child's personal data is done with the consent
of a parent or guardian and is in the **best interests of the child**.

> **We are being straight with you about a gap.** Today the app requires
> guardian consent before **AI analysis** of an under-18's video, and enforces
> that in the database. It does not yet require guardian consent before a
> 13–17 year old creates a basic account and posts a highlight video. Kenyan
> law reads more strictly than that. We are closing this, and until we do, a
> guardian can have any under-18 account removed immediately by emailing
> support@matobev.com.

### What we do today

- **Analysis requires a guardian.** You send them a link from inside the app.
  They open it, see exactly what is being asked, and decide. Until they
  confirm, the upload is refused.
- **We record the minimum.** Their name, email, what they approved and when.
  Nothing else about them.
- **Consent is confirmed by them, not by you.** The confirmation happens on a
  web page they open, never with a checkbox inside your app — a child ticking
  "my parent agrees" is not consent.
- **Your profile is hidden from strangers.** Anyone not signed in can browse
  profiles of players aged 18 and over. Under-18 profiles are excluded
  entirely, so your name, photo, age and club are not visible to the open
  internet.
- **Guardians can withdraw at any time**, by emailing support@matobev.com. We
  stop analysis and delete the derived scores on request.

Confirmation by link is a reasonable method. It is not the strongest that
exists, and we may strengthen it. If you believe an account was created
without a guardian's knowledge, tell us and we will remove it.

---

## 6. Who can see your information

| Who | Can see |
|---|---|
| **Verified scouts** | Player profiles, videos, ratings, and the details you put on your profile |
| **Other players** | Your public profile and your videos |
| **Not signed in** | Profiles of players **18 and over** only |
| **Nobody but you and us** | Your email, your phone number, your private messages, and scout verification documents |

**We do not sell your personal data. We do not share it for advertising. We
run no advertising.**

We will disclose data if we are legally required to, or where it is necessary
to protect someone — particularly a child — from harm. Where we are permitted
to tell you, we will.

---

## 7. Companies that process data for us

| Who | What they do | Where |
|---|---|---|
| Supabase | Database, file storage, authentication | Ireland (EU) |
| Sentry | Crash and error reporting | Germany (EU) |
| Expo | Delivers push notifications to your device | United States |
| Google Play / Apple | App distribution, and payments if we ever charge | Global |

Each is bound by contract to process data only on our instructions. None of
them may use your data for their own purposes.

---

## 8. Your data leaves Kenya

**It is stored in the European Union — Ireland — and our error reporting is in
Germany.** Push notification delivery routes through the United States.

We do this because the infrastructure is more reliable and better secured than
what we could run ourselves, not because we prefer it to be far away.

Sections 48 and 49 of the Data Protection Act allow a transfer out of Kenya
where there is proof of appropriate safeguards. Ours are:

- Contractual data-processing terms with each provider, incorporating the EU
  Standard Contractual Clauses;
- storage in a jurisdiction the EU regards as offering a high standard of
  protection, and which the GDPR governs directly; and
- encryption in transit and at rest.

You can ask us for details of these safeguards at support@matobev.com.

---

## 9. How long we keep things

| Data | Kept for |
|---|---|
| Your profile, videos, ratings and messages | While your account is open |
| **Everything, on account deletion** | **Deleted immediately.** Files are removed from storage and records deleted. Not reversible. |
| Evidence that guardian consent was given | 3 years after the account closes, because we must be able to prove consent existed |
| Suspension and moderation records | 5 years, so a banned account cannot simply be recreated |
| Reports of harm to a minor | 7 years, or longer where law enforcement requires it |
| Crash diagnostics | 90 days |
| The offline copy on your own device | 24 hours, and cleared when you sign out |
| Backups | Up to 30 days, after which deleted data is gone from backups too |

---

## 10. How we protect it

- **Access rules live in the database, not just the app.** Even a request made
  directly to our API cannot read what it is not entitled to.
- **Videos are private.** They are never publicly listed and are served
  through short-lived signed links.
- **Passwords never reach us** in readable form.
- **Sessions are stored in your device's secure storage**, not in a cookie.
- **Encrypted in transit and at rest.**
- **Least privilege**: internal access is limited to those who need it, and
  verification documents are restricted to reviewers.

No system is perfectly secure, and we will not pretend otherwise.

---

## 11. If there is a breach

If personal data is compromised, we will notify the **ODPC within 72 hours**
of becoming aware, as section 43 of the Data Protection Act requires, and the
relevant EU authority where the GDPR applies.

**We will tell you directly, without undue delay, where there is a real risk
to your rights** — and we will tell you what happened and what to do, not a
sentence of reassurance.

---

## 12. Your rights

Under the Data Protection Act (section 26) and the GDPR you have the right to:

| Right | How to use it |
|---|---|
| **Be informed** | This document |
| **Access** a copy of your data | Most is visible in the app; email us for a full export |
| **Correct** anything wrong | Edit your profile |
| **Delete** your data | Settings → Delete account. Immediate. No email, no waiting period, no retention hostage. |
| **Object** to processing based on legitimate interests | Email us |
| **Restrict** processing while a complaint is resolved | Email us |
| **Portability** — your data in a machine-readable form | Email us |
| **Withdraw consent** | Notifications: Settings. Analysis: email us, or a guardian can withdraw directly. |
| **Not be subject to solely automated decisions** | See section 4 |

We respond within **7 days** and complete within **30 days**. We will not
charge you, and we will not ask you to justify a deletion request.

### Complaints

Tell us first — support@matobev.com — and we will try to put it right.

You can complain to the **Office of the Data Protection Commissioner** in
Kenya at any time, whether or not you have raised it with us. If you are in
the EU or UK, you may complain to your national supervisory authority instead.

---

## 13. Marketing

We do not send marketing email, and we do not sell your details to anyone who
would.

App notifications tell you about things that actually happened in your account
— a scout viewed your profile, your rating changed, a trial replied. You can
turn any category off in Settings, and quiet hours are respected.

---

## 14. Changes to this policy

If we change anything material, we will tell you **in the app before it takes
effect**, not by quietly updating this page. The date at the top always
reflects the current version, and previous versions are available in the
public repository this document is published from.

---

**Questions, requests, or complaints:** support@matobev.com
