# Environment separation (prod vs test) — verification

Closes the check in #75 (security plan R05). Supabase projects: **prod** `ypzlxhhhvnffnxebutgw`, **test** `aqmarbfzpdcnwwawbulv`.

## Last verified: 2026-11-05 (Netlify site `opencivera`)

| Variable | production | deploy-preview | branch-deploy | dev / dev-server |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | prod | test | test | test |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (JWT `ref`) | prod | test | test | test |
| `SUPABASE_SERVICE_ROLE_KEY` (JWT `ref`) | prod | test | test | test |

No tracked file holds real keys: only `.env*.example` are committed (`.gitignore` ignores every other `.env*`), and `tests/environment-separation.test.mjs` fails if that changes.

## Re-check (prints refs only, never key values)

```bash
export NODE_OPTIONS=--use-system-ca   # corporate TLS proxy
S=a2791e53-7379-4b60-882b-c1e31e97054e
ACC=$(netlify api getSite --data "{\"site_id\":\"$S\"}" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).account_slug')
netlify api getEnvVars --data "{\"account_id\":\"$ACC\",\"site_id\":\"$S\"}" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>JSON.parse(s).filter(v=>/SUPABASE/.test(v.key)).forEach(v=>{
 console.log(v.key);for(const x of v.values){const m=(x.value||"").match(/([a-z0-9]{20})\.supabase\.co/);let r=m&&m[1];
 try{r=r||JSON.parse(Buffer.from(x.value.split(".")[1],"base64url").toString()).ref}catch{}console.log("  ",x.context,r)}}))'
```

Expected: only `production` shows the prod ref.

## Rules

- Never use real personal data in the test project (all test accounts are synthetic; see `is_test_user`, ADR 0019).
- A new Supabase env var must be scoped per context the same way before it ships.
