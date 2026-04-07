export type SafetyFileRequirementScope = 'direct' | 'scope-based' | 'supporting';

export type SafetyFileRequirementSection =
  | 'core-pack'
  | 'appointments'
  | 'site-controls'
  | 'emergency';

export type SafetyFileRequirement = {
  id: string;
  title: string;
  section: SafetyFileRequirementSection;
  scope: SafetyFileRequirementScope;
  regulatoryBasis: string;
  summary: string;
  onsiteExpectation: string;
  evidenceExamples: string[];
  keywords: string[];
};

export const SAFETY_FILE_REQUIREMENTS: SafetyFileRequirement[] = [
  {
    id: 'baseline-risk-assessment',
    title: 'Baseline Risk Assessment',
    section: 'core-pack',
    scope: 'direct',
    regulatoryBasis: 'Construction Regulations, 2014: regulation 5(1)(a)',
    summary: 'The client must prepare a baseline risk assessment before the work starts.',
    onsiteExpectation: 'Keep the signed project baseline risk assessment in the file and ensure later site controls align to it.',
    evidenceExamples: ['Baseline risk assessment', 'BRA', 'Project risk assessment'],
    keywords: ['baseline risk assessment', 'bra', 'project risk assessment'],
  },
  {
    id: 'health-safety-specification',
    title: 'Client Health and Safety Specification',
    section: 'core-pack',
    scope: 'direct',
    regulatoryBasis: 'Construction Regulations, 2014: regulation 5(1)(b)',
    summary: 'The client must issue a site-specific health and safety specification based on the baseline risk assessment.',
    onsiteExpectation: 'Store the latest approved client specification and any revisions issued to the contractor team.',
    evidenceExamples: ['H&S specification', 'Health and safety specification', 'Client specification'],
    keywords: ['health and safety specification', 'h&s specification', 'client specification'],
  },
  {
    id: 'health-safety-plan',
    title: 'Principal Contractor Health and Safety Plan',
    section: 'core-pack',
    scope: 'direct',
    regulatoryBasis: 'Construction Regulations, 2014: regulation 7(1)(a)',
    summary: 'The principal contractor must maintain a site-specific health and safety plan aligned to the client specification.',
    onsiteExpectation: 'Keep the approved project H&S plan on site and update it as the work progresses.',
    evidenceExamples: ['Health and safety plan', 'H&S plan', 'Site safety plan'],
    keywords: ['health and safety plan', 'h&s plan', 'site safety plan'],
  },
  {
    id: 'permit-or-notification',
    title: 'Construction Work Permit or Notification',
    section: 'core-pack',
    scope: 'direct',
    regulatoryBasis: 'Construction Regulations, 2014: regulations 3, 4 and 3(6)',
    summary: 'Depending on project thresholds and risk triggers, the permit or notification paperwork must be retained in the file.',
    onsiteExpectation: 'Keep the permit, site number, or notification confirmation with the project pack.',
    evidenceExamples: ['Construction work permit', 'Annexure 2 notification', 'Provincial director notification'],
    keywords: ['construction work permit', 'annexure 2', 'notification', 'site specific number'],
  },
  {
    id: 'good-standing',
    title: 'Compensation Fund Good Standing',
    section: 'core-pack',
    scope: 'direct',
    regulatoryBasis: 'Construction Regulations, 2014: regulation 5(1)(j)',
    summary: 'Before work starts, the client must ensure the principal contractor is registered and in good standing with the Compensation Fund or a licensed insurer.',
    onsiteExpectation: 'Keep the current letter of good standing and any insurer proof used for the job.',
    evidenceExamples: ['Letter of good standing', 'COIDA good standing', 'Compensation Fund'],
    keywords: ['good standing', 'coida', 'compensation fund'],
  },
  {
    id: 'written-appointments',
    title: 'Written Appointments and Mandates',
    section: 'appointments',
    scope: 'direct',
    regulatoryBasis: 'Construction Regulations, 2014: regulations 5(1)(k), 5(5)-(7) and 7(1)(c)',
    summary: 'Principal contractor appointments, agent appointments, and downstream contractor appointments should be evidenced in writing.',
    onsiteExpectation: 'Keep signed appointment letters, acceptance letters, and scope allocations for the project team.',
    evidenceExamples: ['Principal contractor appointment', 'CR appointment', 'Agent appointment', 'Mandatory appointment'],
    keywords: ['appointment', 'appointee', 'mandatory appointment', 'principal contractor'],
  },
  {
    id: 'competency-and-induction',
    title: 'Competency, Training, and Induction Records',
    section: 'appointments',
    scope: 'supporting',
    regulatoryBasis: 'Construction Regulations, 2014: competent person definitions and role-based duties',
    summary: 'The file usually needs evidence that appointed persons and workers were competent and inducted for the work.',
    onsiteExpectation: 'Store inductions, competency records, licenses, and relevant training proof for the active site team.',
    evidenceExamples: ['Induction register', 'Training matrix', 'Competency certificate', 'Operator license'],
    keywords: ['induction', 'training', 'competency', 'competence', 'certificate', 'license'],
  },
  {
    id: 'medical-fitness',
    title: 'Medical Certificates of Fitness',
    section: 'appointments',
    scope: 'scope-based',
    regulatoryBasis: 'Construction Regulations, 2014: medical fitness references for construction work risk controls',
    summary: 'Where the work or task requires fitness confirmation, certificates should be available in the file.',
    onsiteExpectation: 'Keep current medical fitness certificates for exposed workers and supervisors where applicable.',
    evidenceExamples: ['Medical certificate of fitness', 'Medical fitness', 'Fit for duty'],
    keywords: ['medical certificate', 'fitness', 'fit for duty', 'medical fitness'],
  },
  {
    id: 'fall-protection',
    title: 'Fall Protection and Other Scope-Specific Plans',
    section: 'appointments',
    scope: 'scope-based',
    regulatoryBasis: 'Construction Regulations, 2014: work-at-height and task-specific planning obligations',
    summary: 'If the project includes work at height or other high-risk activities, the relevant plan should be carried in the file.',
    onsiteExpectation: 'Keep the fall protection plan and other task-specific plans that match the site risk profile.',
    evidenceExamples: ['Fall protection plan', 'Rescue plan', 'Work at height plan'],
    keywords: ['fall protection', 'work at height', 'rescue plan'],
  },
  {
    id: 'task-risk-controls',
    title: 'Task Risk Assessments and Method Statements',
    section: 'site-controls',
    scope: 'supporting',
    regulatoryBasis: 'Derived from the site-specific H&S plan and risk control duties in the Construction Regulations, 2014',
    summary: 'Method statements and task-level risk controls are common evidence that the site plan is being implemented.',
    onsiteExpectation: 'Keep current method statements, activity risk assessments, and safe work procedures for live tasks.',
    evidenceExamples: ['Method statement', 'Task risk assessment', 'Safe work procedure', 'JSA'],
    keywords: ['method statement', 'task risk assessment', 'safe work procedure', 'jsa', 'activity risk assessment'],
  },
  {
    id: 'inspections-and-audits',
    title: 'Inspections, Registers, and Monthly Audits',
    section: 'site-controls',
    scope: 'direct',
    regulatoryBasis: 'Construction Regulations, 2014: regulation 5(1)(o)-(p)',
    summary: 'The client must ensure periodic audits and document verification at intervals agreed with the principal contractor, at least every 30 days.',
    onsiteExpectation: 'Keep audit reports, inspection registers, corrective actions, and document verification evidence in the file.',
    evidenceExamples: ['H&S audit report', 'Inspection register', 'Checklist', 'Corrective action register'],
    keywords: ['audit report', 'inspection register', 'checklist', 'corrective action', 'document verification'],
  },
  {
    id: 'plant-ppe-registers',
    title: 'Plant, PPE, and Equipment Control Records',
    section: 'site-controls',
    scope: 'supporting',
    regulatoryBasis: 'Project evidence commonly needed to show implementation of the Act and construction controls',
    summary: 'Sites usually keep issue registers and inspection records for PPE, tools, ladders, scaffolds, and plant used on the job.',
    onsiteExpectation: 'Store the live issue and inspection evidence that supports safe execution of the work on site.',
    evidenceExamples: ['PPE register', 'Ladder inspection', 'Scaffold register', 'Toolbox talk register'],
    keywords: ['ppe register', 'ladder inspection', 'scaffold', 'toolbox talk', 'plant inspection'],
  },
  {
    id: 'emergency-arrangements',
    title: 'Emergency Preparedness and Site Contacts',
    section: 'emergency',
    scope: 'supporting',
    regulatoryBasis: 'Needed to support safe site execution and emergency response under the Act and site plan',
    summary: 'A practical site file normally includes emergency contacts, evacuation arrangements, and first-aid or firefighting allocations.',
    onsiteExpectation: 'Keep the emergency plan, contact sheet, first-aid appointments, and response layout accessible in the file.',
    evidenceExamples: ['Emergency plan', 'Emergency contacts', 'Evacuation procedure', 'First aider appointment'],
    keywords: ['emergency plan', 'emergency contact', 'evacuation', 'first aider', 'fire'],
  },
  {
    id: 'incident-records',
    title: 'Incident Reporting and Investigation Records',
    section: 'emergency',
    scope: 'direct',
    regulatoryBasis: 'Construction Regulations, 2014: regulation 5(3) read with reporting duties under the Act',
    summary: 'If serious incidents occur, reporting and corrective evidence should sit with the site file.',
    onsiteExpectation: 'Keep incidents, investigations, section 24 reporting records, and corrective action follow-up together.',
    evidenceExamples: ['Incident report', 'Section 24 report', 'Investigation report', 'Corrective action'],
    keywords: ['incident report', 'section 24', 'investigation report', 'near miss', 'corrective action'],
  },
  {
    id: 'closeout-design-info',
    title: 'Close-Out, Completion, and Residual H&S Information',
    section: 'emergency',
    scope: 'supporting',
    regulatoryBasis: 'Construction Regulations, 2014: design and completion information relevant to later safe use and maintenance',
    summary: 'For mature project files, completion evidence and residual health and safety information help support handover and future maintenance.',
    onsiteExpectation: 'Retain completion certificates, final design safety information, and close-out records for archive and client handover.',
    evidenceExamples: ['Completion certificate', 'Close-out', 'Residual hazards', 'Handover pack'],
    keywords: ['completion certificate', 'close-out', 'closeout', 'handover', 'residual hazard'],
  },
];
