export default {
  id: 'master-01-global',
  rawFolder: 'master-01',
  outputBase: 'master-01-global-entry-home-access',
  titleSlide: 'master-01-title.svg',
  captureFramesPerSecond: 2.5,
  introMinimumSeconds: 27,
  intro: 'Welcome to Master 01 for EXL Salesforce COE Resource 360. This live Salesforce walkthrough covers six distinct global experiences: identity assurance, the role-aware home, actionable notifications, governed cross-object search, role and scope selection, and personal preferences with contextual guidance. Every transition is selected in the product, and every action produces a visible result using fictional demo data.',
  scenes: [
    {
      screen: 'GLB-01', raw: '01-glb-01', title: 'Identity assurance', interaction: 'Verify the authenticated session and continue into the role-aware home.',
      narration: 'GLB-01 proves the authenticated entry contract. We select Verify session, and Salesforce resolves the current identity, assigned permission groups and authorized scope. The successful verification outcome appears on the screen before Continue opens the role-aware home. In production, EXL identity federation would replace the developer-org login; the server-side authorization and audit contract remains the same.',
    },
    {
      screen: 'GLB-02', raw: '02-glb-02', title: 'Role-aware home', interaction: 'Select a delivery priority, observe its destination, and return through the visible module navigation.',
      narration: 'GLB-02 is an operational home rather than a generic menu. Capacity, commercial and delivery signals come from the seeded Salesforce records. We choose the Delivery priority, which opens the scoped engagement portfolio, then return through the visible module control and continue to notifications. The destination changes with the active persona while record security remains authoritative.',
    },
    {
      screen: 'GLB-03', raw: '03-glb-03', title: 'Notification center', interaction: 'Filter high-severity alerts, select one, and record a reviewed outcome.',
      narration: 'GLB-03 turns alerts into an accountable exception queue. We filter for high severity, select a specific notification and mark it reviewed. The selected state exposes category, owner, business context and review evidence. A notification can lead only to records already authorized for the user, so the inbox cannot bypass portfolio sharing or commercial confidentiality.',
    },
    {
      screen: 'GLB-04', raw: '04-glb-04', title: 'Governed global search', interaction: 'Search for Architect practitioners, filter by object type, select a result, and open its drill-down.',
      narration: 'GLB-04 provides governed discovery across Resource 360 objects. We search for Architect, filter the result set to practitioners, select a named result and open its Resource 360 drill-down. The result explains object type and context, while user-mode queries and scope controls determine visibility. Empty, filtered and unauthorized outcomes remain distinguishable.',
    },
    {
      screen: 'GLB-05', raw: '05-glb-05', title: 'Role and scope switcher', interaction: 'Select Project Manager, choose a permitted scope, and apply the effective context.',
      narration: 'GLB-05 makes the active operating context explicit. We select Project Manager, choose an authorized portfolio scope and apply it. The visible outcome confirms the effective persona and boundary. This interaction never grants authority by itself: Salesforce permission sets, sharing, delegation dates and user-mode enforcement still decide which records and actions are available.',
    },
    {
      screen: 'GLB-06', raw: '06-glb-06', title: 'Preferences and contextual help', interaction: 'Change density and time zone, save preferences, and launch the engagement guide.',
      narration: 'GLB-06 combines personal preferences with task-specific guidance. We change display density and time zone, save the settings, then launch the engagement guide. The action opens the relevant Salesforce journey instead of returning a generic response. This completes the global foundation: verified identity, purposeful home, actionable exceptions, governed search, explicit context and reusable help.',
    },
  ],
};
