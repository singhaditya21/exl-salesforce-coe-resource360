export default {
  id: 'master-02-engagement',
  rawFolder: 'master-02',
  outputBase: 'master-02-engagement-360',
  titleSlide: 'master-02-title.svg',
  captureFramesPerSecond: 2.5,
  introMinimumSeconds: 29,
  intro: 'Welcome to Master 02 for EXL Salesforce COE Resource 360. This live Salesforce walkthrough follows one project from portfolio selection through its account and commercial lineage, resource roster, budget economics, actual effort, dynamic work plan, accountable risks and effective-dated allocation history. Filters, selections, drill-downs and action outcomes are all performed on the authenticated product using the rich fictional dataset.',
  scenes: [
    {
      screen: 'ENG-01', raw: '01-eng-01', title: 'Scoped project portfolio', interaction: 'Filter active projects, search Global Retail, select the project, and open Project 360.',
      narration: 'ENG-01 starts with the scoped engagement portfolio. We filter to active delivery, search for Global Retail, select Global Retail Cloud and open its Project 360. The selected card carries account, portfolio, industry, solution tower, completion, health and risk context. Salesforce sharing and the active persona determine the rows returned by this live selector.',
    },
    {
      screen: 'ENG-02', raw: '02-eng-02', title: 'Project and commercial 360', interaction: 'Select an amendment, inspect accepted commercial lines, drill into the work plan, and continue to the roster.',
      narration: 'ENG-02 reconciles account, portfolio, sub-portfolio and delivery ownership around the selected project. Its commercial chain preserves the original SOW, amendment and change order as separate versions. We select the amendment, inspect its value, validity and accepted line, then drill into the related work plan before continuing to the project roster.',
    },
    {
      screen: 'ENG-03', raw: '03-eng-03', title: 'Project resource roster', interaction: 'Filter billing resources, search Riya, inspect an allocation, and open practitioner Resource 360.',
      narration: 'ENG-03 shows the effective project roster, not a contact list. We filter to Billing, search for Riya Sen, select an allocation and inspect daily hours, capacity state, effective dates, over-allocation control and skill evidence. Opening the practitioner Resource 360 proves the roster supports real record drill-down before we return to project economics.',
    },
    {
      screen: 'ENG-04', raw: '04-eng-04', title: 'Project economics', interaction: 'Filter approved budgets, select the current version, and expose approval and policy evidence.',
      narration: 'ENG-04 connects signed commercial authority to project economics. We filter approved budgets, select the current version and review approval evidence. Revenue, planned cost, gross margin, forecast margin, EAC, ETC and the costed role roster remain visible together. The outcome exposes policy and approval context instead of treating the status badge as proof.',
    },
    {
      screen: 'ENG-05', raw: '05-eng-05', title: 'Actuals reconciliation', interaction: 'Filter submitted timesheets, select a weekly sheet, and run the eight-hour daily-cap validation.',
      narration: 'ENG-05 reconciles actual effort with the selected project. We filter to Submitted, select a weekly timesheet and run the eight-hour daily-cap validation. The screen shows workflow state, exception evidence and daily entries. Planned over-allocation can be controlled elsewhere, while actual time remains capped at eight hours per day unless a separately governed overtime policy is enabled.',
    },
    {
      screen: 'ENG-06', raw: '06-eng-06-private', title: 'Dynamic delivery plan', interaction: 'Filter Build work, select a WBS item, isolate the critical path, and open related risks.',
      narration: 'ENG-06 is the project manager work plan. We filter to Build, select a WBS item and isolate the critical path. The detail panel exposes owner, schedule, progress, acceptance, effort and dependency evidence. The final action opens the related risk register, connecting schedule exceptions to accountable mitigation rather than leaving the Gantt as a passive picture.',
    },
    {
      screen: 'ENG-07', raw: '07-eng-07', title: 'Risk and action board', interaction: 'Filter high mitigating risks, select one, and record an accountable acknowledgement.',
      narration: 'ENG-07 makes delivery risk actionable. We filter for high-severity risks in mitigation, select the consent and identity-resolution item and acknowledge the accountable action. Owner, due date, mitigation and visible acknowledgement outcome remain together. This gives project, portfolio and operations roles the same attributable evidence from trigger through response.',
    },
    {
      screen: 'ENG-08', raw: '08-eng-08-private', title: 'Effective-dated allocation history', interaction: 'Select a practitioner and compare allocation versions, publication evidence and capacity states.',
      narration: 'ENG-08 closes the project journey with effective-dated allocation lineage. We select another practitioner and compare versions. The screen preserves role, hours, effective window, acceptance, billing classification, publication evidence and capacity state for each line. Prior versions remain immutable, while only the current accepted version drives capacity, utilization and authorized time entry.',
    },
  ],
};
