# n8n Workflow Import Guide

## leads_scrape_apify

### How to Import

1. Open your n8n instance at `<your-name>.app.n8n.cloud`
2. Go to **Workflows** in the left sidebar
3. Click **Add Workflow** > **Import from file**
4. Select `workflows/leads_scrape_apify.json`
5. Click **Import**

### Post-Import Setup (Required)

#### 1. Assign Apify Credential

After import, the "Apify Scrape" HTTP Request node will show a credential error.

1. Open the "Apify Scrape" node
2. Under **Authentication**, click the credential selector
3. Create a new credential named **"Apify API"**:
   - Type: **Header Auth**
   - Name: `Authorization`
   - Value: `Bearer <your-apify-api-token>`
4. Save the credential

> Your Apify API token is at: https://console.apify.com/account/integrations

#### 2. Verify Node Chain

Confirm the workflow has these 5 nodes wired in order:

```
Execute Workflow Trigger
    -> Apify Scrape (HTTP Request, POST, sync endpoint)
    -> Map Fields (Code node, normalizes 5 output fields)
    -> Has Posts? (IF node, branches on array length)
        true (items > 0)  -> [workflow output — posts pass through]
        false (items = 0) -> Log Empty (Code node, returns empty array)
```

#### 3. Record Workflow ID

After saving:
1. Note the workflow ID from the URL: `adir1123.app.n8n.cloud/workflow/<ID>`
2. Update `.planning/STATE.md` with the ID in the `leads_scrape_apify` row

### Testing

See `.planning/phases/02-leads-scrape-apify/02-VALIDATION.md` for the 3 test scenarios.

**Quick test:**
1. Open the workflow in n8n
2. Click **Test workflow**
3. Enter input:
   ```json
   { "group_url": "https://www.facebook.com/groups/<public-group-id>", "post_count": 5 }
   ```
4. Confirm "Map Fields" node output has items with: `postId`, `authorName`, `postText`, `postLink`, `postDate`

### Node Configuration Reference

| Node | Type | Key Config |
|------|------|-----------|
| Execute Workflow Trigger | executeWorkflowTrigger | No config needed — receives `$json` from caller |
| Apify Scrape | httpRequest | POST, Header Auth (Apify API credential), 300s timeout |
| Map Fields | code | JS — maps Apify fields to 5-field schema with fallback aliases |
| Has Posts? | if | Condition: `$input.all().length > 0` |
| Log Empty | code | Logs group URL, returns `[{ json: { posts: [] } }]` |

### Apify Sync Endpoint

```
POST https://api.apify.com/v2/acts/apify~facebook-groups-scraper/run-sync-get-dataset-items
Authorization: Bearer <token>
Content-Type: application/json

{
  "startUrls": [{ "url": "<group_url>" }],
  "resultsLimit": <post_count>,
  "viewOption": "CHRONOLOGICAL"
}
```

Response is a direct JSON array of post objects (no polling needed).
