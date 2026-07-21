# Graph Report - Safeviate-Manager-Vercel  (2026-07-21)

## Corpus Check
- 623 files · ~488,994 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 4038 nodes · 15220 edges · 204 communities (149 shown, 55 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 24 edges (avg confidence: 0.51)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1a61198c`
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
- react-leaflet
- Community 80
- Community 81
- ensureExternalOrganizationsSchema
- exam-form.tsx
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- manage-cap-dialog.tsx
- Community 92
- Community 93
- page.tsx
- generate-exam-flow.ts
- Community 96
- generate-safety-protocol-recommendations.ts
- alert.ts
- Community 99
- Community 100
- Community 101
- chart.tsx
- Community 103
- Community 104
- page.tsx
- page.tsx
- Community 107
- Community 108
- Community 109
- @azure/storage-blob
- Community 111
- Community 112
- Community 115
- Community 116
- Community 117
- Community 119
- Community 120
- Community 121
- Community 122
- react-leaflet
- route.ts
- Community 140
- Community 141
- Community 142
- Community 143
- Community 144
- Community 145
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
- Community 234
- Community 236
- Community 242
- Community 244
- Community 251
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
5. `Card` - 185 edges
6. `CardContent` - 171 edges
7. `usePermissions()` - 162 edges
8. `useIsMobile()` - 127 edges
9. `Badge()` - 126 edges
10. `Input` - 125 edges

## Surprising Connections (you probably didn't know these)
- `RiskAssessmentEditor()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/management-of-change/[mocId]/implementation-form.tsx → package.json
- `RiskAssessmentEditor()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/risk-register/risk-form.tsx → package.json
- `ClosureMonitoringPanel()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/safety-reports/[reportId]/final-review.tsx → package.json
- `FinalReview()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/safety-reports/[reportId]/final-review.tsx → package.json
- `HazardIdentificationForm()` --references--> `react`  [EXTRACTED]
  src/app/(app)/safety/safety-reports/[reportId]/hazard-identification-form.tsx → package.json

## Import Cycles
- 1-file cycle: `src/lib/placeholder-images.ts -> src/lib/placeholder-images.ts`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/personnel-actions.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-table.tsx -> src/app/(app)/users/personnel/personnel-actions.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 3-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 4-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 4-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/hooks/use-tenant-route-access.ts -> src/hooks/use-permissions.ts -> src/hooks/use-tenant-config.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/admin/roles/page.tsx -> src/app/(app)/admin/roles/role-form.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/roles/page.tsx`
- 5-file cycle: `src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-table.tsx -> src/app/(app)/users/personnel/personnel-actions.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-permissions.ts -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/admin/department/page.tsx`
- 5-file cycle: `src/app/(app)/admin/department/page.tsx -> src/hooks/use-user-profile.tsx -> src/app/(app)/users/personnel/page.tsx -> src/app/(app)/users/personnel/personnel-directory-page.tsx -> src/app/(app)/users/personnel/personnel-form.tsx -> src/app/(app)/admin/department/page.tsx`

## Communities (204 total, 55 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (47): asDate(), asRecord(), GET(), getRecoveryContext(), isRecoveryAdministrator(), PATCH(), restoreArchive(), DELETE() (+39 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (59): BOOKING_TYPE_COLORS, BookingOverviewMetrics, buildTrendBuckets(), calcBreakMinutes(), calcDutyMinutes(), calcNetDutyMinutes(), CANCELLATION_REASON_COLORS, CompetencyArea (+51 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (23): FindingLevelsSettings, AuditChecklist(), formatAuditDate(), AuditDetailPage(), AuditDetailPageProps, parseLocalDate(), AuditActions(), AuditActionsProps (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (33): ActiveFlightLiveMap, ActiveFlightPage(), ActiveTrackingSelection, ActiveTrackingState, clearActiveTrackingState(), clearLocationCalibration(), clearQueuedFlightSession(), clearQueuedTrackPoints() (+25 more)

### Community 4 - "Community 4"
Cohesion: 0.21
Nodes (10): ASSET_TYPE_OPTIONS, AssetInspectionNewPage(), AssetOption, flattenTemplateChecklist(), getAssetDescription(), getAssetLabel(), getDefaultChecklist(), INSPECTION_TYPE_OPTIONS (+2 more)

### Community 5 - "Community 5"
Cohesion: 0.29
Nodes (14): asDate(), canonicalKeyFor(), defaultTrainingClassification(), isOccurrenceLinked(), mergeMitigations(), mergeOccurrences(), mergeRiskItem(), normalizeText() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (28): ContactsTab(), DiaryTab(), DocumentsTab(), EstimatorTab(), MediaTab(), PhasesTab(), TriggersTab(), printOptions (+20 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (20): CompetencyHighlight, CompetencyStrip(), DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getCompetencySnapshot(), getCompetencyTone() (+12 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (45): AIRCRAFT_MODELS, buildCorrectiveActionPlans(), buildMeetings(), buildQualityAudits(), buildRisks(), buildSafetyReports(), buildSimulationAircraft(), buildSimulationAssertions() (+37 more)

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (13): CompetencyRow(), ExerciseProgressMatrix(), formatLastSeen(), getMeterTone(), getRatingColor(), InstructorAssignmentTimeline(), parseLocalDate(), round1() (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (17): buildDefaultEnabledHrefs(), buildTenantIdFromName(), DatabaseForm(), getDefaultTenantMenuState(), getTenantMenuState(), getTenantPageLayoutSettings(), isTenantMenuHref(), normalizeTenantConfig() (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (63): BillingTable(), parseLocalDate(), defaultFindingLevels, FeatureSettings, BookingsTable(), NewBookingForm(), DatabasePage(), calculateSpans() (+55 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (35): AssignPersonnelDialog(), DETAIL_TABS, formatDisplayDate(), getDocumentHealth(), getDocumentHealthBadge(), getProjectDocumentsForRequirement(), getProjectStatusBadge(), getRiskScoreBadge() (+27 more)

### Community 13 - "Community 13"
Cohesion: 0.07
Nodes (39): AddComponentDialog(), AddDefectDialog(), AddMaintenanceLogDialog(), AircraftDetailPage(), AircraftDetailPageProps, AircraftDocumentUpload, AircraftUsageBooking, categorizeDefect() (+31 more)

### Community 14 - "Community 14"
Cohesion: 0.05
Nodes (70): ActivityLogResponse, ActivityLogRow, ActivityTrackerPage(), describeChange(), formatLogTime(), MassBalanceConfigPage(), OverdueSettingsPage(), AdminPage() (+62 more)

### Community 15 - "Community 15"
Cohesion: 0.14
Nodes (24): DebriefRoomBookingForm(), BookingItem(), BRIEFING_ROOMS, combineDateAndTime(), formatHoursValue(), formatMaintenanceWindowRange(), getBookingDateSegments(), getDatesInRangeInclusive() (+16 more)

### Community 16 - "Community 16"
Cohesion: 0.06
Nodes (54): DELETE(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), GET(), getTenantId() (+46 more)

### Community 17 - "Community 17"
Cohesion: 0.09
Nodes (41): FindingLevel, parseLocalDate(), VehicleList(), BookingBuckets, EnrichedBooking, AlertCard(), defaultFindingLevels, EnrichedAudit (+33 more)

### Community 18 - "Community 18"
Cohesion: 0.06
Nodes (41): AiChecklistGenerator(), AiChecklistGeneratorProps, ImportFromGapAnalysesDialogProps, ImportFromMatrixDialog(), ImportFromMatrixDialogProps, NewChecklistDialog(), NewChecklistDialogProps, ComplianceItemFormProps (+33 more)

### Community 19 - "Community 19"
Cohesion: 0.08
Nodes (30): EditReportDialog(), parseLocalDate(), buildRiskAssessmentPath(), deriveCorrectiveActionsFromHazards(), FormValues, getRiskLevel(), getRiskScoreColor(), HazardIdentificationForm() (+22 more)

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (9): DocumentsTabProps, REQUIRED_DOCUMENTS, ERPCollectedDocument, ERPContact, ERPContactCategory, ERPEvent, ERPEventStatus, ERPLogEntry (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.13
Nodes (19): DocumentDatesPage(), FeaturesPage(), BookingPlanningMap(), BookingPlanningMapSettings, buildWaypointContext(), DEFAULT_SETTINGS, distanceNm(), formatAirportRunways() (+11 more)

### Community 22 - "Community 22"
Cohesion: 0.13
Nodes (21): ACTION_STATUS_OPTIONS, createActionItem(), createDiscussionPoint(), DiscussionPointDraft, getPersonName(), MeetingDetailPage(), parseLocalDate(), PersonnelLite (+13 more)

### Community 23 - "Community 23"
Cohesion: 0.08
Nodes (22): formSchema, FormValues, getRiskLevel(), getRiskScoreColor(), hazardSchema, ImplementationFormProps, mapDatesToObjects(), MatrixRowHeader() (+14 more)

### Community 24 - "Community 24"
Cohesion: 0.30
Nodes (14): DEFAULT_TEMPLATES, DELETE(), GET(), getConfig(), getTemplates(), getTenantId(), normalizeAssetType(), normalizeScope() (+6 more)

### Community 25 - "Community 25"
Cohesion: 0.05
Nodes (55): BookingDetailPageProps, BookingHistoryDetailPage(), AeronauticalMap, BookingPerson, BookingStation, BookingStationState, CHECK_APPROVAL_KEYS, CheckApprovalKey (+47 more)

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
Cohesion: 0.09
Nodes (40): GET(), isAnswerMap(), loadTemplate(), POST(), GET(), getTenantId(), PUT(), readConfig() (+32 more)

### Community 30 - "Community 30"
Cohesion: 0.05
Nodes (54): AddVehicleDialog(), AuditChecklistProps, CapActionsFormProps, EnrichedGapAnalysis, GapAnalysesList(), GapAnalysisActions(), getStatusBadgeVariant(), parseLocalDate() (+46 more)

### Community 31 - "Community 31"
Cohesion: 0.10
Nodes (17): buildMitigatedHazardsFromReview(), ClosureMonitoringPanel(), closureStatuses, deriveReviewRisks(), FinalReview(), FormValues, monitoringStatuses, reportReviewSchema (+9 more)

### Community 32 - "Community 32"
Cohesion: 0.09
Nodes (23): scripts, audit:density, build, db:inspect:tenant, db:push, db:push:local, db:recover:tenant-audit-config, db:studio (+15 more)

### Community 33 - "Community 33"
Cohesion: 0.12
Nodes (25): AircraftList(), AircraftListProps, formatLastAuditDate(), getAircraftDocumentStatus(), parseLocalDate(), ViewAircraftDetails(), CompanyDocumentsPage(), parseLocalDate() (+17 more)

### Community 34 - "Community 34"
Cohesion: 0.13
Nodes (16): EditSpiFormProps, SPICard(), SPICardProps, parseLocalDate(), SpiCalculationResult, SpiDataPoint, useSpiData(), EditReportDialogProps (+8 more)

### Community 35 - "Community 35"
Cohesion: 0.17
Nodes (13): react, react, RiskMatrixPage(), defaultTrainingClassification(), mapDatesToObjects(), parseLocalDate(), RiskForm(), RisksArray() (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.12
Nodes (17): extractChecklistSource(), extractChecklistSourceFlow, ExtractChecklistSourceInput, ExtractChecklistSourceInputSchema, ExtractChecklistSourceOutput, ExtractChecklistSourceOutputSchema, prompt, checklistItemSchema (+9 more)

### Community 37 - "Community 37"
Cohesion: 0.06
Nodes (71): buildMatrixIdentityKey(), collectDeletionIds(), ComplianceMatrixEntry, dedupeMatrixEntries(), DELETE(), GET(), getConfig(), getTenantId() (+63 more)

### Community 38 - "Community 38"
Cohesion: 0.24
Nodes (13): POST(), readHeader(), GET(), BETA_NDA_AGREEMENT_TEXT, NDA_PARAGRAPHS, hasAcceptedBetaNda(), isBetaNdaRequiredForTenant(), normalizeEmail() (+5 more)

### Community 39 - "Community 39"
Cohesion: 0.12
Nodes (36): BillingTable(), parseLocalDate(), ComponentForm(), ComponentList(), parseLocalDate(), MaintenanceLogList(), parseLocalDate(), MaintenanceLogs() (+28 more)

### Community 40 - "Community 40"
Cohesion: 0.23
Nodes (19): getActiveLegState(), getCrossTrackErrorNm(), toRadians(), calculateEte(), calculateFuelRequired(), calculateWindTriangle(), getBearing(), getDistance() (+11 more)

### Community 41 - "Community 41"
Cohesion: 0.12
Nodes (22): NavlogBuilder(), AeronauticalMap, FlightPlannerPage(), createEmptyRoute(), TrainingRoutesPage(), formatLatLonDms(), SidebarBrandLogoFooter(), axisHemisphere (+14 more)

### Community 42 - "Community 42"
Cohesion: 0.06
Nodes (35): FormValues, InterviewCard(), InvestigationForm(), investigationInterviewSchema, investigationMemberSchema, investigationSchema, investigationTaskSchema, investigationTaskUpdateSchema (+27 more)

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (7): isEmailLike(), resolveReporterLabel(), SafetyReportPrintPage(), SafetyReportPrintPageProps, PrintButton(), PrintButtonProps, RiskMatrixSettings

### Community 44 - "Community 44"
Cohesion: 0.06
Nodes (40): ActiveFlightLiveMap(), ActiveFlightMapLayerSettings, airspaceFeatureCollection(), AVAILABLE_ZOOM_LEVELS, clearLocationCalibration(), clearOfflineTileCaches(), DEFAULT_ACTIVE_FLIGHT_MAP_LAYER_SETTINGS, delay() (+32 more)

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (14): DEFAULT_STUDENT_MILESTONES, formatDateLabel(), formatDaysSince(), formatHours(), getDaysSince(), getPeriodDays(), getPeriodStart(), getStudentRecommendation() (+6 more)

### Community 47 - "Community 47"
Cohesion: 0.17
Nodes (16): PermissionsPage(), EditPersonnelForm(), isPilotProfile(), isPilotProfile(), parseLocalDate(), roleGrantsPermission(), ViewPersonnelDetails(), getPermissionDisplayLabel() (+8 more)

### Community 48 - "Community 48"
Cohesion: 0.21
Nodes (8): AddToolDialog(), ToolsPage(), ToolList(), ToolsPage(), ToolList(), Tool, ToolOwnerType, ToolStatus

### Community 49 - "Community 49"
Cohesion: 0.44
Nodes (9): AssetInspectionRecord, DELETE(), GET(), getConfig(), getTenantId(), normalizeAssetType(), normalizeChecklistItems(), POST() (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.10
Nodes (34): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), SUPER_USERS (+26 more)

### Community 51 - "Community 51"
Cohesion: 0.07
Nodes (45): airspaceFeatureCollection(), AviationMapLibreShell(), AviationMapLibreShellProps, createAircraftIcon(), delay(), distanceMeters(), distanceNm(), fetchOpenAipJson() (+37 more)

### Community 52 - "Community 52"
Cohesion: 0.12
Nodes (23): QuickSafetyReportPage(), NewSafetyReportForm(), NewSafetyReportValues, NewSafetyReportPage(), ArchiveReportButton(), DepartmentOption, getSafetyReportGroup(), getStatusBadgeVariant() (+15 more)

### Community 53 - "Community 53"
Cohesion: 0.10
Nodes (27): BookingForm(), combineLocalDateAndTime(), getBookingRange(), parseLocalDate(), buildCriterionRatingsFromTemplate(), buildHumanFactorsChecklist(), createDebriefEntry(), createDebriefEntryFromTemplate() (+19 more)

### Community 54 - "Community 54"
Cohesion: 0.08
Nodes (38): AppSidebarMobile(), buildInitialOpenParents(), clearLastSubmenuByParent(), findSubItemByHref(), getLastSubmenuByParent(), hasActiveDescendant(), lastSubmenuByParentMemory, renderNestedSubItems() (+30 more)

### Community 55 - "Community 55"
Cohesion: 0.10
Nodes (29): clamp(), formatLitres(), normalizeFuelStation(), serializeStation(), WBCalculator(), WBCalculatorContent(), getGraphTemplate(), GRAPH_TEMPLATES (+21 more)

### Community 56 - "Community 56"
Cohesion: 0.12
Nodes (19): getMenuSections(), MENU_SECTION_DEFINITIONS, MenuSection, RoleFormProps, EditVehicleDialog(), parseLocalDate(), VehicleDetailPageProps, VehicleDocumentsTab() (+11 more)

### Community 57 - "Community 57"
Cohesion: 0.33
Nodes (4): ColorThemeForm(), mergeTenantConfig(), PALETTE_PRESETS, readLocalTenantOverride()

### Community 58 - "Community 58"
Cohesion: 0.13
Nodes (16): formSchema, FormValues, NewAircraftForm(), Action, ActionType, actionTypes, addToRemoveQueue(), dispatch() (+8 more)

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
Nodes (61): POST(), POST(), POST(), POST(), POST(), POST(), POST(), POST() (+53 more)

### Community 63 - "Community 63"
Cohesion: 0.36
Nodes (9): createActionItem(), createAgendaItem(), createBlankMeeting(), createDiscussionPoint(), getPersonName(), MeetingFormDialog(), MeetingsPage(), parseLocalDate() (+1 more)

### Community 64 - "Community 64"
Cohesion: 0.15
Nodes (17): CorrectiveActionsForm(), FlattenedMitigation, flattenMitigations(), getRiskScoreColor(), likelihoodLabels, mitigationReviewSchema, normalizeRiskAssessment(), parseLocalDate() (+9 more)

### Community 65 - "Community 65"
Cohesion: 0.22
Nodes (17): calculateDistanceMeters(), calculateTrackBearing(), emitGeolocationChange(), GeolocationSnapshot, GeolocationState, geolocationStore, getGeolocationSnapshot(), metersPerSecondToKnots() (+9 more)

### Community 66 - "Community 66"
Cohesion: 0.06
Nodes (55): GET(), isBarryMasterUser(), DELETE(), getTenantId(), PATCH(), GET(), safeValue(), handler (+47 more)

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
Cohesion: 0.15
Nodes (24): DELETE(), GET(), POST(), PUT(), GET(), POST(), PUT(), ensureQuickSafetyReportsSchema() (+16 more)

### Community 71 - "Community 71"
Cohesion: 0.09
Nodes (44): DELETE(), GET(), getAllCaps(), getMeaningfulCorrectiveActions(), getTenantId(), hasMeaningfulResponseHistory(), isMeaningfulCap(), mergePermissions() (+36 more)

### Community 72 - "Community 72"
Cohesion: 0.15
Nodes (12): parseLocalDate(), TECHNICAL_REPORT_WORKFLOW_STATUSES, TechnicalReportAssigneeOption, TechnicalReportDetailPage(), TechnicalReportDraft, debriefSchema, FormValues, HUMAN_FACTORS_CHECKS (+4 more)

### Community 73 - "Community 73"
Cohesion: 0.40
Nodes (4): AttendanceBreak, AttendanceRecordData, AttendanceStatus, AttendanceSummary

### Community 74 - "Community 74"
Cohesion: 0.17
Nodes (16): analyzeMoc(), AnalyzeMocInput, AnalyzeMocInputSchema, AnalyzeMocOutput, AnalyzeMocOutputSchema, extractJsonPayload(), hazardSchema, OpenAiAnalyzeMocOutputSchema (+8 more)

### Community 75 - "Community 75"
Cohesion: 0.15
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

### Community 76 - "Community 76"
Cohesion: 0.11
Nodes (23): compactNumber, CostPredictor(), currency, integerNumber, MetricCard(), AZURE_APP_SERVICE_PLAN_OPTIONS, AZURE_APP_SERVICE_PLANS, AZURE_POSTGRES_PLAN_OPTIONS (+15 more)

### Community 79 - "react-leaflet"
Cohesion: 0.18
Nodes (10): AreaActionsProps, getStatusBadgeClass(), INITIAL_AUDIT_AREAS, MONTHS, ScheduleChangeRequest, STATUSES, StatusSelector(), StatusSelectorProps (+2 more)

### Community 80 - "Community 80"
Cohesion: 0.17
Nodes (13): AppLayout(), AppHeader(), findCurrentItem(), getTitle(), AppSidebar(), AuthGuard(), Avatar, AvatarFallback (+5 more)

### Community 81 - "Community 81"
Cohesion: 0.05
Nodes (73): DEFAULT_TOPICS, ExamTopicsSettings, FuelStation, FuelStationInput, POINT_COLORS, defaultSettings, OverdueMonitorSettings, formatDate() (+65 more)

### Community 82 - "ensureExternalOrganizationsSchema"
Cohesion: 0.42
Nodes (8): DELETE(), GET(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), ensureExternalOrganizationsSchema()

### Community 83 - "exam-form.tsx"
Cohesion: 0.14
Nodes (18): AiExamGenerator(), AiExamGeneratorProps, ExamForm(), ExamFormProps, examFormSchema, ExamFormValues, optionSchema, QuestionItem() (+10 more)

### Community 84 - "Community 84"
Cohesion: 0.33
Nodes (6): MessagesPage(), MyDashboardPage(), parseLocalDate(), parseLocalDate(), TasksPage(), useDashboardData()

### Community 85 - "Community 85"
Cohesion: 0.22
Nodes (8): 1. Roles and Users, 2. Fleet and Assets, 3. Safety and Quality, 4. Training and Maintenance, 5. Operations and Admin, 6. What Should Stay Local, 7. Sanity Checks, Verification Plan

### Community 86 - "Community 86"
Cohesion: 0.14
Nodes (16): FlowDefinition, LogbookColumn, LogbookColumnSchema, parseLogbook(), parseLogbookFlow, ParseLogbookInput, ParseLogbookInputSchema, ParseLogbookOutputSchema (+8 more)

### Community 87 - "Community 87"
Cohesion: 0.24
Nodes (10): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+2 more)

### Community 88 - "Community 88"
Cohesion: 0.04
Nodes (57): DataPortabilityPage(), DatabaseForm(), DepartmentForm(), ExamTopicsPage(), TenantDirectory(), AdminTrainingExercisesPage(), cloneTemplates(), AddComponentDialog() (+49 more)

### Community 89 - "Community 89"
Cohesion: 0.18
Nodes (10): API_DEPENDENCY_GROUPS, APP_FLOW_MAP, APP_LINK_TREE, BookingSequenceSettings, DB_FLOW_ROWS, DevelopmentDiagnostics, DevelopmentPage(), MODULE_FLOW_GROUPS (+2 more)

### Community 90 - "Community 90"
Cohesion: 0.25
Nodes (7): Agents Contract, Commands, Debugging Notes, Default Verification Order, graphify, Repo Context, Working Rules

### Community 91 - "manage-cap-dialog.tsx"
Cohesion: 0.08
Nodes (30): DocumentExpirySettings, AircraftActions(), AircraftActionsProps, AircraftFormProps, AircraftTableProps, Document, ManageComponentsDialog(), parseLocalDate() (+22 more)

### Community 92 - "Community 92"
Cohesion: 0.25
Nodes (7): 1. Global App Header & Navigation, 2. Card Layout & Sticky Headers, 3. Card Interior Tab Navigation, 4. Data Presentation (Grids & Tables), 5. Buttons & Controls, 6. Mobile Optimization, Electronic Note: UI Source of Truth (Layout & Cards)

### Community 93 - "Community 93"
Cohesion: 0.15
Nodes (11): ParseLogbookOutput, AiStudioPage(), arrayFromLines(), FlowKey, flowLabels, FlowResultMap, JsonLike, AiFlowFailure (+3 more)

### Community 94 - "page.tsx"
Cohesion: 0.36
Nodes (10): formatMonitoringDate(), getMonitoringState(), getReportTitle(), getStateClassName(), matchesFilter(), MonitoringFilter, MonitoringRow(), MonitoringState (+2 more)

### Community 95 - "generate-exam-flow.ts"
Cohesion: 0.22
Nodes (9): generateExam(), generateExamFlow, GenerateExamInput, GenerateExamInputSchema, GenerateExamOutput, GenerateExamOutputSchema, optionSchema, prompt (+1 more)

### Community 96 - "Community 96"
Cohesion: 0.04
Nodes (76): AccountingPage(), AccountingPage(), DepartmentActions(), DepartmentPage(), ExternalOrganizationsPage(), ExternalCompaniesPage(), NewRolePage(), RolesPage() (+68 more)

### Community 97 - "generate-safety-protocol-recommendations.ts"
Cohesion: 0.29
Nodes (7): generateSafetyProtocolRecommendations(), generateSafetyProtocolRecommendationsFlow, GenerateSafetyProtocolRecommendationsInput, GenerateSafetyProtocolRecommendationsInputSchema, GenerateSafetyProtocolRecommendationsOutput, GenerateSafetyProtocolRecommendationsOutputSchema, prompt

### Community 98 - "alert.ts"
Cohesion: 0.24
Nodes (7): AlertCardProps, AlertFormProps, MandatoryAlertsProps, Alert, AlertStatus, AlertType, ReadReceipt

### Community 99 - "Community 99"
Cohesion: 0.24
Nodes (8): buildDecimalFromParts(), createInitialDmsState(), Hemisphere, WaypointDmsDialog(), WaypointDmsDialogProps, WaypointDmsForm(), WaypointDmsFormProps, WaypointDmsFormState

### Community 100 - "Community 100"
Cohesion: 0.10
Nodes (30): GET(), getTenantId(), PATCH(), POST(), DELETE(), GET(), getTenantId(), normalizeRoute() (+22 more)

### Community 101 - "Community 101"
Cohesion: 0.07
Nodes (56): BillingTableProps, BillingTableProps, DepartmentActionsProps, Department, Role, RoleActionsProps, RoleForm(), BookingFormProps (+48 more)

### Community 102 - "chart.tsx"
Cohesion: 0.20
Nodes (7): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES

### Community 103 - "Community 103"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 104 - "Community 104"
Cohesion: 0.25
Nodes (7): getTenantOverride(), UserProfileProvider(), CacheEntry, getOrSetClientApiCache(), inflightCache, invalidateClientApiCache(), valueCache

### Community 105 - "page.tsx"
Cohesion: 0.27
Nodes (10): buildTrainingCompetencyAreas(), expandEntryObservations(), getTrainingCompetencySignal(), resolveTrainingCompetencies(), TRAINING_COMPETENCY_DEFINITIONS, TrainingCompetencyArea, TrainingCompetencyDefinition, CompetencySignal (+2 more)

### Community 107 - "Community 107"
Cohesion: 0.44
Nodes (7): DELETE(), getTenantId(), PATCH(), GET(), getTenantId(), POST(), ensureToolsSchema()

### Community 108 - "Community 108"
Cohesion: 0.28
Nodes (14): GET(), getTenantId(), DELETE(), FlightSessionPayload, FlightTrackPointPayload, GET(), getTenantId(), PATCH() (+6 more)

### Community 109 - "Community 109"
Cohesion: 0.50
Nodes (3): **App Name**: Safeviate Manager, Core Features:, Style Guidelines:

### Community 111 - "Community 111"
Cohesion: 0.50
Nodes (3): Example, Firebase Genkit Endpoints, Notes

### Community 112 - "Community 112"
Cohesion: 0.50
Nodes (3): Card Layout Standard, Prisma (Development), Safeviate Manager

### Community 117 - "Community 117"
Cohesion: 0.06
Nodes (112): DepartmentFormProps, formSchema, AddComponentDialogProps, componentFormSchema, ComponentFormValues, formSchema, ComponentFormProps, componentSchema (+104 more)

### Community 127 - "react-leaflet"
Cohesion: 0.07
Nodes (65): DELETE(), GET(), getAttendanceRows(), getTenantId(), PATCH(), POST(), EMPTY_SUMMARY, GET() (+57 more)

### Community 129 - "route.ts"
Cohesion: 0.52
Nodes (6): GET(), getTenantId(), PATCH(), PUT(), toStableJson(), validateLifecycleUpdate()

### Community 232 - "Community 232"
Cohesion: 0.10
Nodes (38): AirspaceCollections, airspaceFeatureCollection(), buildFeatureDetail(), buildWaypointContext(), delay(), distanceNm(), fetchOpenAipJson(), formatAirportRunways() (+30 more)

### Community 234 - "Community 234"
Cohesion: 0.06
Nodes (44): airspaceFeatureCollection(), Bbox, containsBbox(), createAircraftIcon(), DEFAULT_SETTINGS, DefaultIcon, delay(), fetchOpenAipJson() (+36 more)

### Community 236 - "Community 236"
Cohesion: 0.19
Nodes (17): BookingPlannedLegsPanel(), BookingPlannedLegsPanelProps, BookingPlanningMapProps, AeronauticalMapProps, classifyDetailText(), getWaypointDetailEntries(), getWaypointDetailGroups(), getWaypointDetailLines() (+9 more)

### Community 242 - "Community 242"
Cohesion: 0.27
Nodes (9): emitServiceWorkerStatus(), requestServiceWorkerUpdate(), ServiceWorkerRegistration(), serviceWorkerStatusListeners, ServiceWorkerStatusPanel(), ServiceWorkerStatusSnapshot, subscribeToServiceWorkerStatus(), useServiceWorkerStatus() (+1 more)

### Community 244 - "Community 244"
Cohesion: 0.08
Nodes (32): applyColorsToDOM(), applyCssNumberToDOM(), applyHeaderBackgroundImageToDOM(), applyScaleToDOM(), applySidebarBackgroundImageToDOM(), AUTH_ROUTES, BootstrapThemeSnapshot, ButtonThemeColors (+24 more)

### Community 251 - "Community 251"
Cohesion: 0.06
Nodes (35): createDb(), getDb(), activeFlightSessions, aircrafts, alerts, bookings, companyDocuments, correctiveActionPlans (+27 more)

### Community 289 - "Community 289"
Cohesion: 0.17
Nodes (28): assertActionPermission(), buildNextConfig(), changeRequestPayload(), cleanReason(), DatabaseExecutor, decideScheduleChange(), GET(), getAction() (+20 more)

### Community 332 - "Community 332"
Cohesion: 0.12
Nodes (18): defaultFiftyHourWarnings, defaultHundredHourWarnings, defaultInstructorWarnings, defaultMilestones, WarningPeriod, ExamOption, ExamPublication, ExamPublicationMode (+10 more)

### Community 333 - "Community 333"
Cohesion: 0.16
Nodes (18): buildAttemptsForTemplate(), buildCriterionInsights(), buildExerciseCurrencySummary(), buildExerciseProgressSummary(), daysSince(), deriveStatus(), deriveTrend(), ExerciseAttempt (+10 more)

### Community 340 - "Community 340"
Cohesion: 0.60
Nodes (4): applySecurityHeaders(), config, middleware(), resolveCanonicalHost()

### Community 349 - "Community 349"
Cohesion: 0.10
Nodes (26): FleetTrackerMap, FleetTrackerPage(), formatReplayDuration(), formatReplayTimestamp(), TRACK_REPLAY_WINDOW_OPTIONS, MobileActionDropdown(), MobileActionDropdownProps, SheetContent (+18 more)

### Community 353 - "Community 353"
Cohesion: 0.09
Nodes (35): ChecklistTemplateCardProps, BookingStatus, AssetInspectionAssetType, AssetInspectionChecklistItem, AssetInspectionChecklistPhoto, AssetInspectionOutcome, AssetInspectionRecord, AssetInspectionScope (+27 more)

## Knowledge Gaps
- **1046 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+1041 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **55 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useToast()` connect `Community 88` to `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 10`, `Community 11`, `Community 12`, `Community 13`, `Community 14`, `Community 15`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 30`, `Community 31`, `Community 33`, `Community 35`, `Community 37`, `Community 39`, `Community 41`, `Community 42`, `Community 46`, `Community 47`, `Community 48`, `Community 52`, `Community 53`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 63`, `Community 64`, `Community 72`, `Community 332`, `Community 81`, `exam-form.tsx`, `Community 87`, `Community 89`, `manage-cap-dialog.tsx`, `Community 93`, `Community 349`, `Community 96`, `Community 99`, `Community 101`, `Community 242`, `Community 117`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Community 67` to `Community 149`, `Community 150`, `Community 151`, `Community 152`, `Community 153`, `Community 154`, `Community 156`, `Community 157`, `Community 158`, `Community 160`, `Community 161`, `Community 163`, `Community 164`, `Community 165`, `Community 166`, `Community 35`, `Community 169`, `Community 170`, `Community 172`, `Community 174`, `Community 176`, `Community 177`, `Community 181`, `Community 182`, `Community 183`, `Community 184`, `Community 186`, `Community 187`, `Community 60`, `Community 188`, `Community 189`, `Community 190`, `Community 191`, `Community 192`, `Community 194`, `Community 195`, `Community 197`, `Community 198`, `@azure/storage-blob`, `Community 115`, `Community 116`, `Community 119`, `Community 120`, `Community 121`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `react` connect `Community 35` to `Community 96`, `Community 67`, `Community 11`, `Community 19`, `Community 54`, `Community 23`, `Community 88`, `Community 31`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _1046 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09019607843137255 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05129561078794289 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10052910052910052 - nodes in this community are weakly interconnected._