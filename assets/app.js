(() => {
  "use strict";

  const DATA_URL = "https://data.marincounty.gov/resource/w7uw-fvda.json?$limit=50000&$order=title";
  const CACHE_KEY = "marin-meeting-meter-cache-v1";
  const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
  const DEFAULT_EMPLOYER_COST_PERCENT = 138;
  const DEFAULT_MEETING_DURATION_HOURS = 1;
  const MEETING_CLASS_OPTION_LIMIT = 30;
  const MEETING_TIMER_INTERVAL_MS = 250;
  const MEETING_IDLE_DELAY_MS = 5000;
  const MEETING_FILE_FORMAT = "marin-meeting-meter";
  const MEETING_FILE_VERSION = 1;
  const MEETING_IMPORT_MAX_BYTES = 1024 * 1024;
  const MEETING_IMPORT_MAX_PARTICIPANTS = 500;
  const STEP_NUMBERS = [1, 2, 3, 4, 5];
  const PERSONNEL_GROUP_TYPE = "personnel";
  const NON_PERSONNEL_GROUP_TYPE = "non-personnel";
  const NON_PERSONNEL_DESCRIPTIONS = [
    { id: "facilitator", label: "Facilitator" },
    { id: "consultant", label: "Consultant" },
    { id: "vendor-staff", label: "Vendor staff" },
    { id: "other-non-personnel", label: "Other non-personnel" }
  ];

  let nextMeetingGroupId = 1;
  let meetingTimerIntervalId = null;
  let meetingIdleTimeoutId = null;
  let meetingDragDepth = 0;
  let meetingIdleTargets = [];
  const meetingIdleInertState = new Map();
  let isRenderingMeetingParticipants = false;

  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const state = {
    records: [],
    meeting: {
      mode: "duration",
      employerPercent: DEFAULT_EMPLOYER_COST_PERCENT,
      durationHours: DEFAULT_MEETING_DURATION_HOURS,
      durationMinutes: 0,
      simpleAttendees: 1,
      simpleDistribution: 50,
      groups: [],
      openGroupId: null,
      hasUserEdits: false,
      timerStatus: "idle",
      elapsedMs: 0,
      startedAt: null
    }
  };

  const el = {
    appStatus: document.querySelector("#app-status-message"),
    meetingLoadState: document.querySelector("#meeting-load-state"),
    meetingErrorState: document.querySelector("#meeting-error-state"),
    meetingCalculator: document.querySelector("#meeting-calculator"),
    meetingParticipantList: document.querySelector("#meeting-participant-list"),
    meetingDurationPanel: document.querySelector("#meeting-duration-panel"),
    meetingLivePanel: document.querySelector("#meeting-live-panel"),
    meetingDurationHours: document.querySelector("#meeting-duration-hours"),
    meetingDurationMinutes: document.querySelector("#meeting-duration-minutes"),
    employerCostPercent: document.querySelector("#employer-cost-percent"),
    employerCostCalloutPercent: document.querySelector("#employer-cost-callout-percent"),
    meetingTimerDisplay: document.querySelector("#meeting-timer-display"),
    meetingTimerStatus: document.querySelector("#meeting-timer-status"),
    meetingTimerStart: document.querySelector("#meeting-timer-start"),
    meetingTimerPause: document.querySelector("#meeting-timer-pause"),
    meetingTimerResume: document.querySelector("#meeting-timer-resume"),
    meetingTimerReset: document.querySelector("#meeting-timer-reset"),
    meetingAttendeeCount: document.querySelector("#meeting-attendee-count"),
    meetingDurationSummary: document.querySelector("#meeting-duration-summary"),
    meetingHourlyTotal: document.querySelector("#meeting-hourly-total"),
    meetingSalaryCost: document.querySelector("#meeting-salary-cost"),
    meetingEmployerCostLabel: document.querySelector("#meeting-employer-cost-label"),
    meetingEmployerCost: document.querySelector("#meeting-employer-cost"),
    meetingNonPersonnelCost: document.querySelector("#meeting-non-personnel-cost"),
    meetingTotalHeading: document.querySelector("#meeting-total-heading"),
    meetingTotalCost: document.querySelector("#meeting-total-cost"),
    copyMeetingSummary: document.querySelector("#copy-meeting-summary"),
    meetingCopyStatus: document.querySelector("#meeting-copy-status"),
    importMeetingButton: document.querySelector("#import-meeting-button"),
    importMeetingFile: document.querySelector("#import-meeting-file"),
    exportMeetingButton: document.querySelector("#export-meeting-button"),
    meetingFileStatus: document.querySelector("#meeting-file-status"),
    meetingDropOverlay: document.querySelector("#meeting-drop-overlay"),
    simpleAttendees: document.querySelector("#simple-attendees"),
    simpleDistributionSlider: document.querySelector("#simple-distribution-slider"),
    simpleBlendedRate: document.querySelector("#simple-blended-rate"),
    simpleInfoToggle: document.querySelector("#simple-info-toggle"),
    simpleInfoPanel: document.querySelector("#simple-info-panel"),
    meetingSimpleParticipants: document.querySelector("#meeting-simple-participants"),
    meetingDetailedParticipants: document.querySelector("#meeting-detailed-participants"),
    employerInfoToggle: document.querySelector("#employer-info-toggle"),
    employerInfoPanel: document.querySelector("#employer-info-panel")
  };

  function isDetailedMode() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("calc") === "legit";
  }

  function renderMeetingModeContainers() {
    const detailed = isDetailedMode();
    if (el.meetingSimpleParticipants) el.meetingSimpleParticipants.hidden = detailed;
    if (el.meetingDetailedParticipants) el.meetingDetailedParticipants.hidden = !detailed;
  }

  function percentile(sortedNumbers, p) {
    if (!sortedNumbers.length) return 0;
    if (sortedNumbers.length === 1) return sortedNumbers[0];
    const index = (p / 100) * (sortedNumbers.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (upper >= sortedNumbers.length) return sortedNumbers[sortedNumbers.length - 1];
    return sortedNumbers[lower] * (1 - weight) + sortedNumbers[upper] * weight;
  }

  function getSimpleEstimateRates() {
    const rates = state.records
      .map((record) => {
        const steps = meetingAvailableSteps(record);
        if (!steps.length) return null;
        const step5 = steps.find((s) => s.step === 5);
        const baseStep = step5 && step5.hourly > 0 ? step5 : steps[steps.length - 1];
        return baseStep && baseStep.hourly > 0 ? baseStep.hourly : null;
      })
      .filter((r) => r !== null && r > 0)
      .sort((a, b) => a - b);

    if (!rates.length) return { leftAnchor: 0, rightAnchor: 0, baseRate: 0 };

    const leftAnchor = percentile(rates, 15);
    const rightAnchor = percentile(rates, 85);
    const sliderValue = clampNumber(state.meeting.simpleDistribution, 0, 100, 50);
    const baseRate = leftAnchor + ((sliderValue / 100) * (rightAnchor - leftAnchor));

    return { leftAnchor, rightAnchor, baseRate };
  }

  function clean(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/\s+/g, " ").trim();
  }

  function normalizeSearch(value) {
    return clean(value)
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function slugify(value) {
    return normalizeSearch(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 96);
  }

  function hashText(source) {
    let hash = 0;
    const text = clean(source);
    for (let index = 0; index < text.length; index += 1) {
      hash = (Math.imul(31, hash) + text.charCodeAt(index)) | 0;
    }
    return Math.abs(hash).toString(36);
  }

  function parseNumber(value) {
    const text = clean(value).replace(/[$,]/g, "");
    if (!text) return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
  }

  function numberOrZero(value) {
    const number = parseNumber(value);
    return number === null ? 0 : number;
  }

  function formatCurrency(value) {
    const number = Number(value);
    return currencyFormatter.format(Number.isFinite(number) ? number : 0);
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(clean(value));
  }

  function setLiveStatus(message) {
    if (el.appStatus) el.appStatus.textContent = message;
  }

  function clampNumber(value, minimum, maximum, fallback = minimum) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(maximum, Math.max(minimum, number));
  }

  function nonNegativeNumber(value, fallback = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, number);
  }

  function formatPercent(value) {
    return nonNegativeNumber(value, 0).toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
  }

  function buildSteps(row) {
    return STEP_NUMBERS.map((step) => ({
      step,
      hourly: numberOrZero(row[`hourly_step_${step}`])
    }));
  }

  function normalizeRecord(row, index) {
    const title = clean(row.title) || `Untitled job class ${index + 1}`;
    const jobClassCode = clean(row.job_class_code);
    const steps = buildSteps(row);
    const hourlyValues = steps.filter((step) => step.hourly > 0).map((step) => step.hourly);
    const source = [
      title,
      jobClassCode,
      ...steps.map((step) => step.hourly)
    ].join("|");
    const idBase = jobClassCode || slugify(title) || `record-${index + 1}`;

    return {
      _id: `${slugify(idBase) || `record-${index + 1}`}-${hashText(source)}-${index}`,
      title,
      job_class_code: jobClassCode,
      steps,
      min_hourly: hourlyValues.length ? Math.min(...hourlyValues) : null,
      max_hourly: hourlyValues.length ? Math.max(...hourlyValues) : null
    };
  }

  function createMeetingGroup(type = PERSONNEL_GROUP_TYPE) {
    const id = `g${nextMeetingGroupId}`;
    nextMeetingGroupId += 1;

    if (type === NON_PERSONNEL_GROUP_TYPE) {
      return {
        id,
        type: NON_PERSONNEL_GROUP_TYPE,
        descriptionId: null,
        descriptionQuery: "",
        hourlyRate: null,
        people: 1
      };
    }

    return {
      id,
      type: PERSONNEL_GROUP_TYPE,
      recordId: null,
      query: "",
      step: null,
      people: 1
    };
  }

  function ensureMeetingGroups() {
    if (!state.meeting.groups.some((group) => group.type !== NON_PERSONNEL_GROUP_TYPE)) {
      state.meeting.groups.push(createMeetingGroup());
    }
  }

  function findMeetingGroup(groupId) {
    return state.meeting.groups.find((group) => group.id === groupId) || null;
  }

  function isNonPersonnelGroup(group) {
    return group?.type === NON_PERSONNEL_GROUP_TYPE;
  }

  function meetingPersonnelGroupCount() {
    return state.meeting.groups.filter((group) => !isNonPersonnelGroup(group)).length;
  }

  function nonPersonnelDescriptionById(descriptionId) {
    if (!descriptionId) return null;
    return NON_PERSONNEL_DESCRIPTIONS.find(
      (description) => description.id === descriptionId
    ) || null;
  }

  function meetingRecordById(recordId) {
    if (!recordId) return null;
    return state.records.find((record) => record._id === recordId) || null;
  }

  function meetingAvailableSteps(record) {
    if (!record) return [];
    return record.steps
      .filter((step) => step.hourly > 0)
      .sort((first, second) => first.step - second.step);
  }

  function defaultMeetingStep(record) {
    const steps = meetingAvailableSteps(record);
    if (!steps.length) return null;
    return steps.find((step) => step.step === 5)?.step ?? steps[steps.length - 1].step;
  }

  function meetingClassificationLabel(record) {
    if (!record) return "";
    return record.job_class_code
      ? `${record.title} — Class ${record.job_class_code}`
      : record.title;
  }

  function meetingSearchOptions(query) {
    const normalizedQuery = normalizeSearch(query);
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);

    return state.records
      .filter((record) => meetingAvailableSteps(record).length)
      .map((record) => {
        const title = normalizeSearch(record.title);
        const code = normalizeSearch(record.job_class_code);
        const label = normalizeSearch(meetingClassificationLabel(record));
        if (terms.length && !terms.every((term) => label.includes(term))) return null;

        let score = 10;
        if (normalizedQuery) {
          if (code && code === normalizedQuery) score = 0;
          else if (code && code.startsWith(normalizedQuery)) score = 1;
          else if (title.startsWith(normalizedQuery)) score = 2;
          else if (label.startsWith(normalizedQuery)) score = 3;
          else score = 4;
        }

        return { record, score };
      })
      .filter(Boolean)
      .sort((first, second) => (
        first.score - second.score
        || first.record.title.localeCompare(second.record.title, undefined, {
          numeric: true,
          sensitivity: "base"
        })
      ))
      .slice(0, MEETING_CLASS_OPTION_LIMIT)
      .map((item) => item.record);
  }

  function meetingNonPersonnelDescriptionOptions(query) {
    const normalizedQuery = normalizeSearch(query);
    const terms = normalizedQuery.split(/\s+/).filter(Boolean);

    return NON_PERSONNEL_DESCRIPTIONS.filter((description) => {
      const label = normalizeSearch(description.label);
      return !terms.length || terms.every((term) => label.includes(term));
    });
  }

  function meetingStepRate(group) {
    const record = meetingRecordById(group.recordId);
    if (!record || !group.step) return 0;
    return record.steps.find((step) => step.step === Number(group.step))?.hourly || 0;
  }

  function meetingNonPersonnelRate(group) {
    const rate = parseNumber(group?.hourlyRate);
    return rate === null ? null : nonNegativeNumber(rate, 0);
  }

  function meetingGroupRate(group) {
    return isNonPersonnelGroup(group)
      ? meetingNonPersonnelRate(group)
      : meetingStepRate(group);
  }

  function meetingPeopleCount(group) {
    const people = Number(group.people);
    return Number.isFinite(people) && people >= 1 ? Math.trunc(people) : 0;
  }

  function currentMeetingElapsedMs() {
    const accumulated = Math.max(0, Number(state.meeting.elapsedMs) || 0);
    if (state.meeting.timerStatus !== "running" || !state.meeting.startedAt) return accumulated;
    return accumulated + Math.max(0, Date.now() - state.meeting.startedAt);
  }

  function currentMeetingDurationMs() {
    if (state.meeting.mode === "live") return currentMeetingElapsedMs();
    const hours = Math.max(0, Number(state.meeting.durationHours) || 0);
    const minutes = Math.max(0, Number(state.meeting.durationMinutes) || 0);
    return ((hours * 60) + minutes) * 60 * 1000;
  }

  function calculateMeetingTotals() {
    const durationMs = currentMeetingDurationMs();
    const durationHours = durationMs / 3600000;

    if (!isDetailedMode()) {
      const attendees = Math.max(1, Math.trunc(Number(state.meeting.simpleAttendees) || 1));
      const { baseRate } = getSimpleEstimateRates();
      const salaryCost = baseRate * attendees * durationHours;
      const employerPercent = nonNegativeNumber(state.meeting.employerPercent, 0);
      const employerCost = salaryCost * (employerPercent / 100);

      return {
        durationMs,
        durationHours,
        groups: [{ type: "simple", attendees, baseRate, salaryCost }],
        attendees,
        combinedHourlyRate: baseRate * attendees,
        combinedNonPersonnelHourlyRate: 0,
        salaryCost,
        nonPersonnelCost: 0,
        employerPercent,
        employerCost,
        totalCost: salaryCost + employerCost
      };
    }

    const groups = [];
    let attendees = 0;
    let combinedHourlyRate = 0;
    let combinedNonPersonnelHourlyRate = 0;

    state.meeting.groups.forEach((group) => {
      const people = meetingPeopleCount(group);
      if (!people) return;

      if (isNonPersonnelGroup(group)) {
        const rate = meetingNonPersonnelRate(group);
        if (rate === null) return;
        const hourlyGroupRate = rate * people;
        const description = nonPersonnelDescriptionById(group.descriptionId);
        const nonPersonnelCost = hourlyGroupRate * durationHours;
        attendees += people;
        combinedNonPersonnelHourlyRate += hourlyGroupRate;
        groups.push({
          type: NON_PERSONNEL_GROUP_TYPE,
          group,
          description,
          people,
          rate,
          hourlyGroupRate,
          nonPersonnelCost
        });
        return;
      }

      const rate = meetingStepRate(group);
      if (!rate) return;
      const hourlyGroupRate = rate * people;
      const record = meetingRecordById(group.recordId);
      if (!record) return;
      const salaryCost = hourlyGroupRate * durationHours;
      attendees += people;
      combinedHourlyRate += hourlyGroupRate;
      groups.push({
        type: PERSONNEL_GROUP_TYPE,
        group,
        record,
        people,
        rate,
        hourlyGroupRate,
        salaryCost
      });
    });

    const salaryCost = combinedHourlyRate * durationHours;
    const nonPersonnelCost = combinedNonPersonnelHourlyRate * durationHours;
    const employerPercent = nonNegativeNumber(state.meeting.employerPercent, 0);
    const employerCost = salaryCost * (employerPercent / 100);

    return {
      durationMs,
      durationHours,
      groups,
      attendees,
      combinedHourlyRate,
      combinedNonPersonnelHourlyRate,
      salaryCost,
      nonPersonnelCost,
      employerPercent,
      employerCost,
      totalCost: salaryCost + employerCost + nonPersonnelCost
    };
  }

  function formatTimer(milliseconds) {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, "0"))
      .join(":");
  }

  function formatDurationWords(milliseconds) {
    const totalMinutes = Math.max(0, Math.round(milliseconds / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const parts = [];

    if (hours) parts.push(`${hours.toLocaleString()} ${hours === 1 ? "hour" : "hours"}`);
    if (minutes) parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
    return parts.length ? parts.join(" ") : "0 minutes";
  }

  function meetingDurationDisplay(totals) {
    return state.meeting.mode === "live"
      ? `${formatTimer(totals.durationMs)} elapsed`
      : formatDurationWords(totals.durationMs);
  }

  function meetingClassOptionHtml(group, record, index) {
    const optionId = `meeting-class-option-${group.id}-${index}`;
    const code = record.job_class_code
      ? `Class ${record.job_class_code}`
      : "Class code not published";
    const hourlyRange = record.min_hourly && record.max_hourly
      ? `${formatCurrency(record.min_hourly)} to ${formatCurrency(record.max_hourly)} per hour`
      : "Published hourly steps available";

    return `
      <button type="button" id="${escapeAttr(optionId)}" class="meeting-class-option" role="option" tabindex="-1" aria-selected="${group.recordId === record._id ? "true" : "false"}" data-action="select-meeting-class" data-group-id="${escapeAttr(group.id)}" data-record-id="${escapeAttr(record._id)}">
        <span class="meeting-class-option__title">${escapeHtml(record.title)}</span>
        <span class="meeting-class-option__meta">${escapeHtml(code)} · ${escapeHtml(hourlyRange)}</span>
      </button>`;
  }

  function meetingClassOptionsContentHtml(group) {
    const options = meetingSearchOptions(group.query);
    const optionsHtml = options.length
      ? options.map((record, index) => meetingClassOptionHtml(group, record, index)).join("")
      : `<p class="meeting-class-options__empty">${group.query ? "No matching classifications with published hourly rates." : "No classifications are available."}</p>`;
    const limitNote = options.length === MEETING_CLASS_OPTION_LIMIT
      ? `<p class="meeting-class-options__note">Showing the first ${MEETING_CLASS_OPTION_LIMIT} ${group.query ? "matches" : "classifications"}. Type more to narrow the list.</p>`
      : "";
    return `${optionsHtml}${limitNote}`;
  }

  function meetingClassDropdownHtml(group) {
    const isOpen = state.meeting.openGroupId === group.id;
    return `<div id="meeting-class-options-${escapeAttr(group.id)}" class="meeting-class-options" role="listbox" aria-label="Classification options" ${isOpen ? "" : "hidden"}>${meetingClassOptionsContentHtml(group)}</div>`;
  }

  function meetingStepOptionsHtml(group) {
    const record = meetingRecordById(group.recordId);
    const steps = meetingAvailableSteps(record);
    if (!steps.length) return '<option value="">Select a classification first</option>';

    return steps
      .map((step) => `<option value="${step.step}" ${Number(group.step) === step.step ? "selected" : ""}>Step ${step.step} — ${escapeHtml(formatCurrency(step.hourly))}/hr</option>`)
      .join("");
  }

  function meetingGroupHelpText(group, record) {
    if (record) {
      const code = record.job_class_code
        ? `Class ${record.job_class_code}`
        : "Class code not published";
      return `${code} selected. Choose another classification by typing in the field.`;
    }
    if (group.query) {
      return "Select a classification from the available results. Unmatched text is not included in the estimate.";
    }
    return "Search by title or class code. Only classifications with a published hourly rate are available.";
  }

  function meetingNonPersonnelDescriptionOptionHtml(group, description) {
    return `
      <button type="button" class="meeting-class-option meeting-description-option" role="option" tabindex="-1" aria-selected="${group.descriptionId === description.id ? "true" : "false"}" data-action="select-meeting-description" data-group-id="${escapeAttr(group.id)}" data-description-id="${escapeAttr(description.id)}">
        <span class="meeting-class-option__title">${escapeHtml(description.label)}</span>
      </button>`;
  }

  function meetingNonPersonnelDescriptionOptionsContentHtml(group) {
    const options = meetingNonPersonnelDescriptionOptions(group.descriptionQuery);
    return options.length
      ? options.map((description) => meetingNonPersonnelDescriptionOptionHtml(
        group,
        description
      )).join("")
      : `<p class="meeting-class-options__empty">No matching descriptions. Clear the field to see all options.</p>`;
  }

  function meetingNonPersonnelDescriptionDropdownHtml(group) {
    const isOpen = state.meeting.openGroupId === group.id;
    return `<div id="meeting-description-options-${escapeAttr(group.id)}" class="meeting-class-options" role="listbox" aria-label="Non-personnel description options" ${isOpen ? "" : "hidden"}>${meetingNonPersonnelDescriptionOptionsContentHtml(group)}</div>`;
  }

  function meetingNonPersonnelDescriptionHelpText(group, description) {
    if (description) {
      return `${description.label} selected. Choose another description by typing in the field.`;
    }
    if (group.descriptionQuery) {
      return "Select a description from the available results, or clear the field. A description is optional.";
    }
    return "Optional. Choose Facilitator, Consultant, Vendor staff, or Other non-personnel.";
  }

  function meetingGroupHeading(group, index) {
    const groupNumber = state.meeting.groups
      .slice(0, index + 1)
      .filter((candidate) => (
        isNonPersonnelGroup(candidate) === isNonPersonnelGroup(group)
      )).length;
    return isNonPersonnelGroup(group)
      ? `Non-personnel group ${groupNumber}`
      : `Participant group ${groupNumber}`;
  }

  function meetingGroupCanBeRemoved(group) {
    return isNonPersonnelGroup(group) || meetingPersonnelGroupCount() > 1;
  }

  function meetingGroupInputId(group) {
    return isNonPersonnelGroup(group)
      ? `meeting-description-input-${group.id}`
      : `meeting-class-input-${group.id}`;
  }

  function meetingGroupOptionsId(group) {
    return isNonPersonnelGroup(group)
      ? `meeting-description-options-${group.id}`
      : `meeting-class-options-${group.id}`;
  }

  function meetingPersonnelGroupHtml(group, index) {
    const record = meetingRecordById(group.recordId);
    const rate = meetingStepRate(group);
    const people = meetingPeopleCount(group);
    const durationHours = currentMeetingDurationMs() / 3600000;
    const salaryCost = rate * people * durationHours;
    const isOpen = state.meeting.openGroupId === group.id;
    const canRemove = meetingGroupCanBeRemoved(group);
    const heading = meetingGroupHeading(group, index);
    const inputId = `meeting-class-input-${group.id}`;
    const helpId = `meeting-class-help-${group.id}`;
    const stepId = `meeting-step-${group.id}`;
    const peopleId = `meeting-people-${group.id}`;

    return `
      <article class="meeting-participant-group" data-meeting-group="${escapeAttr(group.id)}">
        <div class="meeting-participant-group__header">
          <h4>${escapeHtml(heading)}</h4>
          <button type="button" class="secondary meeting-remove-group" data-action="remove-meeting-group" data-group-id="${escapeAttr(group.id)}" ${canRemove ? "" : "disabled"} aria-label="Remove ${escapeAttr(heading.toLocaleLowerCase())}">Remove</button>
        </div>
        <div class="meeting-participant-fields">
          <div class="meeting-participant-field meeting-participant-field--classification">
            <label for="${escapeAttr(inputId)}">Classification</label>
            <div class="meeting-class-combobox">
              <input id="${escapeAttr(inputId)}" type="search" autocomplete="off" spellcheck="false" value="${escapeAttr(group.query)}" placeholder="Search title or class code..." role="combobox" aria-autocomplete="list" aria-expanded="${isOpen ? "true" : "false"}" aria-controls="meeting-class-options-${escapeAttr(group.id)}" aria-describedby="${escapeAttr(helpId)}" data-meeting-class-input data-group-id="${escapeAttr(group.id)}">
              ${meetingClassDropdownHtml(group)}
            </div>
            <p id="${escapeAttr(helpId)}" class="app-help-text meeting-class-help">${escapeHtml(meetingGroupHelpText(group, record))}</p>
          </div>

          <label class="meeting-participant-field meeting-participant-field--step" for="${escapeAttr(stepId)}">Pay step
            <select id="${escapeAttr(stepId)}" data-meeting-step data-group-id="${escapeAttr(group.id)}" ${record ? "" : "disabled"}>
              ${meetingStepOptionsHtml(group)}
            </select>
          </label>

          <label class="meeting-participant-field meeting-participant-field--people" for="${escapeAttr(peopleId)}">People
            <input id="${escapeAttr(peopleId)}" type="number" inputmode="numeric" min="1" max="999" step="1" value="${Math.max(1, people || 1)}" data-meeting-people data-group-id="${escapeAttr(group.id)}">
          </label>

          <div class="meeting-participant-field meeting-calculated-field meeting-calculated-field--rate">
            <span class="meeting-field-label">Hourly salary rate</span>
            <output id="meeting-hourly-${escapeAttr(group.id)}">${escapeHtml(formatCurrency(rate))}/hour</output>
          </div>

          <div class="meeting-participant-field meeting-calculated-field meeting-calculated-field--cost">
            <span class="meeting-field-label">Salary cost for meeting</span>
            <output id="meeting-group-cost-${escapeAttr(group.id)}">${escapeHtml(formatCurrency(salaryCost))}</output>
          </div>
        </div>
      </article>`;
  }

  function meetingNonPersonnelGroupHtml(group, index) {
    const description = nonPersonnelDescriptionById(group.descriptionId);
    const rate = meetingNonPersonnelRate(group);
    const numericRate = rate ?? 0;
    const people = meetingPeopleCount(group);
    const durationHours = currentMeetingDurationMs() / 3600000;
    const nonPersonnelCost = numericRate * people * durationHours;
    const isOpen = state.meeting.openGroupId === group.id;
    const heading = meetingGroupHeading(group, index);
    const inputId = `meeting-description-input-${group.id}`;
    const helpId = `meeting-description-help-${group.id}`;
    const peopleId = `meeting-people-${group.id}`;
    const rateId = `meeting-non-personnel-rate-${group.id}`;
    const rateValue = rate === null ? "" : String(rate);

    return `
      <article class="meeting-participant-group meeting-participant-group--non-personnel" data-meeting-group="${escapeAttr(group.id)}" data-meeting-group-type="non-personnel">
        <div class="meeting-participant-group__header">
          <h4>${escapeHtml(heading)}</h4>
          <button type="button" class="secondary meeting-remove-group" data-action="remove-meeting-group" data-group-id="${escapeAttr(group.id)}" aria-label="Remove ${escapeAttr(heading.toLocaleLowerCase())}">Remove</button>
        </div>
        <div class="meeting-participant-fields meeting-participant-fields--non-personnel">
          <div class="meeting-participant-field meeting-participant-field--classification">
            <label for="${escapeAttr(inputId)}">Description (optional)</label>
            <div class="meeting-class-combobox">
              <input id="${escapeAttr(inputId)}" type="search" autocomplete="off" spellcheck="false" value="${escapeAttr(group.descriptionQuery)}" placeholder="Type to filter descriptions..." role="combobox" aria-autocomplete="list" aria-expanded="${isOpen ? "true" : "false"}" aria-controls="meeting-description-options-${escapeAttr(group.id)}" aria-describedby="${escapeAttr(helpId)}" data-meeting-description-input data-group-id="${escapeAttr(group.id)}">
              ${meetingNonPersonnelDescriptionDropdownHtml(group)}
            </div>
            <p id="${escapeAttr(helpId)}" class="app-help-text meeting-class-help">${escapeHtml(meetingNonPersonnelDescriptionHelpText(group, description))}</p>
          </div>

          <label class="meeting-participant-field meeting-participant-field--non-personnel-rate" for="${escapeAttr(rateId)}">Hourly rate per person
            <input id="${escapeAttr(rateId)}" type="number" inputmode="decimal" min="0" step="0.01" value="${escapeAttr(rateValue)}" placeholder="0.00" data-meeting-non-personnel-rate data-group-id="${escapeAttr(group.id)}">
          </label>

          <label class="meeting-participant-field meeting-participant-field--people" for="${escapeAttr(peopleId)}">People
            <input id="${escapeAttr(peopleId)}" type="number" inputmode="numeric" min="1" max="999" step="1" value="${Math.max(1, people || 1)}" data-meeting-people data-group-id="${escapeAttr(group.id)}">
          </label>

          <div class="meeting-participant-field meeting-calculated-field meeting-calculated-field--cost meeting-calculated-field--non-personnel-cost">
            <span class="meeting-field-label">Non-personnel cost for meeting</span>
            <output id="meeting-group-cost-${escapeAttr(group.id)}">${escapeHtml(formatCurrency(nonPersonnelCost))}</output>
          </div>
        </div>
      </article>`;
  }

  function meetingParticipantGroupHtml(group, index) {
    return isNonPersonnelGroup(group)
      ? meetingNonPersonnelGroupHtml(group, index)
      : meetingPersonnelGroupHtml(group, index);
  }

  function focusMeetingElement(selector, cursorPosition = null) {
    window.requestAnimationFrame(() => {
      const target = document.querySelector(selector);
      if (!target) return;
      try {
        target.focus({ preventScroll: true });
      } catch {
        target.focus();
      }
      if (cursorPosition !== null && typeof target.setSelectionRange === "function") {
        target.setSelectionRange(cursorPosition, cursorPosition);
      }
    });
  }

  function renderMeetingParticipantRows({ focusSelector = null, cursorPosition = null } = {}) {
    if (!el.meetingParticipantList) return;
    ensureMeetingGroups();
    isRenderingMeetingParticipants = true;
    el.meetingParticipantList.innerHTML = state.meeting.groups
      .map(meetingParticipantGroupHtml)
      .join("");
    isRenderingMeetingParticipants = false;
    renderMeetingSummary();
    if (focusSelector) focusMeetingElement(focusSelector, cursorPosition);
  }

  function openMeetingOptionsInPlace(groupId) {
    const group = findMeetingGroup(groupId);
    if (!group) return;
    const previouslyOpen = state.meeting.openGroupId;
    if (previouslyOpen && previouslyOpen !== groupId) {
      closeMeetingOptionsInPlace(previouslyOpen);
    }
    state.meeting.openGroupId = groupId;
    const input = document.querySelector(`#${meetingGroupInputId(group)}`);
    const options = document.querySelector(`#${meetingGroupOptionsId(group)}`);
    if (input) input.setAttribute("aria-expanded", "true");
    if (options) options.hidden = false;
  }

  function closeMeetingOptionsInPlace(groupId = state.meeting.openGroupId) {
    const group = findMeetingGroup(groupId);
    if (!group) {
      state.meeting.openGroupId = null;
      return;
    }
    state.meeting.openGroupId = null;
    const input = document.querySelector(`#${meetingGroupInputId(group)}`);
    const options = document.querySelector(`#${meetingGroupOptionsId(group)}`);
    if (input) input.setAttribute("aria-expanded", "false");
    if (options) options.hidden = true;
  }

  function renderMeetingModeControls() {
    document.querySelectorAll('input[name="meeting-mode"]').forEach((input) => {
      input.checked = input.value === state.meeting.mode;
    });
    if (el.meetingDurationPanel) {
      el.meetingDurationPanel.hidden = state.meeting.mode !== "duration";
    }
    if (el.meetingLivePanel) {
      el.meetingLivePanel.hidden = state.meeting.mode !== "live";
    }

    const status = state.meeting.timerStatus;
    if (el.meetingTimerStart) el.meetingTimerStart.hidden = status !== "idle";
    if (el.meetingTimerPause) el.meetingTimerPause.hidden = status !== "running";
    if (el.meetingTimerResume) el.meetingTimerResume.hidden = status !== "paused";
    if (el.meetingTimerStatus) {
      el.meetingTimerStatus.textContent = status === "running"
        ? "Running"
        : status === "paused"
          ? "Paused"
          : "Not started";
    }
  }

  function renderMeetingSummary() {
    const totals = calculateMeetingTotals();
    const percentLabel = formatPercent(totals.employerPercent);
    const totalText = formatCurrency(totals.totalCost);

    if (el.meetingAttendeeCount) {
      el.meetingAttendeeCount.textContent = totals.attendees.toLocaleString();
    }
    if (el.meetingDurationSummary) {
      el.meetingDurationSummary.textContent = meetingDurationDisplay(totals);
    }
    if (el.meetingHourlyTotal) {
      el.meetingHourlyTotal.textContent = `${formatCurrency(totals.combinedHourlyRate)}/hour`;
    }
    if (el.meetingSalaryCost) {
      el.meetingSalaryCost.textContent = formatCurrency(totals.salaryCost);
    }
    if (el.meetingEmployerCostLabel) {
      el.meetingEmployerCostLabel.textContent = `Estimated employer costs (${percentLabel}%)`;
    }
    if (el.employerCostCalloutPercent) {
      el.employerCostCalloutPercent.textContent = `${percentLabel}%`;
    }
    if (el.meetingEmployerCost) {
      el.meetingEmployerCost.textContent = formatCurrency(totals.employerCost);
    }
    if (el.meetingNonPersonnelCost) {
      el.meetingNonPersonnelCost.textContent = formatCurrency(totals.nonPersonnelCost);
    }
    if (el.meetingTotalHeading) el.meetingTotalHeading.textContent = totalText;
    if (el.meetingTotalCost) el.meetingTotalCost.textContent = totalText;
    if (el.copyMeetingSummary) {
      el.copyMeetingSummary.disabled = totals.attendees === 0;
    }

    if (!isDetailedMode()) {
      if (el.simpleAttendees) {
        el.simpleAttendees.value = String(state.meeting.simpleAttendees);
      }
      if (el.simpleDistributionSlider) {
        el.simpleDistributionSlider.value = String(state.meeting.simpleDistribution);
      }
      const { baseRate } = getSimpleEstimateRates();
      if (el.simpleBlendedRate) {
        el.simpleBlendedRate.textContent = `${formatCurrency(baseRate)}/hour`;
      }
    } else {
      state.meeting.groups.forEach((group) => {
        const rate = meetingGroupRate(group) ?? 0;
        const people = meetingPeopleCount(group);
        const cost = rate * people * totals.durationHours;
        const rateOutput = document.querySelector(`#meeting-hourly-${group.id}`);
        const costOutput = document.querySelector(`#meeting-group-cost-${group.id}`);
        if (rateOutput) rateOutput.textContent = `${formatCurrency(rate)}/hour`;
        if (costOutput) costOutput.textContent = formatCurrency(cost);
      });
    }

    if (el.meetingTimerDisplay) {
      const elapsedMilliseconds = currentMeetingElapsedMs();
      el.meetingTimerDisplay.textContent = formatTimer(elapsedMilliseconds);
      el.meetingTimerDisplay.dateTime = `PT${Math.floor(elapsedMilliseconds / 1000)}S`;
    }
    renderMeetingModeControls();
  }

  function sanitizeMeetingStateAgainstData() {
    state.meeting.employerPercent = nonNegativeNumber(
      state.meeting.employerPercent,
      DEFAULT_EMPLOYER_COST_PERCENT
    );
    state.meeting.durationHours = Math.trunc(clampNumber(
      state.meeting.durationHours,
      0,
      999,
      DEFAULT_MEETING_DURATION_HOURS
    ));
    state.meeting.durationMinutes = Math.trunc(clampNumber(
      state.meeting.durationMinutes,
      0,
      59,
      0
    ));
    state.meeting.simpleAttendees = Math.trunc(clampNumber(
      state.meeting.simpleAttendees,
      1,
      9999,
      1
    ));
    state.meeting.simpleDistribution = Math.trunc(clampNumber(
      state.meeting.simpleDistribution,
      0,
      100,
      50
    ));

    if (isDetailedMode()) {
      ensureMeetingGroups();
      state.meeting.groups.forEach((group) => {
        if (!group.type) group.type = PERSONNEL_GROUP_TYPE;
        group.people = Math.trunc(clampNumber(group.people, 1, 999, 1));

        if (isNonPersonnelGroup(group)) {
          const hourlyRate = parseNumber(group.hourlyRate);
          group.hourlyRate = hourlyRate === null
            ? null
            : nonNegativeNumber(hourlyRate, 0);
          const description = nonPersonnelDescriptionById(group.descriptionId);
          if (!description) {
            group.descriptionId = null;
            group.descriptionQuery = clean(group.descriptionQuery);
          } else {
            group.descriptionQuery = description.label;
          }
          return;
        }

        const record = meetingRecordById(group.recordId);
        if (!record || !meetingAvailableSteps(record).length) {
          group.recordId = null;
          group.step = null;
          return;
        }
        group.query = meetingClassificationLabel(record);
        const validSteps = meetingAvailableSteps(record).map((step) => step.step);
        if (!validSteps.includes(Number(group.step))) {
          group.step = defaultMeetingStep(record);
        }
      });
    }
  }

  function renderMeetingFileActions() {
    if (el.exportMeetingButton) {
      el.exportMeetingButton.hidden = !state.meeting.hasUserEdits;
    }
  }

  function markMeetingEdited() {
    if (state.meeting.hasUserEdits) return;
    state.meeting.hasUserEdits = true;
    renderMeetingFileActions();
  }

  function renderMeetingCalculator({ focusSelector = null, cursorPosition = null } = {}) {
    sanitizeMeetingStateAgainstData();
    renderMeetingFileActions();
    renderMeetingModeContainers();
    if (el.meetingDurationHours) {
      el.meetingDurationHours.value = String(state.meeting.durationHours);
    }
    if (el.meetingDurationMinutes) {
      el.meetingDurationMinutes.value = String(state.meeting.durationMinutes);
    }
    if (el.employerCostPercent) {
      el.employerCostPercent.value = String(state.meeting.employerPercent);
    }
    if (!isDetailedMode()) {
      if (el.simpleAttendees) {
        el.simpleAttendees.value = String(state.meeting.simpleAttendees);
      }
      if (el.simpleDistributionSlider) {
        el.simpleDistributionSlider.value = String(state.meeting.simpleDistribution);
      }
      const { baseRate } = getSimpleEstimateRates();
      if (el.simpleBlendedRate) {
        el.simpleBlendedRate.textContent = `${formatCurrency(baseRate)}/hour`;
      }
    }
    renderMeetingModeControls();
    if (isDetailedMode()) {
      renderMeetingParticipantRows({ focusSelector, cursorPosition });
    } else {
      renderMeetingSummary();
    }
  }

  function selectMeetingClassification(groupId, recordId) {
    const group = findMeetingGroup(groupId);
    const record = meetingRecordById(recordId);
    if (
      !group
      || isNonPersonnelGroup(group)
      || !record
      || !meetingAvailableSteps(record).length
    ) return;

    const wasEmpty = !group.recordId;
    group.recordId = record._id;
    group.query = meetingClassificationLabel(record);
    group.step = defaultMeetingStep(record);
    if (wasEmpty) {
      const groupIndex = state.meeting.groups.findIndex((item) => item.id === group.id);
      state.meeting.groups.splice(groupIndex + 1, 0, createMeetingGroup());
    }
    state.meeting.openGroupId = null;
    markMeetingEdited();
    renderMeetingParticipantRows({ focusSelector: `#meeting-step-${group.id}` });

    const stepMessage = group.step === 5
      ? "Step 5 selected by default."
      : `Step ${group.step} selected because it is the highest published step.`;
    setLiveStatus(`${record.title} added to the meeting estimate. ${stepMessage}`);
  }

  function selectMeetingNonPersonnelDescription(groupId, descriptionId) {
    const group = findMeetingGroup(groupId);
    const description = nonPersonnelDescriptionById(descriptionId);
    if (!group || !isNonPersonnelGroup(group) || !description) return;

    group.descriptionId = description.id;
    group.descriptionQuery = description.label;
    state.meeting.openGroupId = null;
    markMeetingEdited();
    renderMeetingParticipantRows({
      focusSelector: `#meeting-non-personnel-rate-${group.id}`
    });
    setLiveStatus(`${description.label} selected for the non-personnel group.`);
  }

  function addNonPersonnelGroup() {
    const group = createMeetingGroup(NON_PERSONNEL_GROUP_TYPE);
    state.meeting.groups.unshift(group);
    state.meeting.openGroupId = group.id;
    markMeetingEdited();
    renderMeetingParticipantRows({
      focusSelector: `#meeting-description-input-${group.id}`
    });
    setLiveStatus("Non-personnel group added at the top.");
  }

  function removeMeetingGroup(groupId) {
    const index = state.meeting.groups.findIndex((group) => group.id === groupId);
    if (index === -1) return;
    const group = state.meeting.groups[index];
    if (!meetingGroupCanBeRemoved(group)) return;

    state.meeting.groups.splice(index, 1);
    ensureMeetingGroups();
    state.meeting.openGroupId = null;
    markMeetingEdited();
    const nextGroup = state.meeting.groups[Math.min(index, state.meeting.groups.length - 1)];
    renderMeetingParticipantRows({
      focusSelector: nextGroup
        ? `#${meetingGroupInputId(nextGroup)}`
        : "#add-non-personnel-group"
    });
    setLiveStatus("Participant group removed.");
  }

  function initializeMeetingIdleTargets() {
    meetingIdleTargets = [
      document.querySelector(".skip-link"),
      document.querySelector(".marinos-banner"),
      document.querySelector(".app-header"),
      document.querySelector(".app-footer"),
      document.querySelector(".app-feedback"),
      document.querySelector("#start > .meeting-page-heading"),
      document.querySelector("#meeting-load-state"),
      document.querySelector("#meeting-error-state"),
      document.querySelector(".meeting-editor"),
      document.querySelector(".meeting-reset-calculator"),
      ...document.querySelectorAll(".meeting-summary-card > :not(.meeting-summary-eyebrow):not(#meeting-total-heading)")
    ].filter(Boolean);

    meetingIdleTargets.forEach((target) => target.classList.add("meeting-idle-fade-target"));
  }

  function meetingCostViewIsActive() {
    const section = document.querySelector("#start");
    return Boolean(section && !section.hidden);
  }

  function canEnterMeetingIdleMode() {
    return state.meeting.mode === "live"
      && state.meeting.timerStatus === "running"
      && meetingCostViewIsActive()
      && document.visibilityState !== "hidden";
  }

  function hasVisibleKeyboardFocus() {
    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement) || activeElement === document.body) return false;
    return activeElement.matches(":focus-visible");
  }

  function setMeetingIdleTargetsInert(isInert) {
    if (isInert) {
      meetingIdleTargets.forEach((target) => {
        if (!meetingIdleInertState.has(target)) meetingIdleInertState.set(target, target.inert);
        target.inert = true;
      });
      return;
    }

    meetingIdleInertState.forEach((wasInert, target) => {
      target.inert = wasInert;
    });
    meetingIdleInertState.clear();
  }

  function exitMeetingIdleMode() {
    document.body.classList.remove("meeting-idle");
    setMeetingIdleTargetsInert(false);
  }

  function clearMeetingIdleTimeout() {
    if (meetingIdleTimeoutId !== null) {
      window.clearTimeout(meetingIdleTimeoutId);
      meetingIdleTimeoutId = null;
    }
  }

  function stopMeetingIdleMode() {
    clearMeetingIdleTimeout();
    exitMeetingIdleMode();
  }

  function scheduleMeetingIdleMode() {
    clearMeetingIdleTimeout();
    exitMeetingIdleMode();
    if (!canEnterMeetingIdleMode()) return;

    meetingIdleTimeoutId = window.setTimeout(() => {
      meetingIdleTimeoutId = null;
      if (!canEnterMeetingIdleMode()) {
        exitMeetingIdleMode();
        return;
      }
      if (hasVisibleKeyboardFocus()) {
        scheduleMeetingIdleMode();
        return;
      }
      setMeetingIdleTargetsInert(true);
      document.body.classList.add("meeting-idle");
    }, MEETING_IDLE_DELAY_MS);
  }

  function noteMeetingActivity() {
    if (!canEnterMeetingIdleMode()) {
      stopMeetingIdleMode();
      return;
    }
    scheduleMeetingIdleMode();
  }

  function clearMeetingTimerInterval() {
    if (meetingTimerIntervalId !== null) {
      window.clearInterval(meetingTimerIntervalId);
      meetingTimerIntervalId = null;
    }
  }

  function startMeetingTimerInterval() {
    clearMeetingTimerInterval();
    meetingTimerIntervalId = window.setInterval(
      renderMeetingSummary,
      MEETING_TIMER_INTERVAL_MS
    );
  }

  function startMeetingTimer() {
    if (state.meeting.timerStatus === "running") return;
    state.meeting.timerStatus = "running";
    state.meeting.startedAt = Date.now();
    startMeetingTimerInterval();
    renderMeetingSummary();
    scheduleMeetingIdleMode();
    setLiveStatus("Live meeting timer started.");
  }

  function pauseMeetingTimer({ announce = true } = {}) {
    if (state.meeting.timerStatus !== "running") return;
    state.meeting.elapsedMs = currentMeetingElapsedMs();
    state.meeting.startedAt = null;
    state.meeting.timerStatus = "paused";
    clearMeetingTimerInterval();
    stopMeetingIdleMode();
    renderMeetingSummary();
    if (announce) setLiveStatus("Live meeting timer paused.");
  }

  function resumeMeetingTimer() {
    if (state.meeting.timerStatus !== "paused") return;
    state.meeting.startedAt = Date.now();
    state.meeting.timerStatus = "running";
    startMeetingTimerInterval();
    renderMeetingSummary();
    scheduleMeetingIdleMode();
    setLiveStatus("Live meeting timer resumed.");
  }

  function resetMeetingTimer() {
    clearMeetingTimerInterval();
    state.meeting.timerStatus = "idle";
    state.meeting.elapsedMs = 0;
    state.meeting.startedAt = null;
    stopMeetingIdleMode();
    renderMeetingSummary();
    setLiveStatus("Live meeting timer reset.");
  }

  function setMeetingMode(mode) {
    if (!["duration", "live"].includes(mode) || state.meeting.mode === mode) return;
    if (mode === "duration" && state.meeting.timerStatus === "running") {
      pauseMeetingTimer({ announce: false });
    }
    state.meeting.mode = mode;
    markMeetingEdited();
    stopMeetingIdleMode();
    renderMeetingModeControls();
    renderMeetingSummary();
    setLiveStatus(
      mode === "live"
        ? "Live timer mode selected."
        : "Set duration mode selected."
    );
  }

  function resetMeetingCalculator() {
    clearMeetingTimerInterval();
    stopMeetingIdleMode();
    state.meeting = {
      mode: "duration",
      employerPercent: DEFAULT_EMPLOYER_COST_PERCENT,
      durationHours: DEFAULT_MEETING_DURATION_HOURS,
      durationMinutes: 0,
      simpleAttendees: 1,
      simpleDistribution: 50,
      groups: [createMeetingGroup()],
      openGroupId: null,
      hasUserEdits: false,
      timerStatus: "idle",
      elapsedMs: 0,
      startedAt: null
    };
    if (el.meetingCopyStatus) el.meetingCopyStatus.textContent = "";
    setMeetingFileStatus("");
    renderMeetingModeContainers();
    renderMeetingCalculator({
      focusSelector: isDetailedMode() ? `#meeting-class-input-${state.meeting.groups[0].id}` : "#simple-attendees"
    });
    setLiveStatus("Meeting cost calculator reset.");
  }

  function buildMeetingSummaryText() {
    const totals = calculateMeetingTotals();
    const mode = state.meeting.mode === "live" ? "Live timer" : "Set duration";
    const duration = state.meeting.mode === "live"
      ? formatTimer(totals.durationMs)
      : formatDurationWords(totals.durationMs);
    const percentLabel = formatPercent(totals.employerPercent);

    if (!isDetailedMode()) {
      const { baseRate } = getSimpleEstimateRates();
      return [
        "Meeting Cost Estimate",
        "",
        `Mode: ${mode}`,
        `Duration: ${duration}`,
        `Attendees: ${totals.attendees}`,
        "",
        `Blended base hourly rate: ${formatCurrency(baseRate)}/hour per attendee`,
        `Salary cost: ${formatCurrency(totals.salaryCost)}`,
        `Estimated employer costs (${percentLabel}%): ${formatCurrency(totals.employerCost)}`,
        `Estimated total meeting cost: ${formatCurrency(totals.totalCost)}`,
        "",
        "Assumptions: Simple Estimate Mode derives blended rates using the 15th and 85th percentiles of published County job classes based on the selected staff level distribution. Employer costs default to 138% of salary cost."
      ].join("\n");
    }

    const participantLines = totals.groups.map((item) => {
      if (item.type === NON_PERSONNEL_GROUP_TYPE) {
        const description = item.description?.label || "Non-personnel";
        return `- ${item.people} × ${description} — ${formatCurrency(item.rate)}/hour each — ${formatCurrency(item.nonPersonnelCost)} non-personnel cost`;
      }

      const {
        group,
        record,
        people,
        rate,
        salaryCost
      } = item;
      const classCode = record.job_class_code
        ? ` (Class ${record.job_class_code})`
        : "";
      return `- ${people} × ${record.title}${classCode}, Step ${group.step} — ${formatCurrency(rate)}/hour each — ${formatCurrency(salaryCost)} salary cost`;
    });

    return [
      "Meeting Cost Estimate",
      "",
      `Mode: ${mode}`,
      `Duration: ${duration}`,
      `Attendees: ${totals.attendees}`,
      "",
      "Participants",
      ...participantLines,
      "",
      `Combined hourly salary rate: ${formatCurrency(totals.combinedHourlyRate)}/hour`,
      `Salary cost: ${formatCurrency(totals.salaryCost)}`,
      `Estimated employer costs (${percentLabel}%): ${formatCurrency(totals.employerCost)}`,
      `Non-personnel cost: ${formatCurrency(totals.nonPersonnelCost)}`,
      `Estimated total meeting cost: ${formatCurrency(totals.totalCost)}`,
      "",
      "Assumptions: County personnel pay rates default to Step 5 when available; the selected steps are shown above. If Step 5 is not published, the highest available step is used. Employer costs are a planning estimate and default to 138% of County personnel salary cost. Employer costs are not applied to manually entered non-personnel rates."
    ].join("\n");
  }

  function setMeetingFileStatus(message, isError = false) {
    if (!el.meetingFileStatus) return;
    el.meetingFileStatus.textContent = message;
    el.meetingFileStatus.hidden = !message;
    el.meetingFileStatus.classList.toggle("meeting-file-status--error", Boolean(isError));
  }

  function meetingExportParticipant(group) {
    const people = meetingPeopleCount(group);
    if (!people) return null;

    if (isNonPersonnelGroup(group)) {
      const hourlyRate = meetingNonPersonnelRate(group);
      if (hourlyRate === null) return null;
      const description = nonPersonnelDescriptionById(group.descriptionId);
      return {
        type: NON_PERSONNEL_GROUP_TYPE,
        descriptionId: description?.id || null,
        people,
        hourlyRate
      };
    }

    const record = meetingRecordById(group.recordId);
    const step = Number(group.step);
    if (!record || !meetingAvailableSteps(record).some((item) => item.step === step)) {
      return null;
    }

    return {
      type: PERSONNEL_GROUP_TYPE,
      classification: {
        jobClassCode: record.job_class_code || "",
        title: record.title
      },
      step,
      people
    };
  }

  function buildMeetingExportPayload() {
    const payload = {
      format: MEETING_FILE_FORMAT,
      version: MEETING_FILE_VERSION,
      exportedAt: new Date().toISOString(),
      meeting: {
        mode: state.meeting.mode,
        employerCostPercent: nonNegativeNumber(
          state.meeting.employerPercent,
          DEFAULT_EMPLOYER_COST_PERCENT
        ),
        plannedDuration: {
          hours: Math.trunc(clampNumber(state.meeting.durationHours, 0, 999, 0)),
          minutes: Math.trunc(clampNumber(state.meeting.durationMinutes, 0, 59, 0))
        },
        liveDurationMilliseconds: Math.round(currentMeetingElapsedMs())
      }
    };

    if (!isDetailedMode()) {
      payload.meeting.simpleEstimate = {
        attendees: Math.trunc(clampNumber(state.meeting.simpleAttendees, 1, 9999, 1)),
        distribution: Math.trunc(clampNumber(state.meeting.simpleDistribution, 0, 100, 50))
      };
      payload.meeting.participants = [];
    } else {
      payload.meeting.participants = state.meeting.groups
        .map(meetingExportParticipant)
        .filter(Boolean);
    }
    return payload;
  }

  function meetingExportFileName(now = new Date()) {
    const pad = (value) => String(value).padStart(2, "0");
    const date = [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())].join("");
    const time = [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join("");
    return `meeting-cost-calculation-${date}-${time}.json`;
  }

  function exportMeetingFile() {
    const payload = buildMeetingExportPayload();
    const filename = meetingExportFileName();
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);

    const count = payload.meeting.participants.length;
    const groupLabel = count === 1 ? "participant group" : "participant groups";
    setMeetingFileStatus(`Exported ${count} ${groupLabel} to ${filename}.`);
    setLiveStatus(`Meeting exported with ${count} ${groupLabel}.`);
  }

  function isObjectRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function importedInteger(value, minimum, maximum, label) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < minimum || value > maximum) {
      throw new Error(`${label} must be a whole number from ${minimum} to ${maximum}.`);
    }
    return value;
  }

  function importedNonNegativeNumber(value, label) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new Error(`${label} must be zero or a positive number.`);
    }
    return value;
  }

  function importedClassificationRecord(classification, participantNumber) {
    if (!isObjectRecord(classification)) {
      throw new Error(`Participant group ${participantNumber} is missing its classification.`);
    }

    const jobClassCode = clean(classification.jobClassCode);
    const title = clean(classification.title);
    if (!jobClassCode && !title) {
      throw new Error(`Participant group ${participantNumber} is missing its classification.`);
    }

    const availableRecords = state.records.filter(
      (record) => meetingAvailableSteps(record).length
    );
    let matches = jobClassCode
      ? availableRecords.filter((record) => (
        normalizeSearch(record.job_class_code) === normalizeSearch(jobClassCode)
      ))
      : availableRecords.filter((record) => (
        normalizeSearch(record.title) === normalizeSearch(title)
      ));

    if (matches.length > 1 && title) {
      matches = matches.filter((record) => (
        normalizeSearch(record.title) === normalizeSearch(title)
      ));
    }

    if (!matches.length) {
      const label = jobClassCode
        ? `${title || "Classification"} (Class ${jobClassCode})`
        : title;
      throw new Error(`Participant group ${participantNumber} uses ${label}, which is not available in the current County dataset.`);
    }
    if (matches.length > 1) {
      throw new Error(`Participant group ${participantNumber} does not identify a unique County classification.`);
    }
    return matches[0];
  }

  function importedMeetingGroup(participant, index) {
    const participantNumber = index + 1;
    if (!isObjectRecord(participant)) {
      throw new Error(`Participant group ${participantNumber} is not valid.`);
    }

    const people = importedInteger(
      participant.people,
      1,
      999,
      `People in participant group ${participantNumber}`
    );

    if (participant.type === PERSONNEL_GROUP_TYPE) {
      const record = importedClassificationRecord(
        participant.classification,
        participantNumber
      );
      const step = importedInteger(
        participant.step,
        1,
        5,
        `Pay step in participant group ${participantNumber}`
      );
      if (!meetingAvailableSteps(record).some((item) => item.step === step)) {
        throw new Error(`Participant group ${participantNumber} uses Step ${step}, which is not published for ${record.title}.`);
      }

      const group = createMeetingGroup();
      group.recordId = record._id;
      group.query = meetingClassificationLabel(record);
      group.step = step;
      group.people = people;
      return group;
    }

    if (participant.type === NON_PERSONNEL_GROUP_TYPE) {
      const descriptionId = clean(participant.descriptionId) || null;
      const description = descriptionId
        ? nonPersonnelDescriptionById(descriptionId)
        : null;
      if (descriptionId && !description) {
        throw new Error(`Participant group ${participantNumber} uses an unsupported non-personnel description.`);
      }

      const group = createMeetingGroup(NON_PERSONNEL_GROUP_TYPE);
      group.descriptionId = description?.id || null;
      group.descriptionQuery = description?.label || "";
      group.hourlyRate = importedNonNegativeNumber(
        participant.hourlyRate,
        `Hourly rate in participant group ${participantNumber}`
      );
      group.people = people;
      return group;
    }

    throw new Error(`Participant group ${participantNumber} has an unsupported participant type.`);
  }

  function parseMeetingImport(payload) {
    if (!isObjectRecord(payload)) {
      throw new Error("The file does not contain a meeting calculation.");
    }
    if (payload.format !== MEETING_FILE_FORMAT) {
      throw new Error("The file was not exported by Meeting Meter.");
    }
    if (payload.version !== MEETING_FILE_VERSION) {
      throw new Error(`Meeting file version ${payload.version ?? "unknown"} is not supported.`);
    }
    if (!isObjectRecord(payload.meeting)) {
      throw new Error("The meeting file is missing its meeting data.");
    }

    const source = payload.meeting;
    if (!["duration", "live"].includes(source.mode)) {
      throw new Error("The meeting file has an unsupported calculation mode.");
    }
    if (!isObjectRecord(source.plannedDuration)) {
      throw new Error("The meeting file is missing its planned duration.");
    }
    const simpleEstimate = isObjectRecord(source.simpleEstimate) ? {
      attendees: importedInteger(source.simpleEstimate.attendees, 1, 9999, "Simple estimate attendees"),
      distribution: importedInteger(source.simpleEstimate.distribution, 0, 100, "Simple estimate distribution")
    } : null;

    const participants = Array.isArray(source.participants) ? source.participants : [];
    if (!simpleEstimate && participants.length > MEETING_IMPORT_MAX_PARTICIPANTS) {
      throw new Error(`A meeting file may contain no more than ${MEETING_IMPORT_MAX_PARTICIPANTS} participant groups.`);
    }

    const durationHours = importedInteger(
      source.plannedDuration.hours,
      0,
      999,
      "Planned duration hours"
    );
    const durationMinutes = importedInteger(
      source.plannedDuration.minutes,
      0,
      59,
      "Planned duration minutes"
    );
    const employerPercent = source.employerCostPercent === undefined
      ? DEFAULT_EMPLOYER_COST_PERCENT
      : importedNonNegativeNumber(
        source.employerCostPercent,
        "Employer-cost percentage"
      );
    const elapsedMs = source.liveDurationMilliseconds === undefined
      ? 0
      : importedNonNegativeNumber(
        source.liveDurationMilliseconds,
        "Live meeting duration"
      );
    if (!Number.isSafeInteger(Math.round(elapsedMs))) {
      throw new Error("The live meeting duration is too large to import.");
    }

    return {
      mode: source.mode,
      employerPercent,
      durationHours,
      durationMinutes,
      elapsedMs: Math.round(elapsedMs),
      simpleEstimate,
      groups: simpleEstimate ? [] : participants.map(importedMeetingGroup)
    };
  }

  function applyImportedMeeting(importedMeeting) {
    clearMeetingTimerInterval();
    stopMeetingIdleMode();
    state.meeting.mode = importedMeeting.mode;
    state.meeting.employerPercent = importedMeeting.employerPercent;
    state.meeting.durationHours = importedMeeting.durationHours;
    state.meeting.durationMinutes = importedMeeting.durationMinutes;
    state.meeting.elapsedMs = importedMeeting.elapsedMs;
    state.meeting.timerStatus = importedMeeting.elapsedMs > 0 || importedMeeting.mode === "live" ? "paused" : "idle";
    state.meeting.startedAt = null;
    if (importedMeeting.simpleEstimate) {
      state.meeting.simpleAttendees = importedMeeting.simpleEstimate.attendees;
      state.meeting.simpleDistribution = importedMeeting.simpleEstimate.distribution;
    } else if (importedMeeting.groups.length > 0) {
      state.meeting.groups = [...importedMeeting.groups, createMeetingGroup()];
    }
    ensureMeetingGroups();
    state.meeting.openGroupId = null;
    state.meeting.hasUserEdits = true;
    renderMeetingCalculator();
    setMeetingFileStatus("Imported meeting successfully.");
    setLiveStatus("Meeting imported successfully.");
  }

  async function importMeetingFile(file) {
    if (window.location.hash !== "#start") window.location.hash = "#start";
    setMeetingFileStatus("");

    try {
      if (!state.records.length) {
        throw new Error("Job classifications must finish loading before a meeting can be imported.");
      }
      if (!file) throw new Error("Choose one meeting JSON file to import.");
      if (file.size > MEETING_IMPORT_MAX_BYTES) {
        throw new Error("The meeting file is larger than the 1 MB import limit.");
      }

      let payload;
      try {
        const source = (await file.text()).replace(/^\uFEFF/, "");
        payload = JSON.parse(source);
      } catch {
        throw new Error("The selected file is not valid JSON.");
      }

      const importedMeeting = parseMeetingImport(payload);
      applyImportedMeeting(importedMeeting);

      const count = importedMeeting.groups.length;
      const groupLabel = count === 1 ? "participant group" : "participant groups";
      const timerNote = importedMeeting.mode === "live" && importedMeeting.elapsedMs > 0
        ? " The live timer was restored paused."
        : "";
      const filename = clean(file.name) || "meeting file";
      setMeetingFileStatus(`Imported ${count} ${groupLabel} from ${filename}.${timerNote}`);
      setLiveStatus(`Meeting imported with ${count} ${groupLabel}.${timerNote}`);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "The meeting could not be imported.";
      setMeetingFileStatus(`Import failed: ${message}`, true);
      setLiveStatus(`Meeting import failed. ${message}`);
    }
  }

  function fileDragContainsFiles(event) {
    return Array.from(event.dataTransfer?.types || []).includes("Files");
  }

  function showMeetingDropOverlay() {
    if (el.meetingDropOverlay) {
      el.meetingDropOverlay.hidden = false;
      el.meetingDropOverlay.setAttribute("aria-hidden", "false");
    }
    document.body.classList.add("meeting-file-drag-active");
    stopMeetingIdleMode();
  }

  function hideMeetingDropOverlay({ resumeIdle = true } = {}) {
    meetingDragDepth = 0;
    if (el.meetingDropOverlay) {
      el.meetingDropOverlay.hidden = true;
      el.meetingDropOverlay.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("meeting-file-drag-active");
    if (resumeIdle) noteMeetingActivity();
  }

  function bindMeetingFileEvents() {
    el.importMeetingButton?.addEventListener("click", () => {
      if (!el.importMeetingFile) return;
      el.importMeetingFile.value = "";
      el.importMeetingFile.click();
    });
    el.importMeetingFile?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0] || null;
      await importMeetingFile(file);
      event.target.value = "";
    });
    el.exportMeetingButton?.addEventListener("click", exportMeetingFile);

    document.addEventListener("dragenter", (event) => {
      if (!fileDragContainsFiles(event)) return;
      event.preventDefault();
      meetingDragDepth += 1;
      showMeetingDropOverlay();
    });
    document.addEventListener("dragover", (event) => {
      if (!fileDragContainsFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      showMeetingDropOverlay();
    });
    document.addEventListener("dragleave", (event) => {
      if (!meetingDragDepth) return;
      event.preventDefault();
      meetingDragDepth = Math.max(0, meetingDragDepth - 1);
      if (!meetingDragDepth) hideMeetingDropOverlay();
    });
    document.addEventListener("drop", async (event) => {
      if (!fileDragContainsFiles(event) && !meetingDragDepth) return;
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files || []);
      hideMeetingDropOverlay({ resumeIdle: false });
      if (files.length !== 1) {
        if (window.location.hash !== "#start") window.location.hash = "#start";
        const message = "Drop one meeting JSON file at a time.";
        setMeetingFileStatus(`Import failed: ${message}`, true);
        setLiveStatus(`Meeting import failed. ${message}`);
        return;
      }
      await importMeetingFile(files[0]);
    });
    window.addEventListener("blur", () => {
      if (meetingDragDepth) hideMeetingDropOverlay();
    });
  }

  async function writeClipboardText(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        /* Use the fallback when Clipboard API access is unavailable. */
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Copy command was not available");
  }

  async function copyMeetingEstimate() {
    const totals = calculateMeetingTotals();
    if (!totals.groups.length) return;

    try {
      await writeClipboardText(buildMeetingSummaryText());
      if (el.meetingCopyStatus) {
        el.meetingCopyStatus.textContent = "Summary copied to the clipboard.";
      }
      if (el.copyMeetingSummary) {
        el.copyMeetingSummary.textContent = "Copied";
        window.setTimeout(() => {
          if (el.copyMeetingSummary) {
            el.copyMeetingSummary.textContent = "Copy summary";
          }
        }, 1600);
      }
      setLiveStatus("Meeting cost summary copied to the clipboard.");
    } catch {
      if (el.meetingCopyStatus) {
        el.meetingCopyStatus.textContent = "The summary could not be copied. Check browser clipboard permissions and try again.";
      }
      setLiveStatus("Unable to copy the meeting cost summary.");
    }
  }

  function normalizeMeetingIntegerInput(input, minimum, maximum, fallback) {
    const value = Math.trunc(clampNumber(input.value, minimum, maximum, fallback));
    input.value = String(value);
    return value;
  }

  function bindMeetingEvents() {
    el.simpleAttendees?.addEventListener("input", (event) => {
      const value = Math.trunc(clampNumber(event.target.value, 1, 9999, 1));
      if (state.meeting.simpleAttendees !== value) {
        state.meeting.simpleAttendees = value;
        markMeetingEdited();
      }
      renderMeetingSummary();
    });

    el.simpleDistributionSlider?.addEventListener("input", (event) => {
      const value = Math.trunc(clampNumber(event.target.value, 0, 100, 50));
      if (state.meeting.simpleDistribution !== value) {
        state.meeting.simpleDistribution = value;
        markMeetingEdited();
      }
      renderMeetingSummary();
    });

    el.simpleInfoToggle?.addEventListener("click", () => {
      const expanded = el.simpleInfoToggle.getAttribute("aria-expanded") === "true";
      el.simpleInfoToggle.setAttribute("aria-expanded", String(!expanded));
      if (el.simpleInfoPanel) {
        el.simpleInfoPanel.hidden = expanded;
      }
    });

    el.employerInfoToggle?.addEventListener("click", () => {
      const expanded = el.employerInfoToggle.getAttribute("aria-expanded") === "true";
      el.employerInfoToggle.setAttribute("aria-expanded", String(!expanded));
      if (el.employerInfoPanel) {
        el.employerInfoPanel.hidden = expanded;
      }
    });

    document.querySelectorAll('input[name="meeting-mode"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) setMeetingMode(input.value);
      });
    });

    el.meetingDurationHours?.addEventListener("input", (event) => {
      const value = Math.trunc(clampNumber(
        event.target.value,
        0,
        999,
        0
      ));
      if (state.meeting.durationHours !== value) {
        state.meeting.durationHours = value;
        markMeetingEdited();
      }
      renderMeetingSummary();
    });
    el.meetingDurationHours?.addEventListener("blur", (event) => {
      const value = normalizeMeetingIntegerInput(
        event.target,
        0,
        999,
        0
      );
      if (state.meeting.durationHours !== value) {
        state.meeting.durationHours = value;
        markMeetingEdited();
      }
      renderMeetingSummary();
    });

    el.meetingDurationMinutes?.addEventListener("input", (event) => {
      const value = Math.trunc(clampNumber(
        event.target.value,
        0,
        59,
        0
      ));
      if (state.meeting.durationMinutes !== value) {
        state.meeting.durationMinutes = value;
        markMeetingEdited();
      }
      renderMeetingSummary();
    });
    el.meetingDurationMinutes?.addEventListener("blur", (event) => {
      const value = normalizeMeetingIntegerInput(
        event.target,
        0,
        59,
        0
      );
      if (state.meeting.durationMinutes !== value) {
        state.meeting.durationMinutes = value;
        markMeetingEdited();
      }
      renderMeetingSummary();
    });

    el.employerCostPercent?.addEventListener("input", (event) => {
      const value = nonNegativeNumber(event.target.value, 0);
      if (state.meeting.employerPercent !== value) {
        state.meeting.employerPercent = value;
        markMeetingEdited();
      }
      renderMeetingSummary();
    });
    el.employerCostPercent?.addEventListener("blur", (event) => {
      const parsed = parseNumber(event.target.value);
      const value = parsed === null
        ? DEFAULT_EMPLOYER_COST_PERCENT
        : nonNegativeNumber(parsed, DEFAULT_EMPLOYER_COST_PERCENT);
      if (state.meeting.employerPercent !== value) {
        state.meeting.employerPercent = value;
        markMeetingEdited();
      }
      event.target.value = String(value);
      renderMeetingSummary();
    });

    document.querySelector("#add-non-personnel-group")?.addEventListener(
      "click",
      addNonPersonnelGroup
    );
    document.querySelector("#reset-meeting-calculator")?.addEventListener(
      "click",
      resetMeetingCalculator
    );
    el.meetingTimerStart?.addEventListener("click", startMeetingTimer);
    el.meetingTimerPause?.addEventListener("click", () => pauseMeetingTimer());
    el.meetingTimerResume?.addEventListener("click", resumeMeetingTimer);
    el.meetingTimerReset?.addEventListener("click", resetMeetingTimer);
    el.copyMeetingSummary?.addEventListener("click", copyMeetingEstimate);
    bindMeetingFileEvents();
    document.querySelector("#meeting-retry-load")?.addEventListener(
      "click",
      () => loadData({ force: true })
    );

    ["pointermove", "pointerdown", "touchstart", "wheel"].forEach((eventName) => {
      document.addEventListener(eventName, noteMeetingActivity, { passive: true });
    });
    document.addEventListener("keydown", noteMeetingActivity);
    document.addEventListener("focusin", noteMeetingActivity);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") stopMeetingIdleMode();
      else scheduleMeetingIdleMode();
    });
    window.addEventListener("hashchange", () => {
      window.setTimeout(() => {
        if (canEnterMeetingIdleMode()) scheduleMeetingIdleMode();
        else stopMeetingIdleMode();
      }, 0);
    });

    el.meetingParticipantList?.addEventListener("focusin", (event) => {
      const input = event.target.closest?.(
        "[data-meeting-class-input], [data-meeting-description-input]"
      );
      if (!input) return;
      openMeetingOptionsInPlace(input.dataset.groupId);
    });

    el.meetingParticipantList?.addEventListener("focusout", (event) => {
      if (isRenderingMeetingParticipants) return;
      const combobox = event.target.closest?.(".meeting-class-combobox");
      if (!combobox) return;
      const groupElement = event.target.closest?.("[data-meeting-group]");
      const groupId = groupElement?.dataset.meetingGroup;
      window.setTimeout(() => {
        const currentGroup = groupId
          ? document.querySelector(`[data-meeting-group="${groupId}"]`)
          : null;
        const currentCombobox = currentGroup?.querySelector(".meeting-class-combobox");
        if (
          groupId
          && state.meeting.openGroupId === groupId
          && currentCombobox
          && !currentCombobox.contains(document.activeElement)
        ) {
          closeMeetingOptionsInPlace(groupId);
        }
      }, 0);
    });

    el.meetingParticipantList?.addEventListener("input", (event) => {
      const target = event.target;
      if (target.matches?.("[data-meeting-class-input]")) {
        const group = findMeetingGroup(target.dataset.groupId);
        if (!group) return;
        group.query = target.value;
        const selectedRecord = meetingRecordById(group.recordId);
        if (
          selectedRecord
          && target.value !== meetingClassificationLabel(selectedRecord)
        ) {
          group.recordId = null;
          group.step = null;
        }
        state.meeting.openGroupId = group.id;
        target.setAttribute("aria-expanded", "true");
        const options = document.querySelector(`#meeting-class-options-${group.id}`);
        if (options) {
          options.innerHTML = meetingClassOptionsContentHtml(group);
          options.hidden = false;
        }
        const help = document.querySelector(`#meeting-class-help-${group.id}`);
        if (help) help.textContent = meetingGroupHelpText(group, meetingRecordById(group.recordId));
        if (!group.recordId) {
          const step = document.querySelector(`#meeting-step-${group.id}`);
          if (step) {
            step.disabled = true;
            step.innerHTML = meetingStepOptionsHtml(group);
          }
        }
        renderMeetingSummary();
        return;
      }

      if (target.matches?.("[data-meeting-description-input]")) {
        const group = findMeetingGroup(target.dataset.groupId);
        if (!group || !isNonPersonnelGroup(group)) return;
        group.descriptionQuery = target.value;
        const selectedDescription = nonPersonnelDescriptionById(group.descriptionId);
        if (
          selectedDescription
          && target.value !== selectedDescription.label
        ) {
          group.descriptionId = null;
        }
        state.meeting.openGroupId = group.id;
        target.setAttribute("aria-expanded", "true");
        const options = document.querySelector(
          `#meeting-description-options-${group.id}`
        );
        if (options) {
          options.innerHTML = meetingNonPersonnelDescriptionOptionsContentHtml(group);
          options.hidden = false;
        }
        const help = document.querySelector(`#meeting-description-help-${group.id}`);
        if (help) {
          help.textContent = meetingNonPersonnelDescriptionHelpText(
            group,
            nonPersonnelDescriptionById(group.descriptionId)
          );
        }
        renderMeetingSummary();
        return;
      }

      if (target.matches?.("[data-meeting-non-personnel-rate]")) {
        const group = findMeetingGroup(target.dataset.groupId);
        if (!group || !isNonPersonnelGroup(group)) return;
        const parsed = parseNumber(target.value);
        const value = parsed === null ? null : nonNegativeNumber(parsed, 0);
        if (group.hourlyRate !== value) {
          group.hourlyRate = value;
          markMeetingEdited();
        }
        renderMeetingSummary();
        return;
      }

      if (target.matches?.("[data-meeting-people]")) {
        const group = findMeetingGroup(target.dataset.groupId);
        if (!group) return;
        const value = Math.trunc(clampNumber(target.value, 0, 999, 0));
        if (group.people !== value) {
          group.people = value;
          markMeetingEdited();
        }
        renderMeetingSummary();
      }
    });

    el.meetingParticipantList?.addEventListener("change", (event) => {
      const target = event.target;
      if (target.matches?.("[data-meeting-step]")) {
        const group = findMeetingGroup(target.dataset.groupId);
        if (!group) return;
        const value = Number(target.value) || null;
        if (group.step !== value) {
          group.step = value;
          markMeetingEdited();
        }
        renderMeetingSummary();
        setLiveStatus(`Pay Step ${group.step} selected.`);
        return;
      }

      if (target.matches?.("[data-meeting-non-personnel-rate]")) {
        const group = findMeetingGroup(target.dataset.groupId);
        if (!group || !isNonPersonnelGroup(group)) return;
        const parsed = parseNumber(target.value);
        const value = parsed === null ? null : nonNegativeNumber(parsed, 0);
        if (group.hourlyRate !== value) {
          group.hourlyRate = value;
          markMeetingEdited();
        }
        target.value = parsed === null ? "" : String(group.hourlyRate);
        renderMeetingSummary();
        return;
      }

      if (target.matches?.("[data-meeting-people]")) {
        const group = findMeetingGroup(target.dataset.groupId);
        if (!group) return;
        const value = normalizeMeetingIntegerInput(target, 1, 999, 1);
        if (group.people !== value) {
          group.people = value;
          markMeetingEdited();
        }
        renderMeetingSummary();
      }
    });

    el.meetingParticipantList?.addEventListener("click", (event) => {
      const selectButton = event.target.closest?.('[data-action="select-meeting-class"]');
      if (selectButton) {
        selectMeetingClassification(
          selectButton.dataset.groupId,
          selectButton.dataset.recordId
        );
        return;
      }

      const descriptionButton = event.target.closest?.(
        '[data-action="select-meeting-description"]'
      );
      if (descriptionButton) {
        selectMeetingNonPersonnelDescription(
          descriptionButton.dataset.groupId,
          descriptionButton.dataset.descriptionId
        );
        return;
      }

      const removeButton = event.target.closest?.('[data-action="remove-meeting-group"]');
      if (removeButton) removeMeetingGroup(removeButton.dataset.groupId);
    });

    el.meetingParticipantList?.addEventListener("keydown", (event) => {
      const input = event.target.closest?.(
        "[data-meeting-class-input], [data-meeting-description-input]"
      );
      if (input) {
        const groupId = input.dataset.groupId;
        const group = findMeetingGroup(groupId);
        if (!group) return;
        const optionsId = meetingGroupOptionsId(group);

        if (event.key === "ArrowDown") {
          event.preventDefault();
          state.meeting.openGroupId = groupId;
          renderMeetingParticipantRows({
            focusSelector: `#${optionsId} .meeting-class-option`
          });
          return;
        }

        if (event.key === "Escape") {
          event.preventDefault();
          closeMeetingOptionsInPlace(groupId);
          input.focus();
          return;
        }

        if (event.key !== "Enter") return;

        if (isNonPersonnelGroup(group) && group.descriptionQuery) {
          const firstMatch = meetingNonPersonnelDescriptionOptions(
            group.descriptionQuery
          )[0];
          if (!firstMatch) return;
          event.preventDefault();
          selectMeetingNonPersonnelDescription(groupId, firstMatch.id);
          return;
        }

        if (!isNonPersonnelGroup(group) && group.query) {
          const firstMatch = meetingSearchOptions(group.query)[0];
          if (!firstMatch) return;
          event.preventDefault();
          selectMeetingClassification(groupId, firstMatch._id);
        }
        return;
      }

      const option = event.target.closest?.(".meeting-class-option");
      if (!option) return;
      const options = Array.from(
        option.parentElement.querySelectorAll(".meeting-class-option")
      );
      const index = options.indexOf(option);

      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        let nextIndex = index;
        if (event.key === "ArrowDown") {
          nextIndex = Math.min(options.length - 1, index + 1);
        }
        if (event.key === "ArrowUp") nextIndex = Math.max(0, index - 1);
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = options.length - 1;

        if (event.key === "ArrowUp" && index === 0) {
          const group = findMeetingGroup(option.dataset.groupId);
          if (group) focusMeetingElement(`#${meetingGroupInputId(group)}`);
        } else {
          options[nextIndex]?.focus();
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        const group = findMeetingGroup(option.dataset.groupId);
        closeMeetingOptionsInPlace(option.dataset.groupId);
        if (group) focusMeetingElement(`#${meetingGroupInputId(group)}`);
      }
    });

    document.addEventListener("click", (event) => {
      if (
        !el.meetingParticipantList
        || el.meetingParticipantList.contains(event.target)
      ) return;
      closeMeetingOptionsInPlace();
    });

    window.addEventListener("beforeunload", () => {
      clearMeetingTimerInterval();
      hideMeetingDropOverlay({ resumeIdle: false });
    });
  }

  function showLoading({ force = false } = {}) {
    if (el.meetingLoadState) {
      el.meetingLoadState.hidden = false;
      el.meetingLoadState.textContent = force
        ? "Refreshing job classes and hourly pay rates..."
        : "Loading job classes and hourly pay rates...";
    }
    if (el.meetingErrorState) el.meetingErrorState.hidden = true;
    if (el.meetingCalculator) el.meetingCalculator.hidden = true;
  }

  function showLoaded() {
    if (el.meetingLoadState) el.meetingLoadState.hidden = true;
    if (el.meetingErrorState) el.meetingErrorState.hidden = true;
    if (el.meetingCalculator) el.meetingCalculator.hidden = false;
  }

  function showError(error) {
    if (el.meetingLoadState) el.meetingLoadState.hidden = true;
    if (el.meetingErrorState) el.meetingErrorState.hidden = false;
    if (el.meetingCalculator) el.meetingCalculator.hidden = true;
    const message = error && error.message ? error.message : "Unknown error";
    setLiveStatus(`Unable to load job classes and pay rates. ${message}`);
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.records) || typeof parsed.fetchedAt !== "number") {
        return null;
      }
      if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function writeCache(records) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        records,
        fetchedAt: Date.now()
      }));
    } catch {
      /* Storage can be full or disabled. The app still works without caching. */
    }
  }

  async function fetchCatalog() {
    const response = await fetch(DATA_URL, {
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`Open Data returned ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Open Data response was not a JSON array");
    }
    return data;
  }

  async function loadData({ force = false } = {}) {
    showLoading({ force });

    try {
      let rawRecords = null;
      if (!force) rawRecords = readCache()?.records || null;

      if (!rawRecords) {
        rawRecords = await fetchCatalog();
        writeCache(rawRecords);
      }

      state.records = rawRecords
        .map((row, index) => normalizeRecord(row, index))
        .sort((first, second) => first.title.localeCompare(
          second.title,
          undefined,
          { numeric: true, sensitivity: "base" }
        ));

      sanitizeMeetingStateAgainstData();
      showLoaded();
      renderMeetingCalculator();

      const availableCount = state.records.filter(
        (record) => meetingAvailableSteps(record).length
      ).length;
      setLiveStatus(`Loaded ${availableCount} job classifications with hourly pay rates.`);
    } catch (error) {
      showError(error);
    }
  }

  initializeMeetingIdleTargets();
  ensureMeetingGroups();
  bindMeetingEvents();
  loadData();
})();
