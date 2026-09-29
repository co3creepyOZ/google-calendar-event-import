# Personal Google Calendar sync without Desktop OAuth

Setup instructions and a copyable script are inside the app under **Google Calendar Sync — без Desktop OAuth JSON → Як підключити Apps Script**.

1. Open script.google.com under the Google account that owns the destination calendar.
2. Create a project and paste apps-script/Code.gs into Code.gs.
3. Enable the advanced Google Calendar service (Services → + → Google Calendar API).
4. Run setup and authorize calendar access. Copy the private 64-character connection key from the execution log.
5. Optionally change CALENDAR_ID in Project Settings → Script Properties from primary to another calendar ID you can edit.
6. Deploy as a Web app: Execute as Me, access Anyone. Paste the /exec URL and connection key into the desktop app and connect.
7. Generate lessons and click Sync. Confirm the destination calendar before writing events.

Anyone access is required for the desktop HTTP client; signed requests with a private key protect the endpoint. Do not publish the key or execution logs. School policies may disallow this deployment option. Each user should deploy their own project and use their own key.

The connection is stored encrypted with Windows protection. Disconnect deletes the local connection file, not the deployment. Archive the deployment or rotate SYNC_KEY in Script Properties to revoke remote access.

This is manually triggered, one-way sync from the current generated schedule to Google. Date + lesson number + class/group determine identity within a profile/calendar. Changes to title, time, room, reminder or color update the same event. A changed date/slot/group creates a new event. Nothing is deleted automatically. Existing CSV, ICS, and Desktop OAuth events are not adopted.

One sync accepts up to 200 lessons. Errors report partial counts; retrying updates already-created lessons instead of duplicating them. Colors map to the nearest Google event color. Times use the configured Google calendar time zone. A different target calendar receives its own events.

No Google project, deployment or actual events were created during development. Real connection requires your setup and authorization.

References: https://developers.google.com/apps-script/guides/web and https://developers.google.com/apps-script/guides/content
