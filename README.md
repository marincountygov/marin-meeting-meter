# Meeting Meter

## About this app

- **Purpose:** Estimate costs for County meetings.
- **Audience:** County staff planning or reviewing meetings.
- **Owner:** County of Marin
- **Repo:** marin-meeting-meter
- **Status:** Prototype

## Data source

The app reads the public County Open Data JSON endpoint:

```text
https://data.marincounty.gov/resource/w7uw-fvda.json
```

The calculator uses published hourly pay-step values from the County job-class dataset for County personnel. It does not contain a separate salary table or allow manually entered County classifications. Non-personnel groups use manually entered hourly rates.

## Features

- Search job classifications by title or class code.
- Add multiple County personnel groups, with a classification, pay step, and number of people for each group. Selecting a classification in an empty group automatically creates a new empty personnel group directly below it.
- Add non-personnel groups at the top of the participant list for contractors and similar participants. Each group has an optional filtered description, number of people, and manually entered hourly rate per person.
- Default each classification to Step 5 when available; otherwise use its highest published hourly step.
- Calculate a meeting using a planned duration in hours and minutes.
- Track an active meeting with a timestamp-based live timer that supports Start, Pause, Resume, and Reset.
- Add an editable employer-cost percentage, defaulting to 138% and accepting any nonnegative value, including values greater than 100%.
- Show salary cost, estimated employer costs, non-personnel cost, and estimated total meeting cost separately.
- Copy a plain-text summary for Outlook, Teams, Word, or another internal tool.
- Export a meeting to a versioned JSON file and import it later with a file picker or drag and drop anywhere on the page.
- Keep participant groups and calculator state in the current page session only unless the user explicitly exports a meeting file.
- Cache only the public job-class dataset in browser `localStorage` for up to 12 hours.
- Run without a backend or build process.

## Calculation

For each participant group:

```text
hourly group rate = published hourly step rate × number of people
salary cost = hourly group rate × meeting duration in hours
```

For each non-personnel group:

```text
hourly group rate = manually entered hourly rate per person × number of people
non-personnel cost = hourly group rate × meeting duration in hours
```

For the meeting:

```text
salary cost = sum of all participant-group salary costs
estimated employer costs = salary cost × employer-cost percentage
non-personnel cost = sum of all non-personnel-group costs
estimated total meeting cost = salary cost + estimated employer costs + non-personnel cost
```

## Assumptions and limits

- Classifications must come from the County Open Data dataset and have at least one positive published hourly step.
- Step 5 is selected by default when available. If it is not published, the highest available step is selected.
- The employer-cost percentage defaults to 138% and is visibly editable. It accepts any nonnegative value, including values greater than 100%.
- Employer costs are a general planning estimate for benefits and other employer costs, not an employee-specific calculation.
- The employer-cost percentage applies only to County personnel salary cost. It is not applied to non-personnel rates.
- Non-personnel descriptions are optional and limited to Facilitator, Consultant, Vendor staff, and Other non-personnel.
- Non-personnel hourly rates are entered manually and should represent the rate for each person in the group.
- The estimate does not include overtime, premium pay, deductions, or other employee-specific payroll factors.
- The result does not imply that the total would become available as budget savings if a meeting did not occur.
- Recurring-meeting projections are outside version 1.

## Meeting files

**Export meeting** creates a local JSON file containing:

- Calculation mode.
- Planned duration and the current live-timer duration.
- Employer-cost percentage.
- Complete County personnel and non-personnel participant groups.

The automatically created empty County personnel row and any other incomplete participant rows are not exported. Importing a meeting replaces the current calculation and appends a new empty County personnel row so another classification can be added. A live meeting is imported paused at its exported elapsed time; it never starts automatically.

Meeting files use the application identifier `marin-meeting-meter` and schema version `1`. Imports are limited to 1 MB and 500 participant groups. County personnel classifications are resolved against the currently loaded Open Data records, and an import is rejected if a classification or selected pay step is no longer available.

Users can import with the **Import meeting** button or drop one exported JSON file anywhere on the page. Files are read locally by the browser and are not uploaded.

## Privacy and storage

The app does not collect employee or contractor names or other personal information. Participant groups, meeting duration, timer state, and employer-cost percentage are not written to `localStorage`. Only the public job-class dataset may be cached locally for faster loading. Exported meeting files are created only when a user chooses **Export meeting** and remain on the user's device unless the user shares them.

## Run locally

Open `index.html` directly in a browser, or serve the folder with a static web server:

```bash
python3 -m http.server 8000
```

Then visit:

```text
http://localhost:8000/
```

Serving over HTTP is preferred because browser fetch and clipboard behavior are more predictable than with `file://` URLs.

## Deployment

This app is static HTML, CSS, and JavaScript. It can be deployed to GitHub Pages or any static web host.

Expected production URL:

```text
https://marincountygov.github.io/marin-meeting-meter/
```

## MarinOS registration

Add the contents of `catalog-entry.json` to the MarinOS `catalog.json`, then add a matching card to the MarinOS directory `index.html` if the directory still requires manually maintained cards.

The app vendors Marin App Shell under:

```text
vendor/marinos/
```

The pinned shell version is recorded in `marin.yml`. Do not edit vendored shell files directly.

The app requires internet access to load the shared MarinOS shell assets and the County Open Data feed.

## Files

```text
index.html                  Application markup and shell components
assets/app.css              Calculator-specific styles
assets/app.js               Data loading, participant entry, calculations, timer, copy, and meeting import/export logic
vendor/marinos/             Vendored Marin App Shell runtime and styles
marin.yml                   MarinOS project manifest
catalog-entry.json          Suggested MarinOS catalog entry
security.json               Security policy manifest
THIRD_PARTY_NOTICES.md      Third-party license notices
AGENTS.md                   Maintenance notes for AI coding agents
```

## Testing checklist

Before publishing, test:

- Open Data loading, cache loading, failed-load state, and Retry.
- Classification search by title and class code.
- Step 5 default behavior.
- Fallback to the highest published step when Step 5 is unavailable.
- Changing the selected pay step.
- Multiple County personnel groups, automatic insertion of a new empty personnel group after a classification is selected, and multiple people in a group.
- Adding multiple non-personnel groups at the top of the list.
- Filtering and selecting each optional non-personnel description, including leaving it blank.
- Manually entered non-personnel hourly rates and confirmation that employer costs are not applied to them.
- Removing participant groups.
- Planned-duration calculations in hours and minutes.
- Employer-cost values at 0%, 138%, decimal percentages, and a value greater than 100%.
- Live timer Start, Pause, Resume, and Reset.
- Changing personnel, non-personnel rates, or employer percentage while the live timer is running.
- Full calculator reset.
- Copy summary output.
- Exporting and reimporting planned-duration and live-timer meetings.
- Confirmation that exported files omit incomplete participant rows and preserve employer percentage, participant order, classifications, steps, people, descriptions, and non-personnel rates.
- Importing with the file picker and by dropping a file anywhere on Calculator, About, and Updates.
- Invalid JSON, wrong app identifier, unsupported schema version, unavailable classification, unavailable pay step, oversized file, and multiple-file drop handling.
- Confirmation that imported live timers are paused and do not begin counting automatically.
- Keyboard operation of classification search and all controls.
- Mobile reflow at narrow widths.
- Light and dark mode.
