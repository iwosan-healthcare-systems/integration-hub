# LaunchPad

Routes: `/launchpad` (overview), `/launchpad/submit` (shareable form link), `/launchpad/history` (own submissions), `/launchpad/review` (review dashboard).

## Enable on a deployed environment

Run `npm run migrate` before restarting the API, then deploy the frontend build. The migration runner automatically includes `scripts/migrate-launchpad.js`. For a database already current with previous app migrations, `node scripts/migrate-launchpad.js` applies only LaunchPad. The migration is transactional and safe to repeat.

Admins have reviewer access. In Admin > Users, open a user's action menu and choose **Grant LaunchPad reviewer access**. Managers and CMS editors need this separate permission. The API checks the current permission on every request. The dashboard opens from the LaunchPad navigation; admins also have a LaunchPad link in their sidebar.

## Behaviour

- References use the `IHS-` prefix (for example `IHS-000001`) in screens, search and CSV export, including existing submissions.
- Account name, email and entity are captured server-side as a submission snapshot. No unique-per-user submission restriction applies.
- Five form sections and the appointment-reminder example follow the supplied requirements. Funding is capped at NGN 100,000; pilot dates are user-entered. Programme deadlines are not enforced.
- Statuses: Submitted, Under Review, Successful, Rejected. Status changes are transactional and retain an audit history. Concurrent changes require the reviewer to refresh.
- Users see only their own history; reviewers can view all entities. Date filters include both calendar dates in Africa/Lagos. Dashboard counts and CSV exports use the applied filters; export includes every matching page and every answer. Text cells are protected against spreadsheet formula execution.
- Email notifications are deferred. MD/CEO approval remains outside the platform. Iwosan Wellness is available for account entity assignment.

## Verification

`npm run build`, `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit`, and `npm test` verify the frontend.

`npm run test:launchpad` runs the API against the configured localhost PostgreSQL database, creates temporary test users and submissions, and removes them afterward. Apply existing app migrations first. The test starts an isolated API on port 3197 and refuses remote databases. It checks identity capture, multiple submissions, authorisation, validation, concurrent status updates, history, filters, CSV export, and permission revocation.
