# Working on Meeting Meter

## Architecture

This is a static MarinOS app built with `index.html`, `assets/app.css`, and `assets/app.js`. It has no build process, framework, or backend.

The browser fetches the County Open Data JSON endpoint directly:

```text
https://data.marincounty.gov/resource/w7uw-fvda.json?$limit=50000&$order=title
```

The calculator uses these source fields:

- `title`
- `job_class_code`
- `hourly_step_1`
- `hourly_step_2`
- `hourly_step_3`
- `hourly_step_4`
- `hourly_step_5`

Other fields in the source dataset are not needed for calculation.

## Required behavior

1. Classification choices must come from the loaded Open Data records and have at least one positive published hourly step.
2. County personnel classifications and hourly rates must come from Open Data. Non-personnel groups are the only approved use of manually entered hourly rates.
3. A County personnel group contains a classification, selected pay step, and number of people. When an empty personnel group receives a classification, insert a new empty personnel group immediately below it.
4. The **Add non-personnel group** button inserts a non-personnel group at the top of the participant list. A non-personnel group contains an optional predefined description, number of people, and manually entered hourly rate per person. Description choices are Facilitator, Consultant, Vendor staff, and Other non-personnel.
5. Default to Step 5 when it has a positive hourly value. Otherwise, use the highest available positive hourly step.
6. Planned-duration mode defaults to 1 hour.
7. Employer costs default to 138%, remain visibly editable, and accept any nonnegative percentage, including values greater than 100%. Apply employer costs only to County personnel salary cost, never to non-personnel rates.
8. Display salary cost, estimated employer costs, non-personnel cost, and estimated total meeting cost separately.
9. Count complete non-personnel groups in the attendee total and add their calculated cost directly to the meeting total.
10. Live timing must be timestamp-based rather than implemented as a counter that increments once per interval.
11. Keep calculator entries in memory only. Do not write participant groups, timer state, duration, or employer percentage to `localStorage`. Explicit meeting export is the only persistence mechanism.
12. Export meeting files as versioned JSON with application identifier `marin-meeting-meter`, schema version `1`, calculation mode, planned duration, live elapsed duration, employer percentage, and complete participant groups. Do not export the automatic empty personnel row or other incomplete groups.
13. Import must work through the file picker and drag and drop anywhere on the page. Read files locally in the browser, limit imports to 1 MB and 500 groups, validate the schema before changing state, resolve County classifications against the current Open Data records, reject unavailable classifications or pay steps, and restore live timers paused rather than running.
14. The public job-class dataset may be cached for up to 12 hours.
15. Copy summary must remain plain text and must not include employee or contractor names or other personal information.
16. Recurring-meeting projections are outside version 1.

## Calculation

```text
salary cost = sum(hourly step rate × people) × elapsed hours
estimated employer costs = salary cost × employer-cost percentage
non-personnel cost = sum(manually entered hourly rate × people) × elapsed hours
estimated total meeting cost = salary cost + estimated employer costs + non-personnel cost
```

## Development rules

1. Keep the app client-side unless the product owner explicitly changes the requirement.
2. Keep the app independent of Job Classes and Pay. Do not introduce a runtime dependency on that repository.
3. Reuse the public source endpoint, but do not maintain a second salary dataset in this repository.
4. Preserve responsive behavior, keyboard operation, visible focus, and light/dark mode support.
5. Preserve visible loading, error, and retry states.
6. Keep the searchable classification field usable by keyboard. Search must match title and class code.
7. Do not add employee-name fields.
8. Keep the main `#start` section immediately useful. Put assumptions and explanatory details in `#about`.
9. Keep identity references aligned to `Meeting Meter` and `marin-meeting-meter`.

## Before finishing

Run:

```bash
node --check assets/app.js
```

Then test over HTTP:

```bash
python3 -m http.server 8000
```

Exercise Step 5 default and fallback behavior, multiple personnel and non-personnel groups, optional description filtering, manually entered rates, employer-cost exclusion for non-personnel, edited employer percentages, live-timer pause/resume, reset, copy summary, JSON export/import round trips, drop import from every app section, invalid-file handling, keyboard operation, and mobile reflow.
