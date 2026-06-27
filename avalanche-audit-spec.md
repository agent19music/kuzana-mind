# Avalanche On-Chain Audit Trail — Implementation Spec

Tamper-proof attestation of knowledge queries on Avalanche C-Chain.  
Sponsored by AVAX Africa. Opt-in per workspace via env var.

---

## What this is and isn't

**Is:** A lightweight, verifiable record that a specific question was answered using a specific document at a specific time. Independently auditable — no one needs to trust Kuzana's database.

**Isn't:** Content storage. No query text, no document content, no PII goes on-chain. Only cryptographic hashes and metadata.

---

## What goes on-chain

One transaction per query, submitted asynchronously after the response is returned to the user.

### Transaction payload (calldata)

```json
{
  "v": 1,
  "query_hash": "sha256(normalized_query_text)",
  "doc_id": "notion_page_abc123",
  "doc_hash": "sha256(chunk_text_used_in_response)",
  "source_type": "notion | google_docs | mock",
  "workspace_id": "kuzana_org_xyz",
  "similarity_score": 0.87,
  "ts": 1719432000
}
```

Encoded as UTF-8 JSON, stored in the transaction's `data` field.  
No smart contract needed for MVP — plain value transfer (0 AVAX) with data payload.  
Post-MVP: deploy a minimal `AuditLog` contract with an `emit` event for structured indexing.

### Cost per query

Avalanche C-Chain base fee: ~25 nAVAX/gas. A data-only tx uses ~21,000 + ~68 gas per byte.  
At ~200 bytes of payload: **~0.000006 AVAX per query** (~$0.0001 at current prices).  
1,000 queries/day = ~$0.10/day in gas. Negligible.

---

## Architecture

```
User sends question
        │
        ▼
FastAPI /chat endpoint
  → retrieval.py finds best matching chunk
  → returns answer + source doc metadata
        │
        ├──► Response returned to frontend immediately (not blocked)
        │
        └──► audit.py.submit_audit() called as background task
                │
                ▼
              Hash query + doc chunk
                │
                ▼
              Build calldata JSON
                │
                ▼
              Sign + submit tx to Avalanche C-Chain (or Fuji testnet)
                │
                ▼
              Store tx_hash on the chat record in DB
```

The chain submission is **fire-and-forget** — the user gets their answer in the same latency as today. Audit happens in the background.

---

## Environment variables

```env
# Kill switch — off by default, org opts in
AVALANCHE_AUDIT_ENABLED=false

# Fuji testnet for dev, mainnet for production
AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc

# Dedicated audit wallet — funded with small AVAX, never the org's main wallet
AVALANCHE_PRIVATE_KEY=0x...

# Workspace identifier stamped on every tx (can be org name or UUID)
AVALANCHE_WORKSPACE_ID=kuzana-demo
```

**Mainnet RPC:** `https://api.avax.network/ext/bc/C/rpc`  
**Fuji testnet RPC:** `https://api.avax-test.network/ext/bc/C/rpc`  
**Chain ID:** mainnet `43114`, Fuji `43113`

Get testnet AVAX at: `faucet.avax.network` — $2 worth of real AVAX covers months of mainnet usage.

---

## File specs

### `backend/audit.py` — new file

Owns all chain interaction. No other file needs to know about web3.

```python
# Dependencies: web3==6.x  (add to requirements.txt)

submit_audit(
    query: str,
    doc_id: str,
    chunk_text: str,
    source_type: str,
    similarity_score: float,
) -> str | None
```

Returns the transaction hash on success, `None` if audit is disabled or submission fails.  
**Never raises** — a failed audit tx must not break the chat response.

#### Internal logic

1. Check `AVALANCHE_AUDIT_ENABLED` — return `None` immediately if false
2. Build payload dict (see schema above)
3. Hash query: `hashlib.sha256(query.strip().lower().encode()).hexdigest()`
4. Hash doc: `hashlib.sha256(chunk_text.encode()).hexdigest()`
5. Encode payload as UTF-8 JSON → bytes
6. Build tx:
   ```python
   {
     "to": AVALANCHE_PRIVATE_KEY.address,  # self-send, value=0
     "value": 0,
     "data": payload_bytes,
     "gas": 100_000,                       # safe upper bound for data tx
     "maxFeePerGas": w3.eth.gas_price * 2,
     "maxPriorityFeePerGas": w3.to_wei(1, "gwei"),
     "nonce": w3.eth.get_transaction_count(address),
     "chainId": 43114,                     # 43113 for Fuji
   }
   ```
7. Sign with `AVALANCHE_PRIVATE_KEY`, send raw tx
8. Return `tx.hex()`

#### Error handling

Wrap entire function in `try/except`. On any exception: log the error, return `None`. The chat endpoint continues regardless.

---

### `backend/main.py` — update `/chat` endpoint

After `retrieval.py` returns the result, add:

```python
from fastapi import BackgroundTasks

@app.post("/chat")
async def chat(req: ChatRequest, background_tasks: BackgroundTasks):
    result = retrieve(req.query)

    background_tasks.add_task(
        submit_audit,
        query=req.query,
        doc_id=result.get("source_doc_id", ""),
        chunk_text=result.get("chunk_text", ""),
        source_type=result.get("source_type", "unknown"),
        similarity_score=result.get("similarity_score", 0.0),
    )

    return result
```

`BackgroundTasks` is built into FastAPI — no new dependencies.

---

### `backend/database.py` — update `DocumentChunk` model

Add `tx_hash` to the chat response schema (not to `DocumentChunk` — to wherever chat messages are eventually persisted).

For MVP (no chat persistence yet): `tx_hash` is returned in the API response only, stored client-side.

---

### `app/api/chat/route.ts` — pass tx_hash through

The FastAPI response will include `tx_hash: string | null`. Pass it through the Next.js proxy without modification. Frontend receives it alongside the answer.

---

### Chat response type update — `app/chat/page.tsx`

```typescript
type ChatResponse = {
  // existing fields...
  tx_hash?: string | null;
}
```

---

### `app/components/chat/AuditBadge.tsx` — new component

Shown below each assistant response when `tx_hash` is present.

**States:**

| State | Display |
|---|---|
| `tx_hash` present | Small badge: "Verified on Avalanche ↗" — links to Snowtrace |
| `tx_hash` null (audit disabled or failed) | Nothing rendered |

**Snowtrace links:**
- Mainnet: `https://snowtrace.io/tx/{tx_hash}`
- Testnet: `https://testnet.snowtrace.io/tx/{tx_hash}`

Use an env var `NEXT_PUBLIC_AVALANCHE_NETWORK=testnet|mainnet` to switch the link.

**Design:**
- Tiny — 12px, muted color, sits below the answer text
- Avalanche red (`#E84142`) for the dot/icon only — don't paint the whole badge red
- No hover animation, no emphasis — it should feel like a footnote, not a feature flag

```
  ● Verified on Avalanche  ↗
```

---

### `app/components/Integrations.tsx` — Avalanche card

Add a fourth card (or replace "Coming soon" section) for the audit trail:

- Icon: Avalanche logo (red A)
- Title: "Audit trail"
- Body: "Every query is attested on Avalanche C-Chain. Share a link with auditors, donors, or your board — no middleman."
- Badge: "Powered by AVAX Africa"
- State: shows as active when `NEXT_PUBLIC_AVALANCHE_AUDIT_ENABLED=true`

---

## Wallet setup (one-time)

1. Create a dedicated wallet in MetaMask or via `web3.py` key generation — **not your personal wallet**
2. Fund it with AVAX:
   - Dev: Fuji faucet (`faucet.avax.network`) — free
   - Production: ~$5 of real AVAX covers tens of thousands of queries
3. Store the private key as `AVALANCHE_PRIVATE_KEY` in backend env
4. AVAX Africa can top up this wallet as part of the sponsorship — frames their contribution as direct infrastructure support

---

## Snowtrace explorer UX

When a user clicks the badge, they see a raw Avalanche transaction. The `Input Data` field decodes to the JSON payload. Anyone — auditor, donor, regulator — can independently verify:

- The query happened at that timestamp
- The document hash matches the document currently in the knowledge base
- The workspace ID matches the org

No Kuzana account needed. No login. Just the tx hash.

---

## Testnet first checklist

- [ ] Add `web3` to `backend/requirements.txt`
- [ ] Set `AVALANCHE_RPC_URL` to Fuji endpoint
- [ ] Set `AVALANCHE_AUDIT_ENABLED=true` in local `.env`
- [ ] Generate a test wallet, fund from faucet
- [ ] Send one test query, verify tx appears on `testnet.snowtrace.io`
- [ ] Confirm `tx_hash` flows through to frontend badge
- [ ] Flip `AVALANCHE_RPC_URL` to mainnet + `CHAIN_ID=43114` for production

---

## Post-MVP additions (not in scope)

### Minimal smart contract

Deploy an `AuditLog` contract on C-Chain that emits structured events:

```solidity
event QueryAudited(
    bytes32 indexed workspaceId,
    bytes32 queryHash,
    bytes32 docHash,
    string  docId,
    uint256 timestamp
);
```

Enables: indexed queries by workspace, subgraph indexing, dashboard of all org queries over time.

### Org-level audit dashboard

A page at `/audit` — table of all queries with timestamp, document referenced, and Snowtrace link. Exportable as CSV for auditors.

### AVAX Africa subsidy programme

AVAX Africa funds a shared wallet that orgs can draw gas from for their first N queries. Removes the barrier of orgs needing to hold AVAX before they can use the feature. Directly ties the sponsorship to product value.

### Query volume reporting to AVAX Africa

Monthly: total tx count by workspace, submitted to AVAX Africa as proof of ecosystem usage. Gives them a concrete metric for their grant/sponsorship reporting.
