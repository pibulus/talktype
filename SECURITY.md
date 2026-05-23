# Security Policy

Please do not open a public issue for vulnerabilities, leaked secrets, payment flow problems, or anything that could expose user recordings, transcripts, supporter codes, or API credentials.

## Reporting

Use GitHub private vulnerability reporting if it is available for this repository. If that is not available, contact the maintainer through the GitHub profile links and include:

- A short description of the issue.
- Steps to reproduce.
- Affected route, component, or service.
- Any logs or screenshots with secrets removed.

## Supported Version

Security fixes target the `main` branch.

## Data Handling Notes

TalkType can send audio to Deepgram or Gemini depending on the selected mode. Offline Mode runs Whisper locally in the browser. Transcript history is stored locally in the user's browser when supporter mode is unlocked. If a Passport and Vault URL are configured, transcript history and attached recordings can mirror automatically to the configured Vault server. Vault payloads are encrypted client-side before upload, and local history deletion is mirrored by removing stale encrypted media where possible.
