export const seedComplianceData = [
    {
        regulationCode: '141.02.2',
        regulationStatement: 'An air operator must have a safety management system (SMS).',
        companyReference: 'Safety Management Manual, Section 1.1',
        responsibleManagerId: '', // Should be linked to an actual manager ID
        nextAuditDate: new Date(new Date().getFullYear(), 2, 15).toISOString(),
    },
    {
        regulationCode: '141.03.4',
        regulationStatement: 'The operator shall establish and maintain a flight data monitoring (FDM) programme.',
        companyReference: 'Operations Manual, Part A, Section 8.3',
        responsibleManagerId: '',
        nextAuditDate: new Date(new Date().getFullYear(), 5, 20).toISOString(),
    },
    {
        regulationCode: '141.08.1',
        regulationStatement: 'All flight crew members must complete recurrent training annually.',
        companyReference: 'Training Manual, Section 5.2',
        responsibleManagerId: '',
        nextAuditDate: new Date(new Date().getFullYear(), 8, 10).toISOString(),
    },
    {
        regulationCode: '141.11.5',
        regulationStatement: 'Procedures for the transport of dangerous goods must be established and documented.',
        companyReference: 'Ground Operations Manual, Section 6',
        responsibleManagerId: '',
        nextAuditDate: new Date(new Date().getFullYear(), 11, 1).toISOString(),
    }
];
