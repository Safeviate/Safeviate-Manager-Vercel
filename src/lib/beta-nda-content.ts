export const BETA_NDA_VERSION = 'beta-nda-v1';

export const BETA_NDA_TITLE = 'Safeviate Beta Tester NDA';

export const BETA_NDA_SUMMARY =
  'Access to the beta is conditional on keeping the product, data, screenshots, credentials, and operational content confidential.';

const NDA_PARAGRAPHS = [
  'This Beta Tester Non-Disclosure Agreement applies to your access to Safeviate beta features, test data, screenshots, workflows, and any non-public information you may see while using the system.',
  'By accepting, you agree that you will keep all non-public product information confidential, use the beta only for evaluation and testing, and avoid sharing screenshots, recordings, credentials, or operational details with anyone outside the approved tester group.',
  'You also agree that beta features may change or be withdrawn without notice, may contain defects or incomplete workflows, and are provided for evaluation purposes only.',
  'You confirm that you are authorized to receive this information, that you will protect your account credentials, and that your electronic signature below records your agreement to these terms.',
];

export const BETA_NDA_AGREEMENT_TEXT = [
  `${BETA_NDA_TITLE} (${BETA_NDA_VERSION})`,
  '',
  ...NDA_PARAGRAPHS,
].join('\n\n');
