# Google Calendar setup

1. In Google Cloud Console, create or choose a project and enable Google Calendar API.
2. Configure Google Auth Platform / OAuth consent. For an External app in Testing, add your Google account as a test user.
3. Create an OAuth client of type Desktop app and download its JSON file.
4. Restart Lesson Planner. Expand Google Calendar, click “Завантажити OAuth JSON”, and select that file.
5. Click “Увійти в Google” and approve access in your browser. Sign-in times out after three minutes.
6. Generate and review lessons. Select a calendar and click “Створити події в Google Calendar”. Confirm the calendar, event count, and time zone.

Grade colors map to the nearest Google event color. Reminders override calendar defaults, including no notification. Times use the selected calendar's time zone.

Identical events created by this app use stable IDs and are skipped on retries. Changing a title, date, time, room, or destination creates a new event, rather than updating the old event. Previously imported CSV/ICS events are not detected; avoid importing a schedule twice.

Credentials and tokens are encrypted with Windows protection in google-calendar.enc in Electron's userData directory. They never enter the renderer or source files. Sign out deletes this file and clears tokens and OAuth client credentials from memory. Load OAuth JSON again before the next sign-in. The original downloaded JSON, Google events, and lesson settings are not deleted. To revoke Google access too, remove the app in your Google Account's third-party connections.

External OAuth apps in Testing may require renewed consent after seven days. Organization policies may require administrator approval.

Documentation:
- https://developers.google.com/identity/protocols/oauth2/native-app
- https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
