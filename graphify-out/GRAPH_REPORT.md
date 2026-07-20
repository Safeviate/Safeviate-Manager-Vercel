# Graph Report - Safeviate-Manager-Vercel  (2026-07-20)

## Corpus Check
- 621 files · ~486,897 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4026 nodes · 15176 edges · 215 communities (160 shown, 55 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `91894d81`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 108
- Community 109
- Community 110
- Community 111
- Community 112
- Community 113
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
- Community 147
- Community 149
- Community 150
- Community 151
- Community 152
- Community 153
- Community 154
- Community 156
- Community 157
- Community 158
- Community 160
- Community 161
- Community 163
- Community 164
- Community 165
- Community 166
- Community 167
- Community 169
- Community 170
- Community 172
- Community 174
- Community 176
- Community 177
- Community 181
- Community 182
- Community 183
- Community 184
- Community 186
- Community 187
- Community 188
- Community 189
- Community 190
- Community 191
- Community 192
- Community 194
- Community 195
- Community 197
- Community 198
- Community 232
- Community 233
- Community 234
- Community 235
- Community 236
- Community 237
- Community 240
- Community 242
- Community 244
- Community 248
- Community 250
- Community 251
- Community 255
- Community 261
- Community 266
- Community 268
- Community 284
- Community 289
- Community 332
- Community 333
- Community 340
- Community 349
- Community 353
- Community 355
- Community 397

## God Nodes (most connected - your core abstractions)
1. `useToast()` - 317 edges
2. `cn()` - 297 edges
3. `Button` - 226 edges
4. `useUserProfile()` - 192 edges
5. `Card` - 186 edges
6. `CardContent` - 172 edges
7. `usePermissions()` - 162 edges
8. `useIsMobile()` - 129 edges
9. `Badge()` - 126 edges
10. `Input` - 125 edges

## Surprising Connections (you probably didn't know these)
- `useCarousel()` --references--> `react`  [EXTRACTED]
  src/components/ui/carousel.tsx → package.json
- `useChart()` --references--> `react`  [EXTRACTED]
  src/components/ui/chart.tsx → package.json
- `RiskAssessmentEditor()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/management-of-change/[mocId]/implementation-form.tsx → package.json
- `ClosureMonitoringPanel()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/safety-reports/[reportId]/final-review.tsx → package.json
- `FinalReview()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/safety-reports/[reportId]/final-review.tsx → package.json

## Import Cycles
- 1-file cycle: `src/lib/placeholder-images.ts -> src/lib/placeholder-images.ts`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/personnel-actions.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-table.tsx -> src/app/(app)/users/personnel/personnel-actions.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/app/(app)/admin/roles/role-actions.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/app/(app)/admin/roles/role-form.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/department/page.tsx`

## Communities (215 total, 55 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (47): asDate(), asRecord(), GET(), getRecoveryContext(), isRecoveryAdministrator(), PATCH(), restoreArchive(), DELETE() (+39 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (63): BOOKING_TYPE_COLORS, BookingOverviewMetrics, buildTrendBuckets(), calcBreakMinutes(), calcDutyMinutes(), calcNetDutyMinutes(), CANCELLATION_REASON_COLORS, CompetencyArea (+55 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (36): ImportFromMatrixDialogProps, MatrixTreeNode, CapActionsForm(), CapFormValues, capSchema, correctiveActionSchema, parseLocalDate(), toNoonUtcIso() (+28 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (30): ActiveFlightLiveMap, ActiveFlightPage(), ActiveTrackingSelection, ActiveTrackingState, clearActiveTrackingState(), clearLocationCalibration(), clearQueuedFlightSession(), clearQueuedTrackPoints() (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (26): ChecklistTemplateCardProps, ASSET_TYPE_OPTIONS, AssetInspectionChecklistsPage(), createEmptySection(), SCOPE_OPTIONS, TemplateSectionDraft, ASSET_TYPE_OPTIONS, AssetInspectionNewPage() (+18 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (21): asDate(), canonicalKeyFor(), defaultTrainingClassification(), isOccurrenceLinked(), mergeMitigations(), mergeOccurrences(), mergeRiskItem(), normalizeText() (+13 more)

### Community 6 - "Community 6"
Cohesion: 0.17
Nodes (22): DEFAULT_TOPICS, ExamTopicsSettings, parseLocalDate(), VehicleList(), BookingBuckets, EnrichedBooking, UpsertQuestionDialogProps, DeleteActionButton() (+14 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (20): CompetencyHighlight, CompetencyStrip(), DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getCompetencySnapshot(), getCompetencyTone() (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (47): AIRCRAFT_MODELS, buildCorrectiveActionPlans(), buildMeetings(), buildQualityAudits(), buildRisks(), buildSafetyReports(), buildSimulationAircraft(), buildSimulationAssertions() (+39 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (31): DepartmentActionsProps, Department, AlertCard(), ChecklistTemplateCard(), ChecklistTemplateCardProps, NewChecklistDialogProps, StartAuditDialogProps, GapAnalysisTemplateCardProps (+23 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (17): buildDefaultEnabledHrefs(), buildTenantIdFromName(), DatabaseForm(), getDefaultTenantMenuState(), getTenantMenuState(), getTenantPageLayoutSettings(), isTenantMenuHref(), normalizeTenantConfig() (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.09
Nodes (65): DepartmentFormProps, formSchema, AddComponentDialogProps, componentFormSchema, ComponentFormValues, formSchema, ComponentFormProps, componentSchema (+57 more)

### Community 12 - "Community 12"
Cohesion: 0.09
Nodes (31): AssignPersonnelDialog(), DETAIL_TABS, formatDisplayDate(), getDocumentHealth(), getDocumentHealthBadge(), getProjectDocumentsForRequirement(), getProjectStatusBadge(), getRiskScoreBadge() (+23 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (38): AddComponentDialog(), AddDefectDialog(), AddMaintenanceLogDialog(), AircraftDetailPage(), AircraftDetailPageProps, AircraftDocumentUpload, AircraftUsageBooking, categorizeDefect() (+30 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (82): DepartmentPage(), ExternalCompaniesPage(), defaultSettings, OverdueMonitorSettings, OverdueSettingsPage(), AdminPage(), PageFormatPage(), RolesPage() (+74 more)

### Community 15 - "Community 15"
Cohesion: 0.16
Nodes (18): DebriefRoomBookingForm(), BookingItem(), BRIEFING_ROOMS, combineDateAndTime(), formatHoursValue(), formatMaintenanceWindowRange(), getBookingDateSegments(), getDatesInRangeInclusive() (+10 more)

### Community 16 - "Community 16"
Cohesion: 0.04
Nodes (99): DELETE(), getTenantId(), PATCH(), GET(), safeValue(), handler, DELETE(), getTenantId() (+91 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (18): BillingTableProps, AircraftActions(), AircraftActionsProps, AircraftFormProps, AircraftTableProps, EditHoursDialogProps, AircraftTableProps, ViewAircraftDetailsProps (+10 more)

### Community 18 - "Community 18"
Cohesion: 0.06
Nodes (42): BillingTable(), BillingTableProps, parseLocalDate(), DepartmentActions(), Role, RoleActions(), RoleActionsProps, ExternalUsersTable() (+34 more)

### Community 19 - "Community 19"
Cohesion: 0.15
Nodes (14): AiChecklistGenerator(), AiChecklistGeneratorProps, ImportFromGapAnalysesDialogProps, ImportFromMatrixDialog(), NewChecklistDialog(), AiGapAnalysisGenerator(), AiGapAnalysisGeneratorProps, ImportFromGapAnalysesDialogProps (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.17
Nodes (13): CATEGORIES, ContactsTabProps, DocumentsTab(), DocumentsTabProps, REQUIRED_DOCUMENTS, ERPCollectedDocument, ERPContact, ERPContactCategory (+5 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (23): DocumentDatesPage(), FeaturesPage(), BookingPlannedLegsPanelProps, BookingPlanningMap(), BookingPlanningMapProps, BookingPlanningMapSettings, buildWaypointContext(), DEFAULT_SETTINGS (+15 more)

### Community 22 - "Community 22"
Cohesion: 0.16
Nodes (16): ACTION_STATUS_OPTIONS, createActionItem(), createDiscussionPoint(), DiscussionPointDraft, getPersonName(), MeetingDetailPage(), parseLocalDate(), PersonnelLite (+8 more)

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (24): formSchema, FormValues, getRiskLevel(), getRiskScoreColor(), hazardSchema, ImplementationForm, ImplementationFormHandle, ImplementationFormProps (+16 more)

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (7): FlightTelemetryTable(), FlightTelemetryTableProps, TelemetryCell(), FullScreenFlightLayout(), FullScreenFlightLayoutProps, Point, ActiveLegState

### Community 25 - "Community 25"
Cohesion: 0.09
Nodes (25): BookingDetailPageProps, BookingHistoryDetailPage(), AeronauticalMap, BookingPerson, BookingStation, BookingStationState, CHECK_APPROVAL_KEYS, CheckApprovalKey (+17 more)

### Community 26 - "Community 26"
Cohesion: 0.11
Nodes (15): buildComparisonCsv(), buildSimulationRunCsv(), buildSimulationRunCsvRow(), EMPTY_SETTINGS, escapeCsvCell(), getComparisonInterpretation(), getDecodedAnalysis(), getObservedRequests() (+7 more)

### Community 27 - "Community 27"
Cohesion: 0.13
Nodes (28): ActiveFlightMapLibreShell(), ActiveFlightMapLibreShellProps, airspaceFeatureCollection(), bringAerialLayersToFront(), buildWaypointPopupMarkup(), escapeHtml(), FlightPosition, formatAirspaceVerticalLimits() (+20 more)

### Community 28 - "Community 28"
Cohesion: 0.06
Nodes (45): AeronauticalMap(), airspaceFeatureCollection(), AVAILABLE_ZOOM_LEVELS, blockMapInteraction(), createOwnshipIcon(), DEFAULT_FLIGHT_PLANNER_MAP_SETTINGS, DefaultIcon, delay() (+37 more)

### Community 29 - "Community 29"
Cohesion: 0.08
Nodes (37): GET(), loadConfig(), loadMatchingGroup(), POST(), resolveTenantId(), GET(), getTenantId(), POST() (+29 more)

### Community 30 - "Community 30"
Cohesion: 0.06
Nodes (32): FindingLevel, StatusSelectorProps, AuditChecklistProps, CapActionsFormProps, GapAnalysisChecklistProps, CapTaskDetailCard, CapTaskDetailCardHandle, CapTaskDetailCardProps (+24 more)

### Community 31 - "Community 31"
Cohesion: 0.09
Nodes (19): buildMitigatedHazardsFromReview(), ClosureMonitoringPanel(), closureStatuses, deriveReviewRisks(), FinalReview(), FormValues, monitoringStatuses, reportReviewSchema (+11 more)

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (23): scripts, audit:density, build, db:inspect:tenant, db:push, db:push:local, db:recover:tenant-audit-config, db:studio (+15 more)

### Community 33 - "Community 33"
Cohesion: 0.11
Nodes (21): WBCalculatorContent(), AeronauticalMap, BookingPerson, BookingStation, BookingStationState, DEFAULT_BASIC_EMPTY, DEFAULT_GRAPH_CONFIG, formatDateSafe() (+13 more)

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (16): EditSpiFormProps, SPICard(), SPICardProps, parseLocalDate(), SpiCalculationResult, SpiDataPoint, useSpiData(), EditReportDialogProps (+8 more)

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (10): eventClassifications, ICAO_CATEGORIES, isEmailLike(), reportStatuses, resolveReporterLabel(), TriageForm(), TriageFormValues, triageSchema (+2 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (16): extractChecklistSource(), extractChecklistSourceFlow, ExtractChecklistSourceInput, ExtractChecklistSourceInputSchema, ExtractChecklistSourceOutput, ExtractChecklistSourceOutputSchema, prompt, checklistItemSchema (+8 more)

### Community 37 - "Community 37"
Cohesion: 0.25
Nodes (19): buildMatrixIdentityKey(), collectDeletionIds(), ComplianceMatrixEntry, dedupeMatrixEntries(), DELETE(), GET(), getConfig(), getTenantId() (+11 more)

### Community 38 - "Community 38"
Cohesion: 0.50
Nodes (3): parseLocalDate(), ViewAircraftDetails(), ViewAircraftDetailsProps

### Community 39 - "Community 39"
Cohesion: 0.14
Nodes (24): BillingTable(), parseLocalDate(), MaintenanceLogList(), parseLocalDate(), MaintenanceLogs(), MaintenanceLogsProps, parseLocalDate(), TrackedComponentsProps (+16 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (27): NavlogBuilder(), AeronauticalMap, FlightPlannerPage(), createEmptyRoute(), TrainingRoutesPage(), SidebarBrandLogoFooter(), useTheme(), getActiveLegState() (+19 more)

### Community 41 - "Community 41"
Cohesion: 0.10
Nodes (41): AssetInspectionRecord, DELETE(), GET(), getConfig(), getTenantId(), normalizeAssetType(), normalizeChecklistItems(), POST() (+33 more)

### Community 42 - "Community 42"
Cohesion: 0.08
Nodes (24): FormValues, InterviewCard(), InvestigationForm(), investigationInterviewSchema, investigationMemberSchema, investigationSchema, investigationTaskSchema, investigationTaskUpdateSchema (+16 more)

### Community 43 - "Community 43"
Cohesion: 0.07
Nodes (35): react, react, RiskMatrixPage(), buildRiskAssessmentPath(), defaultTrainingClassification(), formSchema, getRiskLevel(), getRiskScoreColor() (+27 more)

### Community 44 - "Community 44"
Cohesion: 0.06
Nodes (40): ActiveFlightLiveMap(), ActiveFlightMapLayerSettings, airspaceFeatureCollection(), AVAILABLE_ZOOM_LEVELS, clearLocationCalibration(), clearOfflineTileCaches(), DEFAULT_ACTIVE_FLIGHT_MAP_LAYER_SETTINGS, delay() (+32 more)

### Community 45 - "Community 45"
Cohesion: 0.06
Nodes (41): cleanData(), componentSchema, ComponentsFormValues, componentsSchema, DetailsFormValues, detailsSchema, EditComponentsDialog(), EditDetailsDialog() (+33 more)

### Community 46 - "Community 46"
Cohesion: 0.06
Nodes (40): AddAircraftDialog(), AddComponentDialog(), toNoonUtcIso(), BookingsTable(), DatabasePage(), calculateSpans(), HeaderCell, LogbookParserPage() (+32 more)

### Community 47 - "Community 47"
Cohesion: 0.06
Nodes (48): defaultFiftyHourWarnings, defaultHundredHourWarnings, defaultInstructorWarnings, defaultMilestones, DocumentExpirySettings, WarningPeriod, FuelStation, FuelStationInput (+40 more)

### Community 48 - "Community 48"
Cohesion: 0.05
Nodes (46): ExternalOrganizationsPage(), NewRolePage(), EditRolePage(), AircraftFleetPage(), COMPLETED_AUDIT_STATUSES, getLastAuditDates(), BookingsHistoryPage(), WorkpackDetailsPage() (+38 more)

### Community 49 - "Community 49"
Cohesion: 0.27
Nodes (10): getSafetyReportGroup(), getStatusBadgeVariant(), isEmailLike(), normalizeSafetyReportGroup(), parseLocalDate(), QuickSafetyInbox(), ReportSortOrder, ReportsTable() (+2 more)

### Community 50 - "Community 50"
Cohesion: 0.08
Nodes (51): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), SUPER_USERS (+43 more)

### Community 51 - "Community 51"
Cohesion: 0.09
Nodes (38): airspaceFeatureCollection(), AviationMapLibreShell(), AviationMapLibreShellProps, createAircraftIcon(), delay(), distanceMeters(), distanceNm(), fetchOpenAipJson() (+30 more)

### Community 52 - "Community 52"
Cohesion: 0.04
Nodes (58): AccountingPage(), DataPortabilityPage(), DatabaseForm(), DepartmentForm(), ExamTopicsPage(), TenantDirectory(), AircraftActions(), AircraftActionsProps (+50 more)

### Community 53 - "Community 53"
Cohesion: 0.11
Nodes (28): buildCriterionRatingsFromTemplate(), buildHumanFactorsChecklist(), createDebriefEntry(), createDebriefEntryFromTemplate(), debriefSchema, FormValues, HAZARDOUS_ATTITUDE_OPTIONS, HUMAN_FACTORS_CHECKS (+20 more)

### Community 54 - "Community 54"
Cohesion: 0.09
Nodes (31): AppSidebarMobile(), lastSubmenuByParentMemory, USERS_STATIC_SUB_ITEMS, Sidebar, SidebarCollapsibleContent, SidebarCollapsibleTrigger, SidebarContent, SidebarContext (+23 more)

### Community 55 - "Community 55"
Cohesion: 0.21
Nodes (14): getGraphTemplate(), GRAPH_TEMPLATES, GraphPoint, GraphTemplate, ensureClosedEnvelope(), formatTick(), generateTicks(), MasterGraph() (+6 more)

### Community 56 - "Community 56"
Cohesion: 0.18
Nodes (14): CorrectiveActionsForm(), FlattenedMitigation, flattenMitigations(), getRiskScoreColor(), likelihoodLabels, mitigationReviewSchema, normalizeRiskAssessment(), parseLocalDate() (+6 more)

### Community 57 - "Community 57"
Cohesion: 0.17
Nodes (14): DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getDaysSince(), getPeriodDays(), getPeriodStart(), getStudentRecommendation() (+6 more)

### Community 58 - "Community 58"
Cohesion: 0.22
Nodes (9): LogbookColumn, LogbookColumnSchema, parseLogbook(), parseLogbookFlow, ParseLogbookInput, ParseLogbookInputSchema, ParseLogbookOutput, ParseLogbookOutputSchema (+1 more)

### Community 59 - "Community 59"
Cohesion: 0.07
Nodes (26): dom, dom.iterable, esnext, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx (+18 more)

### Community 60 - "Community 60"
Cohesion: 0.07
Nodes (26): genkit-cli, devDependencies, genkit-cli, @playwright/test, postcss, prisma, tailwindcss, @types/node (+18 more)

### Community 61 - "Community 61"
Cohesion: 0.20
Nodes (15): buildUserContent(), extractJsonPayload(), isStandaloneSubordinateMarker(), normalizeCodeFragment(), OpenAiRequirementSchema, OpenAiSummarizeDocumentOutputSchema, parseFallbackTextRequirements(), RegulationSchema (+7 more)

### Community 62 - "Community 62"
Cohesion: 0.06
Nodes (57): POST(), POST(), POST(), POST(), POST(), GET(), getMeetingRows(), getTenantContext() (+49 more)

### Community 63 - "Community 63"
Cohesion: 0.18
Nodes (13): clamp(), formatLitres(), normalizeFuelStation(), serializeStation(), WBCalculator(), calculateFuelGallonsFromWeight(), calculateFuelWeight(), FUEL_PRESETS (+5 more)

### Community 64 - "Community 64"
Cohesion: 0.11
Nodes (21): buildDecimalFromParts(), createInitialDmsState(), Hemisphere, WaypointDmsDialog(), WaypointDmsDialogProps, WaypointDmsForm(), WaypointDmsFormProps, WaypointDmsFormState (+13 more)

### Community 65 - "Community 65"
Cohesion: 0.22
Nodes (17): calculateDistanceMeters(), calculateTrackBearing(), emitGeolocationChange(), GeolocationSnapshot, GeolocationState, geolocationStore, getGeolocationSnapshot(), metersPerSecondToKnots() (+9 more)

### Community 66 - "Community 66"
Cohesion: 0.29
Nodes (8): buildInitialOpenParents(), clearLastSubmenuByParent(), findSubItemByHref(), getLastSubmenuByParent(), hasActiveDescendant(), renderNestedSubItems(), setLastSubmenuByParent(), SidebarItems()

### Community 67 - "Community 67"
Cohesion: 0.05
Nodes (37): bcryptjs, drizzle-orm, geomagnetism, lucide-react, dependencies, bcryptjs, drizzle-orm, geomagnetism (+29 more)

### Community 68 - "Community 68"
Cohesion: 0.33
Nodes (4): RegisteredFlowName, POST(), RouteContext, isAuthorizedForAiFlow()

### Community 69 - "Community 69"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 70 - "Community 70"
Cohesion: 0.11
Nodes (32): DELETE(), GET(), POST(), PUT(), GET(), POST(), PUT(), buildTenantDefaultRoles() (+24 more)

### Community 71 - "Community 71"
Cohesion: 0.13
Nodes (31): DELETE(), GET(), getConfig(), getTenantId(), loadAircraft(), loadAudits(), loadCaps(), loadExternalOrganizations() (+23 more)

### Community 72 - "Community 72"
Cohesion: 0.31
Nodes (13): DEFAULT_TEMPLATES, DELETE(), GET(), getConfig(), getTemplates(), getTenantId(), normalizeAssetType(), normalizeScope() (+5 more)

### Community 73 - "Community 73"
Cohesion: 0.24
Nodes (12): BookingForm(), combineLocalDateAndTime(), getBookingRange(), parseLocalDate(), BLOCKED_STATUSES, getBlockingBookingForTracking(), getBookingStartTime(), getTrackableBookings() (+4 more)

### Community 74 - "Community 74"
Cohesion: 0.18
Nodes (16): analyzeMoc(), AnalyzeMocInput, AnalyzeMocInputSchema, AnalyzeMocOutput, AnalyzeMocOutputSchema, extractJsonPayload(), hazardSchema, OpenAiAnalyzeMocOutputSchema (+8 more)

### Community 75 - "Community 75"
Cohesion: 0.14
Nodes (13): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+5 more)

### Community 76 - "Community 76"
Cohesion: 0.11
Nodes (23): compactNumber, CostPredictor(), currency, integerNumber, MetricCard(), AZURE_APP_SERVICE_PLAN_OPTIONS, AZURE_APP_SERVICE_PLANS, AZURE_POSTGRES_PLAN_OPTIONS (+15 more)

### Community 77 - "Community 77"
Cohesion: 0.24
Nodes (12): AircraftList(), AircraftListProps, formatLastAuditDate(), getAircraftDocumentStatus(), DocumentsTab(), VehicleDocumentsTab(), DocumentExpirySettingsLike, DocumentExpiryWarningPeriod (+4 more)

### Community 78 - "Community 78"
Cohesion: 0.20
Nodes (10): Document, ManageComponentsDialog(), parseLocalDate(), toNoonUtcIso(), AircraftDocuments(), AircraftDocumentsProps, parseLocalDate(), DocumentUploader() (+2 more)

### Community 79 - "Community 79"
Cohesion: 0.24
Nodes (10): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+2 more)

### Community 80 - "Community 80"
Cohesion: 0.20
Nodes (9): AppLayout(), AppHeader(), findCurrentItem(), getTitle(), AppSidebar(), AuthGuard(), AuthGuardProps, SidebarInset (+1 more)

### Community 81 - "Community 81"
Cohesion: 0.04
Nodes (97): ActivityLogResponse, ActivityLogRow, ActivityTrackerPage(), describeChange(), formatLogTime(), defaultFindingLevels, FeatureSettings, FindingLevelsSettings (+89 more)

### Community 82 - "Community 82"
Cohesion: 0.16
Nodes (21): DELETE(), GET(), getAllCaps(), getMeaningfulCorrectiveActions(), getTenantId(), hasMeaningfulResponseHistory(), isMeaningfulCap(), mergePermissions() (+13 more)

### Community 83 - "Community 83"
Cohesion: 0.29
Nodes (6): NewBookingForm(), NewBookingFormValues, NewBookingPage(), getAircraftHourSnapshot(), broadcastBookingUpdate(), PreFlightData

### Community 84 - "Community 84"
Cohesion: 0.29
Nodes (7): ColorThemeForm(), ColorThemeFormProps, mergeTenantConfig(), PALETTE_PRESETS, PalettePreset, readLocalTenantOverride(), getTenantThemeLocalOverrideKey()

### Community 85 - "Community 85"
Cohesion: 0.22
Nodes (8): 1. Roles and Users, 2. Fleet and Assets, 3. Safety and Quality, 4. Training and Maintenance, 5. Operations and Admin, 6. What Should Stay Local, 7. Sanity Checks, Verification Plan

### Community 86 - "Community 86"
Cohesion: 0.11
Nodes (23): FlowDefinition, generateExam(), generateExamFlow, GenerateExamInput, GenerateExamInputSchema, GenerateExamOutputSchema, optionSchema, prompt (+15 more)

### Community 87 - "Community 87"
Cohesion: 0.33
Nodes (7): ComponentForm(), ComponentFormProps, ComponentList(), ComponentListProps, parseLocalDate(), ComponentsTableProps, AircraftComponent

### Community 88 - "Community 88"
Cohesion: 0.36
Nodes (9): createActionItem(), createAgendaItem(), createBlankMeeting(), createDiscussionPoint(), getPersonName(), MeetingFormDialog(), MeetingsPage(), parseLocalDate() (+1 more)

### Community 89 - "Community 89"
Cohesion: 0.11
Nodes (17): API_DEPENDENCY_GROUPS, APP_FLOW_MAP, APP_LINK_TREE, BookingSequenceSettings, DB_FLOW_ROWS, DevelopmentDiagnostics, DevelopmentPage(), MODULE_FLOW_GROUPS (+9 more)

### Community 90 - "Community 90"
Cohesion: 0.25
Nodes (7): Agents Contract, Commands, Debugging Notes, Default Verification Order, graphify, Repo Context, Working Rules

### Community 91 - "Community 91"
Cohesion: 0.36
Nodes (10): formatMonitoringDate(), getMonitoringState(), getReportTitle(), getStateClassName(), matchesFilter(), MonitoringFilter, MonitoringRow(), MonitoringState (+2 more)

### Community 92 - "Community 92"
Cohesion: 0.25
Nodes (7): 1. Global App Header & Navigation, 2. Card Layout & Sticky Headers, 3. Card Interior Tab Navigation, 4. Data Presentation (Grids & Tables), 5. Buttons & Controls, 6. Mobile Optimization, Electronic Note: UI Source of Truth (Layout & Cards)

### Community 93 - "Community 93"
Cohesion: 0.20
Nodes (8): GenerateExamOutput, SummarizeMaintenanceLogsOutput, AiStudioPage(), arrayFromLines(), FlowKey, flowLabels, FlowResultMap, JsonLike

### Community 94 - "Community 94"
Cohesion: 0.23
Nodes (14): POST(), readHeader(), GET(), BETA_NDA_AGREEMENT_TEXT, NDA_PARAGRAPHS, hasAcceptedBetaNda(), isBetaNdaRequiredForTenant(), normalizeEmail() (+6 more)

### Community 95 - "Community 95"
Cohesion: 0.42
Nodes (8): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), ensureExternalOrganizationsSchema()

### Community 96 - "Community 96"
Cohesion: 0.07
Nodes (56): AccountingPage(), AdminTrainingExercisesPage(), cloneTemplates(), PhasesTab(), AuditActionsProps, AuditsPage(), AuditsTable(), AuditsTableProps (+48 more)

### Community 97 - "Community 97"
Cohesion: 0.40
Nodes (4): QuickSafetyInboxProps, QuickReportWorkflowStatus, QuickSafetyReport, TechnicalQuickReport

### Community 98 - "Community 98"
Cohesion: 0.08
Nodes (23): AuditChecklist(), defaultFindingLevels, EnrichedAudit, evidenceSchema, findingSchema, formatAuditDate(), formSchema, FormValues (+15 more)

### Community 99 - "Community 99"
Cohesion: 0.29
Nodes (8): parseCapFindingLevel(), parseCapObservation(), buildLocalDraftCap(), CapTaskDetailPage(), hasSavedCorrectiveAction(), isFindingRouteId(), isLocalDraftCapId(), parseFindingRouteId()

### Community 100 - "Community 100"
Cohesion: 0.11
Nodes (32): GET(), isBarryMasterUser(), GET(), DELETE(), GET(), getTenantIdForSession(), PATCH(), POST() (+24 more)

### Community 101 - "Community 101"
Cohesion: 0.29
Nodes (6): getTenantOverride(), UserProfileProvider(), CacheEntry, inflightCache, invalidateClientApiCache(), valueCache

### Community 102 - "Community 102"
Cohesion: 0.33
Nodes (5): ACTION_STATUS_OPTIONS, MEETING_STATUS_OPTIONS, MEETING_TYPE_OPTIONS, MeetingFormState, PersonnelLite

### Community 103 - "Community 103"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 105 - "Community 105"
Cohesion: 0.25
Nodes (7): parseLocalDate(), VehicleDetailPage(), VehicleDetailPageProps, vehicleSchema, VehiclesPage(), Vehicle, VehicleDocument

### Community 106 - "Community 106"
Cohesion: 0.50
Nodes (4): parseLocalDate(), RiskGroup(), getAlphanumericRisk(), getRiskScoreStyle()

### Community 107 - "Community 107"
Cohesion: 0.08
Nodes (50): POST(), POST(), POST(), GET(), getTenantId(), PATCH(), POST(), DELETE() (+42 more)

### Community 108 - "Community 108"
Cohesion: 0.57
Nodes (7): DELETE(), GET(), getTenantId(), POST(), PUT(), toStableJson(), ensureManagementOfChangeSchema()

### Community 109 - "Community 109"
Cohesion: 0.50
Nodes (3): **App Name**: Safeviate Manager, Core Features:, Style Guidelines:

### Community 110 - "Community 110"
Cohesion: 0.64
Nodes (7): DELETE(), GET(), getTenantId(), normalizeRoute(), PATCH(), POST(), ensureTrainingRoutesSchema()

### Community 111 - "Community 111"
Cohesion: 0.50
Nodes (3): Example, Firebase Genkit Endpoints, Notes

### Community 112 - "Community 112"
Cohesion: 0.50
Nodes (3): Card Layout Standard, Prisma (Development), Safeviate Manager

### Community 117 - "Community 117"
Cohesion: 0.07
Nodes (43): BOOKING_STATUS_OPTIONS, BOOKING_TYPE_OPTIONS, BookingDraft, bookingFormSchema, Cell, createInitialTable(), PublishDialog(), TableBuilderPage() (+35 more)

### Community 118 - "Community 118"
Cohesion: 0.40
Nodes (4): AiFlowFailure, AiFlowName, AiFlowSuccess, callAiFlow()

### Community 232 - "Community 232"
Cohesion: 0.10
Nodes (38): AirspaceCollections, airspaceFeatureCollection(), buildFeatureDetail(), buildWaypointContext(), delay(), distanceNm(), fetchOpenAipJson(), formatAirportRunways() (+30 more)

### Community 233 - "Community 233"
Cohesion: 0.24
Nodes (7): AlertCardProps, AlertFormProps, MandatoryAlertsProps, Alert, AlertStatus, AlertType, ReadReceipt

### Community 234 - "Community 234"
Cohesion: 0.07
Nodes (39): airspaceFeatureCollection(), Bbox, containsBbox(), createAircraftIcon(), DEFAULT_SETTINGS, DefaultIcon, delay(), fetchOpenAipJson() (+31 more)

### Community 235 - "Community 235"
Cohesion: 0.29
Nodes (7): addOpenAipVectorLayers(), addPointImage(), MapLibreBackground(), MapLibreBackgroundProps, FALLBACK_SATELLITE_STYLE, MAPLIBRE_BASE_STYLES, OPENAIP_VECTOR_TILE_URL

### Community 236 - "Community 236"
Cohesion: 0.19
Nodes (14): formatLatLonDms(), axisHemisphere, axisLimits, axisWidths, CoordinateAxis, formatCoordinateDms(), formatWaypointCoordinatesDms(), normalizeSeconds() (+6 more)

### Community 237 - "Community 237"
Cohesion: 0.27
Nodes (12): BookingPlannedLegsPanel(), classifyDetailText(), getWaypointDetailEntries(), getWaypointDetailGroups(), getWaypointDetailLines(), getWaypointDetailTone(), getWaypointDetailToneClass(), splitDetailText() (+4 more)

### Community 240 - "Community 240"
Cohesion: 0.60
Nodes (4): formatTick(), generateNiceTicks(), GraphPoint, MassBalanceEnvelopeChart()

### Community 242 - "Community 242"
Cohesion: 0.33
Nodes (8): emitServiceWorkerStatus(), requestServiceWorkerUpdate(), ServiceWorkerRegistration(), serviceWorkerStatusListeners, ServiceWorkerStatusPanel(), ServiceWorkerStatusSnapshot, subscribeToServiceWorkerStatus(), useServiceWorkerStatus()

### Community 244 - "Community 244"
Cohesion: 0.08
Nodes (32): applyColorsToDOM(), applyCssNumberToDOM(), applyHeaderBackgroundImageToDOM(), applyScaleToDOM(), applySidebarBackgroundImageToDOM(), AUTH_ROUTES, BootstrapThemeSnapshot, ButtonThemeColors (+24 more)

### Community 248 - "Community 248"
Cohesion: 0.18
Nodes (8): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES, useChart()

### Community 250 - "Community 250"
Cohesion: 0.44
Nodes (7): createDb(), getDb(), assertRequiredEnv(), EnvRequirement, getMissingEnvVars(), getRequirementLabel(), isProvided()

### Community 251 - "Community 251"
Cohesion: 0.07
Nodes (29): activeFlightSessions, aircrafts, alerts, bookings, companyDocuments, correctiveActionPlans, departments, erpState (+21 more)

### Community 255 - "Community 255"
Cohesion: 0.29
Nodes (7): CapTaskSummary, isSummaryPerson(), SummaryPerson, toSummaryPeople(), UnifiedMessage, UnifiedTask, UpcomingScheduledAudit

### Community 261 - "Community 261"
Cohesion: 0.32
Nodes (5): UseMapZoomDraftOptions, clampZoomPreference(), MapZoomPreference, useMapZoomPreferences(), UseMapZoomPreferencesOptions

### Community 266 - "Community 266"
Cohesion: 0.26
Nodes (11): AircraftBookingBlockState, AircraftInspectionStatus, getAircraftBookingBlockState(), getAircraftInspectionStatus(), hasExpiredAircraftDocuments(), isAircraftInspectionBlocked(), isRedWarningColor(), parseColorChannels() (+3 more)

### Community 268 - "Community 268"
Cohesion: 0.40
Nodes (3): BackConfig, explicitBackTargets, menuBackTargets

### Community 289 - "Community 289"
Cohesion: 0.17
Nodes (28): assertActionPermission(), buildNextConfig(), changeRequestPayload(), cleanReason(), DatabaseExecutor, decideScheduleChange(), GET(), getAction() (+20 more)

### Community 332 - "Community 332"
Cohesion: 0.13
Nodes (20): buildTrainingCompetencyAreas(), expandEntryObservations(), getTrainingCompetencySignal(), resolveTrainingCompetencies(), TRAINING_COMPETENCY_DEFINITIONS, TrainingCompetencyArea, TrainingCompetencyDefinition, CompetencySignal (+12 more)

### Community 333 - "Community 333"
Cohesion: 0.10
Nodes (30): CompetencyRow(), ExerciseProgressMatrix(), formatLastSeen(), getMeterTone(), getRatingColor(), InstructorAssignmentTimeline(), parseLocalDate(), round1() (+22 more)

### Community 340 - "Community 340"
Cohesion: 0.60
Nodes (4): applySecurityHeaders(), config, middleware(), resolveCanonicalHost()

### Community 349 - "Community 349"
Cohesion: 0.11
Nodes (23): FleetTrackerMap, FleetTrackerPage(), formatReplayDuration(), formatReplayTimestamp(), TRACK_REPLAY_WINDOW_OPTIONS, MobileActionDropdown(), MobileActionDropdownProps, DropdownMenuCheckboxItem (+15 more)

### Community 353 - "Community 353"
Cohesion: 0.08
Nodes (36): MocActionsProps, ApprovalFormProps, ManagementOfChange, MocHazard, MocMitigation, MocMitigationStatus, MocPhase, MocRisk (+28 more)

## Knowledge Gaps
- **1045 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+1040 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **55 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Community 52` to `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 30`, `Community 31`, `Community 33`, `Community 35`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 53`, `Community 56`, `Community 57`, `Community 63`, `Community 64`, `Community 73`, `Community 77`, `Community 78`, `Community 79`, `Community 81`, `Community 82`, `Community 83`, `Community 84`, `Community 87`, `Community 88`, `Community 89`, `Community 93`, `Community 349`, `Community 96`, `Community 98`, `Community 99`, `Community 102`, `Community 105`, `Community 242`, `Community 117`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 67` to `Community 147`, `Community 149`, `Community 150`, `Community 151`, `Community 152`, `Community 153`, `Community 154`, `Community 156`, `Community 157`, `Community 158`, `Community 160`, `Community 161`, `Community 163`, `Community 164`, `Community 165`, `Community 166`, `Community 169`, `Community 170`, `Community 43`, `Community 172`, `Community 174`, `Community 176`, `Community 177`, `Community 181`, `Community 182`, `Community 183`, `Community 184`, `Community 186`, `Community 187`, `Community 60`, `Community 188`, `Community 189`, `Community 190`, `Community 191`, `Community 192`, `Community 194`, `Community 195`, `Community 197`, `Community 198`, `Community 115`, `Community 116`, `Community 119`, `Community 120`, `Community 121`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `react` connect `Community 43` to `Community 96`, `Community 67`, `Community 42`, `Community 75`, `Community 45`, `Community 52`, `Community 54`, `Community 23`, `Community 248`, `Community 31`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _1045 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09019607843137255 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.046585255540479424 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07419712070874862 - nodes in this community are weakly interconnected._