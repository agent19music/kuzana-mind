# Google Workspace Integration — Spec & Approval Guide

The backend connector (`load_from_google_drive` in `ingest.py`) is already written.  
This spec covers two paths: wiring it up without Google approval, and the OAuth path that does require it.

---

## The scope decision — this determines everything

| Scope | Classification | Approval required | Timeline |
|---|---|---|---|
| `drive.file` | Non-sensitive | Basic OAuth verification | 1–3 business days |
| `drive.readonly` | **Restricted** | Full CASA security assessment | 4–8 weeks + annual audit |
| `drive` | **Restricted** | Same as above | Same |
| Service account (no OAuth) | N/A — server-to-server | **None** | Zero |

**Recommendation: use the service account path first, then add `drive.file` OAuth as a convenience layer.**  
`drive.readonly` is not worth the audit unless you have a compliance requirement that demands it.

---

## Path A — Service Account (no Google approval, works immediately)

This is what the backend already does. It just needs to be wired into the UI.

### How it works

An admin creates a service account in their GCP project, downloads the JSON key, and manually shares the target Drive folder with the service account email. The backend reads from that folder server-to-server — no OAuth consent screen, no Google review.

### What changes

#### `app/onboarding/page.tsx` + `app/admin/settings/SettingsClient.tsx`
Add two new fields:

```
Drive folder ID       — the folder the service account can read
                        (from the Drive URL: /folders/<THIS_PART>)
```

The service account JSON (`GOOGLE_SERVICE_ACCOUNT_JSON`) is a **deployment secret**, not a per-customer input — it goes in Cloud Run env vars, not the UI. All customers share one service account; each admin just grants that account reader access to their folder.

#### `app/api/orgs/route.ts`
Accept `driveFolderId` in the POST body and pass it to the backend:

```ts
body: JSON.stringify({
  org_id: orgId,
  drive_folder_id: driveFolderId?.trim() || null,
  ...
})
```

#### `backend/main.py` — `IngestRequest`
Add the field (already partially supported via env var fallback):

```python
class IngestRequest(BaseModel):
    org_id: str | None = None
    org_name: str | None = None
    org_logo_url: str | None = None
    notion_api_key: str | None = None
    notion_root_page_id: str | None = None
    public_doc_ids: list[str] | None = None
    drive_folder_id: str | None = None   # ← add this
```

#### `backend/ingest.py` — `load_documents()`
Wire it up inside `load_documents()`:

```python
_DRIVE_FOLDER_ID = os.getenv("DRIVE_FOLDER_ID", "")
_GOOGLE_SERVICE_ACCOUNT_JSON = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")

def load_documents(
    ...
    drive_folder_id: str | None = None,
) -> list[dict]:
    docs = []

    # ... existing loaders ...

    # Google Drive (service account)
    effective_folder = drive_folder_id or _DRIVE_FOLDER_ID
    if effective_folder and _GOOGLE_SERVICE_ACCOUNT_JSON and not USE_MOCK:
        print("Loading from Google Drive...")
        docs += load_from_google_drive(effective_folder, _GOOGLE_SERVICE_ACCOUNT_JSON)

    return docs
```

#### `database.py` — `Organization` model
Add column (store per-org so re-sync knows which folder to use):

```python
drive_folder_id: Mapped[str | None] = mapped_column(String, nullable=True)
```

Store it in `run_ingestion()` alongside `notion_api_key`.

### Admin setup instructions (per customer)

Give every new customer these four steps:

1. Go to `console.cloud.google.com` → IAM → Service Accounts
2. Create a new key for the Athena service account (`athena-ingest@<project>.iam.gserviceaccount.com`)
   — or use the key you already have — no new account needed
3. Open Google Drive, right-click the folder you want Athena to read, → Share
4. Add `athena-ingest@<project>.iam.gserviceaccount.com` as **Viewer**
5. Paste the folder ID into the Athena settings page

That's it — no Google approval, no OAuth, works in Shared Drives too (pass `supportsAllDrives=True`, which the existing code already does).

---

## Path B — OAuth user flow (`drive.file`, non-sensitive)

Use this when you want a one-click "Connect Google Drive" button that doesn't require the admin to manually share a folder. The user authorises Athena to see files they explicitly pick.

**Scope:** `drive.file` — only sees files opened through the app or selected via Picker.  
**Verification:** basic OAuth app verification (no security assessment).

### OAuth flow

```
User clicks "Connect Google Drive"
        │
        ▼
GET /api/auth/google
  → builds Google OAuth URL with scope=drive.file
  → 302 to accounts.google.com/o/oauth2/auth
        │
        ▼
Google consent screen (non-sensitive — no scary warning)
  User clicks Allow
        │
        ▼
GET /api/auth/google/callback?code=xxx
  → exchanges code for access_token + refresh_token
  → stores tokens in Organization DB record
  → 302 to /dashboard?connected=google
        │
        ▼
User then opens the Google Picker
  → selects folder/files to index
  → Picker returns file IDs
  → POST /api/drive/index { fileIds: [...] }
  → backend reads each file via drive.file token
```

### New files

| File | Purpose |
|---|---|
| `app/api/auth/google/route.ts` | Initiate OAuth redirect |
| `app/api/auth/google/callback/route.ts` | Exchange code, store tokens |
| `app/api/drive/picker/route.ts` | Return picker config (access token for client) |
| `app/api/drive/index/route.ts` | Trigger ingest for selected file IDs |
| `app/admin/settings/GoogleDriveCard.tsx` | UI card with Picker + connected state |

### New env vars

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

### Backend changes

`load_from_google_drive` already accepts folder IDs. Add a parallel function that accepts an OAuth access token + explicit file IDs:

```python
def load_from_drive_files(file_ids: list[str], access_token: str) -> list[dict]:
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    creds = Credentials(token=access_token)
    service = build("drive", "v3", credentials=creds)

    docs = []
    for file_id in file_ids:
        content = service.files().export(
            fileId=file_id,
            mimeType="text/plain"
        ).execute()
        meta = service.files().get(fileId=file_id, fields="name").execute()
        docs.append({
            "doc_id": file_id,
            "title": meta["name"],
            "content": content.decode("utf-8"),
            "source_type": "google_docs",
        })

    return docs
```

Token refresh: store `refresh_token` in the DB and exchange for a new `access_token` before each ingest run using `google.oauth2.credentials.Credentials`.

---

## Getting Google approval

### For Path A (service account)
**Nothing to do.** Service account auth does not go through the OAuth consent screen at all. No review, no verification, no waiting.

### For Path B (`drive.file`, basic verification)

Basic OAuth verification is required for any public app using OAuth. This is the lightweight version — no security assessment.

#### What you need before you apply

| Item | Notes |
|---|---|
| **Privacy policy URL** | Must be publicly accessible. Must name the scopes you use and explain what you do with user data. Must name your company. |
| **Homepage URL** | The Athena marketing page (already exists). Must describe what the app does. |
| **App name + logo** | "Athena" + your logo. Must match what users see in the product. |
| **Authorised domain** | The domain your app runs on. Must be verified in Google Search Console. |
| **Demo video** | Unlisted YouTube video showing the full OAuth flow — click "Connect", consent screen, redirect back, and how Drive files are used. Keep it under 2 minutes. |
| **Scope justification** | One sentence: "We use drive.file to read documents the user selects in the Google Picker in order to build a searchable knowledge base for their organisation." |

#### Verification steps

1. **Verify your domain** in [Google Search Console](https://search.google.com/search-console) — add the TXT record to your DNS. Takes minutes.

2. **Configure the OAuth consent screen** in [GCP console](https://console.cloud.google.com/apis/credentials/consent):
   - User type: **External**
   - App name: `Athena`
   - Support email: your support email
   - App domain: your production domain
   - Privacy policy link: `https://yourdomain.com/privacy`
   - Homepage link: `https://yourdomain.com`
   - Scopes: add `drive.file` — it should show as non-sensitive (no `!` indicator)
   - Test users: add your own email to test in development

3. **Write your privacy policy.** It must explicitly state:
   - What data you collect via Google (file content, file metadata)
   - That you do not sell or share user data with third parties
   - That you store data only to provide the search service
   - How users can request deletion
   - That you comply with Google's [API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)

   The last point is mandatory — you must include a link to that policy and state compliance.

4. **Record the demo video.** Flow to show:
   - User is logged into Athena
   - User clicks "Connect Google Drive" in Settings
   - Google consent screen appears (show the scopes listed — `drive.file`)
   - User clicks Allow
   - App redirects back to Athena Settings, showing "Connected"
   - User opens the file picker, selects a folder
   - Athena displays search results from documents in that folder
   - Upload to YouTube as **Unlisted**

5. **Submit for verification** in the OAuth consent screen page → click **"Prepare for verification"** → fill in the form. You'll need:
   - The YouTube video link
   - Scope justification text
   - Up to 3 links to documentation or help pages (use your onboarding guide or help docs)

6. **Wait.** Basic verification typically takes **1–3 business days** for non-sensitive scopes. You'll get an email from `api-oauth-review@google.com`.

#### While waiting

During review, the app works in **testing mode** for up to 100 test users you add manually. Add your customers' emails as test users so they can use it.

After verification, the consent screen shows your branding instead of the "Google hasn't verified this app" warning.

---

## What NOT to do

- Do not request `drive.readonly` or `drive` unless you have a specific reason. The CASA security assessment takes 4–8 weeks, costs real money (assessors charge $1,500–$5,000+), and requires annual recertification.
- Do not put the service account JSON key in the frontend or expose it in the onboarding form. It's a deployment secret.
- Do not use HTTP redirect URIs — Google rejects them. Use HTTPS in production.

---

## Implementation order

```
Week 1  Service account path wired up (Path A)
        — backend changes, Drive folder ID in settings, no approval needed
        — ship to customers immediately

Week 2  OAuth consent screen configured, privacy policy written, domain verified
        — app stays in testing mode, add customers as test users

Week 3  Demo video recorded, verification submitted
        — 1–3 day review

Week 3–4  Approval received, remove test-user restriction
          — any user can now connect Google Drive via the picker
```

---

## Open questions

- Who owns the GCP project and service account? (Determines step ownership for Path A)
- Does the production domain have HTTPS? (Required for OAuth redirect URI)
- Is there an existing privacy policy page? (Fastest unblock for verification)
- Do customers use Shared Drives or personal Drive? (Shared Drive requires `supportsAllDrives=True` — already in the code)
