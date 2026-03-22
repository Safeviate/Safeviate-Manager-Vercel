# Firebase Genkit Endpoints

This project already uses Firebase App Hosting with a Next.js app and Genkit flows under `src/ai/flows`.

To expose those flows as Firebase-hosted backend functions, use the API routes below:

- `POST /api/ai/analyzeMoc`
- `POST /api/ai/generateChecklist`
- `POST /api/ai/generateExam`
- `POST /api/ai/generateSafetyProtocolRecommendations`
- `POST /api/ai/parseLogbook`
- `POST /api/ai/summarizeDocument`
- `POST /api/ai/summarizeMaintenanceLogs`

Each route:

- validates the JSON body against the matching Genkit input schema
- runs the existing Genkit flow on the server
- returns `{ ok, flow, result }`

## Example

```bash
curl -X POST http://localhost:9003/api/ai/analyzeMoc \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduce new dispatch workflow",
    "description": "Move dispatch approval into a digital review flow.",
    "reason": "Reduce manual coordination delays.",
    "scope": "Operations control and instructors"
  }'
```

## Notes

- These endpoints are server-side and compatible with the existing Firebase-hosted app backend.
- If you later want separate Cloud Functions, the same registry can be reused as the execution layer.
