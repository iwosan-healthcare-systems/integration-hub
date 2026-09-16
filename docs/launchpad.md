# LaunchPad

Routes: `/launchpad` (overview), `/launchpad/your_idea` (shareable form link), `/launchpad/history` (own submissions), `/launchpad/review` (permitted regular users), `/admin/launchpad` (admin/manager review dashboard).

## Enable on a deployed environment

Run `npm run migrate` before restarting the API, then deploy the frontend build. The migration runner automatically includes `scripts/migrate-launchpad.js`. For a database already current with previous app migrations, `node scripts/migrate-launchpad.js` applies only LaunchPad. The migration is transactional and safe to repeat.

Admins and managers have reviewer access automatically through **Panel > LaunchPad**. The shared dashboard renders inside the panel layout at `/admin/launchpad`, with the same counts, filters, responses, status actions and exports. Their hub review links redirect to the panel, and the hub review tab is hidden for these roles.

Regular users need an admin to grant **LaunchPad reviewer access** in Admin > Users. They review at `/launchpad/review` in the hub. CMS access alone does not grant review permission. The API checks the current role and permission on every request.

## Behaviour

- References use the `IHS-` prefix (for example `IHS-01`) in screens, search and CSV export, including existing submissions.
- Account name, email and entity are captured server-side as a submission snapshot. No unique-per-user submission restriction applies.
- Five form sections and the appointment-reminder example follow the supplied requirements. Funding above NGN 100,000 is flagged for review; implementation start and free-text duration are user-entered. Programme deadlines are not enforced.
- Statuses: Idea Received, Under MD Review, MD Approved, Under Implementation, Concluded Pilot, Parked. Status changes are transactional and retain an audit history. Concurrent changes require the reviewer to refresh.
- Users see only their own history; reviewers can view all entities. Date filters include both calendar dates in Africa/Lagos. Dashboard counts and CSV exports use the applied filters; export includes every matching page and every answer. Text cells are protected against spreadsheet formula execution.
- Email notifications are deferred. Reviewers can record MD approval using the MD Approved status. Iwosan Wellness is available for account entity assignment.

## Verification

`npm run build`, `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit`, and `npm test` verify the frontend.

`npm run test:launchpad` runs the API against the configured localhost PostgreSQL database, creates temporary test users and submissions, and removes them afterward. Apply existing app migrations first. The test starts an isolated API on port 3197 and refuses remote databases. It checks identity capture, multiple submissions, authorisation, validation, concurrent status updates, history, filters, CSV export, and permission revocation.

The review status cards are toggle filters; All submissions clears the status. Cards and the status bar chart retain counts across all statuses for the applied date, entity and search. The entity pie chart, response list and export follow the selected status as well. All charts aggregate every matching response, independently of pagination.

Review responses use compact rows with 25 responses per page. Search applies after a 250 ms typing pause and cancels superseded requests; entity and valid date ranges apply immediately. Previous results remain visible during refresh.

Funding above NGN 100,000 is accepted and flagged in review cards, response details and CSV exports. The exact requested amount is retained; the flag does not automatically change the submission status.

Parking an idea requires a reason (up to 2,000 characters). The owner and reviewers can read it in response details and status history; it is also included in CSV exports. Pushing to master automatically runs this migration through the deployment workflow's npm run migrate step before the API restarts. Include scripts/migrate-launchpad-rejection-comments.js and the updated schema in the commit; no manual production command is needed. Older parked submissions show that no comment was recorded.

The Implementing Your Idea section collects implementation plan, KPIs/outcomes, start date, free-text duration, funding and optional pilot risks in that order. Older testing/team/end-date/risk answers remain available in details and export. Existing status keys are retained: submitted = Idea Received, under_review = Under MD Review, successful = MD Approved, rejected = Parked. The new workflow migration (migrate-launchpad-workflow.js) adds Under Implementation and Concluded Pilot automatically on push to master. Frontend reversal controls allow forward progress and parking; only admins can reopen Parked or Concluded Pilot or move backward.

Ownership and approval includes a required Yes/No MD approval answer after line manager support. This is the submitter's answer and does not automatically change the reviewer-controlled status. Older responses display Not collected on the original form.
