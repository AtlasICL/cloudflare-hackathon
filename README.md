# Cloudwave - 1111 FM
Cloudflare 2026 summer hackathon submission.

### Team members
|               |
| ------------- |
| Emre Acarsoy  |
| Othman Achki  |
| Sina Dilek    |
| Anna Rachkova |

### Development

Set `ELEVENLABS_API_KEY` in `.dev.vars`, then run:

```sh
npm run dev
```

Add the production secret before deploying:

```sh
npx wrangler secret put ELEVENLABS_API_KEY
npm run deploy
```
