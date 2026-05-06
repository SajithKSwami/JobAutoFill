# Security Notes

## Data boundary
Candidate profile data must remain on the user's device in MVP. No backend calls should include profile, resume, demographic, sponsorship, or application answers.

## Autofill boundary
The extension fills fields only after user action. It must not submit forms, bypass CAPTCHA, scrape pages at scale, or hide automation from the user.

## Permission policy
Start with `activeTab`, `scripting`, and explicit host permissions for supported ATS domains. Avoid `<all_urls>` unless the user enables generic mode.

## Sensitive fields
Demographic, disability, veteran, and sponsorship fields should require explicit user configuration and should be previewed before filling.
